import { createApp } from './app.ts';
import { env } from './env.ts';
import { disconnectPrisma } from './prisma.ts';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down`);
  server.close(() => {
    void disconnectPrisma().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
