import { isSessionActive } from '../models/session.model.js';
import { type ServerMessage } from '../schemas/realtime.schema.js';
import { requireViewableSpace, type SpaceAccess } from './space-access.service.js';
import { type AuthContext } from './token.service.js';

export const UNAUTHORIZED_CLOSE_CODE = 4401;

export type RealtimeConnection = {
  auth: AuthContext;
  send: (message: ServerMessage) => void;
  close: (code: number, reason: string) => void;
};

const connections = new Map<RealtimeConnection, Set<string>>();
const subscriptions = new Map<string, Map<RealtimeConnection, SpaceAccess>>();

export const connect = (connection: RealtimeConnection): RealtimeConnection => {
  connections.set(connection, new Set());
  return connection;
};

export const unsubscribe = (connection: RealtimeConnection, spaceId: string): void => {
  connections.get(connection)?.delete(spaceId);
  const subscribers = subscriptions.get(spaceId);
  subscribers?.delete(connection);
  if (subscribers?.size === 0) {
    subscriptions.delete(spaceId);
  }
};

export const disconnect = (connection: RealtimeConnection): void => {
  for (const spaceId of connections.get(connection) ?? []) {
    unsubscribe(connection, spaceId);
  }
  connections.delete(connection);
};

export const subscribe = async (connection: RealtimeConnection, spaceId: string): Promise<void> => {
  const space = await requireViewableSpace(connection.auth, spaceId);
  const spaceIds = connections.get(connection);
  if (!spaceIds) {
    return;
  }
  spaceIds.add(spaceId);
  const subscribers = subscriptions.get(spaceId) ?? new Map<RealtimeConnection, SpaceAccess>();
  subscriptions.set(spaceId, subscribers.set(connection, space.access));
  connection.send({ type: 'subscribed', spaceId, version: space.version, data: null });
};

export const subscribersOf = (spaceId: string): [RealtimeConnection, SpaceAccess][] => [
  ...(subscriptions.get(spaceId) ?? []),
];

export const updateSubscriberAccess = (
  connection: RealtimeConnection,
  spaceId: string,
  access: SpaceAccess,
): void => {
  subscriptions.get(spaceId)?.set(connection, access);
};

export const closeSpace = (spaceId: string, message: ServerMessage): void => {
  for (const [connection] of subscribersOf(spaceId)) {
    connection.send(message);
    unsubscribe(connection, spaceId);
  }
};

export const ensureSessionActive = async (connection: RealtimeConnection): Promise<void> => {
  const { userId, sessionId, expiresAt } = connection.auth;
  if (expiresAt.getTime() <= Date.now()) {
    connection.close(UNAUTHORIZED_CLOSE_CODE, 'TOKEN_EXPIRED');
  } else if (!(await isSessionActive(sessionId, userId))) {
    connection.close(UNAUTHORIZED_CLOSE_CODE, 'TOKEN_INVALID');
  }
};
