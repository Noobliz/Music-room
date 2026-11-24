import { type Space } from '../db/schema.js';
import { AppError } from '../errors/app-error.js';
import { findSpaceForUser, type SpaceRow } from '../models/space.model.js';
import { type SpaceRole } from '../schemas/space.schema.js';
import { type AuthContext } from './token.service.js';

export type SpaceAccess = {
  role: SpaceRole;
  canView: boolean;
  canAct: boolean;
};

export type AccessibleSpace = SpaceRow & { access: SpaceAccess };

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
  return { role: 'none', canView, canAct: canView && space.accessMode === 'everyone' };
};

export const requireViewableSpace = async (
  { userId }: AuthContext,
  spaceId: string,
): Promise<AccessibleSpace> => {
  const space = await findSpaceForUser(spaceId, userId);
  const access = space && resolveAccess(space, userId, space.isInvited);
  if (!space || !access?.canView) {
    throw new AppError(404, 'SPACE_NOT_FOUND', `No space with id ${spaceId}`);
  }
  return { ...space, access };
};

export const requireActionableSpace = async (
  auth: AuthContext,
  spaceId: string,
): Promise<AccessibleSpace> => {
  const space = await requireViewableSpace(auth, spaceId);
  if (!space.access.canAct) {
    throw new AppError(
      403,
      'SPACE_ACTION_FORBIDDEN',
      'Only the owner and invited users can act in this space',
    );
  }
  return space;
};

export const requireSpaceOwner = async (
  auth: AuthContext,
  spaceId: string,
): Promise<AccessibleSpace> => {
  const space = await requireViewableSpace(auth, spaceId);
  if (space.access.role !== 'owner') {
    throw new AppError(403, 'NOT_SPACE_OWNER', 'Only the owner can manage this space');
  }
  return space;
};
