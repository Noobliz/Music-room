import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase';

export const spaceKind = pgEnum('space_kind', ['event', 'playlist']);
export const spaceVisibility = pgEnum('space_visibility', ['public', 'private']);
export const spaceAccessMode = pgEnum('space_access_mode', ['everyone', 'invited_only']);

export const spaces = pgTable(
  'spaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: spaceKind('kind').notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    visibility: spaceVisibility('visibility').notNull().default('public'),
    accessMode: spaceAccessMode('access_mode').notNull().default('everyone'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('spaces_owner_idx').on(table.ownerId),
    index('spaces_visibility_kind_idx').on(table.visibility, table.kind),
    check('spaces_name_not_blank', sql`btrim(${table.name}) <> ''`),
    check('spaces_name_length', sql`char_length(${table.name}) <= 100`),
    check('spaces_description_length', sql`char_length(${table.description}) <= 500`),
    pgPolicy('members can read their spaces', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_space_member(${table.id}, ${authUid})`,
    }),
  ],
);

export const spaceInvitations = pgTable(
  'space_invitations',
  {
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'space_invitations_pkey', columns: [table.spaceId, table.userId] }),
    index('space_invitations_user_idx').on(table.userId),
    pgPolicy('invitee or owner can read invitations', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid} or public.is_space_owner(${table.spaceId}, ${authUid})`,
    }),
  ],
);

export type Space = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;
export type SpaceInvitation = typeof spaceInvitations.$inferSelect;
