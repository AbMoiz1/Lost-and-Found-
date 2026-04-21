import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../jwt';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const user = verifyToken(token);
    
    // Check if user has admin role
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'FORBIDDEN' });
      return;
    }
    
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}