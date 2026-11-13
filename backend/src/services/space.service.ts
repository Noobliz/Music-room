import { isUniqueViolation } from '../db/errors.js';
import { AppError } from '../errors/app-error.js';
import { areFriends, findProfileById } from '../models/profile.model.js';
import {
  deleteInvitation,
  deleteSpace as deleteSpaceRow,
  insertInvitation,
  insertSpace,
  listInvitations as listInvitationRows,
  listSpacesOf,
  searchPublicSpaces,
  type SpaceInvitationRow,
  type SpaceRow,
  updateSpace as updateSpaceRow,
} from '../models/space.model.js';
import {
  type CreateSpaceBody,
  type MySpacesQuery,
  type SpaceInvitationView,
  type SpacePage,
  type SpaceSearchQuery,
  type SpaceView,
  type UpdateSpaceBody,
} from '../schemas/space.schema.js';
import { requireSpaceOwner, requireViewableSpace, resolveAccess } from './space-access.service.js';
import { type AuthContext } from './token.service.js';

const toSpaceView = (space: SpaceRow, userId: string): SpaceView => {
  const { role, canAct } = resolveAccess(space, userId, space.isInvited);
  return {
    id: space.id,
    kind: space.kind,
    name: space.name,
    description: space.description,
    visibility: space.visibility,
    accessMode: space.accessMode,
    owner: space.owner,
    myRole: role,
    canAct,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
};

const toInvitationView = ({ user, createdAt }: SpaceInvitationRow): SpaceInvitationView => ({
  user,
  invitedAt: createdAt.toISOString(),
});

export const createSpace = async (auth: AuthContext, body: CreateSpaceBody): Promise<SpaceView> => {
  const space = await insertSpace({
    kind: body.kind,
    ownerId: auth.userId,
    name: body.name,
    description: body.description ?? null,
    visibility: body.visibility,
    accessMode: body.accessMode,
  });
  return getSpace(auth, space.id);
};

export const getSpace = async (auth: AuthContext, spaceId: string): Promise<SpaceView> => {
  return toSpaceView(await requireViewableSpace(auth, spaceId), auth.userId);
};

export const updateSpace = async (
  auth: AuthContext,
  spaceId: string,
  body: UpdateSpaceBody,
): Promise<SpaceView> => {
  await requireSpaceOwner(auth, spaceId);
  await updateSpaceRow(spaceId, body);
  return getSpace(auth, spaceId);
};

export const deleteSpace = async (auth: AuthContext, spaceId: string): Promise<void> => {
  await requireSpaceOwner(auth, spaceId);
  await deleteSpaceRow(spaceId);
};

export const searchSpaces = async (
  { userId }: AuthContext,
  { q, kind, limit, offset }: SpaceSearchQuery,
): Promise<SpacePage> => {
  const { rows, total } = await searchPublicSpaces(userId, q, kind, limit, offset);
  return { items: rows.map((row) => toSpaceView(row, userId)), total, limit, offset };
};

export const listMySpaces = async (
  { userId }: AuthContext,
  { kind }: MySpacesQuery,
): Promise<SpaceView[]> => {
  return (await listSpacesOf(userId, kind)).map((row) => toSpaceView(row, userId));
};

export const listInvitations = async (
  auth: AuthContext,
  spaceId: string,
): Promise<SpaceInvitationView[]> => {
  await requireSpaceOwner(auth, spaceId);
  return (await listInvitationRows(spaceId)).map(toInvitationView);
};

export const inviteToSpace = async (
  auth: AuthContext,
  spaceId: string,
  inviteeId: string,
): Promise<SpaceInvitationView> => {
  await requireSpaceOwner(auth, spaceId);
  if (inviteeId === auth.userId) {
    throw new AppError(400, 'CANNOT_INVITE_SELF', 'You cannot invite yourself to your own space');
  }
  const invitee = await findProfileById(inviteeId);
  if (!invitee) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', `No profile with id ${inviteeId}`);
  }
  if (!(await areFriends(auth.userId, inviteeId))) {
    throw new AppError(403, 'INVITEE_NOT_FRIEND', 'You can only invite your friends');
  }

  try {
    const invitation = await insertInvitation(spaceId, inviteeId, auth.userId);
    return toInvitationView({
      user: { id: invitee.id, username: invitee.username, avatarUrl: invitee.avatarUrl },
      createdAt: invitation.createdAt,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'ALREADY_INVITED', 'This user is already invited to this space');
    }
    throw error;
  }
};

export const removeInvitation = async (
  auth: AuthContext,
  spaceId: string,
  inviteeId: string,
): Promise<void> => {
  const space = await requireViewableSpace(auth, spaceId);
  if (space.access.role !== 'owner' && inviteeId !== auth.userId) {
    throw new AppError(
      403,
      'NOT_SPACE_OWNER',
      'Only the owner can remove the invitation of another user',
    );
  }
  if (!(await deleteInvitation(spaceId, inviteeId))) {
    throw new AppError(404, 'SPACE_INVITATION_NOT_FOUND', 'This user is not invited to this space');
  }
};
