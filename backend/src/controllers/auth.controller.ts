import { type FastifyReply, type FastifyRequest } from 'fastify';

import {
  type EmailBody,
  type EmailLinkQuery,
  type LoginBody,
  type RefreshBody,
  type ResetPasswordBody,
  type SignupBody,
  type VerifyEmailBody,
} from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js';

export const signUp = async (
  request: FastifyRequest<{ Body: SignupBody }>,
  reply: FastifyReply,
) => {
  const result = await authService.signUp(request.body);
  return reply.status(201).send(result);
};

export const redirectToApp = async (
  request: FastifyRequest<{ Querystring: EmailLinkQuery }>,
  reply: FastifyReply,
) => {
  return reply.redirect(authService.buildAppLink(request.query), 302);
};

export const verifyEmail = async (request: FastifyRequest<{ Body: VerifyEmailBody }>) => {
  return authService.verifyEmail(request.body);
};

export const resendConfirmation = async (
  request: FastifyRequest<{ Body: EmailBody }>,
  reply: FastifyReply,
) => {
  await authService.resendConfirmation(request.body);
  return reply
    .status(202)
    .send({ message: 'If an unverified account uses this email, a confirmation email was sent' });
};

export const forgotPassword = async (
  request: FastifyRequest<{ Body: EmailBody }>,
  reply: FastifyReply,
) => {
  await authService.requestPasswordReset(request.body);
  return reply
    .status(202)
    .send({ message: 'If an account uses this email, a password reset email was sent' });
};

export const resetPassword = async (
  request: FastifyRequest<{ Body: ResetPasswordBody }>,
  reply: FastifyReply,
) => {
  await authService.resetPassword(request.body);
  return reply.status(204).send();
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
