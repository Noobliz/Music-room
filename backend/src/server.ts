import Fastify from 'fastify';

export const buildServer = () => {
  const server = Fastify({
    logger: true,
  });

  server.get('/health', async () => {
    return { status: 'ok' };
  });

  return server;
};
