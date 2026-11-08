import { randomBytes, randomUUID } from 'node:crypto';

import { eq, inArray, sql } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeDatabaseConnection, db } from '../src/db/client.js';
import { type AuthResponse } from '../src/schemas/auth.schema.js';
import { type OwnProfile } from '../src/schemas/profile.schema.js';
import { buildServer } from '../src/server.js';

const createdEmails: string[] = [];

const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  randomBytes(32),
]);
const JPEG_BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(32)]);

describe('profiles', () => {
  let server: FastifyInstance;
  let alice: AuthResponse;
  let bob: AuthResponse;

  const createVerifiedUser = async (): Promise<AuthResponse> => {
    const id = randomBytes(5).toString('hex');
    const credentials = {
      email: `test_${id}@music-room.test`,
      password: 'Password123!',
      username: `test_${id}`,
    };
    createdEmails.push(credentials.email);

    await server.inject({ method: 'POST', url: '/auth/signup', payload: credentials });
    await db.execute(
      sql`update auth.users set email_confirmed_at = now() where email = ${credentials.email}`,
    );
    const login = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: credentials.email, password: credentials.password },
    });
    return login.json<AuthResponse>();
  };

  const putAvatar = (accessToken: string, contentType: string, payload: Buffer) =>
    server.inject({
      method: 'PUT',
      url: '/profiles/me/avatar',
      headers: { ...bearer(accessToken), 'content-type': contentType },
      payload,
    });

  beforeAll(async () => {
    server = await buildServer();
    server.log.level = 'silent';
    alice = await createVerifiedUser();
    bob = await createVerifiedUser();
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await db.delete(authUsers).where(inArray(authUsers.email, createdEmails));
    }
    await server.close();
    await closeDatabaseConnection();
  });

  it('reads and updates my own profile', async () => {
    const me = await server.inject({
      method: 'GET',
      url: '/profiles/me',
      headers: bearer(alice.session.accessToken),
    });
    expect(me.statusCode).toBe(200);
    expect(me.json<OwnProfile>()).toMatchObject({
      id: alice.user.id,
      email: alice.user.email,
      username: alice.user.username,
      avatarUrl: null,
      bio: null,
    });

    const username = `${alice.user.username}_x`;
    const updated = await server.inject({
      method: 'PATCH',
      url: '/profiles/me',
      headers: bearer(alice.session.accessToken),
      payload: { username, bio: '  Hello  ' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json<OwnProfile>()).toMatchObject({ username, bio: 'Hello' });

    for (const payload of [
      {},
      { bio: 'x'.repeat(501) },
      { avatarUrl: 'https://example.com/a.png' },
    ]) {
      const invalid = await server.inject({
        method: 'PATCH',
        url: '/profiles/me',
        headers: bearer(alice.session.accessToken),
        payload,
      });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json().error.code).toBe('VALIDATION_ERROR');
    }

    const taken = await server.inject({
      method: 'PATCH',
      url: '/profiles/me',
      headers: bearer(alice.session.accessToken),
      payload: { username: bob.user.username.toUpperCase() },
    });
    expect(taken.statusCode).toBe(409);
    expect(taken.json().error.code).toBe('USERNAME_TAKEN');
  });

  it('only exposes public fields to non-friends', async () => {
    const profile = await server.inject({
      method: 'GET',
      url: `/profiles/${alice.user.id}`,
      headers: bearer(bob.session.accessToken),
    });
    expect(profile.statusCode).toBe(200);
    expect(Object.keys(profile.json()).sort()).toEqual(['avatarUrl', 'id', 'username']);

    const missing = await server.inject({
      method: 'GET',
      url: `/profiles/${randomUUID()}`,
      headers: bearer(bob.session.accessToken),
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('uploads, serves and replaces the avatar', async () => {
    const first = await putAvatar(alice.session.accessToken, 'image/png', PNG_BYTES);
    expect(first.statusCode).toBe(200);
    const firstUrl = first.json<OwnProfile>().avatarUrl as string;
    const served = await fetch(firstUrl);
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/png');

    const second = await putAvatar(alice.session.accessToken, 'image/jpeg', JPEG_BYTES);
    expect(second.statusCode).toBe(200);
    expect(second.json<OwnProfile>().avatarUrl).not.toBe(firstUrl);
    expect((await fetch(firstUrl)).ok).toBe(false);

    const wrongType = await putAvatar(alice.session.accessToken, 'text/plain', PNG_BYTES);
    expect(wrongType.statusCode).toBe(415);
    const fakeImage = await putAvatar(alice.session.accessToken, 'image/png', JPEG_BYTES);
    expect(fakeImage.statusCode).toBe(415);
    expect(fakeImage.json().error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('deletes the account and its data', async () => {
    const avatarUrl = (
      await server.inject({
        method: 'GET',
        url: '/profiles/me',
        headers: bearer(alice.session.accessToken),
      })
    ).json<OwnProfile>().avatarUrl as string;

    const deleted = await server.inject({
      method: 'DELETE',
      url: '/profiles/me',
      headers: bearer(alice.session.accessToken),
    });
    expect(deleted.statusCode).toBe(204);

    const me = await server.inject({
      method: 'GET',
      url: '/profiles/me',
      headers: bearer(alice.session.accessToken),
    });
    expect(me.statusCode).toBe(401);
    expect((await fetch(avatarUrl)).ok).toBe(false);
    expect(await db.select().from(authUsers).where(eq(authUsers.id, alice.user.id))).toEqual([]);
  });
});
