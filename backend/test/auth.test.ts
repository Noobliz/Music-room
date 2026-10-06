import { randomBytes } from 'node:crypto';

import { inArray, sql } from 'drizzle-orm';
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

const mailpitUrl = `http://127.0.0.1:${process.env.SUPABASE_INBUCKET_PORT ?? '54324'}`;

const waitForTokenHash = async (
  email: string,
  type: 'email' | 'recovery',
  except?: string,
): Promise<string> => {
  const pattern = new RegExp(`token_hash=([^&"]+)&(?:amp;)?type=${type}`);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const search = await fetch(
      `${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const { messages } = await search.json();
    for (const { ID } of messages as { ID: string }[]) {
      const message = await fetch(`${mailpitUrl}/api/v1/message/${ID}`);
      const tokenHash = (await message.json()).HTML.match(pattern)?.[1];
      if (tokenHash && tokenHash !== except) {
        return tokenHash;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No ${type} email received by ${email}`);
};

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

  it('signs up, verifies the email then logs in', async () => {
    const signup = await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: credentials,
    });
    expect(signup.statusCode).toBe(201);
    expect(signup.json()).toEqual({
      user: expect.objectContaining({ email: credentials.email, username: credentials.username }),
    });

    const login = { email: credentials.email, password: credentials.password };
    const unverified = await server.inject({ method: 'POST', url: '/auth/login', payload: login });
    expect(unverified.statusCode).toBe(403);
    expect(unverified.json().error.code).toBe('EMAIL_NOT_VERIFIED');

    const tokenHash = await waitForTokenHash(credentials.email, 'email');
    const redirect = await server.inject({
      method: 'GET',
      url: `/auth/redirect?token_hash=${tokenHash}&type=email`,
    });
    expect(redirect.statusCode).toBe(302);
    expect(redirect.headers.location).toBe(
      `musicroom://auth/verify-email?token_hash=${tokenHash}&type=email`,
    );

    const verify = await server.inject({
      method: 'POST',
      url: '/auth/email/verify',
      payload: { tokenHash },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json<AuthResponse>().user.email).toBe(credentials.email);

    const verified = await server.inject({ method: 'POST', url: '/auth/login', payload: login });
    expect(verified.statusCode).toBe(200);
    auth = verified.json<AuthResponse>();
    expect(auth.session.expiresIn).toBe(3600);
  });

  it('does not reveal registered emails', async () => {
    const signup = await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { ...newCredentials(), email: credentials.email },
    });
    expect(signup.statusCode).toBe(201);

    for (const url of ['/auth/email/resend', '/auth/password/forgot']) {
      const unknown = await server.inject({
        method: 'POST',
        url,
        payload: { email: newCredentials().email },
      });
      expect(unknown.statusCode).toBe(202);
    }
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

  it('resets the password with a valid link only', async () => {
    const forgot = () =>
      server.inject({
        method: 'POST',
        url: '/auth/password/forgot',
        payload: { email: credentials.email },
      });
    const reset = (tokenHash: string) =>
      server.inject({
        method: 'POST',
        url: '/auth/password/reset',
        payload: { tokenHash, password: 'NewPassword123!' },
      });

    expect((await forgot()).statusCode).toBe(202);
    const expiredToken = await waitForTokenHash(credentials.email, 'recovery');
    await db.execute(
      sql`update auth.users set recovery_sent_at = now() - interval '2 hours' where email = ${credentials.email}`,
    );
    const expired = await reset(expiredToken);
    expect(expired.statusCode).toBe(400);
    expect(expired.json().error.code).toBe('INVALID_OR_EXPIRED_LINK');

    expect((await forgot()).statusCode).toBe(202);
    const tokenHash = await waitForTokenHash(credentials.email, 'recovery', expiredToken);
    expect((await reset(tokenHash)).statusCode).toBe(204);

    const reused = await reset(tokenHash);
    expect(reused.statusCode).toBe(400);
    expect(reused.json().error.code).toBe('INVALID_OR_EXPIRED_LINK');

    const login = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: credentials.email, password: 'NewPassword123!' },
    });
    expect(login.statusCode).toBe(200);
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
        '/auth/redirect',
        '/auth/email/verify',
        '/auth/email/resend',
        '/auth/password/forgot',
        '/auth/password/reset',
      ]),
    );
  });
});
