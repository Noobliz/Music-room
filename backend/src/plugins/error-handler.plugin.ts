import { type FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { AppError } from '../errors/app-error.js';
import { type ErrorResponse } from '../schemas/error.schema.js';

const isFastifyClientError = (error: unknown): error is FastifyError & { statusCode: number } =>
  error instanceof Error &&
  'statusCode' in error &&
  typeof error.statusCode === 'number' &&
  error.statusCode >= 400 &&
  error.statusCode < 500;

export const errorHandlerPlugin = fp(
  async (server) => {
    server.setErrorHandler((error, request, reply) => {
      if (hasZodFastifySchemaValidationErrors(error)) {
        const body: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.validation.map((item) => ({
              field: item.params.issue.path.join('.'),
              message: item.message,
            })),
          },
        };
        return reply.status(400).send(body);
      }

      if (error instanceof AppError) {
        const body: ErrorResponse = { error: { code: error.code, message: error.message } };
        return reply.status(error.statusCode).send(body);
      }

      if (isFastifyClientError(error)) {
        const body: ErrorResponse = { error: { code: 'BAD_REQUEST', message: error.message } };
        return reply.status(error.statusCode).send(body);
      }

      request.log.error({ err: error }, 'Unhandled error');
      const body: ErrorResponse = {
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      };
      return reply.status(500).send(body);
    });

    server.setNotFoundHandler((request, reply) => {
      const body: ErrorResponse = {
        error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
      };
      return reply.status(404).send(body);
    });
  },
  { name: 'error-handler' },
);
