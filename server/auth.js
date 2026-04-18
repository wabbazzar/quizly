/**
 * Authentication module for Quizly Sync Server.
 *
 * JWT (HS256, 30-day expiry) + bcrypt (12 rounds) + rate limiting.
 * Mirrors shredly's auth.ts pattern.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { getDb } from './db.js';
import { users } from './schema.js';

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '30d';

function getJwtSecret() {
  const secret = process.env.QUIZLY_JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'test') {
    return 'test-only-jwt-secret';
  }

  throw new Error(
    'QUIZLY_JWT_SECRET environment variable is required. ' +
    'Generate one with: openssl rand -base64 32'
  );
}

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function createToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

/**
 * Extract and verify JWT from Authorization header.
 * Validates JWT AND checks user still exists in DB.
 */
export function requireAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError(401, 'Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    throw new AuthError(401, 'Invalid or expired token');
  }

  // Verify user still exists
  const db = getDb();
  const user = db.select({ id: users.id }).from(users).where(eq(users.id, payload.userId)).all();
  if (user.length === 0) {
    throw new AuthError(401, 'User no longer exists — please re-login');
  }

  return payload;
}

/**
 * Verify user has required role. Throws 403 if not.
 */
export function requireRole(payload, ...roles) {
  if (!roles.includes(payload.role)) {
    throw new AuthError(403, `Requires one of: ${roles.join(', ')}`);
  }
}

export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

// --- Rate limiting ---

const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export function resetRateLimit(key) {
  rateLimitMap.delete(key);
}
