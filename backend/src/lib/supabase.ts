import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { appConfig } from '../config.js';

const buildClient = (key: string, accessToken?: string): SupabaseClient =>
  createClient(appConfig.supabase.url, key, {
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

export const createSupabaseClient = (): SupabaseClient =>
  buildClient(appConfig.supabase.publishableKey);

export const createSupabaseClientAsUser = (accessToken: string): SupabaseClient =>
  buildClient(appConfig.supabase.publishableKey, accessToken);

export const createSupabaseAdminClient = (): SupabaseClient => {
  const { secretKey } = appConfig.supabase;
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is required to write to the catalog buckets.');
  }
  return buildClient(secretKey);
};
