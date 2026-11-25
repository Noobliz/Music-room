import { and, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';

import { db, type DbTransaction } from '../db/client.js';
import {
  eventTrackProposals as proposals,
  eventTrackVotes as votes,
  spaces,
} from '../db/schema.js';

export const lockUserForQueueWrite = async (tx: DbTransaction, userId: string) => {
  const [user] = await tx
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .for('key share');
  return user;
};

export const deleteUserById = (id: string) =>
  db.transaction(async (tx) => {
    await tx.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.id, id)).for('update');

    const userVotes = tx.select({ id: votes.proposalId }).from(votes).where(eq(votes.userId, id));
    const affectedQueues = tx
      .select({ id: proposals.spaceId })
      .from(proposals)
      .where(
        and(
          eq(proposals.status, 'queued'),
          or(eq(proposals.proposedBy, id), inArray(proposals.id, userVotes)),
        ),
      );
    const affectedSpaces = await tx
      .select({ id: spaces.id, ownerId: spaces.ownerId, version: spaces.version })
      .from(spaces)
      .where(or(eq(spaces.ownerId, id), inArray(spaces.id, affectedQueues)))
      .orderBy(spaces.id)
      .for('update');
    const deletedSpaces = affectedSpaces.filter((space) => space.ownerId === id);
    const changedQueues = await tx
      .update(spaces)
      .set({ version: sql`${spaces.version} + 1` })
      .where(and(ne(spaces.ownerId, id), inArray(spaces.id, affectedQueues)))
      .returning({ id: spaces.id });
    await tx.delete(authUsers).where(eq(authUsers.id, id));
    return { changedQueues, deletedSpaces };
  });
