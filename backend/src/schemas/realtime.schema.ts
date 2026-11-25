import { z } from 'zod';

import { type ErrorCode } from '../errors/error-codes.js';
import { type SpaceView } from './space.schema.js';

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('subscribe'), spaceId: z.string().uuid() }).strict(),
  z.object({ type: z.literal('unsubscribe'), spaceId: z.string().uuid() }).strict(),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export type ServerMessage =
  | { type: 'subscribed'; spaceId: string; version: number; data: null }
  | { type: 'space.updated'; spaceId: string; version: number; data: SpaceView }
  | { type: 'space.deleted'; spaceId: string; version: number; data: null }
  | { type: 'space.access_revoked'; spaceId: string; version: number; data: null }
  | {
      type: 'error';
      spaceId: string | null;
      version: null;
      data: { code: ErrorCode; message: string };
    };
