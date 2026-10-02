import { type FastifyReply, type FastifyRequest } from 'fastify';

import { type LoginBody, type RefreshBody, type SignupBody } from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js';

export const signUp = async (
  request: FastifyRequest<{ Body: SignupBody }>,
  reply: FastifyReply,
) => {
  const result = await authService.signUp(request.body);
  return reply.status(201).send(result);
};

export const logIn = async (request: FastifyRequest<{ Body: LoginBody }>) => {
  return authService.logIn(request.body);
};

export const refresh = async (request: FastifyRequest<{ Body: RefreshBody }>) => {
  return authService.refresh(request.body);
};

export const logOut = async (request: FastifyRequest, reply: FastifyReply) => {
  await authService.logOut(request.auth.accessToken);
  return reply.status(204).send();
};

export const getMe = async (request: FastifyRequest) => {
  return authService.getCurrentUser(request.auth);
};
