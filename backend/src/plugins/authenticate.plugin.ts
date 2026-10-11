import { type FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { AppError } from '../errors/app-error.js';
import { type AuthContext, verifyAccessToken } from '../services/token.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: Pick<FastifyRequest, 'headers' | 'auth'>) => Promise<void>;
  }

  interface FastifyRequest {
    auth: AuthContext;
  }
}

const getBearerToken = (request: Pick<FastifyRequest, 'headers'>): string => {
  const [scheme, token, ...rest] = request.headers.authorization?.split(' ') ?? [];
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    throw new AppError(401, 'TOKEN_MISSING', 'Missing bearer token');
  }
  return token;
};

export const authenticatePlugin = fp(
  async (server) => {
    server.decorateRequest('auth', null as unknown as AuthContext);

    server.decorate('authenticate', async (request: Pick<FastifyRequest, 'headers' | 'auth'>) => {
      request.auth = await verifyAccessToken(getBearerToken(request));
    });
  },
  { name: 'authenticate' },
);
