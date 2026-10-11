import { randomBytes } from 'node:crypto';

import { inArray, sql } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeDatabaseConnection, db } from '../src/db/client.js';
import { type AuthResponse, type IdentitiesResponse } from '../src/schemas/auth.schema.js';
import { buildServer } from '../src/server.js';

const createdEmails: string[] = [];

const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

describe('oauth', () => {
  let server: FastifyInstance;

  const createVerifiedUser = async () => {
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
    return { credentials, auth: login.json<AuthResponse>() };
  };

  const addGoogleIdentity = async (userId: string, email: string) => {
    await db.execute(sql`
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (${randomBytes(8).toString('hex')}, ${userId}, ${JSON.stringify({ email })}::jsonb, 'google', now(), now(), now())
    `);
  };

  const listIdentities = async (accessToken: string) => {
    const response = await server.inject({
      method: 'GET',
      url: '/auth/identities',
      headers: bearer(accessToken),
    });
    return response.json<IdentitiesResponse>().identities.map(({ provider }) => provider);
  };

  beforeAll(async () => {
    server = await buildServer();
    server.log.level = 'silent';
  });

  afterAll(async () => {
    await db.delete(authUsers).where(inArray(authUsers.email, createdEmails));
    await server.close();
    await closeDatabaseConnection();
  });

  it('rejects an invalid Google ID token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/auth/oauth/google',
      payload: { idToken: 'not-a-google-id-token' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('INVALID_ID_TOKEN');
  });

  it('unlinks Google and keeps the password login', async () => {
    const { credentials, auth } = await createVerifiedUser();
    const unlinkGoogle = () =>
      server.inject({
        method: 'DELETE',
        url: '/auth/identities/google',
        headers: bearer(auth.session.accessToken),
      });

    expect(await listIdentities(auth.session.accessToken)).toEqual(['email']);
    const missing = await unlinkGoogle();
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('IDENTITY_NOT_FOUND');

    await addGoogleIdentity(auth.user.id, credentials.email);
    expect(await listIdentities(auth.session.accessToken)).toEqual(
      expect.arrayContaining(['email', 'google']),
    );

    expect((await unlinkGoogle()).statusCode).toBe(204);
    expect(await listIdentities(auth.session.accessToken)).toEqual(['email']);

    const login = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: credentials.email, password: credentials.password },
    });
    expect(login.statusCode).toBe(200);
  });

  it('refuses to unlink the last login method', async () => {
    const { credentials, auth } = await createVerifiedUser();
    await addGoogleIdentity(auth.user.id, credentials.email);
    await db.execute(
      sql`delete from auth.identities where user_id = ${auth.user.id} and provider = 'email'`,
    );

    const response = await server.inject({
      method: 'DELETE',
      url: '/auth/identities/google',
      headers: bearer(auth.session.accessToken),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('LAST_IDENTITY');
  });
});
