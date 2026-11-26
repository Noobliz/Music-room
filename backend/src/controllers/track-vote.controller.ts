import { type FastifyRequest, type FastifyReply } from 'fastify';
import { type z } from 'zod';
import { type SpaceIdParams } from '../schemas/space.schema.js';
import {
  type proposalParams,
  type proposeTrackBody,
  type voteBody,
} from '../schemas/track-vote.schema.js';
import * as trackVote from '../services/track-vote.service.js';

export const listQueue = (request: FastifyRequest<{ Params: SpaceIdParams }>) =>
  trackVote.listQueue(request.auth, request.params.id);

export const proposeTrack = async (
  request: FastifyRequest<{ Params: SpaceIdParams; Body: z.infer<typeof proposeTrackBody> }>,
  reply: FastifyReply,
) =>
  reply
    .status(201)
    .send(
      await trackVote.proposeTrack(
        request.log,
        request.auth,
        request.params.id,
        request.body.trackId,
        request.body.position,
      ),
    );

type VoteRequest = FastifyRequest<{
  Params: z.infer<typeof proposalParams>;
  Body: z.infer<typeof voteBody>;
}>;
export const vote = async (request: VoteRequest, reply: FastifyReply) => {
  await trackVote.setVote(
    request.log,
    request.auth,
    request.params.id,
    request.params.proposalId,
    true,
    request.body.position,
  );
  return reply.status(204).send();
};
export const removeVote = async (request: VoteRequest, reply: FastifyReply) => {
  await trackVote.setVote(
    request.log,
    request.auth,
    request.params.id,
    request.params.proposalId,
    false,
    request.body.position,
  );
  return reply.status(204).send();
};
