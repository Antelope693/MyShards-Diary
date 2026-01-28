import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbGet } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function extractToken(header?: string) {
  if (!header) return null;
  if (header.startsWith('Bearer ')) {
    return header.substring(7);
  }
  return header;
}

async function resolveUser(rawToken: string) {
  const payload = jwt.verify(rawToken, JWT_SECRET) as Express.AuthenticatedUser;
  const dbUser = await dbGet(
    'SELECT id, username, display_name, email, role, status FROM users WHERE id = ?',
    [payload.id]
  );
  if (!dbUser) {
    throw new Error('USER_NOT_FOUND');
  }
  if (dbUser.status === 'banned') {
    const err = new Error('ACCOUNT_BANNED');
    throw err;
  }
  return {
    id: dbUser.id,
    username: dbUser.username,
    display_name: dbUser.display_name,
    email: dbUser.email,
    role: dbUser.role as 'user' | 'admin' | 'maintainer',
    status: dbUser.status as 'active' | 'banned',
  };
}

function handleAuthError(res: Response, error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'ACCOUNT_BANNED') {
      return res.status(403).json({ error: '账号已被封禁，请联系维护者' });
    }
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(401).json({ error: '身份验证失效，请重新登录' });
    }
  }
  console.error('认证失败:', error);
  return res.status(401).json({ error: '身份验证失效，请重新登录' });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = extractToken(req.headers.authorization as string | undefined);
    if (!rawToken) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const user = await resolveUser(rawToken);
    req.user = user;
    next();
  } catch (error) {
    return handleAuthError(res, error);
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const rawToken = extractToken(req.headers.authorization as string | undefined);
  if (!rawToken) {
    return next();
  }
  try {
    const user = await resolveUser(rawToken);
    req.user = user;
  } catch (error) {
    console.warn('可选认证失败，继续以游客身份访问');
  }
  next();
}

export function requireMaintainer(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: '需要身份验证' });
  }

  if (req.user.role !== 'maintainer') {
    return res.status(403).json({ error: '需要维护者权限' });
  }

  next();
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: '需要身份验证' });
  }

  if (req.user.role !== 'maintainer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员或维护者权限' });
  }

  next();
}

