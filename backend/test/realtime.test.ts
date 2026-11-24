import { randomBytes } from 'node:crypto';

import { inArray, sql } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type WebSocket } from 'ws';

import { closeDatabaseConnection, db } from '../src/db/client.js';
import { type AuthResponse } from '../src/schemas/auth.schema.js';
import { type ServerMessage } from '../src/schemas/realtime.schema.js';
import { type SpaceView } from '../src/schemas/space.schema.js';
import { buildServer } from '../src/server.js';

const createdEmails: string[] = [];

const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

type Client = {
  socket: WebSocket;
  send: (message: object) => void;
  next: () => Promise<ServerMessage>;
};

describe('realtime', () => {
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

  const connect = async (user: AuthResponse): Promise<Client> => {
    const socket = await server.injectWS('/realtime', {
      headers: bearer(user.session.accessToken),
    });
    const received: ServerMessage[] = [];
    const waiting: ((message: ServerMessage) => void)[] = [];
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString()) as ServerMessage;
      const resolve = waiting.shift();
      if (resolve) {
        resolve(message);
      } else {
        received.push(message);
      }
    });
    return {
      socket,
      send: (message) => socket.send(JSON.stringify(message)),
      next: () => {
        const message = received.shift();
        return message ? Promise.resolve(message) : new Promise((resolve) => waiting.push(resolve));
      },
    };
  };

  const createSpace = async (owner: AuthResponse, payload: object): Promise<SpaceView> =>
    (
      await server.inject({
        method: 'POST',
        url: '/spaces',
        headers: bearer(owner.session.accessToken),
        payload,
      })
    ).json<SpaceView>();

  const updateSpace = (owner: AuthResponse, spaceId: string, payload: object) =>
    server.inject({
      method: 'PATCH',
      url: `/spaces/${spaceId}`,
      headers: bearer(owner.session.accessToken),
      payload,
    });

  beforeAll(async () => {
    server = await buildServer();
    server.log.level = 'silent';
    await server.ready();
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

  it('refuses a connection without a valid token', async () => {
    await expect(server.injectWS('/realtime')).rejects.toThrow('401');
    await expect(server.injectWS('/realtime', { headers: bearer('not-a-jwt') })).rejects.toThrow(
      '401',
    );
  });

  it('refuses to subscribe to a private space I am not invited to', async () => {
    const space = await createSpace(alice, {
      kind: 'playlist',
      name: 'Secret',
      visibility: 'private',
    });
    const client = await connect(bob);

    client.send({ type: 'subscribe', spaceId: space.id });
    expect(await client.next()).toMatchObject({
      type: 'error',
      spaceId: space.id,
      data: { code: 'SPACE_NOT_FOUND' },
    });

    client.send({ type: 'vote' });
    expect(await client.next()).toMatchObject({
      type: 'error',
      data: { code: 'VALIDATION_ERROR' },
    });
    client.socket.terminate();
  });

  it('pushes the changes made by one client to the other subscribers', async () => {
    const space = await createSpace(alice, { kind: 'event', name: 'Rooftop' });
    const owner = await connect(alice);
    const guest = await connect(bob);

    owner.send({ type: 'subscribe', spaceId: space.id });
    guest.send({ type: 'subscribe', spaceId: space.id });
    const subscribed = { type: 'subscribed', spaceId: space.id, version: 1 };
    expect(await owner.next()).toMatchObject(subscribed);
    expect(await guest.next()).toMatchObject(subscribed);

    expect((await updateSpace(alice, space.id, { name: 'Rooftop party' })).statusCode).toBe(200);
    expect(await guest.next()).toMatchObject({
      type: 'space.updated',
      spaceId: space.id,
      version: 2,
      data: { name: 'Rooftop party', myRole: 'none', canAct: true, version: 2 },
    });
    expect(await owner.next()).toMatchObject({ version: 2, data: { myRole: 'owner' } });

    await updateSpace(alice, space.id, { visibility: 'private' });
    expect(await guest.next()).toEqual({
      type: 'space.access_revoked',
      spaceId: space.id,
      version: 3,
      data: null,
    });
    expect(await owner.next()).toMatchObject({ type: 'space.updated', version: 3 });

    owner.socket.terminate();
    guest.socket.terminate();
  });
});
