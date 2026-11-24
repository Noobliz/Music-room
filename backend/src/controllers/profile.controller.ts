import { type FastifyReply, type FastifyRequest } from 'fastify';

import { type ProfileIdParams, type UpdateProfileBody } from '../schemas/profile.schema.js';
import * as profileService from '../services/profile.service.js';

export const getOwnProfile = async (request: FastifyRequest) => {
  return profileService.getOwnProfile(request.auth);
};

export const updateOwnProfile = async (request: FastifyRequest<{ Body: UpdateProfileBody }>) => {
  return profileService.updateOwnProfile(request.auth, request.body);
};

export const deleteAccount = async (request: FastifyRequest, reply: FastifyReply) => {
  await profileService.deleteAccount(request.auth);
  return reply.status(204).send();
};

export const replaceAvatar = async (request: FastifyRequest<{ Body: Buffer }>) => {
  return profileService.replaceAvatar(request.auth, request.headers['content-type'], request.body);
};

export const removeAvatar = async (request: FastifyRequest, reply: FastifyReply) => {
  await profileService.removeAvatar(request.auth);
  return reply.status(204).send();
};

export const getProfile = async (request: FastifyRequest<{ Params: ProfileIdParams }>) => {
  return profileService.getProfile(request.auth, request.params.id);
};
