import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import * as trackController from '../controllers/track.controller.js';
import { errorResponseSchema } from '../schemas/error.schema.js';
import {
  TRACK_SEARCH_DEFAULT_LIMIT,
  TRACK_SEARCH_MAX_LIMIT,
  trackIdParamsSchema,
  trackPageSchema,
  trackSchema,
  trackSearchQuerySchema,
  trackStreamSchema,
} from '../schemas/track.schema.js';

const unauthorizedSchema = errorResponseSchema.describe(
  'TOKEN_MISSING, TOKEN_INVALID or TOKEN_EXPIRED',
);

export const trackRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/',
    {
      schema: {
        tags: ['tracks'],
        summary: 'Search the catalog',
        description: `Case-insensitive search on part of the title, artist or album. Exact title matches come first, then title prefix matches, then the others by title. Without q, lists the whole catalog by title. ${TRACK_SEARCH_DEFAULT_LIMIT} results per page by default, ${TRACK_SEARCH_MAX_LIMIT} at most.`,
        security: [{ bearerAuth: [] }],
        querystring: trackSearchQuerySchema,
        response: {
          200: trackPageSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
        },
      },
      onRequest: [server.authenticate],
    },
    trackController.searchTracks,
  );

  server.get(
    '/:id',
    {
      schema: {
        tags: ['tracks'],
        summary: 'Get a track',
        security: [{ bearerAuth: [] }],
        params: trackIdParamsSchema,
        response: {
          200: trackSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          404: errorResponseSchema.describe('TRACK_NOT_FOUND'),
        },
      },
      onRequest: [server.authenticate],
    },
    trackController.getTrack,
  );

  server.get(
    '/:id/stream',
    {
      schema: {
        tags: ['tracks'],
        summary: 'Get a link to play a track',
        description:
          'Returns a signed URL of the full MP3, valid for the track length plus a margin (one hour at most). Give it to the audio player as is: it serves HTTP Range requests, so seeking works. When it expires, call this route again.',
        security: [{ bearerAuth: [] }],
        params: trackIdParamsSchema,
        response: {
          200: trackStreamSchema,
          400: errorResponseSchema.describe('VALIDATION_ERROR'),
          401: unauthorizedSchema,
          404: errorResponseSchema.describe('TRACK_NOT_FOUND'),
        },
      },
      onRequest: [server.authenticate],
    },
    trackController.getTrackStream,
  );
};
