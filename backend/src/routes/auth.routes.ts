import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import * as authController from '../controllers/auth.controller.js';
import {
  acceptedResponseSchema,
  authResponseSchema,
  authUserSchema,
  emailBodySchema,
  emailLinkQuerySchema,
  loginBodySchema,
  refreshBodySchema,
  resetPasswordBodySchema,
  signupBodySchema,
  signupResponseSchema,
  verifyEmailBodySchema,
} from '../schemas/auth.schema.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

export const authRoutes: FastifyPluginAsyncZod = async (server) => {
  server.post(
    '/signup',
    {
      schema: {
        tags: ['auth'],
        summary: 'Create an account',
        description:
          'Creates the account and its profile, then sends a confirmation email. No session is returned: the account can log in once the email is verified. The username is checked for format and case-insensitive availability. An email already registered gets the same response, so accounts cannot be enumerated.',
        body: signupBodySchema,
        response: {
          201: signupResponseSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR or BAD_REQUEST'),
          409: errorResponseSchema.describe('USERNAME_TAKEN'),
          429: errorResponseSchema.describe('RATE_LIMITED'),
        },
      },
    },
    authController.signUp,
  );

  server.get(
    '/redirect',
    {
      schema: {
        tags: ['auth'],
        summary: 'Open the app from an email link',
        description:
          'Target of the confirmation and password reset email links. Redirects to the mobile app deep link with the same "token_hash", which the app then sends to POST /auth/email/verify or POST /auth/password/reset.',
        querystring: emailLinkQuerySchema,
        response: {
          302: z.null().describe('Redirect to the app deep link'),
          400: errorResponseSchema.describe('VALIDATION_ERROR or BAD_REQUEST'),
        },
      },
    },
    authController.redirectToApp,
  );

  server.post(
    '/email/verify',
    {
      schema: {
        tags: ['auth'],
        summary: 'Confirm the email address',
        description:
          'Activates the account with the "token_hash" of the confirmation email link, then returns a session. Links expire after one hour and are single-use.',
        body: verifyEmailBodySchema,
        response: {
          200: authResponseSchema,
          400: errorResponseSchema.describe(
            'INVALID_OR_EXPIRED_LINK, VALIDATION_ERROR or BAD_REQUEST',
          ),
          429: errorResponseSchema.describe('RATE_LIMITED'),
        },
      },
    },
    authController.verifyEmail,
  );

  server.post(
    '/email/resend',
    {
      schema: {
        tags: ['auth'],
        summary: 'Resend the confirmation email',
        description:
          'Always answers 202 whether or not an unverified account uses this email, so accounts cannot be enumerated.',
        body: emailBodySchema,
        response: {
          202: acceptedResponseSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR or BAD_REQUEST'),
          429: errorResponseSchema.describe('RATE_LIMITED'),
        },
      },
    },
    authController.resendConfirmation,
  );

  server.post(
    '/password/forgot',
    {
      schema: {
        tags: ['auth'],
        summary: 'Request a password reset email',
        description:
          'Sends a reset link opening the app. Always answers 202 whether or not an account uses this email, so accounts cannot be enumerated.',
        body: emailBodySchema,
        response: {
          202: acceptedResponseSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR or BAD_REQUEST'),
          429: errorResponseSchema.describe('RATE_LIMITED'),
        },
      },
    },
    authController.forgotPassword,
  );

  server.post(
    '/password/reset',
    {
      schema: {
        tags: ['auth'],
        summary: 'Set a new password',
        description:
          'Changes the password with the "token_hash" of the reset email link, then ends every session of the user: log in again with the new password. Links expire after one hour and are single-use.',
        body: resetPasswordBodySchema,
        response: {
          204: z.null().describe('Password changed'),
          400: errorResponseSchema.describe(
            'INVALID_OR_EXPIRED_LINK, VALIDATION_ERROR or BAD_REQUEST',
          ),
          429: errorResponseSchema.describe('RATE_LIMITED'),
        },
      },
    },
    authController.resetPassword,
  );

  server.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Log in with email and password',
        body: loginBodySchema,
        response: {
          200: authResponseSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR or BAD_REQUEST'),
          401: errorResponseSchema.describe('INVALID_CREDENTIALS'),
          403: errorResponseSchema.describe('EMAIL_NOT_VERIFIED'),
          429: errorResponseSchema.describe('RATE_LIMITED'),
        },
      },
    },
    authController.logIn,
  );

  server.post(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Renew the session',
        description:
          'Exchanges a refresh token for a new session. Refresh tokens are single-use: always store the new one.',
        body: refreshBodySchema,
        response: {
          200: authResponseSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR or BAD_REQUEST'),
          401: errorResponseSchema.describe('INVALID_REFRESH_TOKEN'),
          429: errorResponseSchema.describe('RATE_LIMITED'),
        },
      },
    },
    authController.refresh,
  );

  server.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Log out of the current session',
        description:
          'Ends the current session: its access and refresh tokens stop working immediately. Other sessions of the user stay active.',
        security: [{ bearerAuth: [] }],
        response: {
          204: z.null().describe('Logged out'),
          401: errorResponseSchema.describe('TOKEN_MISSING, TOKEN_INVALID or TOKEN_EXPIRED'),
        },
      },
      onRequest: [server.authenticate],
    },
    authController.logOut,
  );

  server.get(
    '/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Get the authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: authUserSchema,
          401: errorResponseSchema.describe('TOKEN_MISSING, TOKEN_INVALID or TOKEN_EXPIRED'),
        },
      },
      onRequest: [server.authenticate],
    },
    authController.getMe,
  );
};
