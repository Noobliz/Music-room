import { z } from 'zod';
import { spaceIdParamsSchema } from './space.schema.js';
import { trackSchema } from './track.schema.js';

export const proposalParams = spaceIdParamsSchema.extend({ proposalId: z.string().uuid() });
export const proposeTrackBody = z.object({ trackId: z.string().uuid() }).strict();
export const proposalCreated = z.object({ id: z.string().uuid() });
export const queueSchema = z.object({
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
