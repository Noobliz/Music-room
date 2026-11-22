import { asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { db } from '../db/client.js';
import { type NewTrack, type Track, tracks } from '../db/schema.js';
import { escapeLikePattern } from '../lib/sql.js';

export type TrackSearchResult = {
  rows: Track[];
  total: number;
};

const matchesQuery = (query: string): SQL | undefined => {
  const pattern = `%${escapeLikePattern(query)}%`;
  return or(
    ilike(tracks.title, pattern),
    ilike(tracks.artist, pattern),
    ilike(tracks.album, pattern),
  );
};

const searchOrder = (query: string | undefined): SQL[] => {
  const lowerTitle = sql`lower(${tracks.title})`;
  const byName = [asc(lowerTitle), asc(sql`lower(${tracks.artist})`), asc(tracks.id)];
  if (query === undefined) {
    return byName;
  }
  const lowerQuery = query.toLowerCase();
  return [
    desc(sql`${lowerTitle} = ${lowerQuery}`),
    desc(sql`starts_with(${lowerTitle}, ${lowerQuery})`),
    ...byName,
  ];
};

export const searchTracks = async (
  query: string | undefined,
  limit: number,
  offset: number,
): Promise<TrackSearchResult> => {
  const where = query === undefined ? undefined : matchesQuery(query);
  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(tracks)
      .where(where)
      .orderBy(...searchOrder(query))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tracks).where(where),
  ]);
  return { rows, total: totalRow?.total ?? 0 };
};

export const findTrackById = async (id: string): Promise<Track | undefined> => {
  const [track] = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
  return track;
};

export const findTrackIdByContentHash = async (
  contentHash: string,
): Promise<string | undefined> => {
  const [track] = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.contentHash, contentHash))
    .limit(1);
  return track?.id;
};

export const upsertTrack = async (values: NewTrack): Promise<{ id: string; inserted: boolean }> => {
  const { contentHash: _contentHash, ...changes } = values;
  const [row] = await db
    .insert(tracks)
    .values(values)
    .onConflictDoUpdate({ target: tracks.contentHash, set: changes })
    .returning({ id: tracks.id, inserted: sql<boolean>`(xmax = 0)` });
  return row as { id: string; inserted: boolean };
};
