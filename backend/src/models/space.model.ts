import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { db, type DbTransaction } from '../db/client.js';
import {
  eventVoteZones,
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

export type VoteZoneRow = Omit<typeof eventVoteZones.$inferSelect, 'spaceId'>;

export type VoteWindow = 'before' | 'open' | 'after';

export type SpaceRow = Space & {
  owner: SpaceUserRow;
  voteZone: VoteZoneRow | null;
  isInvited: boolean;
};

export type SpaceSearchResult = { rows: SpaceRow[]; total: number };

export type DbExecutor = Pick<typeof db, 'delete' | 'select'>;

export type SpaceInvitationRow = { user: SpaceUserRow; createdAt: Date };

export type SpaceMembers = {
  space: Omit<SpaceRow, 'isInvited'>;
  inviteeIds: Set<string>;
};

export type SpaceChanges = Partial<
  Pick<NewSpace, 'name' | 'description' | 'visibility' | 'accessMode'>
>;

const userColumns = {
  id: profiles.id,
  username: profiles.username,
  avatarUrl: profiles.avatarUrl,
};

const voteZoneColumns = {
  latitude: eventVoteZones.latitude,
  longitude: eventVoteZones.longitude,
  radiusMeters: eventVoteZones.radiusMeters,
  startsAt: eventVoteZones.startsAt,
  endsAt: eventVoteZones.endsAt,
  timeZone: eventVoteZones.timeZone,
};

const spaceColumns = { ...getTableColumns(spaces), owner: userColumns, voteZone: voteZoneColumns };

const isInvited = (userId: string): SQL<boolean> =>
  sql<boolean>`exists (select 1 from ${spaceInvitations} where ${spaceInvitations.spaceId} = ${spaces.id} and ${spaceInvitations.userId} = ${userId})`;

const selectSpaces = (userId: string, executor: DbExecutor = db) =>
  executor
    .select({ ...spaceColumns, isInvited: isInvited(userId) })
    .from(spaces)
    .innerJoin(profiles, eq(profiles.id, spaces.ownerId))
    .leftJoin(eventVoteZones, eq(eventVoteZones.spaceId, spaces.id));

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
  executor: DbExecutor = db,
): Promise<SpaceRow | undefined> => {
  const [space] = await selectSpaces(userId, executor).where(eq(spaces.id, spaceId)).limit(1);
  return space;
};

export const findLockedSpaceForUser = async (
  tx: DbTransaction,
  spaceId: string,
  userId: string,
  lock: 'share' | 'no key update',
): Promise<SpaceRow | undefined> => {
  const [space] = await tx
    .select(spaceColumns)
    .from(spaces)
    .innerJoin(profiles, eq(profiles.id, spaces.ownerId))
    .leftJoin(eventVoteZones, eq(eventVoteZones.spaceId, spaces.id))
    .where(eq(spaces.id, spaceId))
    .for(lock, { of: spaces });
  if (!space) return undefined;
  const [invitation] = await tx
    .select({ id: spaceInvitations.userId })
    .from(spaceInvitations)
    .where(and(eq(spaceInvitations.spaceId, spaceId), eq(spaceInvitations.userId, userId)))
    .for('share');
  return { ...space, isInvited: Boolean(invitation) };
};

const saveVoteZone = async (
  tx: DbTransaction,
  spaceId: string,
  zone: VoteZoneRow | null,
): Promise<void> => {
  if (!zone) {
    await tx.delete(eventVoteZones).where(eq(eventVoteZones.spaceId, spaceId));
    return;
  }
  await tx
    .insert(eventVoteZones)
    .values({ ...zone, spaceId })
    .onConflictDoUpdate({ target: eventVoteZones.spaceId, set: zone });
};

export const insertSpace = (values: NewSpace, zone: VoteZoneRow | null): Promise<Space> =>
  db.transaction(async (tx) => {
    const [space] = await tx.insert(spaces).values(values).returning();
    if (zone) await saveVoteZone(tx, (space as Space).id, zone);
    return space as Space;
  });

export const findVoteWindow = async (
  tx: DbTransaction,
  spaceId: string,
): Promise<VoteWindow | undefined> => {
  const localNow = sql`(now() at time zone ${eventVoteZones.timeZone})`;
  const [row] = await tx
    .select({
      window: sql<VoteWindow>`case when ${localNow} < ${eventVoteZones.startsAt} then 'before' when ${localNow} >= ${eventVoteZones.endsAt} then 'after' else 'open' end`,
    })
    .from(eventVoteZones)
    .where(eq(eventVoteZones.spaceId, spaceId));
  return row?.window;
};

export const findSpaceMembers = async (
  spaceId: string,
  executor: DbExecutor = db,
): Promise<SpaceMembers | undefined> => {
  const [[space], invitees] = await Promise.all([
    executor
      .select(spaceColumns)
      .from(spaces)
      .innerJoin(profiles, eq(profiles.id, spaces.ownerId))
      .leftJoin(eventVoteZones, eq(eventVoteZones.spaceId, spaces.id))
      .where(eq(spaces.id, spaceId))
      .limit(1),
    executor
      .select({ userId: spaceInvitations.userId })
      .from(spaceInvitations)
      .where(eq(spaceInvitations.spaceId, spaceId)),
  ]);
  return space && { space, inviteeIds: new Set(invitees.map(({ userId }) => userId)) };
};

export const updateSpace = async (
  tx: DbTransaction,
  spaceId: string,
  changes: SpaceChanges,
  zone: VoteZoneRow | null,
): Promise<void> => {
  await tx
    .update(spaces)
    .set({ ...changes, version: sql`${spaces.version} + 1` })
    .where(eq(spaces.id, spaceId));
  await saveVoteZone(tx, spaceId, zone);
};

export const deleteSpace = async (spaceId: string): Promise<number | undefined> => {
  const [deleted] = await db
    .delete(spaces)
    .where(eq(spaces.id, spaceId))
    .returning({ version: spaces.version });
  return deleted?.version;
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
  limit: number,
  offset: number,
): Promise<SpaceSearchResult> => {
  const where = and(or(eq(spaces.ownerId, userId), isInvited(userId)), ofKind(kind));
  const [rows, [totalRow]] = await Promise.all([
    selectSpaces(userId)
      .where(where)
      .orderBy(desc(spaces.updatedAt), asc(spaces.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(spaces).where(where),
  ]);
  return { rows, total: totalRow?.total ?? 0 };
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

const invitedToSpacesOf = (executor: DbExecutor, inviteeId: string, ownerId: string): SQL =>
  and(
    eq(spaceInvitations.userId, inviteeId),
    inArray(
      spaceInvitations.spaceId,
      executor.select({ id: spaces.id }).from(spaces).where(eq(spaces.ownerId, ownerId)),
    ),
  ) as SQL;

export const deleteInvitationsBetween = async (
  executor: DbExecutor,
  a: string,
  b: string,
): Promise<string[]> => {
  const deleted = await executor
    .delete(spaceInvitations)
    .where(or(invitedToSpacesOf(executor, a, b), invitedToSpacesOf(executor, b, a)))
    .returning({ spaceId: spaceInvitations.spaceId });
  return deleted.map(({ spaceId }) => spaceId);
};
