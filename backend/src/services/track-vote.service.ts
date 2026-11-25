import { type FastifyBaseLogger } from 'fastify';
import { db } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { selectQueue, insertProposal, setQueuedVote } from '../models/track-vote.model.js';
import { type EventQueue } from '../schemas/track-vote.schema.js';
import { isSubscribed, subscribersOf } from './realtime.service.js';
import {
  requireActionableSpace,
  requireViewableSpace,
  type AccessibleSpace,
} from './space-access.service.js';
import { toTrackView } from './track.service.js';
import { type AuthContext } from './token.service.js';

const requireEvent = (space: AccessibleSpace) => {
  if (space.kind !== 'event') throw new AppError(404, 'SPACE_NOT_FOUND', 'No event with this id');
};

export const listQueue = (auth: AuthContext, spaceId: string): Promise<EventQueue> =>
  db.transaction(
    async (tx) => {
      const space = await requireViewableSpace(auth, spaceId, tx);
      requireEvent(space);
      const rows = await selectQueue(tx, spaceId, auth.userId);
      return {
        version: space.version,
        items: rows.map(({ track, createdAt, ...proposal }) => ({
          ...proposal,
          track: toTrackView(track),
          createdAt: createdAt.toISOString(),
        })),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );

const publishQueue = (log: FastifyBaseLogger, spaceId: string): void => {
  for (const [connection] of subscribersOf(spaceId)) {
    listQueue(connection.auth, spaceId)
      .then(({ version, items }) => {
        if (isSubscribed(connection, spaceId)) {
          connection.send({ type: 'queue.updated', spaceId, version, data: { items } });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof AppError && error.code === 'SPACE_NOT_FOUND') return;
        log.error({ err: error, spaceId }, 'Queue notification failed');
      });
  }
};

export const proposeTrack = async (
  log: FastifyBaseLogger,
  auth: AuthContext,
  spaceId: string,
  trackId: string,
) => {
  requireEvent(await requireActionableSpace(auth, spaceId));
  let proposal;
  try {
    proposal = await insertProposal(spaceId, trackId, auth.userId);
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
  requireEvent(await requireActionableSpace(auth, spaceId));
  const result = await setQueuedVote(spaceId, proposalId, auth.userId, voted);
  if (result === 'missing') {
    throw new AppError(404, 'PROPOSAL_NOT_FOUND', 'No queued proposal with this id in the event');
  }
  if (result === 'changed') publishQueue(log, spaceId);
};
