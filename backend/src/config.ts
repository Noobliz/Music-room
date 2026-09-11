import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv({ path: '../.env' });
loadEnv();

const portSchema = z.coerce.number().int().min(1).max(65535);

const envSchema = z.object({
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: portSchema.default(3000),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: portSchema,
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  DATABASE_URL: z.string().url(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid server configuration: ${details}`);
}

export const appConfig = {
  api: {
    host: parsedEnv.data.API_HOST,
    port: parsedEnv.data.API_PORT,
  },
  database: {
    url: parsedEnv.data.DATABASE_URL,
    host: parsedEnv.data.POSTGRES_HOST,
    port: parsedEnv.data.POSTGRES_PORT,
    name: parsedEnv.data.POSTGRES_DB,
    user: parsedEnv.data.POSTGRES_USER,
  },
} as const;
