import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email().max(254).describe('Account email');

const passwordSchema = z.string().min(6).max(72).describe('Password, 6 to 72 characters');

const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_.]{3,30}$/, 'Must be 3 to 30 letters, digits, "_" or "."')
  .describe('Public username, unique case-insensitively');

export const signupBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).describe('Refresh token from the last session'),
});

export const sessionSchema = z
  .object({
    accessToken: z.string().describe('JWT to send as "Authorization: Bearer <accessToken>"'),
    refreshToken: z.string().describe('Single-use token for POST /auth/refresh'),
    tokenType: z.literal('bearer'),
    expiresIn: z.number().int().describe('Access token lifetime in seconds'),
    expiresAt: z.number().int().describe('Access token expiry as a Unix timestamp in seconds'),
  })
  .describe('Session tokens');

export const authUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    username: z.string(),
  })
  .describe('Authenticated user');

export const authResponseSchema = z.object({
  user: authUserSchema,
  session: sessionSchema,
});

export type SignupBody = z.infer<typeof signupBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type Session = z.infer<typeof sessionSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
