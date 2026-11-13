import { type FastifyReply, type FastifyRequest } from 'fastify';

import {
  type CreateSpaceBody,
  type InviteToSpaceBody,
  type MySpacesQuery,
  type SpaceIdParams,
  type SpaceInvitationParams,
  type SpaceSearchQuery,
  type UpdateSpaceBody,
} from '../schemas/space.schema.js';
import * as spaceService from '../services/space.service.js';

export const createSpace = async (
  request: FastifyRequest<{ Body: CreateSpaceBody }>,
  reply: FastifyReply,
) => {
  const space = await spaceService.createSpace(request.auth, request.body);
  return reply.status(201).send(space);
};

export const searchSpaces = async (request: FastifyRequest<{ Querystring: SpaceSearchQuery }>) => {
  return spaceService.searchSpaces(request.auth, request.query);
};

export const listMySpaces = async (request: FastifyRequest<{ Querystring: MySpacesQuery }>) => {
  return spaceService.listMySpaces(request.auth, request.query);
};

export const getSpace = async (request: FastifyRequest<{ Params: SpaceIdParams }>) => {
  return spaceService.getSpace(request.auth, request.params.id);
};

export const updateSpace = async (
  request: FastifyRequest<{ Params: SpaceIdParams; Body: UpdateSpaceBody }>,
) => {
  return spaceService.updateSpace(request.auth, request.params.id, request.body);
};

export const deleteSpace = async (
  request: FastifyRequest<{ Params: SpaceIdParams }>,
  reply: FastifyReply,
) => {
  await spaceService.deleteSpace(request.auth, request.params.id);
  return reply.status(204).send();
};

export const listInvitations = async (request: FastifyRequest<{ Params: SpaceIdParams }>) => {
  return spaceService.listInvitations(request.auth, request.params.id);
};

export const inviteToSpace = async (
  request: FastifyRequest<{ Params: SpaceIdParams; Body: InviteToSpaceBody }>,
  reply: FastifyReply,
) => {
  const invitation = await spaceService.inviteToSpace(
    request.auth,
    request.params.id,
    request.body.userId,
  );
  return reply.status(201).send(invitation);
};

export const removeInvitation = async (
  request: FastifyRequest<{ Params: SpaceInvitationParams }>,
  reply: FastifyReply,
) => {
  await spaceService.removeInvitation(request.auth, request.params.id, request.params.userId);
  return reply.status(204).send();
};
