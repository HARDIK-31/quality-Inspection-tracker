import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.ts';
import { unauthorized } from '../lib/errors.ts';

export interface AuthTokenPayload {
  sub: string;
  username: string;
  displayName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function readBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme?.toLowerCase() !== 'bearer') return null;
  return token;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readBearer(req.headers.authorization);
  if (!token) {
    next(unauthorized('Missing bearer token'));
    return;
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    next();
  } catch {
    next(unauthorized('Token is invalid or has expired'));
  }
};
