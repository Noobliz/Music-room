import { z } from 'zod';

import { profileSchema } from './profile.schema.js';

export const USER_SEARCH_LIMIT = 20;

export const friendUserSchema = profileSchema
  .pick({ id: true, username: true, avatarUrl: true })
  .describe('Public fields of the other user');

export const friendSchema = z
  .object({
    user: friendUserSchema,
    friendsSince: z.string().datetime().describe('When the request was accepted'),
  })
  .describe('Accepted friend');

export const friendRequestSchema = z
  .object({
    id: z.string().uuid().describe('Friend request id'),
    user: friendUserSchema.describe('Requester for a received request, addressee for a sent one'),
    createdAt: z.string().datetime(),
  })
  .describe('Pending friend request');

export const friendRequestsSchema = z.object({
  received: z.array(friendRequestSchema).describe('Requests waiting for my answer'),
  sent: z.array(friendRequestSchema).describe('Requests waiting for the other user'),
});

export const userSearchResultSchema = friendUserSchema
  .extend({
    relationship: z
      .enum(['none', 'friend', 'request_sent', 'request_received'])
      .describe('Relationship between me and this user'),
    requestId: z
      .string()
      .uuid()
      .nullable()
      .describe('Id of the pending request, null when there is none'),
  })
  .describe('User matching the search, with the current relationship');

export const sendFriendRequestBodySchema = z
  .object({
    userId: z.string().uuid().describe('User to send the request to'),
  })
  .strict();

export const friendRequestIdParamsSchema = z.object({
  id: z.string().uuid().describe('Friend request id'),
});

export const friendUserIdParamsSchema = z.object({
  userId: z.string().uuid().describe('User id of the friend'),
});

export const userSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(30).describe('Part of the username, case-insensitive'),
});

export type FriendUser = z.infer<typeof friendUserSchema>;
export type Friend = z.infer<typeof friendSchema>;
export type FriendRequest = z.infer<typeof friendRequestSchema>;
export type FriendRequests = z.infer<typeof friendRequestsSchema>;
export type UserSearchResult = z.infer<typeof userSearchResultSchema>;
export type SendFriendRequestBody = z.infer<typeof sendFriendRequestBodySchema>;
export type FriendRequestIdParams = z.infer<typeof friendRequestIdParamsSchema>;
export type FriendUserIdParams = z.infer<typeof friendUserIdParamsSchema>;
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
