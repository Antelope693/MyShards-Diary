import { Request, Response, NextFunction } from 'express';

// 简单的身份验证中间件
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization;
  
  if (token === 'authenticated') {
    next();
  } else {
    res.status(401).json({ error: '需要身份验证' });
  }
}

