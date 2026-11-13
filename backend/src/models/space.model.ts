import { and, asc, count, desc, eq, getTableColumns, ilike, or, sql, type SQL } from 'drizzle-orm';

import { db } from '../db/client.js';
import {
  type NewSpace,
  profiles,
  type Space,
  type SpaceInvitation,
  spaceInvitations,
  spaces,
} from '../db/schema.js';
import { escapeLikePattern } from '../lib/sql.js';

export type SpaceKind = Space['kind'];

export type SpaceUserRow = { id: string; username: string; avatarUrl: string | null };

export type SpaceRow = Space & { owner: SpaceUserRow; isInvited: boolean };

export type SpaceSearchResult = { rows: SpaceRow[]; total: number };

export type SpaceInvitationRow = { user: SpaceUserRow; createdAt: Date };

export type SpaceChanges = Partial<
  Pick<NewSpace, 'name' | 'description' | 'visibility' | 'accessMode'>
>;

const userColumns = {
  id: profiles.id,
  username: profiles.username,
  avatarUrl: profiles.avatarUrl,
};

const isInvited = (userId: string): SQL<boolean> =>
  sql<boolean>`exists (select 1 from ${spaceInvitations} where ${spaceInvitations.spaceId} = ${spaces.id} and ${spaceInvitations.userId} = ${userId})`;

const selectSpaces = (userId: string) =>
  db
    .select({ ...getTableColumns(spaces), owner: userColumns, isInvited: isInvited(userId) })
    .from(spaces)
    .innerJoin(profiles, eq(profiles.id, spaces.ownerId));

const ofKind = (kind: SpaceKind | undefined): SQL | undefined =>
  kind === undefined ? undefined : eq(spaces.kind, kind);

const searchOrder = (query: string | undefined): SQL[] => {
  if (query === undefined) {
    return [desc(spaces.createdAt), asc(spaces.id)];
  }
  const lowerName = sql`lower(${spaces.name})`;
  const lowerQuery = query.toLowerCase();
  return [
    desc(sql`${lowerName} = ${lowerQuery}`),
    desc(sql`starts_with(${lowerName}, ${lowerQuery})`),
    asc(lowerName),
    asc(spaces.id),
  ];
};

export const findSpaceForUser = async (
  spaceId: string,
  userId: string,
): Promise<SpaceRow | undefined> => {
  const [space] = await selectSpaces(userId).where(eq(spaces.id, spaceId)).limit(1);
  return space;
};

export const insertSpace = async (values: NewSpace): Promise<Space> => {
  const [space] = await db.insert(spaces).values(values).returning();
  return space as Space;
};

export const updateSpace = async (spaceId: string, changes: SpaceChanges): Promise<void> => {
  await db.update(spaces).set(changes).where(eq(spaces.id, spaceId));
};

export const deleteSpace = async (spaceId: string): Promise<void> => {
  await db.delete(spaces).where(eq(spaces.id, spaceId));
};

export const searchPublicSpaces = async (
  userId: string,
  query: string | undefined,
  kind: SpaceKind | undefined,
  limit: number,
  offset: number,
): Promise<SpaceSearchResult> => {
  const where = and(
    eq(spaces.visibility, 'public'),
    ofKind(kind),
    query === undefined ? undefined : ilike(spaces.name, `%${escapeLikePattern(query)}%`),
  );
  const [rows, [totalRow]] = await Promise.all([
    selectSpaces(userId)
      .where(where)
      .orderBy(...searchOrder(query))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(spaces).where(where),
  ]);
  return { rows, total: totalRow?.total ?? 0 };
};

export const listSpacesOf = async (
  userId: string,
  kind: SpaceKind | undefined,
): Promise<SpaceRow[]> => {
  return selectSpaces(userId)
    .where(and(or(eq(spaces.ownerId, userId), isInvited(userId)), ofKind(kind)))
    .orderBy(desc(spaces.updatedAt), asc(spaces.id));
};

export const listInvitations = async (spaceId: string): Promise<SpaceInvitationRow[]> => {
  return db
    .select({ user: userColumns, createdAt: spaceInvitations.createdAt })
    .from(spaceInvitations)
    .innerJoin(profiles, eq(profiles.id, spaceInvitations.userId))
    .where(eq(spaceInvitations.spaceId, spaceId))
    .orderBy(asc(sql`lower(${profiles.username})`));
};

export const insertInvitation = async (
  spaceId: string,
  userId: string,
  invitedBy: string,
): Promise<SpaceInvitation> => {
  const [invitation] = await db
    .insert(spaceInvitations)
    .values({ spaceId, userId, invitedBy })
    .returning();
  return invitation as SpaceInvitation;
};

export const deleteInvitation = async (spaceId: string, userId: string): Promise<boolean> => {
  const deleted = await db
    .delete(spaceInvitations)
    .where(and(eq(spaceInvitations.spaceId, spaceId), eq(spaceInvitations.userId, userId)))
    .returning({ userId: spaceInvitations.userId });
  return deleted.length > 0;
};
