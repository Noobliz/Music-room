import { type FastifyPluginAsyncZod, jsonSchemaTransform } from 'fastify-type-provider-zod';
import { z } from 'zod';

import * as realtimeController from '../controllers/realtime.controller.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

export const realtimeRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/',
    {
      websocket: true,
      schema: {
        tags: ['realtime'],
        summary: 'Open the realtime WebSocket',
        description:
          'WebSocket pushing the changes of the spaces I subscribe to. Send {"type":"subscribe","spaceId":"…"}; every message received is { type, spaceId, version, data }. Message types, versions, close codes and reconnection are in docs/realtime.md.',
        security: [{ bearerAuth: [] }],
        response: {
          101: z.null().describe('Switching Protocols: the WebSocket is open'),
          401: errorResponseSchema.describe('TOKEN_MISSING, TOKEN_INVALID or TOKEN_EXPIRED'),
          404: z.null().describe('The request has no "Upgrade: websocket" header'),
        },
      },
      config: {
        swaggerTransform: (transform) =>
          jsonSchemaTransform({ ...transform, schema: { ...transform.schema, hide: false } }),
      },
      onRequest: [server.authenticate],
    },
    realtimeController.openConnection,
  );
};
