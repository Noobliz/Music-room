import {
  isAuthApiError,
  type Session as SupabaseSession,
  type User as SupabaseUser,
} from '@supabase/supabase-js';

import { AppError } from '../errors/app-error.js';
import { createSupabaseClient } from '../lib/supabase.js';
import { findProfileById, findProfileByUsername } from '../models/profile.model.js';
import { type AuthContext } from './token.service.js';
import {
  type AuthResponse,
  type AuthUser,
  type LoginBody,
  type RefreshBody,
  type Session,
  type SignupBody,
} from '../schemas/auth.schema.js';

const EMAIL_TAKEN_CODES = new Set(['email_exists', 'user_already_exists']);
const INVALID_REFRESH_TOKEN_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'session_not_found',
  'session_expired',
]);
const RATE_LIMIT_CODES = new Set(['over_request_rate_limit', 'over_email_send_rate_limit']);

const toCommonAppError = (error: unknown): AppError | undefined => {
  if (!isAuthApiError(error)) {
    return undefined;
  }
  if (error.code !== undefined && RATE_LIMIT_CODES.has(error.code)) {
    return new AppError(429, 'RATE_LIMITED', 'Too many requests, try again later');
  }
  if (error.code === 'weak_password') {
    return new AppError(400, 'VALIDATION_ERROR', error.message);
  }
  return undefined;
};

const toSession = (session: SupabaseSession): Session => ({
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  tokenType: 'bearer',
  expiresIn: session.expires_in,
  expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
});

const buildAuthUser = async (id: string, email: string | undefined): Promise<AuthUser> => {
  const profile = await findProfileById(id);
  if (!profile) {
    throw new Error(`Profile missing for user ${id}`);
  }
  if (!email) {
    throw new Error(`Email missing for user ${id}`);
  }
  return { id, email, username: profile.username };
};

const toAuthResponse = async (
  user: SupabaseUser | null,
  session: SupabaseSession | null,
): Promise<AuthResponse> => {
  if (!user || !session) {
    throw new Error('Supabase Auth returned no session');
  }
  return { user: await buildAuthUser(user.id, user.email), session: toSession(session) };
};

export const signUp = async ({ email, password, username }: SignupBody): Promise<AuthResponse> => {
  if (await findProfileByUsername(username)) {
    throw new AppError(409, 'USERNAME_TAKEN', 'Username already taken');
  }

  const { data, error } = await createSupabaseClient().auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    if (isAuthApiError(error) && error.code !== undefined && EMAIL_TAKEN_CODES.has(error.code)) {
      throw new AppError(409, 'EMAIL_TAKEN', 'Email already registered');
    }
    throw toCommonAppError(error) ?? error;
  }

  return toAuthResponse(data.user, data.session);
};

export const logIn = async ({ email, password }: LoginBody): Promise<AuthResponse> => {
  const { data, error } = await createSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (isAuthApiError(error) && error.code === 'invalid_credentials') {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    throw toCommonAppError(error) ?? error;
  }

  return toAuthResponse(data.user, data.session);
};

export const refresh = async ({ refreshToken }: RefreshBody): Promise<AuthResponse> => {
  const { data, error } = await createSupabaseClient().auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    if (
      isAuthApiError(error) &&
      ((error.code !== undefined && INVALID_REFRESH_TOKEN_CODES.has(error.code)) ||
        error.status === 400)
    ) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    }
    throw toCommonAppError(error) ?? error;
  }

  return toAuthResponse(data.user, data.session);
};

export const logOut = async (accessToken: string): Promise<void> => {
  const { error } = await createSupabaseClient().auth.admin.signOut(accessToken, 'local');

  if (error) {
    if (isAuthApiError(error) && (error.status === 401 || error.status === 403)) {
      throw new AppError(401, 'TOKEN_INVALID', 'Access token is invalid or expired');
    }
    throw toCommonAppError(error) ?? error;
  }
};

export const getCurrentUser = async ({ userId, email }: AuthContext): Promise<AuthUser> => {
  return buildAuthUser(userId, email);
};
