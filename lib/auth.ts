import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { NextApiRequest } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const TOKEN_EXPIRY = '7d';

export interface AdminTokenPayload {
  id: number;
  email: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function getAdminFromRequest(req: NextApiRequest): AdminTokenPayload | null {
  // Try cookie first
  const cookieToken = req.cookies?.admin_token;
  if (cookieToken) {
    const payload = verifyToken(cookieToken);
    if (payload) return payload;
  }
  
  // Try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) return payload;
  }
  
  return null;
}
