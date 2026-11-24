import { sql } from 'drizzle-orm';
import {
  check,
  date,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase';

export const musicGenre = pgEnum('music_genre', [
  'pop',
  'rock',
  'hip_hop',
  'rnb',
  'electronic',
  'jazz',
  'classical',
  'metal',
  'folk',
  'reggae',
  'blues',
  'country',
  'soul',
  'latin',
  'world',
]);

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    musicGenres: musicGenre('music_genres')
      .array()
      .notNull()
      .default(sql`'{}'`),
    fullName: text('full_name'),
    birthDate: date('birth_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('profiles_username_lower_idx').on(sql`lower(${table.username})`),
    check('profiles_username_format', sql`${table.username} ~ '^[a-zA-Z0-9_.]{3,30}$'`),
    check('profiles_bio_length', sql`char_length(${table.bio}) <= 500`),
    check('profiles_full_name_length', sql`char_length(${table.fullName}) <= 100`),
    check('profiles_birth_date_min', sql`${table.birthDate} >= '1900-01-01'`),
    pgPolicy('owner can read own profile', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${table.id} = ${authUid}`,
    }),
    pgPolicy('owner can update own profile', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${table.id} = ${authUid}`,
      withCheck: sql`${table.id} = ${authUid}`,
    }),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
