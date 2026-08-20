import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.ts';
import { AppError } from '../lib/errors.ts';
import { isProduction } from '../env.ts';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// { field: [messages] } so the client can highlight inputs.
function fieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

// Environment problems, not caller mistakes. Point at the missed setup step.
const DATABASE_ERROR_MESSAGES: Record<string, string> = {
  ECONNREFUSED:
    'Cannot reach PostgreSQL. Is the database running on the host/port in DATABASE_URL?',
  ENOTFOUND: 'The database host in DATABASE_URL could not be resolved.',
  EAI_AGAIN: 'The database host in DATABASE_URL could not be resolved.',
  ETIMEDOUT: 'Timed out connecting to PostgreSQL.',
  ECONNRESET: 'The database connection was reset.',
  P1001: 'Cannot reach PostgreSQL. Is the database running on the host/port in DATABASE_URL?',
  P1002: 'Timed out connecting to PostgreSQL.',
  P1017: 'PostgreSQL closed the connection.',
  P2024: 'Timed out acquiring a database connection from the pool.',
  '28P01': 'PostgreSQL rejected the credentials in DATABASE_URL.',
  '3D000': 'The database named in DATABASE_URL does not exist.',
  '42P01': 'Tables are missing. Run `npm run db:deploy` (or `db:migrate`) to apply migrations.',
};

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: `No route matches ${req.method} ${req.originalUrl}` },
  };
  res.status(404).json(body);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields are invalid',
        details: fieldErrors(err),
      },
    };
    res.status(422).json(body);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: { code: 'DUPLICATE', message: 'A record with this reference already exists' },
      } satisfies ApiErrorBody);
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      } satisfies ApiErrorBody);
      return;
    }
  }

  const bodyParserType = (err as { type?: string }).type;
  if (bodyParserType === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON' },
    } satisfies ApiErrorBody);
    return;
  }
  if (bodyParserType === 'entity.too.large') {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the 256kb limit' },
    } satisfies ApiErrorBody);
    return;
  }

  const infraMessage = DATABASE_ERROR_MESSAGES[String((err as { code?: string }).code)];
  if (infraMessage || err instanceof Prisma.PrismaClientInitializationError) {
    console.error('[db] unavailable:', (err as Error).message);
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: infraMessage ?? 'Cannot reach the database.',
      },
    } satisfies ApiErrorBody);
    return;
  }

  console.error('[api] unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      details: isProduction ? undefined : String(err instanceof Error ? err.stack : err),
    },
  } satisfies ApiErrorBody);
};
