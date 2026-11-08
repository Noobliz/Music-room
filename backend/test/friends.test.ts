import { randomBytes } from 'node:crypto';

import { inArray, sql } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeDatabaseConnection, db } from '../src/db/client.js';
import { type AuthResponse } from '../src/schemas/auth.schema.js';
import {
  type Friend,
  type FriendRequest,
  type FriendRequests,
  type UserSearchResult,
} from '../src/schemas/friend.schema.js';
import { buildServer } from '../src/server.js';

const createdEmails: string[] = [];

const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

describe('friends', () => {
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

  const as = (user: AuthResponse) => ({
    get: (url: string) =>
      server.inject({ method: 'GET', url, headers: bearer(user.session.accessToken) }),
    post: (url: string, payload?: object) =>
      server.inject({ method: 'POST', url, headers: bearer(user.session.accessToken), payload }),
    delete: (url: string) =>
      server.inject({ method: 'DELETE', url, headers: bearer(user.session.accessToken) }),
  });

  const searchFor = async (viewer: AuthResponse, target: AuthResponse) => {
    const results = (await as(viewer).get(`/friends/search?q=${target.user.username}`)).json<
      UserSearchResult[]
    >();
    return results.find((result) => result.id === target.user.id);
  };

  beforeAll(async () => {
    server = await buildServer();
    server.log.level = 'silent';
    alice = await createVerifiedUser();
    bob = await createVerifiedUser();
    carol = await createVerifiedUser();
    await server.inject({
      method: 'PATCH',
      url: '/profiles/me',
      headers: bearer(bob.session.accessToken),
      payload: { bio: 'Bob bio' },
    });
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await db.delete(authUsers).where(inArray(authUsers.email, createdEmails));
    }
    await server.close();
    await closeDatabaseConnection();
  });

  it('sends, accepts and removes a friend', async () => {
    expect(await searchFor(alice, bob)).toMatchObject({ relationship: 'none', requestId: null });

    const sent = await as(alice).post('/friends/requests', { userId: bob.user.id });
    expect(sent.statusCode).toBe(201);
    const request = sent.json<FriendRequest>();
    expect(request.user).toMatchObject({ id: bob.user.id, username: bob.user.username });

    const reverse = await as(bob).post('/friends/requests', { userId: alice.user.id });
    expect(reverse.statusCode).toBe(409);
    expect(reverse.json().error.code).toBe('FRIEND_REQUEST_EXISTS');

    const requests = (await as(bob).get('/friends/requests')).json<FriendRequests>();
    expect(requests.received.map((received) => received.id)).toEqual([request.id]);
    expect(requests.sent).toEqual([]);
    expect(await searchFor(bob, alice)).toMatchObject({
      relationship: 'request_received',
      requestId: request.id,
    });
    expect((await as(alice).get(`/profiles/${bob.user.id}`)).json().bio).toBeUndefined();

    expect((await as(alice).post(`/friends/requests/${request.id}/accept`)).statusCode).toBe(404);
    const accepted = await as(bob).post(`/friends/requests/${request.id}/accept`);
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json<Friend>().user.id).toBe(alice.user.id);

    expect((await as(alice).get(`/profiles/${bob.user.id}`)).json().bio).toBe('Bob bio');
    expect((await as(alice).get('/friends')).json<Friend[]>().map((f) => f.user.id)).toEqual([
      bob.user.id,
    ]);
    expect(await searchFor(alice, bob)).toMatchObject({ relationship: 'friend' });

    const again = await as(alice).post('/friends/requests', { userId: bob.user.id });
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('ALREADY_FRIENDS');

    expect((await as(alice).delete(`/friends/${bob.user.id}`)).statusCode).toBe(204);
    expect((await as(bob).get('/friends')).json()).toEqual([]);
    expect((await as(alice).get(`/profiles/${bob.user.id}`)).json().bio).toBeUndefined();
    const missing = await as(alice).delete(`/friends/${bob.user.id}`);
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('FRIEND_NOT_FOUND');
  });

  it('declines and cancels requests', async () => {
    const self = await as(carol).post('/friends/requests', { userId: carol.user.id });
    expect(self.statusCode).toBe(400);
    expect(self.json().error.code).toBe('CANNOT_FRIEND_SELF');

    const declined = (
      await as(carol).post('/friends/requests', { userId: alice.user.id })
    ).json<FriendRequest>();
    expect((await as(bob).delete(`/friends/requests/${declined.id}`)).statusCode).toBe(404);
    expect((await as(alice).delete(`/friends/requests/${declined.id}`)).statusCode).toBe(204);
    expect((await as(carol).get('/friends/requests')).json<FriendRequests>().sent).toEqual([]);

    const cancelled = (
      await as(carol).post('/friends/requests', { userId: alice.user.id })
    ).json<FriendRequest>();
    expect((await as(carol).delete(`/friends/requests/${cancelled.id}`)).statusCode).toBe(204);
    const gone = await as(alice).post(`/friends/requests/${cancelled.id}/accept`);
    expect(gone.statusCode).toBe(404);
    expect(gone.json().error.code).toBe('FRIEND_REQUEST_NOT_FOUND');
  });
});
