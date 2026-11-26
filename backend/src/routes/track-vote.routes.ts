import rateLimit from '@fastify/rate-limit';
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import * as controller from '../controllers/track-vote.controller.js';
import { AppError } from '../errors/app-error.js';
import { errorResponseSchema } from '../schemas/error.schema.js';
import { spaceIdParamsSchema, type SpaceIdParams } from '../schemas/space.schema.js';
import {
  proposalCreated,
  proposalParams,
  proposeTrackBody,
  queueSchema,
  voteBody,
} from '../schemas/track-vote.schema.js';

const PROPOSALS_PER_MINUTE = 10;
const VOTES_PER_MINUTE = 60;
const secured = { tags: ['track-vote'], security: [{ bearerAuth: [] }] };
const readErrors = {
  400: errorResponseSchema.describe('VALIDATION_ERROR'),
  401: errorResponseSchema.describe('Missing or invalid access token'),
  404: errorResponseSchema.describe('SPACE_NOT_FOUND'),
};
const presenceRule =
  'In a location_time event, a non-owner must send position, be inside the vote zone and act during its time slot, checked against the server clock in the time zone of the event.';
const writeErrors = {
  ...readErrors,
  400: errorResponseSchema.describe('VALIDATION_ERROR or POSITION_REQUIRED'),
  403: errorResponseSchema.describe(
    'SPACE_ACTION_FORBIDDEN, VOTE_NOT_STARTED, VOTE_ENDED or OUTSIDE_VOTE_ZONE',
  ),
  429: errorResponseSchema.describe('RATE_LIMITED'),
};

export const trackVoteRoutes: FastifyPluginAsyncZod = async (server) => {
  server.addHook('onRequest', server.authenticate);
  await server.register(rateLimit, {
    global: false,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.auth.userId,
    errorResponseBuilder: () =>
      new AppError(429, 'RATE_LIMITED', 'Too many requests, try again later'),
  });
  const limitProposals = server.rateLimit<{
    Params: SpaceIdParams;
    Body: z.infer<typeof proposeTrackBody>;
  }>({ max: PROPOSALS_PER_MINUTE });
  const limitVotes = server.rateLimit<{
    Params: z.infer<typeof proposalParams>;
    Body: z.infer<typeof voteBody>;
  }>({
    max: VOTES_PER_MINUTE,
  });
  server.get(
    '/:id/queue',
    {
      schema: {
        ...secured,
        summary: 'List queued tracks by votes, then oldest proposal and id',
        params: spaceIdParamsSchema,
        response: { ...readErrors, 200: queueSchema },
      },
    },
    controller.listQueue,
  );
  server.post(
    '/:id/proposals',
    {
      preHandler: limitProposals,
      schema: {
        ...secured,
        summary: 'Propose a catalog track',
        description: `Up to ${PROPOSALS_PER_MINUTE} proposals per minute per user across events. ${presenceRule}`,
        params: spaceIdParamsSchema,
        body: proposeTrackBody,
        response: {
          ...writeErrors,
          201: proposalCreated,
          404: errorResponseSchema.describe('SPACE_NOT_FOUND or TRACK_NOT_FOUND'),
          409: errorResponseSchema.describe('TRACK_ALREADY_QUEUED'),
        },
      },
    },
    controller.proposeTrack,
  );
  const voteSchema = {
    ...secured,
    params: proposalParams,
    body: voteBody,
    description: `Adding and removing a vote are idempotent and share a limit of ${VOTES_PER_MINUTE} requests per minute per user across events. ${presenceRule}`,
    response: {
      ...writeErrors,
      204: z.null(),
      404: errorResponseSchema.describe('SPACE_NOT_FOUND or PROPOSAL_NOT_FOUND'),
    },
  };
  server.put(
    '/:id/proposals/:proposalId/vote',
    { preHandler: limitVotes, schema: { ...voteSchema, summary: 'Vote for a queued proposal' } },
    controller.vote,
  );
  server.delete(
    '/:id/proposals/:proposalId/vote',
    {
      preHandler: limitVotes,
      schema: { ...voteSchema, summary: 'Remove my vote from a queued proposal' },
    },
    controller.removeVote,
  );
};
