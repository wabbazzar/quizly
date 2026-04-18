/**
 * Quizly Sync Server
 *
 * Express server for auth + sync. Runs on localhost:3001,
 * exposed via Caddy reverse proxy at api.quizly.me.
 */

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';

// Initialize database before accepting requests
initDatabase();

const app = express();
const PORT = parseInt(process.env.QUIZLY_PORT ?? '3001', 10);

// --- Middleware ---

app.use(express.json({ limit: '10mb' }));

app.use(cors({
  origin: [
    'https://quizly.me',
    'https://www.quizly.me',
    'http://localhost:5177',
    'http://localhost:4173',
  ],
  credentials: true,
}));

// --- Health check ---

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- Route mounting ---
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import syncRoutes from './routes/sync.js';
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sync', syncRoutes);

// --- Start ---

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[quizly-server] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[quizly-server] Health: http://127.0.0.1:${PORT}/api/health`);
});
