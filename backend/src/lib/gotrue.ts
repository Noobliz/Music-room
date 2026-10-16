import { AuthApiError } from '@supabase/supabase-js';

import { appConfig } from '../config.js';

type GoTrueErrorBody = {
  code?: number | string;
  error_code?: string;
  error?: string;
  msg?: string;
  message?: string;
  error_description?: string;
};

const toAuthApiError = (status: number, body: GoTrueErrorBody): AuthApiError => {
  const code = body.error_code ?? (typeof body.code === 'string' ? body.code : body.error);
  const message =
    body.msg ?? body.message ?? body.error_description ?? 'Supabase Auth request failed';
  return new AuthApiError(message, status, code);
};

export const requestAsUser = async <T>(
  accessToken: string,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T | undefined> => {
  const response = await fetch(`${appConfig.supabase.url}/auth/v1${path}`, {
    method,
    headers: {
      apikey: appConfig.supabase.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    throw toAuthApiError(response.status, (payload ?? {}) as GoTrueErrorBody);
  }

  return payload as T | undefined;
};
