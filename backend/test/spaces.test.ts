import { randomBytes } from 'node:crypto';

import { inArray, sql } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeDatabaseConnection, db } from '../src/db/client.js';
import { type AuthResponse } from '../src/schemas/auth.schema.js';
import { type FriendRequest } from '../src/schemas/friend.schema.js';
import {
  type SpaceInvitationView,
  type SpacePage,
  type SpaceView,
} from '../src/schemas/space.schema.js';
import { buildServer } from '../src/server.js';

const createdEmails: string[] = [];

const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

describe('spaces', () => {
  let server: FastifyInstance;
  let alice: AuthResponse;
  let bob: AuthResponse;
  let carol: AuthResponse;

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

  const as = (user: AuthResponse) => {
    const headers = bearer(user.session.accessToken);
    return {
      get: (url: string) => server.inject({ method: 'GET', url, headers }),
      post: (url: string, payload?: object) =>
        server.inject({ method: 'POST', url, headers, payload }),
      patch: (url: string, payload: object) =>
        server.inject({ method: 'PATCH', url, headers, payload }),
      delete: (url: string) => server.inject({ method: 'DELETE', url, headers }),
    };
  };

  const befriend = async (a: AuthResponse, b: AuthResponse) => {
    const request = (
      await as(a).post('/friends/requests', { userId: b.user.id })
    ).json<FriendRequest>();
    await as(b).post(`/friends/requests/${request.id}/accept`);
  };

  const searchIds = async (viewer: AuthResponse, name: string) =>
    (await as(viewer).get(`/spaces?q=${name}`)).json<SpacePage>().items.map((space) => space.id);

  beforeAll(async () => {
    server = await buildServer();
    server.log.level = 'silent';
    alice = await createVerifiedUser();
    bob = await createVerifiedUser();
    carol = await createVerifiedUser();
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await db.delete(authUsers).where(inArray(authUsers.email, createdEmails));
    }
    await server.close();
    await closeDatabaseConnection();
  });

  it('shows a public space to everyone and a private one to its members only', async () => {
    const name = `Road trip ${randomBytes(4).toString('hex')}`;
    const created = await as(alice).post('/spaces', { kind: 'playlist', name });
    expect(created.statusCode).toBe(201);
    const space = created.json<SpaceView>();
    expect(space).toMatchObject({
      visibility: 'public',
      accessMode: 'everyone',
      myRole: 'owner',
      owner: { id: alice.user.id },
    });

    expect(await searchIds(bob, name)).toEqual([space.id]);
    expect((await as(bob).get(`/spaces/${space.id}`)).json<SpaceView>()).toMatchObject({
      myRole: 'none',
      canAct: true,
    });

    const updated = await as(alice).patch(`/spaces/${space.id}`, { visibility: 'private' });
    expect(updated.json<SpaceView>().visibility).toBe('private');
    expect(await searchIds(bob, name)).toEqual([]);
    const hidden = await as(bob).get(`/spaces/${space.id}`);
    expect(hidden.statusCode).toBe(404);
    expect(hidden.json().error.code).toBe('SPACE_NOT_FOUND');

    const notFriend = await as(alice).post(`/spaces/${space.id}/invitations`, {
      userId: carol.user.id,
    });
    expect(notFriend.statusCode).toBe(403);
    expect(notFriend.json().error.code).toBe('INVITEE_NOT_FRIEND');

    await befriend(alice, bob);
    const invited = await as(alice).post(`/spaces/${space.id}/invitations`, {
      userId: bob.user.id,
    });
    expect(invited.statusCode).toBe(201);
    expect(
      (await as(alice).get(`/spaces/${space.id}/invitations`))
        .json<SpaceInvitationView[]>()
        .map((invitation) => invitation.user.id),
    ).toEqual([bob.user.id]);
    expect(
      (await as(bob).get('/spaces/mine?kind=playlist')).json<SpaceView[]>().map((s) => s.id),
    ).toContain(space.id);
    expect((await as(bob).get(`/spaces/${space.id}`)).json<SpaceView>()).toMatchObject({
      myRole: 'invited',
      canAct: true,
    });
    expect((await as(bob).get(`/spaces/${space.id}/invitations`)).statusCode).toBe(403);

    expect(
      (await as(bob).delete(`/spaces/${space.id}/invitations/${bob.user.id}`)).statusCode,
    ).toBe(204);
    expect((await as(bob).get(`/spaces/${space.id}`)).statusCode).toBe(404);
  });

  it('lets anyone open a public invited_only space without acting in it', async () => {
    const space = (
      await as(alice).post('/spaces', {
        kind: 'event',
        name: 'Garden party',
        accessMode: 'invited_only',
      })
    ).json<SpaceView>();

    expect((await as(carol).get(`/spaces/${space.id}`)).json<SpaceView>()).toMatchObject({
      myRole: 'none',
      canAct: false,
    });
    const forbidden = await as(carol).patch(`/spaces/${space.id}`, { name: 'Mine now' });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json().error.code).toBe('NOT_SPACE_OWNER');

    expect((await as(alice).delete(`/spaces/${space.id}`)).statusCode).toBe(204);
    expect((await as(carol).get(`/spaces/${space.id}`)).statusCode).toBe(404);
  });
});
