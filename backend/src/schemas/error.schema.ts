import { z } from 'zod';

import { ERROR_CODES } from '../errors/error-codes.js';

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: z.enum(ERROR_CODES),
      message: z.string(),
      details: z
        .array(
          z.object({
            field: z.string(),
            message: z.string(),
          }),
        )
        .optional()
        .describe('Per-field issues, only present for VALIDATION_ERROR'),
    }),
  })
  .describe('Error response shared by every route');

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
