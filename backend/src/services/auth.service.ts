import { randomUUID } from 'node:crypto';

import {
  type AuthError,
  isAuthApiError,
  type Session as SupabaseSession,
  type User as SupabaseUser,
  type UserIdentity,
} from '@supabase/supabase-js';

import { appConfig } from '../config.js';
import { AppError } from '../errors/app-error.js';
import { requestAsUser } from '../lib/gotrue.js';
import { createSupabaseClient } from '../lib/supabase.js';
import { findProfileById, findProfileByUsername } from '../models/profile.model.js';
import { type AuthContext } from './token.service.js';
import {
  type AuthResponse,
  type AuthUser,
  type EmailBody,
  type EmailLinkQuery,
  type IdentitiesResponse,
  type Identity,
  type IdTokenBody,
  type LoginBody,
  type OAuthAuthResponse,
  type OAuthProviderParams,
  type RefreshBody,
  type ResetPasswordBody,
  type Session,
  type SignupBody,
  type SignupResponse,
  type VerifyEmailBody,
} from '../schemas/auth.schema.js';

const EMAIL_TAKEN_CODES = new Set(['email_exists', 'user_already_exists']);
const INVALID_REFRESH_TOKEN_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'session_not_found',
  'session_expired',
]);
const RATE_LIMIT_CODES = new Set(['over_request_rate_limit', 'over_email_send_rate_limit']);
const CLOCK_SKEW_MS = 1_000;

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

const toIdTokenAppError = (error: unknown): unknown => {
  const appError = toCommonAppError(error);
  if (appError) {
    return appError;
  }
  if (isAuthApiError(error) && error.code === 'identity_already_exists') {
    return new AppError(
      409,
      'IDENTITY_ALREADY_LINKED',
      'This social account is already linked to an account',
    );
  }
  if (isAuthApiError(error) && error.status >= 400 && error.status < 500) {
    return new AppError(401, 'INVALID_ID_TOKEN', 'ID token is invalid or expired');
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
    if (isAuthApiError(error) && error.code !== undefined && EMAIL_TAKEN_CODES.has(error.code)) {
      return { user: { id: randomUUID(), email, username } };
    }
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

const isCreatedSince = (user: SupabaseUser, startedAt: number): boolean =>
  Date.parse(user.created_at) >= startedAt - CLOCK_SKEW_MS;

export const signInWithProvider = async (
  { provider }: OAuthProviderParams,
  { idToken, nonce }: IdTokenBody,
): Promise<OAuthAuthResponse> => {
  const startedAt = Date.now();
  const { data, error } = await createSupabaseClient().auth.signInWithIdToken({
    provider,
    token: idToken,
    nonce,
  });

  if (error) {
    throw toIdTokenAppError(error);
  }

  const response = await toAuthResponse(data.user, data.session);
  return { ...response, isNewUser: isCreatedSince(data.user, startedAt) };
};

const toIdentity = (identity: UserIdentity): Identity => ({
  id: identity.identity_id,
  provider: identity.provider,
  email: typeof identity.identity_data?.email === 'string' ? identity.identity_data.email : null,
  createdAt: identity.created_at ?? null,
});

const fetchIdentities = async (accessToken: string): Promise<UserIdentity[]> => {
  const { data, error } = await createSupabaseClient().auth.getUser(accessToken);

  if (error) {
    if (isAuthApiError(error) && (error.status === 401 || error.status === 403)) {
      throw new AppError(401, 'TOKEN_INVALID', 'Access token is invalid or expired');
    }
    throw error;
  }

  return data.user.identities ?? [];
};

export const listIdentities = async ({ accessToken }: AuthContext): Promise<IdentitiesResponse> => {
  const identities = await fetchIdentities(accessToken);
  return { identities: identities.map(toIdentity) };
};

export const linkIdentity = async (
  auth: AuthContext,
  { provider }: OAuthProviderParams,
  { idToken, nonce }: IdTokenBody,
): Promise<IdentitiesResponse> => {
  let linkedSession: { access_token?: string } | undefined;
  try {
    linkedSession = await requestAsUser<{ access_token?: string }>(
      auth.accessToken,
      'POST',
      '/token?grant_type=id_token',
      { provider, id_token: idToken, nonce, link_identity: true },
    );
  } catch (error) {
    throw toIdTokenAppError(error);
  }

  if (linkedSession?.access_token) {
    await createSupabaseClient().auth.admin.signOut(linkedSession.access_token, 'local');
  }

  return listIdentities(auth);
};

export const unlinkIdentity = async (
  { accessToken }: AuthContext,
  { provider }: OAuthProviderParams,
): Promise<void> => {
  const identities = await fetchIdentities(accessToken);
  const identity = identities.find((candidate) => candidate.provider === provider);

  if (!identity) {
    throw new AppError(404, 'IDENTITY_NOT_FOUND', `No ${provider} account is linked`);
  }
  if (identities.length < 2) {
    throw new AppError(409, 'LAST_IDENTITY', 'Cannot unlink the last login method');
  }

  try {
    await requestAsUser(accessToken, 'DELETE', `/user/identities/${identity.identity_id}`);
  } catch (error) {
    if (isAuthApiError(error) && error.code === 'single_identity_not_deletable') {
      throw new AppError(409, 'LAST_IDENTITY', 'Cannot unlink the last login method');
    }
    if (isAuthApiError(error) && error.code === 'email_conflict_identity_not_deletable') {
      throw new AppError(409, 'IDENTITY_NOT_DELETABLE', error.message);
    }
    throw toCommonAppError(error) ?? error;
  }
};
