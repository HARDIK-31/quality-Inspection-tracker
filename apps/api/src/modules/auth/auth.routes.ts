import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../prisma.ts';
import { asyncHandler } from '../../lib/asyncHandler.ts';
import { unauthorized } from '../../lib/errors.ts';
import { requireAuth, signToken } from '../../middleware/auth.ts';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const authRoutes = Router();

authRoutes.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw unauthorized('Incorrect username or password');
    }

    const payload = { sub: user.id, username: user.username, displayName: user.displayName };
    res.json({ token: signToken(payload), user: payload });
  }),
);

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user ?? null });
});
