import { type FastifyBaseLogger } from 'fastify';

import { isUniqueViolation } from '../db/errors.js';
import { AppError } from '../errors/app-error.js';
import { areFriends, findProfileById } from '../models/profile.model.js';
import {
  deleteInvitation,
  deleteSpace as deleteSpaceRow,
  findSpaceMembers,
  insertInvitation,
  insertSpace,
  listInvitations as listInvitationRows,
  listSpacesOf,
  searchPublicSpaces,
  type SpaceInvitationRow,
  type SpaceRow,
  updateSpace as updateSpaceRow,
  type VoteZoneRow,
} from '../models/space.model.js';
import { db } from '../db/client.js';
import {
  type CreateSpaceBody,
  type MySpacesQuery,
  type SpaceAccessMode,
  type SpaceKind,
  type SpaceInvitationView,
  type SpacePage,
  type SpaceSearchQuery,
  type SpaceView,
  type UpdateSpaceBody,
} from '../schemas/space.schema.js';
import * as realtime from './realtime.service.js';
import { type VoteZoneInput } from '../schemas/vote-zone.schema.js';
import {
  requireLockedSpace,
  requireOwnerRole,
  requireSpaceOwner,
  requireViewableSpace,
  resolveAccess,
  toVoteZoneView,
} from './space-access.service.js';
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
    voteZone: space.voteZone && toVoteZoneView(space.voteZone),
    version: space.version,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
};

const notifySubscribers = async (spaceId: string, spaceChanged: boolean): Promise<void> => {
  const subscribers = realtime.subscribersOf(spaceId);
  const members = subscribers.length > 0 ? await findSpaceMembers(spaceId) : undefined;
  if (!members) {
    return;
  }
  const { space, inviteeIds } = members;
  for (const [connection, previous] of subscribers) {
    const { userId } = connection.auth;
    const row = { ...space, isInvited: inviteeIds.has(userId) };
    const access = resolveAccess(row, userId, row.isInvited);
    if (!access.canView) {
      realtime.unsubscribe(connection, spaceId);
      connection.send({
        type: 'space.access_revoked',
        spaceId,
        version: space.version,
        data: null,
      });
    } else if (spaceChanged || access.role !== previous.role || access.canAct !== previous.canAct) {
      realtime.updateSubscriberAccess(connection, spaceId, access);
      connection.send({
        type: 'space.updated',
        spaceId,
        version: space.version,
        data: toSpaceView(row, userId),
      });
    }
  }
};

const notifyInBackground = (
  log: FastifyBaseLogger,
  spaceId: string,
  spaceChanged: boolean,
): void => {
  notifySubscribers(spaceId, spaceChanged).catch((error: unknown) => {
    log.error({ err: error, spaceId }, 'Realtime notification failed');
  });
};

export const notifyAccessChanged = (log: FastifyBaseLogger, spaceIds: string[]): void => {
  for (const spaceId of spaceIds) {
    notifyInBackground(log, spaceId, false);
  }
};

const toInvitationView = ({ user, createdAt }: SpaceInvitationRow): SpaceInvitationView => ({
  user,
  invitedAt: createdAt.toISOString(),
});

const resolveVoteZone = (
  kind: SpaceKind,
  accessMode: SpaceAccessMode,
  current: VoteZoneRow | null,
  requested: VoteZoneInput | undefined,
): VoteZoneRow | null => {
  if (accessMode === 'location_time' && kind !== 'event') {
    throw new AppError(400, 'VOTE_ZONE_NOT_ALLOWED', 'Only events can use the location_time mode');
  }
  if (accessMode !== 'location_time') {
    if (requested) {
      throw new AppError(
        400,
        'VOTE_ZONE_NOT_ALLOWED',
        'A vote zone only applies to the location_time mode',
      );
    }
    return null;
  }
  const zone = requested ?? current;
  if (!zone) {
    throw new AppError(
      400,
      'VOTE_ZONE_REQUIRED',
      'The location_time mode needs a vote zone (place, radius and time slot)',
    );
  }
  return zone;
};

export const createSpace = async (auth: AuthContext, body: CreateSpaceBody): Promise<SpaceView> => {
  const voteZone = resolveVoteZone(body.kind, body.accessMode, null, body.voteZone);
  const space = await insertSpace(
    {
      kind: body.kind,
      ownerId: auth.userId,
      name: body.name,
      description: body.description ?? null,
      visibility: body.visibility,
      accessMode: body.accessMode,
    },
    voteZone,
  );
  return getSpace(auth, space.id);
};

export const getSpace = async (auth: AuthContext, spaceId: string): Promise<SpaceView> => {
  return toSpaceView(await requireViewableSpace(auth, spaceId), auth.userId);
};

export const updateSpace = async (
  log: FastifyBaseLogger,
  auth: AuthContext,
  spaceId: string,
  body: UpdateSpaceBody,
): Promise<SpaceView> => {
  const { voteZone, ...changes } = body;
  await db.transaction(async (tx) => {
    const space = await requireLockedSpace(tx, auth, spaceId, 'no key update');
    requireOwnerRole(space);
    const accessMode = changes.accessMode ?? space.accessMode;
    const zone = resolveVoteZone(space.kind, accessMode, space.voteZone, voteZone);
    await updateSpaceRow(tx, spaceId, changes, zone);
  });
  notifyInBackground(log, spaceId, true);
  return getSpace(auth, spaceId);
};

export const deleteSpace = async (auth: AuthContext, spaceId: string): Promise<void> => {
  await requireSpaceOwner(auth, spaceId);
  const version = await deleteSpaceRow(spaceId);
  if (version !== undefined) {
    realtime.closeSpace(spaceId, {
      type: 'space.deleted',
      spaceId,
      version: version + 1,
      data: null,
    });
  }
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
  { kind, limit, offset }: MySpacesQuery,
): Promise<SpacePage> => {
  const { rows, total } = await listSpacesOf(userId, kind, limit, offset);
  return { items: rows.map((row) => toSpaceView(row, userId)), total, limit, offset };
};

export const listInvitations = async (
  auth: AuthContext,
  spaceId: string,
): Promise<SpaceInvitationView[]> => {
  await requireSpaceOwner(auth, spaceId);
  return (await listInvitationRows(spaceId)).map(toInvitationView);
};

export const inviteToSpace = async (
  log: FastifyBaseLogger,
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

  const invitation = await insertInvitation(spaceId, inviteeId, auth.userId).catch(
    (error: unknown) => {
      if (isUniqueViolation(error)) {
        throw new AppError(409, 'ALREADY_INVITED', 'This user is already invited to this space');
      }
      throw error;
    },
  );
  notifyAccessChanged(log, [spaceId]);
  return toInvitationView({
    user: { id: invitee.id, username: invitee.username, avatarUrl: invitee.avatarUrl },
    createdAt: invitation.createdAt,
  });
};

export const removeInvitation = async (
  log: FastifyBaseLogger,
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
  notifyAccessChanged(log, [spaceId]);
};
