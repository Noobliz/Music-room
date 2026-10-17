import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { authenticatePlugin } from './plugins/authenticate.plugin.js';
import { errorHandlerPlugin } from './plugins/error-handler.plugin.js';
import { authRoutes } from './routes/auth.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { profileRoutes } from './routes/profiles.routes.js';

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
        {
          name: 'auth',
          description: 'Email, password and Google authentication, linked login methods',
        },
        {
          name: 'profiles',
          description: 'User profiles, avatar and account deletion',
        },
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
  await server.register(authenticatePlugin);

  await server.register(healthRoutes);
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(profileRoutes, { prefix: '/profiles' });

  return server;
};
