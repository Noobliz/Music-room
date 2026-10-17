import { and, eq, ne, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import { profiles, type Profile } from '../db/schema.js';

export type ProfileChanges = Partial<Pick<Profile, 'username' | 'bio' | 'avatarUrl'>>;

export const findProfileById = async (id: string): Promise<Profile | undefined> => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return profile;
};

export const findProfileByUsername = async (username: string): Promise<Profile | undefined> => {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(sql`lower(${profiles.username})`, username.toLowerCase()))
    .limit(1);
  return profile;
};

export const isUsernameTakenByOther = async (username: string, id: string): Promise<boolean> => {
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(sql`lower(${profiles.username})`, username.toLowerCase()), ne(profiles.id, id)))
    .limit(1);
  return profile !== undefined;
};

export const updateProfile = async (
  id: string,
  changes: ProfileChanges,
): Promise<Profile | undefined> => {
  const [profile] = await db.update(profiles).set(changes).where(eq(profiles.id, id)).returning();
  return profile;
};

export const areFriends = async (a: string, b: string): Promise<boolean> => {
  const [row] = await db.execute<{ are_friends: boolean }>(
    sql`select public.are_friends(${a}, ${b}) as are_friends`,
  );
  return row?.are_friends === true;
};
