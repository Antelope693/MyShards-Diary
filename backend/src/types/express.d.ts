import 'express';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: number;
      username: string;
      display_name?: string;
      email: string;
      role: 'user' | 'admin' | 'maintainer';
      status: 'active' | 'banned';
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};

