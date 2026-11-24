import { type FastifyRequest } from 'fastify';
import { type RawData, type WebSocket } from 'ws';

import { AppError } from '../errors/app-error.js';
import { type ClientMessage, clientMessageSchema } from '../schemas/realtime.schema.js';
import * as realtimeService from '../services/realtime.service.js';

export const HEARTBEAT_INTERVAL_MS = 30_000;

const parseMessage = (raw: RawData): ClientMessage | undefined => {
  try {
    const parsed = clientMessageSchema.safeParse(JSON.parse(raw.toString()));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

const handleMessage = async (
  connection: realtimeService.RealtimeConnection,
  message: ClientMessage,
): Promise<void> => {
  if (message.type === 'subscribe') {
    await realtimeService.subscribe(connection, message.spaceId);
  } else {
    realtimeService.unsubscribe(connection, message.spaceId);
  }
};

export const openConnection = (socket: WebSocket, request: FastifyRequest) => {
  const connection = realtimeService.connect({
    auth: request.auth,
    send: (message) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    },
    close: (code, reason) => socket.close(code, reason),
  });

  socket.on('message', (raw) => {
    const message = parseMessage(raw);
    if (!message) {
      connection.send({
        type: 'error',
        spaceId: null,
        version: null,
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Expected {"type":"subscribe"|"unsubscribe","spaceId":"<uuid>"}',
        },
      });
      return;
    }
    handleMessage(connection, message).catch((error: unknown) => {
      if (!(error instanceof AppError)) {
        request.log.error({ err: error }, 'Realtime message failed');
      }
      connection.send({
        type: 'error',
        spaceId: message.spaceId,
        version: null,
        data:
          error instanceof AppError
            ? { code: error.code, message: error.message }
            : { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    });
  });

  let alive = true;
  socket.on('pong', () => {
    alive = true;
  });
  const heartbeat = setInterval(() => {
    if (!alive) {
      socket.terminate();
      return;
    }
    alive = false;
    socket.ping();
    realtimeService.ensureSessionActive(connection).catch((error: unknown) => {
      request.log.error({ err: error }, 'Realtime session check failed');
    });
  }, HEARTBEAT_INTERVAL_MS);

  socket.on('close', () => {
    clearInterval(heartbeat);
    realtimeService.disconnect(connection);
  });
};
