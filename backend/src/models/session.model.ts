import { sql } from 'drizzle-orm';

import { db } from '../db/client.js';

export const isSessionActive = async (sessionId: string, userId: string): Promise<boolean> => {
  const rows = await db.execute(sql`
    select 1
    from auth.sessions
    where id = ${sessionId}
      and user_id = ${userId}
      and (not_after is null or not_after > now())
    limit 1
  `);
  return rows.length > 0;
};
