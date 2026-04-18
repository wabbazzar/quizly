/**
 * Auth routes: login, current user info.
 */

import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { users } from '../schema.js';
import {
  verifyPassword,
  createToken,
  requireAuth,
  AuthError,
  checkRateLimit,
  resetRateLimit,
} from '../auth.js';

const router = Router();

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, user: { id, username, role, displayName } }
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Rate limiting
    if (!checkRateLimit(`login:${username}`)) {
      return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
    }

    const db = getDb();
    const [user] = db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .all();

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Successful login — reset rate limit
    resetRateLimit(`login:${username}`);

    const token = createToken(user);

    // Update lastSyncAt
    db.update(users)
      .set({ lastSyncAt: new Date().toISOString() })
      .where(eq(users.id, user.id))
      .run();

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[auth/login] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Requires: Bearer token
 * Returns: current user info
 */
router.get('/me', (req, res) => {
  try {
    const payload = requireAuth(req);

    const db = getDb();
    const [user] = db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .all();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[auth/me] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
