import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { getHealth } from '../controllers/health.controller.js';
import { healthResponseSchema } from '../schemas/health.schema.js';

export const healthRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        response: {
          200: healthResponseSchema,
        },
      },
    },
    getHealth,
  );
};
