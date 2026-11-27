import { z } from 'zod';
import { spaceIdParamsSchema } from './space.schema.js';
import { trackSchema } from './track.schema.js';
import { positionSchema } from './vote-zone.schema.js';

export const proposalParams = spaceIdParamsSchema.extend({ proposalId: z.string().uuid() });
const position = positionSchema
  .optional()
  .describe('Required for a non-owner in a location_time event, ignored otherwise');
export const proposeTrackBody = z.object({ trackId: z.string().uuid(), position }).strict();
export const voteBody = z.preprocess(
  (body) => body ?? {},
  z.object({ position }).strict(),
);
export const proposalCreated = z.object({ id: z.string().uuid() });
export const queueSchema = z.object({
  version: z.number().int().positive(),
  items: z.array(
    proposalCreated.extend({
      track: trackSchema,
      proposedBy: z.string().uuid(),
      createdAt: z.string().datetime(),
      voteCount: z.number().int().nonnegative(),
      hasVoted: z.boolean(),
    }),
  ),
});

export type EventQueue = z.infer<typeof queueSchema>;
