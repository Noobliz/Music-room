import { and, asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { type AnyPgColumn } from 'drizzle-orm/pg-core';

import { db } from '../db/client.js';
import { friendships, profiles, type Friendship } from '../db/schema.js';

export type FriendshipStatus = Friendship['status'];

export type FriendshipWithUser = Pick<
  Friendship,
  'id' | 'requesterId' | 'createdAt' | 'acceptedAt'
> & {
  user: { id: string; username: string; avatarUrl: string | null };
};

export type UserSearchRow = {
  id: string;
  username: string;
  avatarUrl: string | null;
  friendshipId: string | null;
  requesterId: string | null;
  status: FriendshipStatus | null;
};

const betweenUsers = (a: string, b: string | AnyPgColumn) =>
  or(
    and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
    and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)),
  );

const involvesUser = (userId: string) =>
  or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId));

const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

export const findFriendshipBetween = async (
  a: string,
  b: string,
): Promise<Friendship | undefined> => {
  const [friendship] = await db.select().from(friendships).where(betweenUsers(a, b)).limit(1);
  return friendship;
};

export const insertFriendRequest = async (
  requesterId: string,
  addresseeId: string,
): Promise<Friendship> => {
  const [friendship] = await db
    .insert(friendships)
    .values({ requesterId, addresseeId })
    .returning();
  return friendship as Friendship;
};

export const acceptFriendRequest = async (
  id: string,
  addresseeId: string,
): Promise<Friendship | undefined> => {
  const [friendship] = await db
    .update(friendships)
    .set({ status: 'accepted', acceptedAt: sql`now()` })
    .where(
      and(
        eq(friendships.id, id),
        eq(friendships.addresseeId, addresseeId),
        eq(friendships.status, 'pending'),
      ),
    )
    .returning();
  return friendship;
};

export const deletePendingRequest = async (id: string, userId: string): Promise<boolean> => {
  const deleted = await db
    .delete(friendships)
    .where(and(eq(friendships.id, id), eq(friendships.status, 'pending'), involvesUser(userId)))
    .returning({ id: friendships.id });
  return deleted.length > 0;
};

export const deleteFriendship = async (userId: string, friendId: string): Promise<boolean> => {
  const deleted = await db
    .delete(friendships)
    .where(and(betweenUsers(userId, friendId), eq(friendships.status, 'accepted')))
    .returning({ id: friendships.id });
  return deleted.length > 0;
};

export const listFriendshipsOf = async (
  userId: string,
  status: FriendshipStatus,
): Promise<FriendshipWithUser[]> => {
  const otherUserId = sql`case when ${friendships.requesterId} = ${userId} then ${friendships.addresseeId} else ${friendships.requesterId} end`;
  return db
    .select({
      id: friendships.id,
      requesterId: friendships.requesterId,
      createdAt: friendships.createdAt,
      acceptedAt: friendships.acceptedAt,
      user: { id: profiles.id, username: profiles.username, avatarUrl: profiles.avatarUrl },
    })
    .from(friendships)
    .innerJoin(profiles, eq(profiles.id, otherUserId))
    .where(and(involvesUser(userId), eq(friendships.status, status)))
    .orderBy(asc(sql`lower(${profiles.username})`));
};

export const searchProfiles = async (
  userId: string,
  query: string,
  limit: number,
): Promise<UserSearchRow[]> => {
  const lowerUsername = sql`lower(${profiles.username})`;
  const lowerQuery = query.toLowerCase();
  return db
    .select({
      id: profiles.id,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      friendshipId: friendships.id,
      requesterId: friendships.requesterId,
      status: friendships.status,
    })
    .from(profiles)
    .leftJoin(friendships, betweenUsers(userId, profiles.id))
    .where(and(ilike(profiles.username, `%${escapeLikePattern(query)}%`), ne(profiles.id, userId)))
    .orderBy(
      desc(sql`${lowerUsername} = ${lowerQuery}`),
      desc(sql`starts_with(${lowerUsername}, ${lowerQuery})`),
      asc(lowerUsername),
    )
    .limit(limit);
};
