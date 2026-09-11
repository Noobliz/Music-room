import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { appConfig } from '../config.js';

export const postgresClient = postgres(appConfig.database.url, {
  max: 10,
});

export const db = drizzle({ client: postgresClient });

export const checkDatabaseConnection = async (): Promise<void> => {
  await db.execute(sql`select 1`);
};

export const closeDatabaseConnection = async (): Promise<void> => {
  await postgresClient.end();
};
