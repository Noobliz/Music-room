import { type FastifyBaseLogger } from 'fastify';
import { db, type DbTransaction } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { selectQueue, insertProposal, setQueuedVote } from '../models/track-vote.model.js';
import { findSpaceMembers } from '../models/space.model.js';
import { lockUserForQueueWrite } from '../models/user.model.js';
import { type EventQueue } from '../schemas/track-vote.schema.js';
import { isSubscribed, subscribersOf } from './realtime.service.js';
import {
  requireActionableSpace,
  requireViewableSpace,
  requireLockedSpace,
  resolveAccess,
  type AccessibleSpace,
} from './space-access.service.js';
import { toTrackView } from './track.service.js';
import { type AuthContext } from './token.service.js';

const requireEvent = (space: AccessibleSpace) => {
  if (space.kind !== 'event') throw new AppError(404, 'SPACE_NOT_FOUND', 'No event with this id');
};

const snapshot = { isolationLevel: 'repeatable read', accessMode: 'read only' } as const;

const loadQueue = async (tx: DbTransaction, spaceId: string, userIds: string[]) => {
  const rows = await selectQueue(tx, spaceId, userIds);
  return rows.map(({ track, createdAt, voterIds, ...proposal }) => ({
    item: { ...proposal, track: toTrackView(track), createdAt: createdAt.toISOString() },
    voters: new Set(voterIds),
  }));
};

const itemsForUser = (rows: Awaited<ReturnType<typeof loadQueue>>, userId: string) =>
  rows.map(({ item, voters }) => ({ ...item, hasVoted: voters.has(userId) }));

export const listQueue = (auth: AuthContext, spaceId: string): Promise<EventQueue> =>
  db.transaction(async (tx) => {
    const space = await requireViewableSpace(auth, spaceId, tx);
    requireEvent(space);
    const rows = await loadQueue(tx, spaceId, [auth.userId]);
    return { version: space.version, items: itemsForUser(rows, auth.userId) };
  }, snapshot);

const broadcastQueue = async (log: FastifyBaseLogger, spaceId: string) => {
  const subscribers = subscribersOf(spaceId);
  if (subscribers.length === 0) return;
  const update = await db.transaction(async (tx) => {
    const members = await findSpaceMembers(spaceId, tx);
    if (!members) return;
    const recipients = subscribers
      .map(([connection]) => connection)
      .filter(
        ({ auth }) =>
          resolveAccess(members.space, auth.userId, members.inviteeIds.has(auth.userId)).canView,
      );
    if (recipients.length === 0) return;
    const userIds = [...new Set(recipients.map(({ auth }) => auth.userId))];
    const rows = await loadQueue(tx, spaceId, userIds);
    return { recipients, rows, version: members.space.version };
  }, snapshot);
  if (!update) return;
  for (const connection of update.recipients) {
    if (!isSubscribed(connection, spaceId)) continue;
    try {
      connection.send({
        type: 'queue.updated',
        spaceId,
        version: update.version,
        data: { items: itemsForUser(update.rows, connection.auth.userId) },
      });
    } catch (error) {
      log.error({ err: error, spaceId }, 'Could not send queue to subscriber');
    }
  }
};

export const publishQueue = (log: FastifyBaseLogger, spaceId: string): void => {
  broadcastQueue(log, spaceId).catch((error: unknown) => {
    log.error({ err: error, spaceId }, 'Queue notification failed');
  });
};

const requireQueueWrite = async (tx: DbTransaction, auth: AuthContext, spaceId: string) => {
  if (!(await lockUserForQueueWrite(tx, auth.userId))) {
    throw new AppError(401, 'TOKEN_INVALID', 'The account no longer exists');
  }
  const space = await requireLockedSpace(tx, auth, spaceId, 'no key update');
  requireEvent(space);
  requireActionableSpace(space);
};

export const proposeTrack = async (
  log: FastifyBaseLogger,
  auth: AuthContext,
  spaceId: string,
  trackId: string,
) => {
  let proposal;
  try {
    proposal = await db.transaction(async (tx) => {
      await requireQueueWrite(tx, auth, spaceId);
      return insertProposal(tx, spaceId, trackId, auth.userId);
    });
  } catch (error) {
    if (
      error instanceof Error &&
      'constraint_name' in error &&
      error.constraint_name === 'event_track_proposals_track_id_tracks_id_fk'
    ) {
      throw new AppError(404, 'TRACK_NOT_FOUND', 'No catalog track with this id');
    }
    throw error;
  }
  if (!proposal)
    throw new AppError(409, 'TRACK_ALREADY_QUEUED', 'This track is already queued or playing');
  publishQueue(log, spaceId);
  return proposal;
};

export const setVote = async (
  log: FastifyBaseLogger,
  auth: AuthContext,
  spaceId: string,
  proposalId: string,
  voted: boolean,
) => {
  const result = await db.transaction(async (tx) => {
    await requireQueueWrite(tx, auth, spaceId);
    return setQueuedVote(tx, spaceId, proposalId, auth.userId, voted);
  });
  if (result === 'missing') {
    throw new AppError(404, 'PROPOSAL_NOT_FOUND', 'No queued proposal with this id in the event');
  }
  if (result === 'changed') publishQueue(log, spaceId);
};
