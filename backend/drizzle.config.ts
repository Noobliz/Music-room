import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '../.env' });
config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run Drizzle commands.');
}

export default defineConfig({
  // Folder, not the ./src/db/schema.ts barrel: drizzle-kit loads files as CommonJS
  // and cannot resolve the `.js` extension imports required by NodeNext
  schema: './src/db/schema',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Timestamped file names (YYYYMMDDHHMMSS_name.sql) expected by the Supabase CLI
  migrations: {
    prefix: 'supabase',
  },
  // Never touch Supabase-managed schemas (auth, storage, ...)
  schemaFilter: ['public'],
  // Do not recreate roles that Supabase already provides
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
  strict: true,
  verbose: true,
});
