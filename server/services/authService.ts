import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb, queryOne, runSql } from '../database/db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'staff-monitor-ph-jwt-secret-2026-safe-key';
const TOKEN_EXPIRY = '7d';

export interface AuthUserPayload {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: 'ADMINISTRATOR' | 'EMPLOYEE';
  department: string;
  position: string;
  avatar: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export async function loginUser(credential: string, passwordPlain: string, ipAddress?: string) {
  const db = await getDb();
  const trimmed = credential.trim().toLowerCase();

  // Find by email or employee_id
  const user = queryOne(
    db,
    `SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(employee_id) = ?`,
    [trimmed, trimmed]
  );

  if (!user) {
    throw new Error('Invalid email/employee ID or password');
  }

  if (user.is_active === 0) {
    throw new Error('This account has been disabled. Please contact your system administrator.');
  }

  const isMatch = bcrypt.compareSync(passwordPlain, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email/employee ID or password');
  }

  const payload: AuthUserPayload = {
    id: user.id,
    employee_id: user.employee_id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    position: user.position,
    avatar: user.avatar,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  // Record login in audit logs
  runSql(
    db,
    `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, ?, ?, ?)`,
    [user.id, 'USER_LOGIN', JSON.stringify({ ip: ipAddress || 'local', timestamp: new Date().toISOString() }), new Date().toISOString()]
  );

  return { user: payload, token };
}

export function verifyToken(token: string): AuthUserPayload {
  return jwt.verify(token, JWT_SECRET) as AuthUserPayload;
}

export const authenticateJwt = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMINISTRATOR') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required' });
  }
  next();
};
