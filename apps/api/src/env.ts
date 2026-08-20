import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Comma-separated, or * for any origin.
  CORS_ORIGIN: z.string().default('*'),

  JWT_SECRET: z.string().min(16).default('a9e3feaf15997f1c948d0f240a2382589a59aa98a0a6e262395feff3b11f8d36'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  // When set, the webhook requires a matching x-sap-signature header.
  SAP_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${details}\n`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
