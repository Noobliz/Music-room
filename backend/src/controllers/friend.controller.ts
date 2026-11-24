import { type FastifyReply, type FastifyRequest } from 'fastify';

import {
  type FriendRequestIdParams,
  type FriendUserIdParams,
  type SendFriendRequestBody,
  type UserSearchQuery,
} from '../schemas/friend.schema.js';
import * as friendService from '../services/friend.service.js';

export const listFriends = async (request: FastifyRequest) => {
  return friendService.listFriends(request.auth);
};

export const removeFriend = async (
  request: FastifyRequest<{ Params: FriendUserIdParams }>,
  reply: FastifyReply,
) => {
  await friendService.removeFriend(request.auth, request.params.userId);
  return reply.status(204).send();
};

export const listFriendRequests = async (request: FastifyRequest) => {
  return friendService.listFriendRequests(request.auth);
};

export const sendFriendRequest = async (
  request: FastifyRequest<{ Body: SendFriendRequestBody }>,
  reply: FastifyReply,
) => {
  const friendRequest = await friendService.sendFriendRequest(request.auth, request.body.userId);
  return reply.status(201).send(friendRequest);
};

export const acceptFriendRequest = async (
  request: FastifyRequest<{ Params: FriendRequestIdParams }>,
) => {
  return friendService.acceptFriendRequest(request.auth, request.params.id);
};

export const deleteFriendRequest = async (
  request: FastifyRequest<{ Params: FriendRequestIdParams }>,
  reply: FastifyReply,
) => {
  await friendService.deleteFriendRequest(request.auth, request.params.id);
  return reply.status(204).send();
};

export const searchUsers = async (request: FastifyRequest<{ Querystring: UserSearchQuery }>) => {
  return friendService.searchUsers(request.auth, request.query.q);
};
