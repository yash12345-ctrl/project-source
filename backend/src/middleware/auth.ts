import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../utils/jwt';
import { prisma } from '../db/db';

export interface AuthRequest extends Request {
  user?: {
    username: string;
    token_version: number;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
    return;
  }

  const token = authHeader.split(' ')[1] as string;
  const payload = verifySessionToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    return;
  }

  const account = await prisma.academiaAccount.findUnique({
    where: { username: payload.username },
    select: { token_version: true }
  });

  if (!account || account.token_version !== payload.token_version) {
    res.status(401).json({ success: false, error: 'Session revoked (password changed)', code: 'SESSION_REVOKED' });
    return;
  }

  req.user = payload;
  next();
};
