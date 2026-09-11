import { appConfig } from './config.js';
import { checkDatabaseConnection, closeDatabaseConnection } from './db/client.js';
import { buildServer } from './server.js';

const main = async () => {
  const server = buildServer();

  try {
    await checkDatabaseConnection();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    server.log.error(
      { error: message },
      'Database connection failed. Check that local Supabase is running and DATABASE_URL points to the project database.',
    );
    await closeDatabaseConnection().catch(() => undefined);
    process.exitCode = 1;
    return;
  }

  try {
    await server.listen({
      host: appConfig.api.host,
      port: appConfig.api.port,
    });
  } catch (error) {
    server.log.error(error, 'API server failed to start.');
    await closeDatabaseConnection().catch(() => undefined);
    process.exitCode = 1;
  }
};

process.on('SIGINT', async () => {
  await closeDatabaseConnection().catch(() => undefined);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabaseConnection().catch(() => undefined);
  process.exit(0);
});

void main();
