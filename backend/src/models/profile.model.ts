import { eq, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import { profiles, type Profile } from '../db/schema.js';

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
