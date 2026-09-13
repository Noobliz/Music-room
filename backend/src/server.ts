import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

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
    },
    transform: jsonSchemaTransform,
  });

  await server.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  server.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    {
      schema: {
        tags: ['system'],
        response: {
          200: z.object({ status: z.literal('ok') }),
        },
      },
    },
    async () => {
      return { status: 'ok' as const };
    },
  );

  return server;
};
