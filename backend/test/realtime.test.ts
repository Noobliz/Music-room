import { randomBytes, randomUUID } from 'node:crypto';

import { and, eq, inArray, sql } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { type WebSocket } from 'ws';

import { closeDatabaseConnection, db, type DbTransaction } from '../src/db/client.js';
import { spaceInvitations, spaces, tracks } from '../src/db/schema.js';
import * as trackVoteModel from '../src/models/track-vote.model.js';
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

const waitForBlockedRequest = async (tx: DbTransaction) => {
  await expect
    .poll(async () => {
      const [row] = await tx.execute<{ waiting: boolean }>(sql`
      select exists (
        select from pg_locks where not granted and pg_backend_pid() = any(pg_blocking_pids(pid))
      ) as waiting
    `);
      return row?.waiting;
    })
    .toBe(true);
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

  it('publishes the committed queue in vote order with the vote of each subscriber', async () => {
    const space = await createSpace(alice, { kind: 'event', name: 'Live votes' });
    const owner = await connect(alice);
    const guest = await connect(bob);
    const trackIds = [randomUUID(), randomUUID()];
    const url = `/spaces/${space.id.toUpperCase()}`;
    const ranking = vi.spyOn(trackVoteModel, 'selectQueue');
    const headers = bearer(alice.session.accessToken);
    const propose = (trackId: string) =>
      server.inject({
        method: 'POST',
        url: url + '/proposals',
        headers,
        payload: { trackId },
      });
    try {
      await db.insert(tracks).values(
        trackIds.map((id) => ({
          id,
          title: 'Live track',
          artist: 'Test',
          durationMs: 1000,
          audioPath: id,
          contentHash: id,
        })),
      );
      for (const client of [owner, guest]) {
        client.send({
          type: 'subscribe',
          spaceId: client === guest ? space.id.toUpperCase() : space.id,
        });
        expect(await client.next()).toMatchObject({ type: 'subscribed', version: 1 });
      }
      const proposalIds: string[] = [];
      for (const trackId of trackIds) {
        ranking.mockClear();
        const res = await propose(trackId);
        expect(res.statusCode).toBe(201);
        proposalIds.push(res.json().id);
        for (const client of [owner, guest]) {
          expect(await client.next()).toMatchObject({
            type: 'queue.updated',
            spaceId: space.id,
            version: 1 + proposalIds.length,
            data: { items: proposalIds.map((id) => ({ id, voteCount: 0, hasVoted: false })) },
          });
        }
        expect(ranking).toHaveBeenCalledTimes(1);
      }
      const [first, second] = proposalIds;
      const voteUrl = `${url}/proposals/${second}/vote`;
      expect((await propose(trackIds[1]!)).statusCode).toBe(409);
      const votes = await Promise.all(
        [1, 2].map(() => server.inject({ method: 'PUT', url: voteUrl, headers })),
      );
      expect(votes.map((v) => v.statusCode)).toEqual([204, 204]);
      for (const [client, user] of [
        [owner, alice],
        [guest, bob],
      ] as const) {
        const update = await client.next();
        const queue = (
          await server.inject({ url: url + '/queue', headers: bearer(user.session.accessToken) })
        ).json();
        expect(update).toEqual({
          type: 'queue.updated',
          spaceId: space.id,
          version: queue.version,
          data: { items: queue.items },
        });
        expect(queue).toMatchObject({
          version: 4,
          items: [
            { id: second, voteCount: 1, hasVoted: user === alice },
            { id: first, voteCount: 0, hasVoted: false },
          ],
        });
      }
      expect((await server.inject({ method: 'DELETE', url: voteUrl, headers })).statusCode).toBe(
        204,
      );
      for (const client of [owner, guest]) {
        expect(await client.next()).toMatchObject({
          type: 'queue.updated',
          version: 5,
          data: { items: proposalIds.map((id) => ({ id, voteCount: 0, hasVoted: false })) },
        });
      }
      expect((await server.inject({ method: 'DELETE', url: voteUrl, headers })).statusCode).toBe(
        204,
      );
      expect((await server.inject({ url: url + '/queue', headers })).json().version).toBe(5);
    } finally {
      ranking.mockRestore();
      owner.socket.terminate();
      guest.socket.terminate();
      await db.delete(tracks).where(inArray(tracks.id, trackIds));
    }
  });

  it('acknowledges the committed version when a queue change overlaps subscription', async () => {
    const space = await createSpace(alice, { kind: 'event', name: 'Subscription race' });
    const guest = await connect(bob);
    try {
      await db.transaction(async (tx) => {
        await tx.update(spaces).set({ version: 2 }).where(eq(spaces.id, space.id));
        guest.send({ type: 'subscribe', spaceId: space.id });
        await waitForBlockedRequest(tx);
      });
      expect(await guest.next()).toMatchObject({ type: 'subscribed', version: 2 });
    } finally {
      guest.socket.terminate();
    }
  });

  it.each(['restrict', 'revoke'] as const)(
    'checks queue writes against a concurrent %s',
    async (action) => {
      const privateEvent = action === 'revoke';
      const space = await createSpace(alice, {
        kind: 'event',
        name: 'Permission change',
        visibility: privateEvent ? 'private' : 'public',
      });
      const trackId = randomUUID();
      await db.insert(tracks).values({
        id: trackId,
        title: 'Permission change',
        artist: 'Test',
        durationMs: 1000,
        audioPath: trackId,
        contentHash: trackId,
      });
      try {
        if (privateEvent) {
          await db
            .insert(spaceInvitations)
            .values({ spaceId: space.id, userId: bob.user.id, invitedBy: alice.user.id });
        }
        const headers = bearer(bob.session.accessToken);
        const url = `/spaces/${space.id}/proposals`;
        const proposal = privateEvent
          ? (await server.inject({ method: 'POST', url, headers, payload: { trackId } })).json().id
          : undefined;
        let response: Promise<number> | undefined;
        await db.transaction(async (tx) => {
          if (privateEvent) {
            await tx
              .delete(spaceInvitations)
              .where(
                and(
                  eq(spaceInvitations.spaceId, space.id),
                  eq(spaceInvitations.userId, bob.user.id),
                ),
              );
            response = server
              .inject({ method: 'PUT', url: `${url}/${proposal}/vote`, headers })
              .then((r) => r.statusCode);
          } else {
            await tx
              .update(spaces)
              .set({ accessMode: 'invited_only' })
              .where(eq(spaces.id, space.id));
            response = server
              .inject({ method: 'POST', url, headers, payload: { trackId } })
              .then((r) => r.statusCode);
          }
          await waitForBlockedRequest(tx);
        });
        expect(await response).toBe(privateEvent ? 404 : 403);
        const queue = await server.inject({
          url: `/spaces/${space.id}/queue`,
          headers: bearer(alice.session.accessToken),
        });
        expect(queue.json()).toMatchObject({
          version: privateEvent ? 2 : 1,
          items: privateEvent ? [{ voteCount: 0 }] : [],
        });
      } finally {
        await db.delete(tracks).where(eq(tracks.id, trackId));
      }
    },
  );

  it('updates the queue once when account deletion removes both a proposal and a vote', async () => {
    const participant = await createVerifiedUser();
    const space = await createSpace(alice, { kind: 'event', name: 'Account deletion' });
    const owner = await connect(alice);
    const ids = [randomUUID(), randomUUID()];
    try {
      await db.insert(tracks).values(
        ids.map((id) => ({
          id,
          title: 'Account deletion',
          artist: 'Test',
          durationMs: 1000,
          audioPath: id,
          contentHash: id,
        })),
      );
      const url = `/spaces/${space.id}`;
      const propose = (user: AuthResponse, trackId: string) =>
        server.inject({
          method: 'POST',
          url: url + '/proposals',
          headers: bearer(user.session.accessToken),
          payload: { trackId },
        });
      const kept = await propose(alice, ids[0]!);
      expect(kept.statusCode).toBe(201);
      expect((await propose(participant, ids[1]!)).statusCode).toBe(201);
      const headers = bearer(participant.session.accessToken);
      expect(
        (
          await server.inject({
            method: 'PUT',
            url: `${url}/proposals/${kept.json().id}/vote`,
            headers,
          })
        ).statusCode,
      ).toBe(204);
      owner.send({ type: 'subscribe', spaceId: space.id });
      expect(await owner.next()).toMatchObject({ type: 'subscribed', version: 4 });
      expect(
        (await server.inject({ method: 'DELETE', url: '/profiles/me', headers })).statusCode,
      ).toBe(204);
      const queue = (
        await server.inject({ url: url + '/queue', headers: bearer(alice.session.accessToken) })
      ).json();
      expect(queue).toMatchObject({
        version: 5,
        items: [{ id: kept.json().id, voteCount: 0, hasVoted: false }],
      });
      expect(await owner.next()).toEqual({
        type: 'queue.updated',
        spaceId: space.id,
        version: 5,
        data: { items: queue.items },
      });
    } finally {
      owner.socket.terminate();
      await db.delete(tracks).where(inArray(tracks.id, ids));
    }
  });

  it('resyncs a private queue after reconnect and enforces invitation removal', async () => {
    const space = await createSpace(alice, {
      kind: 'event',
      name: 'Private queue',
      visibility: 'private',
      accessMode: 'invited_only',
    });
    const url = `/spaces/${space.id}`;
    const headers = bearer(bob.session.accessToken);
    const owner = bearer(alice.session.accessToken);
    const queue = () => server.inject({ url: url + '/queue', headers });
    const trackId = randomUUID();
    const propose = () =>
      server.inject({ method: 'POST', url: url + '/proposals', headers, payload: { trackId } });
    await db.insert(tracks).values({
      id: trackId,
      title: 'Private track',
      artist: 'Test',
      durationMs: 1000,
      audioPath: trackId,
      contentHash: trackId,
    });
    let guest = await connect(bob);
    try {
      expect((await queue()).statusCode).toBe(404);
      expect((await propose()).statusCode).toBe(404);
      const friend = await server.inject({
        method: 'POST',
        url: '/friends/requests',
        headers: owner,
        payload: { userId: bob.user.id },
      });
      expect(friend.statusCode).toBe(201);
      expect(
        (
          await server.inject({
            method: 'POST',
            url: `/friends/requests/${friend.json().id}/accept`,
            headers,
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await server.inject({
            method: 'POST',
            url: url + '/invitations',
            headers: owner,
            payload: { userId: bob.user.id },
          })
        ).statusCode,
      ).toBe(201);
      const proposal = await propose();
      expect(proposal.statusCode).toBe(201);
      const voteUrl = `${url}/proposals/${proposal.json().id}/vote`;
      guest.send({ type: 'subscribe', spaceId: space.id });
      expect(await guest.next()).toMatchObject({ type: 'subscribed', version: 2 });
      guest.socket.terminate();
      guest = await connect(bob);
      const initial = (await queue()).json();
      expect(initial).toMatchObject({ version: 2, items: [{ voteCount: 0, hasVoted: false }] });
      expect(
        (await server.inject({ method: 'PUT', url: voteUrl, headers: owner })).statusCode,
      ).toBe(204);
      guest.send({ type: 'subscribe', spaceId: space.id });
      expect(await guest.next()).toMatchObject({
        type: 'subscribed',
        version: initial.version + 1,
      });
      expect((await queue()).json()).toMatchObject({
        version: 3,
        items: [{ voteCount: 1, hasVoted: false }],
      });
      expect((await server.inject({ method: 'PUT', url: voteUrl, headers })).statusCode).toBe(204);
      expect(await guest.next()).toMatchObject({
        type: 'queue.updated',
        version: 4,
        data: { items: [{ voteCount: 2, hasVoted: true }] },
      });
      expect(
        (
          await server.inject({
            method: 'DELETE',
            url: `${url}/invitations/${bob.user.id}`,
            headers: owner,
          })
        ).statusCode,
      ).toBe(204);
      expect(await guest.next()).toMatchObject({ type: 'space.access_revoked', spaceId: space.id });
      expect((await queue()).statusCode).toBe(404);
      expect((await server.inject({ method: 'DELETE', url: voteUrl, headers })).statusCode).toBe(
        404,
      );
    } finally {
      guest.socket.terminate();
      await db.delete(tracks).where(inArray(tracks.id, [trackId]));
    }
  });
});
