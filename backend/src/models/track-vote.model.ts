import { and, asc, count, desc, eq, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import {
  eventTrackProposals as proposals,
  eventTrackVotes as votes,
  spaces,
  tracks,
} from '../db/schema.js';
import { type DbExecutor } from './space.model.js';

export const selectQueue = (executor: DbExecutor, spaceId: string, userId: string) => {
  const voteCount = count(votes.userId);
  return executor
    .select({
      id: proposals.id,
      track: tracks,
      proposedBy: proposals.proposedBy,
      createdAt: proposals.createdAt,
      voteCount,
      hasVoted: sql<boolean>`coalesce(bool_or(${votes.userId} = ${userId}), false)`,
    })
    .from(proposals)
    .innerJoin(tracks, eq(tracks.id, proposals.trackId))
    .leftJoin(votes, eq(votes.proposalId, proposals.id))
    .where(and(eq(proposals.spaceId, spaceId), eq(proposals.status, 'queued')))
    .groupBy(proposals.id, tracks.id)
    .orderBy(desc(voteCount), asc(proposals.createdAt), asc(proposals.id));
};

const incrementVersion = (tx: Pick<typeof db, 'update'>, spaceId: string) =>
  tx
    .update(spaces)
    .set({ version: sql`${spaces.version} + 1` })
    .where(eq(spaces.id, spaceId));

export const insertProposal = (spaceId: string, trackId: string, proposedBy: string) =>
  db.transaction(async (tx) => {
    const [proposal] = await tx
      .insert(proposals)
      .values({ spaceId, trackId, proposedBy })
      .onConflictDoNothing()
      .returning({ id: proposals.id });
    if (proposal) await incrementVersion(tx, spaceId);
    return proposal;
  });

export const setQueuedVote = (
  spaceId: string,
  proposalId: string,
  userId: string,
  voted: boolean,
) =>
  db.transaction(async (tx) => {
    const [proposal] = await tx
      .select({ id: proposals.id })
      .from(proposals)
      .where(
        and(
          eq(proposals.id, proposalId),
          eq(proposals.spaceId, spaceId),
          eq(proposals.status, 'queued'),
        ),
      )
      .for('share');
    if (!proposal) return 'missing';
    const mutation = voted
      ? tx.insert(votes).values({ proposalId, userId }).onConflictDoNothing()
      : tx.delete(votes).where(and(eq(votes.proposalId, proposalId), eq(votes.userId, userId)));
    const changed = await mutation.returning();
    if (changed.length === 0) return 'unchanged';
    await incrementVersion(tx, spaceId);
    return 'changed';
  });
