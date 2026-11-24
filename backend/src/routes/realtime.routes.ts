import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import * as realtimeController from '../controllers/realtime.controller.js';

export const realtimeRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/',
    { websocket: true, onRequest: [server.authenticate] },
    realtimeController.openConnection,
  );
};
