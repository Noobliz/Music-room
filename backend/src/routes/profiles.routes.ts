import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import * as profileController from '../controllers/profile.controller.js';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  AVATAR_CONTENT_TYPES,
  AVATAR_MAX_BYTES,
  avatarBodySchema,
  ownProfileSchema,
  profileIdParamsSchema,
  profileSchema,
  updateProfileBodySchema,
} from '../schemas/profile.schema.js';

const unauthorizedSchema = errorResponseSchema.describe(
  'TOKEN_MISSING, TOKEN_INVALID or TOKEN_EXPIRED',
);

const avatarRoutes: FastifyPluginAsyncZod = async (server) => {
  server.removeAllContentTypeParsers();
  server.addContentTypeParser(
    [...AVATAR_CONTENT_TYPES],
    { parseAs: 'buffer', bodyLimit: AVATAR_MAX_BYTES },
    (_request, body, done) => done(null, body),
  );

  server.put(
    '/me/avatar',
    {
      bodyLimit: AVATAR_MAX_BYTES,
      schema: {
        tags: ['profiles'],
        summary: 'Upload or replace the avatar',
        description:
          'Send the raw image bytes as the request body with the matching "Content-Type" (image/jpeg, image/png or image/webp), 50 MiB at most. The file content must match its type. The new image replaces the previous one, which is deleted.',
        security: [{ bearerAuth: [] }],
        consumes: [...AVATAR_CONTENT_TYPES],
        body: avatarBodySchema,
        response: {
          200: ownProfileSchema,
          401: unauthorizedSchema,
          413: errorResponseSchema.describe('PAYLOAD_TOO_LARGE'),
          415: errorResponseSchema.describe('UNSUPPORTED_MEDIA_TYPE'),
        },
      },
      onRequest: [server.authenticate],
    },
    profileController.replaceAvatar,
  );
};

export const profileRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/me',
    {
      schema: {
        tags: ['profiles'],
        summary: 'Get my profile',
        description: 'Returns every field of the profile, including private ones.',
        security: [{ bearerAuth: [] }],
        response: {
          200: ownProfileSchema,
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    profileController.getOwnProfile,
  );

  server.patch(
    '/me',
    {
      schema: {
        tags: ['profiles'],
        summary: 'Update my profile',
        description:
          'Changes the username and/or the bio. Omitted fields are left unchanged. The avatar is managed with PUT /profiles/me/avatar.',
        security: [{ bearerAuth: [] }],
        body: updateProfileBodySchema,
        response: {
          200: ownProfileSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR or BAD_REQUEST'),
          401: unauthorizedSchema,
          409: errorResponseSchema.describe('USERNAME_TAKEN'),
        },
      },
      onRequest: [server.authenticate],
    },
    profileController.updateOwnProfile,
  );

  server.delete(
    '/me',
    {
      schema: {
        tags: ['profiles'],
        summary: 'Delete my account',
        description:
          'Permanently deletes the account, its profile, its avatar, its login methods and every session. Cannot be undone.',
        security: [{ bearerAuth: [] }],
        response: {
          204: z.null().describe('Account deleted'),
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    profileController.deleteAccount,
  );

  await server.register(avatarRoutes);

  server.delete(
    '/me/avatar',
    {
      schema: {
        tags: ['profiles'],
        summary: 'Remove the avatar',
        security: [{ bearerAuth: [] }],
        response: {
          204: z.null().describe('Avatar removed'),
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    profileController.removeAvatar,
  );

  server.get(
    '/:id',
    {
      schema: {
        tags: ['profiles'],
        summary: 'Get the profile of a user',
        description:
          'Public fields (username, avatar) are visible to every authenticated user. Friend-only fields (bio) are only returned to friends. Private fields (email) are never returned.',
        security: [{ bearerAuth: [] }],
        params: profileIdParamsSchema,
        response: {
          200: profileSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          404: errorResponseSchema.describe('PROFILE_NOT_FOUND'),
        },
      },
      onRequest: [server.authenticate],
    },
    profileController.getProfile,
  );
};
