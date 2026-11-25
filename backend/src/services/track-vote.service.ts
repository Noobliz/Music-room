import { AppError } from '../errors/app-error.js';
import { selectQueue, insertProposal, setQueuedVote } from '../models/track-vote.model.js';
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

export const listQueue = async (auth: AuthContext, spaceId: string) => {
  requireEvent(await requireViewableSpace(auth, spaceId));
  const rows = await selectQueue(spaceId, auth.userId);
  return {
    items: rows.map(({ track, createdAt, ...proposal }) => ({
      ...proposal,
      track: toTrackView(track),
      createdAt: createdAt.toISOString(),
    })),
  };
};

export const proposeTrack = async (auth: AuthContext, spaceId: string, trackId: string) => {
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
  return proposal;
};

export const setVote = async (
  auth: AuthContext,
  spaceId: string,
  proposalId: string,
  voted: boolean,
) => {
  requireEvent(await requireActionableSpace(auth, spaceId));
  if (!(await setQueuedVote(spaceId, proposalId, auth.userId, voted))) {
    throw new AppError(404, 'PROPOSAL_NOT_FOUND', 'No queued proposal with this id in the event');
  }
};
