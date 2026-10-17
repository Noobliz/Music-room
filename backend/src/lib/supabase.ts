import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { appConfig } from '../config.js';

export const createSupabaseClient = (): SupabaseClient =>
  createClient(appConfig.supabase.url, appConfig.supabase.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

export const createSupabaseClientAsUser = (accessToken: string): SupabaseClient =>
  createClient(appConfig.supabase.url, appConfig.supabase.publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
