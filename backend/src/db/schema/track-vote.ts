import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase';
import { spaces } from './spaces.js';
import { tracks } from './tracks.js';

export const eventTrackStatus = pgEnum('event_track_status', ['queued', 'playing', 'played']);

export const eventTrackProposals = pgTable(
  'event_track_proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    proposedBy: uuid('proposed_by')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    status: eventTrackStatus('status').notNull().default('queued'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('event_track_proposals_active_track_idx')
      .on(table.spaceId, table.trackId)
      .where(sql`${table.status} in ('queued', 'playing')`),
    index('event_track_proposals_track_idx').on(table.trackId),
    index('event_track_proposals_proposer_idx').on(table.proposedBy),
    pgPolicy('members can read event track proposals', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_space_member(${table.spaceId}, ${authUid})`,
    }),
  ],
);

export const eventTrackVotes = pgTable(
  'event_track_votes',
  {
    proposalId: uuid('proposal_id')
      .notNull()
      .references(() => eventTrackProposals.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'event_track_votes_pkey', columns: [table.proposalId, table.userId] }),
    index('event_track_votes_user_idx').on(table.userId),
    pgPolicy('members can read event track votes', {
      for: 'select',
      to: authenticatedRole,
      using: sql`exists (
        select 1 from public.event_track_proposals proposal
        where proposal.id = ${table.proposalId}
          and public.is_space_member(proposal.space_id, ${authUid})
      )`,
    }),
  ],
);

export const eventVoteZones = pgTable(
  'event_vote_zones',
  {
    spaceId: uuid('space_id')
      .primaryKey()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    radiusMeters: integer('radius_meters').notNull(),
    startsAt: timestamp('starts_at', { mode: 'string' }).notNull(),
    endsAt: timestamp('ends_at', { mode: 'string' }).notNull(),
    timeZone: text('time_zone').notNull(),
  },
  (table) => [
    check('event_vote_zones_latitude_range', sql`${table.latitude} between -90 and 90`),
    check('event_vote_zones_longitude_range', sql`${table.longitude} between -180 and 180`),
    check('event_vote_zones_radius_range', sql`${table.radiusMeters} between 10 and 50000`),
    check('event_vote_zones_slot_order', sql`${table.endsAt} > ${table.startsAt}`),
    pgPolicy('members can read event vote zones', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_space_member(${table.spaceId}, ${authUid})`,
    }),
  ],
);

export type EventTrackProposal = typeof eventTrackProposals.$inferSelect;
export type NewEventTrackProposal = typeof eventTrackProposals.$inferInsert;
export type EventTrackVote = typeof eventTrackVotes.$inferSelect;
export type EventVoteZone = typeof eventVoteZones.$inferSelect;
