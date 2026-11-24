import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgEnum,
  pgPolicy,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase';

export const friendshipStatus = pgEnum('friendship_status', ['pending', 'accepted']);

export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    status: friendshipStatus('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('friendships_pair_idx').on(
      sql`least(${table.requesterId}, ${table.addresseeId})`,
      sql`greatest(${table.requesterId}, ${table.addresseeId})`,
    ),
    index('friendships_addressee_idx').on(table.addresseeId),
    check('friendships_no_self', sql`${table.requesterId} <> ${table.addresseeId}`),
    check(
      'friendships_accepted_at_matches_status',
      sql`(${table.status} = 'accepted') = (${table.acceptedAt} is not null)`,
    ),
    pgPolicy('participants can read their friendships', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${authUid} in (${table.requesterId}, ${table.addresseeId})`,
    }),
  ],
);

export type Friendship = typeof friendships.$inferSelect;
