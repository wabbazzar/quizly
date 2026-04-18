/**
 * Sync routes: full sync, delta sync for decks and progress.
 *
 * LWW (Last-Write-Wins) conflict resolution based on updatedAt timestamps.
 * Mirrors shredly's sync pattern.
 */

import { Router } from 'express';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { decks, progress, syncCursors, users } from '../schema.js';
import { requireAuth, AuthError } from '../auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authMiddleware(req, res, next) {
  try {
    req.auth = requireAuth(req);
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

router.use(authMiddleware);

/**
 * Upsert a deck row with LWW: only write if incoming updatedAt >= server row's updatedAt.
 */
function upsertDeck(db, userId, deck) {
  const now = new Date().toISOString();
  const existing = db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deck.id), eq(decks.userId, userId)))
    .all();

  if (existing.length === 0) {
    // Insert new
    db.insert(decks).values({
      id: deck.id,
      userId,
      deckJson: typeof deck.deckJson === 'string' ? deck.deckJson : JSON.stringify(deck.deckJson),
      updatedAt: deck.updatedAt || now,
      deleted: deck.deleted || false,
      version: deck.version || 1,
      syncedAt: now,
    }).run();
    return true;
  }

  // LWW: only update if incoming is newer or same time
  const serverRow = existing[0];
  if (deck.updatedAt >= serverRow.updatedAt) {
    db.update(decks)
      .set({
        deckJson: typeof deck.deckJson === 'string' ? deck.deckJson : JSON.stringify(deck.deckJson),
        updatedAt: deck.updatedAt,
        deleted: deck.deleted || false,
        version: (serverRow.version || 0) + 1,
        syncedAt: now,
      })
      .where(and(eq(decks.id, deck.id), eq(decks.userId, userId)))
      .run();
    return true;
  }

  return false; // Server version is newer, skip
}

/**
 * Upsert a progress row with LWW.
 */
function upsertProgress(db, userId, prog) {
  const now = new Date().toISOString();
  const existing = db
    .select()
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.deckId, prog.deckId)))
    .all();

  if (existing.length === 0) {
    db.insert(progress).values({
      id: prog.id || uuidv4(),
      userId,
      deckId: prog.deckId,
      progressJson: typeof prog.progressJson === 'string' ? prog.progressJson : JSON.stringify(prog.progressJson),
      updatedAt: prog.updatedAt || now,
      deleted: prog.deleted || false,
      version: prog.version || 1,
      syncedAt: now,
    }).run();
    return true;
  }

  const serverRow = existing[0];
  if (prog.updatedAt >= serverRow.updatedAt) {
    db.update(progress)
      .set({
        progressJson: typeof prog.progressJson === 'string' ? prog.progressJson : JSON.stringify(prog.progressJson),
        updatedAt: prog.updatedAt,
        deleted: prog.deleted || false,
        version: (serverRow.version || 0) + 1,
        syncedAt: now,
      })
      .where(eq(progress.id, serverRow.id))
      .run();
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// POST /api/sync/full — Full sync (first login)
// ---------------------------------------------------------------------------

router.post('/full', (req, res) => {
  try {
    const { userId } = req.auth;
    const { decks: clientDecks = [], progress: clientProgress = [] } = req.body;
    const db = getDb();
    const now = new Date().toISOString();

    // Push client data
    for (const deck of clientDecks) {
      upsertDeck(db, userId, deck);
    }
    for (const prog of clientProgress) {
      upsertProgress(db, userId, prog);
    }

    // Pull all server data for this user
    const serverDecks = db
      .select()
      .from(decks)
      .where(eq(decks.userId, userId))
      .all();

    const serverProgress = db
      .select()
      .from(progress)
      .where(eq(progress.userId, userId))
      .all();

    // Update sync cursors
    for (const dataType of ['decks', 'progress']) {
      db.insert(syncCursors)
        .values({ userId, dataType, lastSyncAt: now, lastRowVersion: 0 })
        .onConflictDoUpdate({
          target: [syncCursors.userId, syncCursors.dataType],
          set: { lastSyncAt: now },
        })
        .run();
    }

    // Update user lastSyncAt
    db.update(users)
      .set({ lastSyncAt: now })
      .where(eq(users.id, userId))
      .run();

    return res.json({
      decks: serverDecks,
      progress: serverProgress,
      syncedAt: now,
    });
  } catch (err) {
    console.error('[sync/full] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/sync/decks — Push deck changes
// ---------------------------------------------------------------------------

router.post('/decks', (req, res) => {
  try {
    const { userId } = req.auth;
    const { decks: clientDecks = [] } = req.body;
    const db = getDb();

    if (clientDecks.length > 100) {
      return res.status(400).json({ error: 'Max 100 decks per request' });
    }

    let accepted = 0;
    for (const deck of clientDecks) {
      if (upsertDeck(db, userId, deck)) accepted++;
    }

    return res.json({ accepted, total: clientDecks.length });
  } catch (err) {
    console.error('[sync/decks] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/sync/decks?since= — Pull deck changes
// ---------------------------------------------------------------------------

router.get('/decks', (req, res) => {
  try {
    const { userId } = req.auth;
    const since = req.query.since || '1970-01-01T00:00:00.000Z';
    const db = getDb();

    const rows = db
      .select()
      .from(decks)
      .where(and(eq(decks.userId, userId), gt(decks.syncedAt, since)))
      .all();

    return res.json({ decks: rows, since });
  } catch (err) {
    console.error('[sync/decks GET] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/sync/progress — Push progress changes
// ---------------------------------------------------------------------------

router.post('/progress', (req, res) => {
  try {
    const { userId } = req.auth;
    const { progress: clientProgress = [] } = req.body;
    const db = getDb();

    if (clientProgress.length > 100) {
      return res.status(400).json({ error: 'Max 100 progress entries per request' });
    }

    let accepted = 0;
    for (const prog of clientProgress) {
      if (upsertProgress(db, userId, prog)) accepted++;
    }

    return res.json({ accepted, total: clientProgress.length });
  } catch (err) {
    console.error('[sync/progress] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/sync/progress?since= — Pull progress changes
// ---------------------------------------------------------------------------

router.get('/progress', (req, res) => {
  try {
    const { userId } = req.auth;
    const since = req.query.since || '1970-01-01T00:00:00.000Z';
    const db = getDb();

    const rows = db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), gt(progress.syncedAt, since)))
      .all();

    return res.json({ progress: rows, since });
  } catch (err) {
    console.error('[sync/progress GET] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/sync/summary — Data counts for integrity checks
// ---------------------------------------------------------------------------

router.get('/summary', (req, res) => {
  try {
    const { userId } = req.auth;
    const db = getDb();

    const deckCount = db
      .select()
      .from(decks)
      .where(and(eq(decks.userId, userId), eq(decks.deleted, false)))
      .all().length;

    const progressCount = db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.deleted, false)))
      .all().length;

    return res.json({
      decks: deckCount,
      progress: progressCount,
    });
  } catch (err) {
    console.error('[sync/summary] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
