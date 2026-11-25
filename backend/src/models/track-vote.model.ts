import { and, asc, count, desc, eq, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import {
  eventTrackProposals as proposals,
  eventTrackVotes as votes,
  tracks,
} from '../db/schema.js';

export const selectQueue = (spaceId: string, userId: string) => {
  const voteCount = count(votes.userId);
  return db
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

export const insertProposal = async (spaceId: string, trackId: string, proposedBy: string) => {
  const [proposal] = await db
    .insert(proposals)
    .values({ spaceId, trackId, proposedBy })
    .onConflictDoNothing()
    .returning({ id: proposals.id });
  return proposal;
};

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
    if (!proposal) return false;
    if (voted) {
      await tx.insert(votes).values({ proposalId, userId }).onConflictDoNothing();
    } else {
      await tx.delete(votes).where(and(eq(votes.proposalId, proposalId), eq(votes.userId, userId)));
    }
    return true;
  });
