import { z } from 'zod';

import { type ErrorCode } from '../errors/error-codes.js';
import { spaceIdSchema, type SpaceView } from './space.schema.js';
import { type EventQueue } from './track-vote.schema.js';

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('subscribe'), spaceId: spaceIdSchema }).strict(),
  z.object({ type: z.literal('unsubscribe'), spaceId: spaceIdSchema }).strict(),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export type ServerMessage =
  | { type: 'subscribed'; spaceId: string; version: number; data: null }
  | { type: 'space.updated'; spaceId: string; version: number; data: SpaceView }
  | { type: 'queue.updated'; spaceId: string; version: number; data: Pick<EventQueue, 'items'> }
  | { type: 'space.deleted'; spaceId: string; version: number; data: null }
  | { type: 'space.access_revoked'; spaceId: string; version: number; data: null }
  | {
      type: 'error';
      spaceId: string | null;
      version: null;
      data: { code: ErrorCode; message: string };
    };
