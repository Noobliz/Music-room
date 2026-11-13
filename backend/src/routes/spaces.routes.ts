import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import * as spaceController from '../controllers/space.controller.js';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  createSpaceBodySchema,
  inviteToSpaceBodySchema,
  mySpacesQuerySchema,
  spaceIdParamsSchema,
  spaceInvitationParamsSchema,
  spaceInvitationSchema,
  spacePageSchema,
  spaceSchema,
  spaceSearchQuerySchema,
  updateSpaceBodySchema,
} from '../schemas/space.schema.js';

const unauthorizedSchema = errorResponseSchema.describe(
  'TOKEN_MISSING, TOKEN_INVALID or TOKEN_EXPIRED',
);

const notFoundSchema = errorResponseSchema.describe(
  'SPACE_NOT_FOUND: the space does not exist, or it is private and I am neither its owner nor invited',
);

const notOwnerSchema = errorResponseSchema.describe(
  'NOT_SPACE_OWNER: I can open the space but I am not its owner',
);

export const spaceRoutes: FastifyPluginAsyncZod = async (server) => {
  server.post(
    '/',
    {
      schema: {
        tags: ['spaces'],
        summary: 'Create an event or a playlist',
        description:
          'I become its owner. Public and open to everyone unless visibility or accessMode say otherwise.',
        security: [{ bearerAuth: [] }],
        body: createSpaceBodySchema,
        response: {
          201: spaceSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    spaceController.createSpace,
  );

  server.get(
    '/',
    {
      schema: {
        tags: ['spaces'],
        summary: 'Search public spaces',
        description:
          'Public spaces only, mine included. Case-insensitive search on part of the name: exact matches first, then prefix matches, then the others alphabetically. Without q, the most recent spaces first.',
        security: [{ bearerAuth: [] }],
        querystring: spaceSearchQuerySchema,
        response: {
          200: spacePageSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    spaceController.searchSpaces,
  );

  server.get(
    '/mine',
    {
      schema: {
        tags: ['spaces'],
        summary: 'List my spaces',
        description:
          'Spaces I own and spaces I am invited to, public or private, most recently updated first.',
        security: [{ bearerAuth: [] }],
        querystring: mySpacesQuerySchema,
        response: {
          200: z.array(spaceSchema),
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    spaceController.listMySpaces,
  );

  server.get(
    '/:id',
    {
      schema: {
        tags: ['spaces'],
        summary: 'Get a space',
        description:
          'A public space is visible to any user; a private one only to its owner and invited users. canAct tells whether I can act in it.',
        security: [{ bearerAuth: [] }],
        params: spaceIdParamsSchema,
        response: {
          200: spaceSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          404: notFoundSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    spaceController.getSpace,
  );

  server.patch(
    '/:id',
    {
      schema: {
        tags: ['spaces'],
        summary: 'Update a space',
        description: 'Owner only. Name, description, visibility and access mode.',
        security: [{ bearerAuth: [] }],
        params: spaceIdParamsSchema,
        body: updateSpaceBodySchema,
        response: {
          200: spaceSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          403: notOwnerSchema,
          404: notFoundSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    spaceController.updateSpace,
  );

  server.delete(
    '/:id',
    {
      schema: {
        tags: ['spaces'],
        summary: 'Delete a space',
        description: 'Owner only. Invitations are deleted with it.',
        security: [{ bearerAuth: [] }],
        params: spaceIdParamsSchema,
        response: {
          204: z.null().describe('Space deleted'),
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          403: notOwnerSchema,
          404: notFoundSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    spaceController.deleteSpace,
  );

  server.get(
    '/:id/invitations',
    {
      schema: {
        tags: ['spaces'],
        summary: 'List invited users',
        description: 'Owner only, sorted by username.',
        security: [{ bearerAuth: [] }],
        params: spaceIdParamsSchema,
        response: {
          200: z.array(spaceInvitationSchema),
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          403: notOwnerSchema,
          404: notFoundSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    spaceController.listInvitations,
  );

  server.post(
    '/:id/invitations',
    {
      schema: {
        tags: ['spaces'],
        summary: 'Invite a friend',
        description:
          'Owner only, and only friends can be invited. The invited user can open the space even when it is private, and act in it.',
        security: [{ bearerAuth: [] }],
        params: spaceIdParamsSchema,
        body: inviteToSpaceBodySchema,
        response: {
          201: spaceInvitationSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR or CANNOT_INVITE_SELF'),
          401: unauthorizedSchema,
          403: errorResponseSchema.describe('NOT_SPACE_OWNER or INVITEE_NOT_FRIEND'),
          404: errorResponseSchema.describe('SPACE_NOT_FOUND or PROFILE_NOT_FOUND'),
          409: errorResponseSchema.describe('ALREADY_INVITED'),
        },
      },
      onRequest: [server.authenticate],
    },
    spaceController.inviteToSpace,
  );

  server.delete(
    '/:id/invitations/:userId',
    {
      schema: {
        tags: ['spaces'],
        summary: 'Remove an invitation or leave a space',
        description:
          'The owner removes the invitation of any user; an invited user removes their own invitation to leave the space.',
        security: [{ bearerAuth: [] }],
        params: spaceInvitationParamsSchema,
        response: {
          204: z.null().describe('Invitation removed'),
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          403: notOwnerSchema,
          404: errorResponseSchema.describe('SPACE_NOT_FOUND or SPACE_INVITATION_NOT_FOUND'),
        },
      },
      onRequest: [server.authenticate],
    },
    spaceController.removeInvitation,
  );
};
