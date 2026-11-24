import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { eq, inArray, sql } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';
import { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeDatabaseConnection, db } from '../src/db/client.js';
import { tracks } from '../src/db/schema.js';
import { createSupabaseAdminClient } from '../src/lib/supabase.js';
import { type AuthResponse } from '../src/schemas/auth.schema.js';
import { type TrackPage, type TrackStream, type TrackView } from '../src/schemas/track.schema.js';
import { buildServer } from '../src/server.js';
import { importCatalog } from '../src/services/catalog-import.service.js';
import { COVERS_BUCKET, TRACKS_BUCKET } from '../src/services/track.service.js';

const createdEmails: string[] = [];

const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

const MPEG_FRAME_COUNT = 200;
const MPEG_FRAME_SAMPLES = 1152;
const SAMPLE_RATE = 44_100;

const id3TextFrame = (id: string, text: string): Buffer => {
  const body = Buffer.concat([Buffer.from([0]), Buffer.from(text, 'latin1')]);
  const header = Buffer.alloc(10);
  header.write(id, 0, 'latin1');
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
};

const synchsafe = (size: number): Buffer =>
  Buffer.from([(size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f]);

const buildMp3 = (tags: { title: string; artist: string; album: string }): Buffer => {
  const frames = Buffer.concat([
    id3TextFrame('TIT2', tags.title),
    id3TextFrame('TPE1', tags.artist),
    id3TextFrame('TALB', tags.album),
  ]);
  const id3 = Buffer.concat([
    Buffer.from('ID3'),
    Buffer.from([3, 0, 0]),
    synchsafe(frames.length),
    frames,
  ]);
  const mpegFrame = Buffer.alloc(417);
  mpegFrame.set([0xff, 0xfb, 0x90, 0x00]);
  return Buffer.concat([id3, ...Array.from({ length: MPEG_FRAME_COUNT }, () => mpegFrame)]);
};

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  randomBytes(32),
]);

describe('tracks', () => {
  let server: FastifyInstance;
  let alice: AuthResponse;
  let catalogDir: string;
  let track: TrackView;
  const artist = `Test artist ${randomBytes(4).toString('hex')}`;

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

  beforeAll(async () => {
    server = await buildServer();
    server.log.level = 'silent';
    alice = await createVerifiedUser();
    catalogDir = await mkdtemp(join(tmpdir(), 'music-room-catalog-'));
    await writeFile(
      join(catalogDir, 'song.mp3'),
      buildMp3({ title: 'Test song', artist, album: 'Test album' }),
    );
    await writeFile(join(catalogDir, 'song.png'), PNG_BYTES);
    await writeFile(
      join(catalogDir, 'catalog.json'),
      JSON.stringify({ 'song.mp3': { license: 'CC-BY 4.0', attribution: `${artist} (CC-BY)` } }),
    );
  });

  afterAll(async () => {
    const rows = await db
      .select({ audioPath: tracks.audioPath, coverPath: tracks.coverPath })
      .from(tracks)
      .where(eq(tracks.artist, artist));
    const storage = createSupabaseAdminClient().storage;
    await storage.from(TRACKS_BUCKET).remove(rows.map((row) => row.audioPath));
    await storage
      .from(COVERS_BUCKET)
      .remove(rows.flatMap((row) => (row.coverPath ? [row.coverPath] : [])));
    await db.delete(tracks).where(eq(tracks.artist, artist));
    if (createdEmails.length > 0) {
      await db.delete(authUsers).where(inArray(authUsers.email, createdEmails));
    }
    await rm(catalogDir, { recursive: true, force: true });
    await server.close();
    await closeDatabaseConnection();
  });

  it('imports the catalog folder once, even when run twice', async () => {
    const first = await importCatalog(catalogDir);
    expect(first).toMatchObject({ imported: ['song.mp3'], updated: [], failed: [] });

    const second = await importCatalog(catalogDir);
    expect(second).toMatchObject({ imported: [], updated: ['song.mp3'], failed: [] });

    const rows = await db.select().from(tracks).where(eq(tracks.artist, artist));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.durationMs).toBe(
      Math.round(((MPEG_FRAME_COUNT * MPEG_FRAME_SAMPLES) / SAMPLE_RATE) * 1000),
    );
  });

  it('finds the track by artist with its details', async () => {
    const search = await server.inject({
      method: 'GET',
      url: `/tracks?q=${encodeURIComponent(artist)}&limit=5`,
      headers: bearer(alice.session.accessToken),
    });
    expect(search.statusCode).toBe(200);
    const page = search.json<TrackPage>();
    expect(page).toMatchObject({ total: 1, limit: 5, offset: 0 });
    track = page.items[0] as TrackView;
    expect(track).toMatchObject({
      title: 'Test song',
      artist,
      album: 'Test album',
      license: 'CC-BY 4.0',
      attribution: `${artist} (CC-BY)`,
    });
    expect(track.coverUrl).toMatch(/\/storage\/v1\/object\/public\/covers\/[0-9a-f]{64}\.png$/);

    const detail = await server.inject({
      method: 'GET',
      url: `/tracks/${track.id}`,
      headers: bearer(alice.session.accessToken),
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json<TrackView>()).toEqual(track);

    const missing = await server.inject({
      method: 'GET',
      url: `/tracks/${randomUUID()}`,
      headers: bearer(alice.session.accessToken),
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('TRACK_NOT_FOUND');
  });

  it('streams the audio to signed-in users only, with seeking', async () => {
    const withoutToken = await server.inject({ method: 'GET', url: `/tracks/${track.id}/stream` });
    expect(withoutToken.statusCode).toBe(401);

    const stream = await server.inject({
      method: 'GET',
      url: `/tracks/${track.id}/stream`,
      headers: bearer(alice.session.accessToken),
    });
    expect(stream.statusCode).toBe(200);
    const { url, expiresAt } = stream.json<TrackStream>();
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

    const partial = await fetch(url, { headers: { Range: 'bytes=100-199' } });
    expect(partial.status).toBe(206);
    expect((await partial.arrayBuffer()).byteLength).toBe(100);
  });
});
