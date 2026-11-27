import { type DbTransaction } from '../db/client.js';
import { type Space } from '../db/schema.js';
import { AppError } from '../errors/app-error.js';
import { distanceInMeters } from '../lib/geo.js';
import {
  findLockedSpaceForUser,
  findSpaceForUser,
  findVoteWindow,
  type DbExecutor,
  type SpaceRow,
  type VoteZoneRow,
} from '../models/space.model.js';
import { type SpaceRole } from '../schemas/space.schema.js';
import { type Position, type VoteZoneView } from '../schemas/vote-zone.schema.js';
import { type AuthContext } from './token.service.js';

export type SpaceAccess = {
  role: SpaceRole;
  canView: boolean;
  canAct: boolean;
};

export type AccessibleSpace = SpaceRow & { access: SpaceAccess };

export const toVoteZoneView = (zone: VoteZoneRow): VoteZoneView => ({
  ...zone,
  startsAt: zone.startsAt.replace(' ', 'T'),
  endsAt: zone.endsAt.replace(' ', 'T'),
});

export const resolveAccess = (
  space: Pick<Space, 'ownerId' | 'visibility' | 'accessMode'>,
  userId: string,
  isInvited: boolean,
): SpaceAccess => {
  if (space.ownerId === userId) {
    return { role: 'owner', canView: true, canAct: true };
  }
  if (isInvited) {
    return { role: 'invited', canView: true, canAct: true };
  }
  const canView = space.visibility === 'public';
  return { role: 'none', canView, canAct: canView && space.accessMode !== 'invited_only' };
};

const viewableSpace = (
  space: SpaceRow | undefined,
  spaceId: string,
  userId: string,
): AccessibleSpace => {
  const access = space && resolveAccess(space, userId, space.isInvited);
  if (!space || !access?.canView) {
    throw new AppError(404, 'SPACE_NOT_FOUND', `No space with id ${spaceId}`);
  }
  return { ...space, access };
};

export const requireViewableSpace = async (
  { userId }: AuthContext,
  spaceId: string,
  executor?: DbExecutor,
): Promise<AccessibleSpace> =>
  viewableSpace(await findSpaceForUser(spaceId, userId, executor), spaceId, userId);

export const requireLockedSpace = async (
  tx: DbTransaction,
  { userId }: AuthContext,
  spaceId: string,
  lock: 'share' | 'no key update',
): Promise<AccessibleSpace> =>
  viewableSpace(await findLockedSpaceForUser(tx, spaceId, userId, lock), spaceId, userId);

export const requireActionableSpace = (space: AccessibleSpace): void => {
  if (!space.access.canAct) {
    throw new AppError(
      403,
      'SPACE_ACTION_FORBIDDEN',
      'Only the owner and invited users can act in this space',
    );
  }
};

export const requireOwnerRole = (space: AccessibleSpace): void => {
  if (space.access.role !== 'owner') {
    throw new AppError(403, 'NOT_SPACE_OWNER', 'Only the owner can manage this space');
  }
};

export const requireSpaceOwner = async (
  auth: AuthContext,
  spaceId: string,
): Promise<AccessibleSpace> => {
  const space = await requireViewableSpace(auth, spaceId);
  requireOwnerRole(space);
  return space;
};

export const requirePresence = async (
  tx: DbTransaction,
  space: AccessibleSpace,
  position: Position | undefined,
): Promise<void> => {
  if (space.accessMode !== 'location_time' || space.access.role === 'owner') return;
  const zone = space.voteZone && toVoteZoneView(space.voteZone);
  const window = zone && (await findVoteWindow(tx, space.id));
  if (!zone || !window) {
    throw new AppError(403, 'SPACE_ACTION_FORBIDDEN', 'This event has no voting zone');
  }
  if (window === 'before') {
    throw new AppError(
      403,
      'VOTE_NOT_STARTED',
      `Voting opens at ${zone.startsAt} (${zone.timeZone})`,
    );
  }
  if (window === 'after') {
    throw new AppError(
      403,
      'VOTE_ENDED',
      `Voting closed at ${zone.endsAt} (${zone.timeZone})`,
    );
  }
  if (!position) {
    throw new AppError(400, 'POSITION_REQUIRED', 'Send your position to act in this event');
  }
  const distance = distanceInMeters(position, zone);
  if (distance > zone.radiusMeters) {
    throw new AppError(
      403,
      'OUTSIDE_VOTE_ZONE',
      `You are ${Math.round(distance)} m from the event, voting is limited to ${zone.radiusMeters} m`,
    );
  }
};
