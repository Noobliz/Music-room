import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import * as authController from '../controllers/auth.controller.js';
import {
  authResponseSchema,
  authUserSchema,
  loginBodySchema,
  refreshBodySchema,
  signupBodySchema,
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
          'Creates the account and its profile, then returns a session. The username is checked for format and case-insensitive availability before the account is created.',
        body: signupBodySchema,
        response: {
          201: authResponseSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR or BAD_REQUEST'),
          409: errorResponseSchema.describe('EMAIL_TAKEN or USERNAME_TAKEN'),
          429: errorResponseSchema.describe('RATE_LIMITED'),
        },
      },
    },
    authController.signUp,
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
