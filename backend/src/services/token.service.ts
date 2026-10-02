import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';

import { appConfig } from '../config.js';
import { AppError } from '../errors/app-error.js';
import { isSessionActive } from '../models/session.model.js';

export type AuthContext = {
  userId: string;
  email: string;
  sessionId: string;
  accessToken: string;
};

const issuer = `${appConfig.supabase.url}/auth/v1`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

const claimsSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  session_id: z.string().uuid(),
});

const verifySignature = async (accessToken: string): Promise<JWTPayload> => {
  try {
    const { payload } = await jwtVerify(accessToken, jwks, {
      issuer,
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256'],
    });
    return payload;
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired');
    }
    if (
      error instanceof errors.JOSEError &&
      !(error instanceof errors.JWKSTimeout) &&
      !(error instanceof errors.JWKSInvalid)
    ) {
      throw new AppError(401, 'TOKEN_INVALID', 'Access token is invalid');
    }
    throw error;
  }
};

export const verifyAccessToken = async (accessToken: string): Promise<AuthContext> => {
  const claims = claimsSchema.safeParse(await verifySignature(accessToken));
  if (!claims.success) {
    throw new AppError(401, 'TOKEN_INVALID', 'Access token is invalid');
  }

  const { sub: userId, email, session_id: sessionId } = claims.data;
  if (!(await isSessionActive(sessionId, userId))) {
    throw new AppError(401, 'TOKEN_INVALID', 'Session has ended');
  }

  return { userId, email, sessionId, accessToken };
};
