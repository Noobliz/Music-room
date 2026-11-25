import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { db, closeDatabaseConnection } from '../src/db/client.js';
import { tracks } from '../src/db/schema.js';
import { createSupabaseAdminClient } from '../src/lib/supabase.js';
import { buildServer } from '../src/server.js';

describe('Track Vote REST API', () => {
  let server: FastifyInstance;
  const trackId = randomUUID();
  const userIds: string[] = [];
  const createParticipant = async () => {
    const email = `vote_${randomUUID()}@music-room.test`;
    const password = randomUUID();
    const { data, error } = await createSupabaseAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userIds.push(data.user.id);
    const login = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(login.statusCode).toBe(200);
    return { authorization: `Bearer ${login.json().session.accessToken}` };
  };

  beforeAll(async () => {
    server = await buildServer();
    server.log.level = 'silent';
    await db.insert(tracks).values({
      id: trackId,
      title: 'Track Vote fixture',
      artist: 'Artist',
      durationMs: 1000,
      audioPath: trackId,
      contentHash: trackId,
    });
  });
  afterAll(async () => {
    for (const id of userIds) await db.delete(authUsers).where(eq(authUsers.id, id));
    await db.delete(tracks).where(eq(tracks.id, trackId));
    await server.close();
    await closeDatabaseConnection();
  });

  it('scopes proposals and votes to an actionable event and returns the caller’s vote', async () => {
    const owner = await createParticipant();
    const guest = await createParticipant();
    const createSpace = async (kind: string, accessMode = 'everyone') => {
      const res = await server.inject({
        method: 'POST',
        url: '/spaces',
        headers: owner,
        payload: { name: 'Track Vote test', kind, accessMode },
      });
      expect(res.statusCode).toBe(201);
      return `/spaces/${res.json().id}`;
    };
    const event = await createSpace('event');
    const restricted = await createSpace('event', 'invited_only');
    const playlist = await createSpace('playlist');
    const propose = (space: string, id: string, headers = guest) =>
      server.inject({
        method: 'POST',
        url: space + '/proposals',
        headers,
        payload: { trackId: id },
      });
    expect((await server.inject({ url: event + '/queue' })).statusCode).toBe(401);
    expect((await propose(playlist, trackId)).statusCode).toBe(404);
    expect((await propose(restricted, trackId)).statusCode).toBe(403);
    expect((await propose(event, 'bad-id')).statusCode).toBe(400);
    expect((await propose(event, randomUUID())).json().error.code).toBe('TRACK_NOT_FOUND');
    const created = await propose(event, trackId);
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    expect((await propose(event, trackId)).json().error.code).toBe('TRACK_ALREADY_QUEUED');
    const vote = (space: string, method: 'PUT' | 'DELETE', headers = guest) =>
      server.inject({ method, url: `${space}/proposals/${id}/vote`, headers });
    const queue = async (headers = guest) =>
      (await server.inject({ url: event + '/queue', headers })).json().items;
    expect((await vote(restricted, 'PUT', owner)).statusCode).toBe(404);
    expect((await vote(event, 'PUT')).statusCode).toBe(204);
    expect((await vote(event, 'PUT')).statusCode).toBe(204);
    expect(await queue()).toMatchObject([
      { id, track: { id: trackId }, voteCount: 1, hasVoted: true },
    ]);
    expect(await queue(owner)).toMatchObject([{ id, voteCount: 1, hasVoted: false }]);
    expect((await vote(event, 'DELETE')).statusCode).toBe(204);
    expect(await queue()).toMatchObject([{ id, voteCount: 0, hasVoted: false }]);
  });

  it('limits proposals separately from vote changes while keeping the queue readable', async () => {
    const headers = await createParticipant();
    const created = await server.inject({
      method: 'POST',
      url: '/spaces',
      headers,
      payload: { kind: 'event', name: 'Limited event' },
    });
    const url = `/spaces/${created.json().id}`;
    const propose = () =>
      server.inject({ method: 'POST', url: url + '/proposals', headers, payload: { trackId } });
    const proposal = await propose();
    expect(proposal.statusCode).toBe(201);
    for (let i = 1; i < 10; i++) expect((await propose()).statusCode).toBe(409);
    const limited = await propose();
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe('RATE_LIMITED');
    const voteUrl = `${url}/proposals/${proposal.json().id}/vote`;
    for (let i = 0; i < 60; i++) {
      const method = i % 2 === 0 ? 'PUT' : 'DELETE';
      expect((await server.inject({ method, url: voteUrl, headers })).statusCode).toBe(204);
    }
    expect((await server.inject({ method: 'PUT', url: voteUrl, headers })).statusCode).toBe(429);
    const guest = await createParticipant();
    expect((await server.inject({ method: 'PUT', url: voteUrl, headers: guest })).statusCode).toBe(
      204,
    );
    expect((await server.inject({ url: url + '/queue', headers })).statusCode).toBe(200);
  });
});
