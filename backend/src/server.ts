import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { errorHandlerPlugin } from './plugins/error-handler.plugin.js';
import { authRoutes } from './routes/auth.routes.js';
import { healthRoutes } from './routes/health.routes.js';

export const buildServer = async () => {
  const server = Fastify({
    logger: true,
  });

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  await server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Music Room API',
        version: '0.1.0',
      },
      tags: [
        { name: 'system', description: 'Service status' },
        { name: 'auth', description: 'Email and password authentication' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await server.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  await server.register(errorHandlerPlugin);

  await server.register(healthRoutes);
  await server.register(authRoutes, { prefix: '/auth' });

  return server;
};
