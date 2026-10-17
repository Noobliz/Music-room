import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email().max(254).describe('Account email');

const passwordSchema = z.string().min(6).max(72).describe('Password, 6 to 72 characters');

export const usernameSchema = z
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

export const emailBodySchema = z.object({
  email: emailSchema,
});

const tokenHashSchema = z
  .string()
  .min(1)
  .describe('"token_hash" query parameter of the email link');

export const emailLinkQuerySchema = z.object({
  token_hash: z.string().min(1),
  type: z.enum(['email', 'recovery']).describe('"email" for confirmation, "recovery" for reset'),
});

export const verifyEmailBodySchema = z.object({
  tokenHash: tokenHashSchema,
});

export const resetPasswordBodySchema = z.object({
  tokenHash: tokenHashSchema,
  password: passwordSchema,
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

export const oauthProviderParamsSchema = z.object({
  provider: z.enum(['google']).describe('Social identity provider'),
});

export const idTokenBodySchema = z.object({
  idToken: z.string().min(1).describe('OpenID Connect ID token issued to the app by the provider'),
  nonce: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Raw nonce whose SHA-256 hash was sent to the provider, required if the token has one',
    ),
});

export const oauthAuthResponseSchema = authResponseSchema
  .extend({
    isNewUser: z
      .boolean()
      .describe(
        'True on the first sign-in, when the account and its generated username were created',
      ),
  })
  .describe('Session of the account linked to the social identity');

export const identitySchema = z
  .object({
    id: z.string().uuid(),
    provider: z.string().describe('"email" for the password login, or a social provider'),
    email: z.string().nullable(),
    createdAt: z.string().nullable(),
  })
  .describe('Login method linked to the account');

export const identitiesResponseSchema = z.object({
  identities: z.array(identitySchema),
});

export const signupResponseSchema = z
  .object({
    user: authUserSchema,
  })
  .describe('Account created, waiting for email confirmation');

export const acceptedResponseSchema = z
  .object({
    message: z.string(),
  })
  .describe('Request accepted');

export type SignupBody = z.infer<typeof signupBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type EmailBody = z.infer<typeof emailBodySchema>;
export type EmailLinkQuery = z.infer<typeof emailLinkQuerySchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
export type Session = z.infer<typeof sessionSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type SignupResponse = z.infer<typeof signupResponseSchema>;
export type OAuthProviderParams = z.infer<typeof oauthProviderParamsSchema>;
export type IdTokenBody = z.infer<typeof idTokenBodySchema>;
export type OAuthAuthResponse = z.infer<typeof oauthAuthResponseSchema>;
export type Identity = z.infer<typeof identitySchema>;
export type IdentitiesResponse = z.infer<typeof identitiesResponseSchema>;
