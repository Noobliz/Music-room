import {
  type AuthError,
  isAuthApiError,
  type Session as SupabaseSession,
  type User as SupabaseUser,
} from '@supabase/supabase-js';

import { appConfig } from '../config.js';
import { AppError } from '../errors/app-error.js';
import { createSupabaseClient } from '../lib/supabase.js';
import { findProfileById, findProfileByUsername } from '../models/profile.model.js';
import { type AuthContext } from './token.service.js';
import {
  type AuthResponse,
  type AuthUser,
  type EmailBody,
  type EmailLinkQuery,
  type LoginBody,
  type RefreshBody,
  type ResetPasswordBody,
  type Session,
  type SignupBody,
  type SignupResponse,
  type VerifyEmailBody,
} from '../schemas/auth.schema.js';

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
  if (error.code === 'weak_password' || error.code === 'same_password') {
    return new AppError(400, 'VALIDATION_ERROR', error.message);
  }
  return undefined;
};

const toLinkAppError = (error: unknown): unknown => {
  const appError = toCommonAppError(error);
  if (appError) {
    return appError;
  }
  if (isAuthApiError(error) && error.status >= 400 && error.status < 500) {
    return new AppError(400, 'INVALID_OR_EXPIRED_LINK', 'Link is invalid, expired or already used');
  }
  return error;
};

const throwUnlessEnumerationSafe = (error: AuthError | null): void => {
  if (!error) {
    return;
  }
  if (isAuthApiError(error)) {
    if (error.code === 'over_request_rate_limit') {
      throw new AppError(429, 'RATE_LIMITED', 'Too many requests, try again later');
    }
    return;
  }
  throw error;
};

const APP_LINK_PATHS: Record<EmailLinkQuery['type'], string> = {
  email: 'verify-email',
  recovery: 'reset-password',
};

export const buildAppLink = ({ token_hash, type }: EmailLinkQuery): string => {
  const query = new URLSearchParams({ token_hash, type });
  return `${appConfig.app.deepLinkUrl}/${APP_LINK_PATHS[type]}?${query.toString()}`;
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

export const signUp = async ({
  email,
  password,
  username,
}: SignupBody): Promise<SignupResponse> => {
  if (await findProfileByUsername(username)) {
    throw new AppError(409, 'USERNAME_TAKEN', 'Username already taken');
  }

  const { data, error } = await createSupabaseClient().auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    throw toCommonAppError(error) ?? error;
  }
  if (!data.user) {
    throw new Error('Supabase Auth returned no user');
  }

  return { user: { id: data.user.id, email, username } };
};

export const verifyEmail = async ({ tokenHash }: VerifyEmailBody): Promise<AuthResponse> => {
  const { data, error } = await createSupabaseClient().auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (error) {
    throw toLinkAppError(error);
  }

  return toAuthResponse(data.user, data.session);
};

export const resendConfirmation = async ({ email }: EmailBody): Promise<void> => {
  const { error } = await createSupabaseClient().auth.resend({ type: 'signup', email });

  throwUnlessEnumerationSafe(error);
};

export const requestPasswordReset = async ({ email }: EmailBody): Promise<void> => {
  const { error } = await createSupabaseClient().auth.resetPasswordForEmail(email);

  throwUnlessEnumerationSafe(error);
};

export const resetPassword = async ({ tokenHash, password }: ResetPasswordBody): Promise<void> => {
  const client = createSupabaseClient();
  const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });

  if (error) {
    throw toLinkAppError(error);
  }
  if (!data.session) {
    throw new Error('Supabase Auth returned no recovery session');
  }

  const { error: updateError } = await client.auth.updateUser({ password });
  if (updateError) {
    throw toCommonAppError(updateError) ?? updateError;
  }

  const { error: signOutError } = await client.auth.admin.signOut(
    data.session.access_token,
    'global',
  );
  if (signOutError) {
    throw signOutError;
  }
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
    if (isAuthApiError(error) && error.code === 'email_not_confirmed') {
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Email address is not verified');
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
