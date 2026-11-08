import { isUniqueViolation } from '../db/errors.js';
import { AppError } from '../errors/app-error.js';
import {
  acceptFriendRequest as acceptPendingRequest,
  deleteFriendship,
  deletePendingRequest,
  findFriendshipBetween,
  type FriendshipWithUser,
  insertFriendRequest,
  listFriendshipsOf,
  searchProfiles,
  type UserSearchRow,
} from '../models/friendship.model.js';
import { findProfileById } from '../models/profile.model.js';
import {
  type Friend,
  type FriendRequest,
  type FriendRequests,
  type FriendUser,
  USER_SEARCH_LIMIT,
  type UserSearchResult,
} from '../schemas/friend.schema.js';
import { type AuthContext } from './token.service.js';

const requireUser = async (id: string): Promise<FriendUser> => {
  const profile = await findProfileById(id);
  if (!profile) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', `No profile with id ${id}`);
  }
  return { id: profile.id, username: profile.username, avatarUrl: profile.avatarUrl };
};

const toFriend = ({ user, acceptedAt }: FriendshipWithUser): Friend => ({
  user,
  friendsSince: (acceptedAt as Date).toISOString(),
});

const toFriendRequest = ({ id, user, createdAt }: FriendshipWithUser): FriendRequest => ({
  id,
  user,
  createdAt: createdAt.toISOString(),
});

const toRelationship = (
  userId: string,
  row: UserSearchRow,
): Pick<UserSearchResult, 'relationship' | 'requestId'> => {
  if (row.status === 'accepted') {
    return { relationship: 'friend', requestId: null };
  }
  if (row.status === 'pending') {
    return {
      relationship: row.requesterId === userId ? 'request_sent' : 'request_received',
      requestId: row.friendshipId,
    };
  }
  return { relationship: 'none', requestId: null };
};

const throwExistingFriendship = (status: 'pending' | 'accepted'): never => {
  if (status === 'accepted') {
    throw new AppError(409, 'ALREADY_FRIENDS', 'You are already friends with this user');
  }
  throw new AppError(
    409,
    'FRIEND_REQUEST_EXISTS',
    'A friend request already exists with this user',
  );
};

export const listFriends = async ({ userId }: AuthContext): Promise<Friend[]> => {
  return (await listFriendshipsOf(userId, 'accepted')).map(toFriend);
};

export const listFriendRequests = async ({ userId }: AuthContext): Promise<FriendRequests> => {
  const pending = await listFriendshipsOf(userId, 'pending');
  return {
    received: pending.filter((request) => request.requesterId !== userId).map(toFriendRequest),
    sent: pending.filter((request) => request.requesterId === userId).map(toFriendRequest),
  };
};

export const sendFriendRequest = async (
  { userId }: AuthContext,
  addresseeId: string,
): Promise<FriendRequest> => {
  if (addresseeId === userId) {
    throw new AppError(400, 'CANNOT_FRIEND_SELF', 'You cannot send a friend request to yourself');
  }
  const user = await requireUser(addresseeId);

  const existing = await findFriendshipBetween(userId, addresseeId);
  if (existing) {
    throwExistingFriendship(existing.status);
  }

  try {
    const request = await insertFriendRequest(userId, addresseeId);
    return toFriendRequest({ ...request, user });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throwExistingFriendship('pending');
    }
    throw error;
  }
};

export const acceptFriendRequest = async (
  { userId }: AuthContext,
  requestId: string,
): Promise<Friend> => {
  const friendship = await acceptPendingRequest(requestId, userId);
  if (!friendship) {
    throw new AppError(404, 'FRIEND_REQUEST_NOT_FOUND', 'No pending friend request with this id');
  }
  return toFriend({ ...friendship, user: await requireUser(friendship.requesterId) });
};

export const deleteFriendRequest = async (
  { userId }: AuthContext,
  requestId: string,
): Promise<void> => {
  if (!(await deletePendingRequest(requestId, userId))) {
    throw new AppError(404, 'FRIEND_REQUEST_NOT_FOUND', 'No pending friend request with this id');
  }
};

export const removeFriend = async ({ userId }: AuthContext, friendId: string): Promise<void> => {
  if (!(await deleteFriendship(userId, friendId))) {
    throw new AppError(404, 'FRIEND_NOT_FOUND', 'This user is not your friend');
  }
};

export const searchUsers = async (
  { userId }: AuthContext,
  query: string,
): Promise<UserSearchResult[]> => {
  const rows = await searchProfiles(userId, query, USER_SEARCH_LIMIT);
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
    ...toRelationship(userId, row),
  }));
};
