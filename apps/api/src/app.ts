import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction } from './env.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import { inspectionRoutes } from './modules/inspections/inspection.routes.ts';
import { authRoutes } from './modules/auth/auth.routes.ts';
import { sapRoutes } from './modules/sap/sap.routes.ts';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(morgan(isProduction ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/inspections', inspectionRoutes);
  app.use('/api/sap-webhook', sapRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
