import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import * as friendController from '../controllers/friend.controller.js';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  friendRequestIdParamsSchema,
  friendRequestSchema,
  friendRequestsSchema,
  friendSchema,
  friendUserIdParamsSchema,
  sendFriendRequestBodySchema,
  USER_SEARCH_LIMIT,
  userSearchQuerySchema,
  userSearchResultSchema,
} from '../schemas/friend.schema.js';

const unauthorizedSchema = errorResponseSchema.describe(
  'TOKEN_MISSING, TOKEN_INVALID or TOKEN_EXPIRED',
);

export const friendRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/',
    {
      schema: {
        tags: ['friends'],
        summary: 'List my friends',
        description: 'Accepted friends, sorted by username.',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(friendSchema),
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    friendController.listFriends,
  );

  server.get(
    '/search',
    {
      schema: {
        tags: ['friends'],
        summary: 'Search users by username',
        description: `Case-insensitive search on part of the username, excluding myself. Exact matches come first, then prefix matches, then the others alphabetically. ${USER_SEARCH_LIMIT} results at most. Each result tells whether a friendship or a pending request already exists.`,
        security: [{ bearerAuth: [] }],
        querystring: userSearchQuerySchema,
        response: {
          200: z.array(userSearchResultSchema),
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    friendController.searchUsers,
  );

  server.delete(
    '/:userId',
    {
      schema: {
        tags: ['friends'],
        summary: 'Remove a friend',
        description:
          'Ends the friendship for both users. Friend-only profile fields become hidden.',
        security: [{ bearerAuth: [] }],
        params: friendUserIdParamsSchema,
        response: {
          204: z.null().describe('Friend removed'),
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          404: errorResponseSchema.describe('FRIEND_NOT_FOUND'),
        },
      },
      onRequest: [server.authenticate],
    },
    friendController.removeFriend,
  );

  server.get(
    '/requests',
    {
      schema: {
        tags: ['friends'],
        summary: 'List my pending friend requests',
        description: 'Requests I received and requests I sent, sorted by username.',
        security: [{ bearerAuth: [] }],
        response: {
          200: friendRequestsSchema,
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    friendController.listFriendRequests,
  );

  server.post(
    '/requests',
    {
      schema: {
        tags: ['friends'],
        summary: 'Send a friend request',
        description:
          'Only one relationship can exist between two users, whatever its direction: if the other user already sent me a request, accept it instead.',
        security: [{ bearerAuth: [] }],
        body: sendFriendRequestBodySchema,
        response: {
          201: friendRequestSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR or CANNOT_FRIEND_SELF'),
          401: unauthorizedSchema,
          404: errorResponseSchema.describe('PROFILE_NOT_FOUND'),
          409: errorResponseSchema.describe('ALREADY_FRIENDS or FRIEND_REQUEST_EXISTS'),
        },
      },
      onRequest: [server.authenticate],
    },
    friendController.sendFriendRequest,
  );

  server.post(
    '/requests/:id/accept',
    {
      schema: {
        tags: ['friends'],
        summary: 'Accept a friend request',
        description:
          'Only the addressee can accept. Friend-only profile fields become visible to both users.',
        security: [{ bearerAuth: [] }],
        params: friendRequestIdParamsSchema,
        response: {
          200: friendSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          404: errorResponseSchema.describe('FRIEND_REQUEST_NOT_FOUND'),
        },
      },
      onRequest: [server.authenticate],
    },
    friendController.acceptFriendRequest,
  );

  server.delete(
    '/requests/:id',
    {
      schema: {
        tags: ['friends'],
        summary: 'Decline or cancel a friend request',
        description: 'The addressee declines the request, the requester cancels it.',
        security: [{ bearerAuth: [] }],
        params: friendRequestIdParamsSchema,
        response: {
          204: z.null().describe('Request deleted'),
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          404: errorResponseSchema.describe('FRIEND_REQUEST_NOT_FOUND'),
        },
      },
      onRequest: [server.authenticate],
    },
    friendController.deleteFriendRequest,
  );
};
