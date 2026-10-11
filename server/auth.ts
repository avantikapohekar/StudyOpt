import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbInstance, UserRecord } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'studyos-secure-dev-jwt-secret-key-98765';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  college?: string;
  timezone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user: UserRecord): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      college: user.college,
      timezone: user.timezone,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    return decoded;
  } catch (err) {
    return null;
  }
}

export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  } else if (req.cookies && req.cookies.studyos_token) {
    token = req.cookies.studyos_token;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required to access this endpoint',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    });
  }

  // Verify user still exists in database
  const user = dbInstance.db.users.find(u => u.id === payload.id);
  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'User no longer exists',
    });
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    college: user.college,
    timezone: user.timezone,
  };

  next();
}
