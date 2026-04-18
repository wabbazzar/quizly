/**
 * Admin routes: user management.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { users } from '../schema.js';
import { requireAuth, requireRole, hashPassword, AuthError } from '../auth.js';

const router = Router();

/**
 * POST /api/admin/users
 * Requires: admin role
 * Body: { username, password, displayName, role? }
 * Creates a new user account.
 */
router.post('/users', (req, res) => {
  try {
    const payload = requireAuth(req);
    requireRole(payload, 'admin');

    const { username, password, displayName, role = 'user' } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'username, password, and displayName are required' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'role must be "admin" or "user"' });
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    const db = getDb();

    try {
      db.insert(users).values({
        id,
        username,
        passwordHash: hashPassword(password),
        role,
        displayName,
        createdAt: now,
        updatedAt: now,
      }).run();
    } catch (err) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: `Username "${username}" already exists` });
      }
      throw err;
    }

    return res.status(201).json({
      user: { id, username, role, displayName, createdAt: now },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[admin/users] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
