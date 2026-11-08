import { eq } from 'drizzle-orm';
import { authUsers } from 'drizzle-orm/supabase';

import { db } from '../db/client.js';

export const deleteUserById = async (id: string): Promise<void> => {
  await db.delete(authUsers).where(eq(authUsers.id, id));
};
