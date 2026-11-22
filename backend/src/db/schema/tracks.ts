import { sql } from 'drizzle-orm';
import { check, integer, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authenticatedRole } from 'drizzle-orm/supabase';

export const tracks = pgTable(
  'tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    album: text('album'),
    durationMs: integer('duration_ms').notNull(),
    audioPath: text('audio_path').notNull().unique('tracks_audio_path_key'),
    coverPath: text('cover_path'),
    contentHash: text('content_hash').notNull().unique('tracks_content_hash_key'),
    license: text('license'),
    attribution: text('attribution'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('tracks_duration_positive', sql`${table.durationMs} > 0`),
    check('tracks_title_not_blank', sql`btrim(${table.title}) <> ''`),
    check('tracks_artist_not_blank', sql`btrim(${table.artist}) <> ''`),
    pgPolicy('authenticated users can read tracks', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
);

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
