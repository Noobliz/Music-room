import { randomBytes } from 'node:crypto';

import { inArray } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeDatabaseConnection, db } from '../src/db/client.js';
import { type AuthResponse } from '../src/schemas/auth.schema.js';
import { buildServer } from '../src/server.js';

const createdEmails: string[] = [];

const newCredentials = () => {
  const id = randomBytes(5).toString('hex');
  const email = `test_${id}@music-room.test`;
  createdEmails.push(email);
  return { email, password: 'Password123!', username: `test_${id}` };
};

const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

describe('auth', () => {
  let server: FastifyInstance;
  const credentials = newCredentials();
  let auth: AuthResponse;

  beforeAll(async () => {
    server = await buildServer();
    server.log.level = 'silent';
  });

  afterAll(async () => {
    await db.delete(authUsers).where(inArray(authUsers.email, createdEmails));
    await server.close();
    await closeDatabaseConnection();
  });

  it('signs up then logs in', async () => {
    const signup = await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: credentials,
    });
    expect(signup.statusCode).toBe(201);
    expect(signup.json().user).toMatchObject({
      email: credentials.email,
      username: credentials.username,
    });

    const login = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: credentials.email, password: credentials.password },
    });
    expect(login.statusCode).toBe(200);
    auth = login.json<AuthResponse>();
    expect(auth.session.expiresIn).toBe(3600);
  });

  it('rejects a username already taken', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { ...newCredentials(), username: credentials.username.toUpperCase() },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('USERNAME_TAKEN');
  });

  it('protects GET /auth/me', async () => {
    const withoutToken = await server.inject({ method: 'GET', url: '/auth/me' });
    expect(withoutToken.statusCode).toBe(401);
    expect(withoutToken.json().error.code).toBe('TOKEN_MISSING');

    const withToken = await server.inject({
      method: 'GET',
      url: '/auth/me',
      headers: bearer(auth.session.accessToken),
    });
    expect(withToken.statusCode).toBe(200);
    expect(withToken.json()).toEqual(auth.user);
  });

  it('renews the session with a refresh token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: auth.session.refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const renewed = response.json<AuthResponse>();
    expect(renewed.session.accessToken).not.toBe(auth.session.accessToken);
    expect(renewed.session.refreshToken).not.toBe(auth.session.refreshToken);
    auth = renewed;
  });

  it('ends the session on logout', async () => {
    const logout = await server.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: bearer(auth.session.accessToken),
    });
    expect(logout.statusCode).toBe(204);

    const me = await server.inject({
      method: 'GET',
      url: '/auth/me',
      headers: bearer(auth.session.accessToken),
    });
    expect(me.statusCode).toBe(401);
    expect(me.json().error.code).toBe('TOKEN_INVALID');
  });

  it('documents the auth routes', async () => {
    const response = await server.inject({ method: 'GET', url: '/docs/json' });

    expect(Object.keys(response.json().paths)).toEqual(
      expect.arrayContaining([
        '/auth/signup',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/auth/me',
      ]),
    );
  });
});
