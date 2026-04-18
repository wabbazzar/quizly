# Ticket 015: Multi-User Support with Server Sync

## Metadata

- **Status**: Backlog
- **Priority**: Critical
- **Effort**: 89 points (18 slices across 6 phases)
- **Created**: 2026-04-17
- **Type**: feature
- **Platforms**: Web (PWA - iOS Safari, Android Chrome, Desktop browsers)
- **Reference**: Shredly 2.0 architecture (`/home/wabbazzar/code/shredly2/`)

## Summary

Transform Quizly from a single-user, static-data PWA into a multi-user application with authentication, server-side persistence, and user-created content. Mirrors Shredly 2.0's proven architecture: IndexedDB for client-side storage (replacing raw localStorage for large data), JWT auth against a self-hosted Node.js + SQLite sync server on `wabbazzar-ice`, delta sync on a timer, and guest mode with zero-friction onboarding.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Client storage (large data) | IndexedDB (raw API, no library) | Matches shredly; localStorage is 5-10MB max, IndexedDB is unbounded. Decks, progress, mastery data move here. |
| Client storage (small prefs) | localStorage via Zustand persist | Keep existing pattern for settings, theme, UI prefs. Small payloads only. |
| Server DB | SQLite + Drizzle ORM | Matches shredly; single-file DB, WAL mode, runs on wabbazzar-ice. |
| Auth | JWT (HS256, 30-day expiry) + bcrypt | Matches shredly; no registration UI for now (admin creates accounts). |
| Sync | Delta sync every 5 min + full sync on login | Matches shredly's syncEngine.ts pattern. Offline queue with retry. |
| Reverse proxy | Caddy at `api.quizly.me` | Matches shredly; auto-TLS, reverse proxy to localhost Node process. |
| Server framework | Express.js (standalone, not Vite SSR) | Quizly is React+Vite (not SvelteKit); server is a separate process like shredly's `server.js`. |
| Guest mode | localStorage flag, no server contact | Matches shredly; guest data migrates to server on first login. |
| Default content | Chinese decks ship as "library" defaults | Guests get Chinese decks auto-loaded; logged-in users can import from library. |

## Dependency Graph

```
Phase 0: CLAUDE.md parity
    |
Phase 1: IndexedDB client storage layer
    |
Phase 2: Server infrastructure (schema, auth, API)
    |
    +-- Phase 3: Sync engine (client-side)
    |       |
    |       +-- Phase 4: Auth UI + guest flow
    |               |
    |               +-- Phase 5: User content creation
    |                       |
    |                       +-- Phase 6: First-time walkthrough
```

---

## Phase 0: CLAUDE.md Parity with Shredly Standards (3 points)

Bring Quizly's CLAUDE.md up to the same rigor as Shredly's for server-side development patterns. This is prerequisite context for all subsequent phases.

### Slice 0.1: Update CLAUDE.md with server architecture section (S, 3 pts) -- DONE

**Description:** Add sections to CLAUDE.md covering: server architecture (Node.js + SQLite + Caddy on wabbazzar-ice), deployment protocol (server restart vs. static deploy), sync server key files table, localStorage key registry, IndexedDB database registry, API endpoint table, and commit strategy for server-side changes.

**Acceptance criteria:**
- [ ] CLAUDE.md has a "Hosting: Self-Hosted Sync Server" section mirroring shredly's pattern (Caddy -> Node -> SQLite)
- [ ] CLAUDE.md has a localStorage key registry listing every key and its purpose
- [ ] CLAUDE.md has server-side file table with "restart needed?" column
- [ ] CLAUDE.md has API endpoint table (filled in as endpoints are built)
- [ ] No existing CLAUDE.md content is removed

**Verification:**
- [ ] `git diff CLAUDE.md` shows only additions
- [ ] All referenced patterns match shredly's proven approach

**Dependencies:** None

**Files likely touched:**
- `CLAUDE.md`

**Estimated scope:** Small (1 file)

---

## Phase 1: IndexedDB Client Storage Layer (13 points)

Migrate large data from localStorage to IndexedDB. This phase does NOT change any UI -- it swaps the storage backend while keeping the same Zustand store interfaces.

### Slice 1.1: IndexedDB wrapper module (S, 3 pts) -- DONE

**Description:** Create a generic IndexedDB wrapper following shredly's `scheduleDb.ts` pattern: raw IndexedDB API (no Dexie/idb library), SSR-safe browser check, cached DB connection, typed CRUD operations. Define the DB schema with object stores for: `decks` (user deck JSON), `progress` (card mastery/progress data), `sessions` (paused learn/flashcard/match sessions).

**Acceptance criteria:**
- [ ] `src/services/db.ts` exports `openDatabase()`, typed `get/put/delete/getAll` helpers
- [ ] DB name is `quizly-data`, version 1
- [ ] Object stores: `decks` (keyPath: `id`), `progress` (keyPath: `deckId`), `sessions` (keyPath: `key`)
- [ ] SSR guard: returns null/no-op when `typeof indexedDB === 'undefined'`
- [ ] No external IndexedDB library added to package.json

**Verification:**
- [ ] `npm run type-check` passes
- [ ] Unit test: open DB, put/get/delete a record, verify round-trip

**Dependencies:** None

**Files likely touched:**
- `src/services/db.ts` (new)
- `__tests__/services/db.test.ts` (new)

**Estimated scope:** Small (2 files)

### Slice 1.2: Migrate progress/mastery data to IndexedDB (M, 5 pts) -- DONE

**Description:** Refactor `progressStore.ts`, `cardMasteryStore.ts`, and `matchBestTimesStore.ts` to read/write from IndexedDB instead of localStorage. Keep Zustand as the in-memory reactive layer; IndexedDB is the persistence backend. On store initialization, hydrate from IndexedDB (async). Existing localStorage data must be migrated on first load (read old key, write to IndexedDB, delete old key).

**Acceptance criteria:**
- [ ] `progressStore` reads/writes progress to IndexedDB `progress` store
- [ ] `cardMasteryStore` reads/writes mastery to IndexedDB `progress` store (nested under deckId)
- [ ] `matchBestTimesStore` reads/writes to IndexedDB `progress` store
- [ ] On first load, if old localStorage keys exist, data is migrated to IndexedDB and old keys deleted
- [ ] All existing Zustand store interfaces/selectors remain unchanged (no component changes needed)
- [ ] Loading state exposed: `isHydrated` boolean on each store

**Verification:**
- [ ] `npm run type-check` passes
- [ ] `npm test` -- existing progress/mastery tests still pass
- [ ] Manual: open app, verify progress data survives refresh
- [ ] Manual: clear IndexedDB, verify old localStorage data migrates

**Dependencies:** Slice 1.1

**Files likely touched:**
- `src/store/progressStore.ts`
- `src/store/cardMasteryStore.ts`
- `src/store/matchBestTimesStore.ts`
- `src/services/db.ts`

**Estimated scope:** Medium (4 files)

### Slice 1.3: Migrate session data to IndexedDB (M, 5 pts) -- DONE

**Description:** Refactor `learnSessionStore.ts`, `flashcardSessionStore.ts`, and `matchSessionStore.ts` to persist paused/active sessions to IndexedDB `sessions` store instead of localStorage. Same pattern as Slice 1.2: Zustand stays reactive, IndexedDB is persistence, migrate existing localStorage data.

**Acceptance criteria:**
- [ ] Paused learn session saved to IndexedDB (key: `learn-session`)
- [ ] Flashcard session state saved to IndexedDB (key: `flashcard-session`)
- [ ] Match session state saved to IndexedDB (key: `match-session`)
- [ ] Old `pausedLearnSession`, `flashcard-session-store`, `match-session-store` localStorage keys migrated and deleted
- [ ] Session restore on page reload works identically to current behavior

**Verification:**
- [ ] `npm run type-check` passes
- [ ] `npm test` passes
- [ ] Manual: start a learn session, refresh page, verify session resumes

**Dependencies:** Slice 1.1

**Files likely touched:**
- `src/store/learnSessionStore.ts`
- `src/store/flashcardSessionStore.ts`
- `src/store/matchSessionStore.ts`
- `src/services/db.ts`

**Estimated scope:** Medium (4 files)

### Checkpoint: Phase 1

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] App works identically to before (no UI changes)
- [ ] localStorage usage reduced to: settings, theme, UI prefs, deck visibility, pinned decks, audio player prefs
- [ ] IndexedDB `quizly-data` contains progress + session data
- [ ] Old localStorage keys cleaned up after migration

---

## Phase 2: Server Infrastructure (18 points)

Stand up the sync server on wabbazzar-ice. Mirrors shredly's architecture exactly: Node.js + Express, SQLite + Drizzle ORM, Caddy reverse proxy, JWT auth.

### Slice 2.1: Server project scaffolding + Drizzle schema (M, 5 pts) -- DONE

**Description:** Create the server directory structure and Drizzle ORM schema. Following shredly's pattern: `server/` directory at repo root with its own `package.json` (ESM, `"type": "module"`), `server.js` entry point, Drizzle schema in `server/schema.ts`. Define tables: `users`, `decks`, `cards`, `progress`, `sync_cursors`.

**Acceptance criteria:**
- [ ] `server/package.json` with dependencies: `express`, `better-sqlite3`, `drizzle-orm`, `drizzle-kit`, `bcryptjs`, `jsonwebtoken`, `cors`, `uuid`
- [ ] `server/schema.ts` defines tables:
  - `users`: id, username, passwordHash, role (admin/user), displayName, createdAt, updatedAt, lastSyncAt
  - `decks`: id, userId, deckJson (full deck JSON blob), updatedAt, deleted, version, syncedAt
  - `progress`: id, userId, deckId, progressJson (mastery/score data), updatedAt, deleted, version, syncedAt
  - `sync_cursors`: userId + dataType compound PK, lastSyncAt, lastRowVersion
- [ ] `server/db.ts` with `getDb()` returning cached Drizzle instance, WAL mode, foreign keys enabled
- [ ] `server/server.js` boots Express on `127.0.0.1:3000`, CORS configured for `https://quizly.me`, `http://localhost:5173`
- [ ] `GET /api/health` endpoint returns `{ status: 'ok', timestamp }`

**Verification:**
- [ ] `cd server && npm install && node server.js` starts without error
- [ ] `curl http://localhost:3000/api/health` returns 200
- [ ] SQLite DB created at `server/data/quizly.db` with correct tables

**Dependencies:** None (can run in parallel with Phase 1)

**Files likely touched:**
- `server/package.json` (new)
- `server/server.js` (new)
- `server/schema.ts` (new)
- `server/db.ts` (new)
- `server/tsconfig.json` (new)
- `.gitignore` (add `server/data/`)

**Estimated scope:** Medium (6 files)

### Slice 2.2: Auth module + login/admin endpoints (M, 5 pts) -- DONE

**Description:** Implement JWT auth mirroring shredly's `auth.ts`: bcrypt password hashing (12 rounds), HS256 JWT with 30-day expiry, `requireAuth` middleware that validates token AND checks user exists in DB, rate limiting (5 attempts/15 min per username). Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/admin/users` (admin-only user creation).

**Acceptance criteria:**
- [ ] `server/auth.ts` exports: `hashPassword`, `verifyPassword`, `createToken`, `verifyToken`, `requireAuth`, `requireRole`, `checkRateLimit`
- [ ] `POST /api/auth/login` accepts `{ username, password }`, returns `{ token, user: { id, username, role, displayName } }`
- [ ] `GET /api/auth/me` requires Bearer token, returns current user info
- [ ] `POST /api/admin/users` requires admin role, creates new user with hashed password
- [ ] Rate limiting: 5 failed logins per username per 15 minutes, returns 429
- [ ] JWT secret from `QUIZLY_JWT_SECRET` env var (required in production, test fallback)
- [ ] `start-server.sh` script that sets env vars and starts the server

**Verification:**
- [ ] Create admin user via seed script, login, verify token works with `/api/auth/me`
- [ ] Verify rate limiting triggers after 5 failed attempts
- [ ] Verify expired/invalid tokens return 401

**Dependencies:** Slice 2.1

**Files likely touched:**
- `server/auth.ts` (new)
- `server/routes/auth.ts` (new)
- `server/routes/admin.ts` (new)
- `server/server.js`
- `server/seed.ts` (new -- admin user seeder)
- `server/start-server.sh` (new)

**Estimated scope:** Medium (6 files)

### Slice 2.3: Sync API endpoints (M, 5 pts) -- DONE

**Description:** Implement server-side sync endpoints mirroring shredly's pattern. Delta sync: client pushes changes since last sync, server returns changes since client's last pull. Full sync on first login pushes all local data, pulls all server data. LWW (Last-Write-Wins) conflict resolution based on `updatedAt` timestamps.

**Acceptance criteria:**
- [ ] `POST /api/sync/full` -- full sync: receives `{ decks, progress }`, merges with LWW, returns all server data for user
- [ ] `POST /api/sync/decks` -- push deck changes (max 100/request)
- [ ] `GET /api/sync/decks?since=` -- pull deck changes since timestamp
- [ ] `POST /api/sync/progress` -- push progress changes
- [ ] `GET /api/sync/progress?since=` -- pull progress changes since timestamp
- [ ] `GET /api/sync/summary` -- data counts for user (for integrity checks)
- [ ] All endpoints require Bearer auth
- [ ] Soft-delete support: `deleted` flag, not hard deletes
- [ ] `sync_cursors` table updated after each sync

**Verification:**
- [ ] Integration test: push deck, pull it back, verify round-trip
- [ ] Integration test: two users cannot see each other's data
- [ ] Integration test: LWW resolves conflict correctly (newer updatedAt wins)

**Dependencies:** Slice 2.2

**Files likely touched:**
- `server/routes/sync.ts` (new)
- `server/sync.ts` (new -- sync logic)
- `server/server.js`

**Estimated scope:** Medium (3 files)

### Slice 2.4: Caddy + systemd setup for api.quizly.me (S, 3 pts) -- DONE

**Description:** Configure Caddy reverse proxy and systemd service on wabbazzar-ice for `api.quizly.me`. Mirrors shredly's `infrastructure/` directory. Requires DNS (Porkbun) A record pointing to wabbazzar-ice's public IP.

**Acceptance criteria:**
- [ ] `infrastructure/Caddyfile` for `api.quizly.me` -> `localhost:3001` (port 3001 to avoid conflicting with shredly's 3000)
- [ ] `infrastructure/quizly.service` systemd unit file
- [ ] `infrastructure/setup.sh` installs/configures Caddy site, creates systemd service
- [ ] DNS A record for `api.quizly.me` pointing to wabbazzar-ice public IP
- [ ] `curl https://api.quizly.me/api/health` returns 200 from the internet

**Verification:**
- [ ] Server accessible over HTTPS from a phone/external network
- [ ] TLS certificate auto-provisioned by Caddy
- [ ] Service restarts automatically on failure

**Dependencies:** Slice 2.2

**Files likely touched:**
- `infrastructure/Caddyfile` (new)
- `infrastructure/quizly.service` (new)
- `infrastructure/setup.sh` (new)

**Estimated scope:** Small (3 files)

### Checkpoint: Phase 2

- [ ] Server running on wabbazzar-ice at `api.quizly.me`
- [ ] Admin can create users via seed script or admin API
- [ ] Auth flow works: login -> JWT -> authenticated requests
- [ ] Sync endpoints accept and return data correctly
- [ ] Client app still works unchanged (no client code touched yet besides Phase 1)

---

## Phase 3: Client-Side Sync Engine (13 points)

Build the client sync engine mirroring shredly's `syncEngine.ts` + `offlineQueue.ts`.

### Slice 3.1: Sync config, constants, and offline queue (S, 3 pts) -- DONE

**Description:** Create client-side sync infrastructure: constants file with server URL and localStorage key names, offline queue that batches local mutations for push to server. Mirrors shredly's `sync/constants.ts` and `sync/offlineQueue.ts`.

**Acceptance criteria:**
- [ ] `src/services/sync/constants.ts` exports `QUIZLY_SERVER_URL = 'https://api.quizly.me'`, `GUEST_MODE_KEY`, `TOKEN_KEY`, `CONFIG_KEY`, `LAST_SYNC_KEY`, `DEVICE_SYNCED_KEY`
- [ ] `src/services/sync/offlineQueue.ts` implements enqueue/dequeue/getByType/markRetry/clearQueue, stored in `localStorage['quizly_sync_queue']`
- [ ] Max 3 retries per queue entry, then silently discarded (matching shredly)
- [ ] Queue entries typed: `{ id, type: 'deck'|'progress', action: 'upsert'|'delete', payload, retries, createdAt }`

**Verification:**
- [ ] `npm run type-check` passes
- [ ] Unit test: enqueue, dequeue, retry exhaustion, clear

**Dependencies:** Phase 1 complete

**Files likely touched:**
- `src/services/sync/constants.ts` (new)
- `src/services/sync/offlineQueue.ts` (new)
- `__tests__/services/sync/offlineQueue.test.ts` (new)

**Estimated scope:** Small (3 files)

### Slice 3.2: Sync engine with delta sync and full sync (L, 5 pts) -- DONE

**Description:** Implement the sync engine: delta sync on 5-minute timer (push offline queue, pull changes since last sync), full sync on login (push all local data, pull all server data), exponential backoff on failure (5m -> 10m -> 20m -> 30m cap). Fetch timeout: 10s standard, 60s for full sync.

**Acceptance criteria:**
- [ ] `src/services/sync/syncEngine.ts` exports: `startSync()`, `stopSync()`, `deltaSync()`, `fullSync()`, `fetchWithTimeout()`
- [ ] Delta sync pushes queued changes, pulls new data, calls `onPull` callback
- [ ] Full sync pushes all local decks + progress, pulls all server data
- [ ] Exponential backoff: consecutive failures increase interval, reset on success
- [ ] Status callbacks: `onSyncStatus(syncing, error, errorType)`, `onIntegrity(message)`
- [ ] Sync only runs in browser (SSR guard)
- [ ] Timer uses `setTimeout` (not `setInterval`) matching shredly

**Verification:**
- [ ] `npm run type-check` passes
- [ ] Unit test: mock fetch, verify push/pull cycle
- [ ] Unit test: verify backoff progression

**Dependencies:** Slice 3.1, Phase 2 complete

**Files likely touched:**
- `src/services/sync/syncEngine.ts` (new)
- `__tests__/services/sync/syncEngine.test.ts` (new)

**Estimated scope:** Large (2 files, complex logic)

### Slice 3.3: Sync store + hook integration into Zustand stores (M, 5 pts) -- DONE

**Description:** Create a `syncStore` that exposes sync state (connected, syncing, error, lastSync) and actions (login, logout, forceSync). Wire up existing Zustand stores to enqueue changes to the offline queue on mutations (deck edits, progress updates, mastery changes). Wire up `onPull` callback to merge server data into local stores.

**Acceptance criteria:**
- [ ] `src/store/syncStore.ts` with state: `isConnected`, `isSyncing`, `syncError`, `lastSyncAt`, `username`, `userId`, `role`, `isGuest`
- [ ] `syncStore.login(username, password)` calls `/api/auth/login`, stores token, triggers `fullSync()`, starts delta timer
- [ ] `syncStore.logout()` clears token/config, stops sync timer
- [ ] `syncStore.isGuest` reads from `GUEST_MODE_KEY` localStorage flag
- [ ] Deck/progress stores call `enqueue()` on mutations when user is logged in (not guest)
- [ ] `onPull` callback merges pulled data into deckStore, progressStore, cardMasteryStore
- [ ] Guest-to-user migration: on first login, all local IndexedDB data is included in fullSync push

**Verification:**
- [ ] `npm run type-check` passes
- [ ] Integration test: mock server, login, verify fullSync fires
- [ ] Integration test: mutate a deck, verify queue entry created
- [ ] Manual: login, make changes, wait 5 min, verify sync

**Dependencies:** Slice 3.2

**Files likely touched:**
- `src/store/syncStore.ts` (new)
- `src/store/deckStore.ts` (add enqueue calls)
- `src/store/progressStore.ts` (add enqueue calls)
- `src/store/cardMasteryStore.ts` (add enqueue calls)

**Estimated scope:** Medium (4 files)

### Checkpoint: Phase 3

- [ ] All tests pass
- [ ] Build succeeds
- [ ] Sync engine connects to server, pushes/pulls data
- [ ] Offline queue batches changes when offline, flushes when online
- [ ] Guest mode still works with no server contact
- [ ] No UI changes yet (sync is wired but invisible)

---

## Phase 4: Auth UI + Guest Flow (15 points)

### Slice 4.1: Login page (M, 5 pts) -- DONE

**Description:** Create a login page at `/login` with username/password fields and "Continue as Guest" button. Mirrors shredly's `login/+page.svelte`. If already logged in or guest, redirect to home. On login success, navigate to `/`. On guest, set `GUEST_MODE_KEY` in localStorage and navigate to `/`.

**Acceptance criteria:**
- [ ] `/login` route renders login form: username, password, "Sign In" button, "Continue as Guest" link
- [ ] Sign in calls `syncStore.login()`, redirects to `/` on success
- [ ] Error states: wrong password, server unreachable, rate limited
- [ ] "Continue as Guest" sets localStorage flag, redirects to `/`
- [ ] If `syncStore.isConnected` or `isGuest` on mount, redirect to `/`
- [ ] Enter key submits form
- [ ] Mobile-first, semi-transparent design, CSS modules
- [ ] Loading spinner during sign-in

**Verification:**
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] Screenshot: desktop + mobile viewports
- [ ] Manual: login with valid creds -> reaches home
- [ ] Manual: "Continue as Guest" -> reaches home

**Dependencies:** Slice 3.3

**Files likely touched:**
- `src/pages/Login.tsx` (new)
- `src/pages/Login.module.css` (new)
- `src/router/AppRouter.tsx`

**Estimated scope:** Medium (3 files)

### Slice 4.2: Auth routing guard + entry redirect (S, 3 pts) -- DONE

**Description:** Add route protection: unauthenticated/non-guest visitors hitting any route except `/login` get redirected to `/login`. Create an `AuthGuard` wrapper component. Mirrors shredly's `resolveEntryRoute()` pattern.

**Acceptance criteria:**
- [ ] `AuthGuard` component wraps all routes except `/login`
- [ ] If not logged in AND not guest, redirect to `/login`
- [ ] If logged in or guest, render children normally
- [ ] Root `/` redirect logic: guest -> home, logged in -> home, neither -> `/login`
- [ ] Deep links work: `/flashcards/deck123` redirects to login, then after login returns to original URL

**Verification:**
- [ ] `npm run type-check` passes
- [ ] Manual: fresh browser (no localStorage), visit `/` -> redirected to `/login`
- [ ] Manual: guest mode, visit `/flashcards/deck1` -> works normally

**Dependencies:** Slice 4.1

**Files likely touched:**
- `src/components/auth/AuthGuard.tsx` (new)
- `src/router/AppRouter.tsx`

**Estimated scope:** Small (2 files)

### Slice 4.3: User menu + logout (S, 3 pts) -- DONE

**Description:** Add a user indicator to the app header/nav showing username (or "Guest") and a logout/sign-in action. Guests see "Sign In" which navigates to `/login`. Logged-in users see their username and "Sign Out" which calls `syncStore.logout()` and redirects to `/login`.

**Acceptance criteria:**
- [ ] User indicator visible in app header on all pages
- [ ] Guest: shows "Guest" label + "Sign In" link
- [ ] Logged in: shows username + "Sign Out" button
- [ ] Sign out clears all sync state, stops sync timer, redirects to `/login`
- [ ] Sync status indicator: subtle dot (green = synced, yellow = syncing, red = error)

**Verification:**
- [ ] Screenshot: desktop + mobile with guest state
- [ ] Screenshot: desktop + mobile with logged-in state
- [ ] Manual: sign out -> returns to login page, localStorage sync keys cleared

**Dependencies:** Slice 4.1

**Files likely touched:**
- `src/components/common/UserMenu.tsx` (new)
- `src/components/common/UserMenu.module.css` (new)
- `src/components/common/Header.tsx` or equivalent layout component

**Estimated scope:** Small (3 files)

### Slice 4.4: Deck library vs. user decks separation (M, 4 pts) -- DEFERRED to Phase 5

**Description:** Separate "library" decks (Chinese content shipped in-repo in `public/data/decks/`) from "user" decks (created by users, stored in IndexedDB + synced to server). Home page shows only user decks. A "Library" section/button lets users browse and import library decks into their collection. Guest users get Chinese decks auto-imported on first visit.

**Acceptance criteria:**
- [ ] `deckStore` distinguishes `userDecks` (from IndexedDB) and `libraryDecks` (from `public/data/decks/`)
- [ ] Home page renders only `userDecks`
- [ ] "Browse Library" button on home page opens library view
- [ ] Library view shows available decks with "Add to My Decks" button
- [ ] Importing a library deck copies it to IndexedDB (and queues for sync if logged in)
- [ ] Guest first visit: Chinese decks auto-imported to IndexedDB silently
- [ ] Logged-in first visit: if no user decks, show library prompt

**Verification:**
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] Screenshot: home page with user decks only
- [ ] Screenshot: library browser
- [ ] Manual: fresh guest -> Chinese decks appear on home page

**Dependencies:** Slices 4.1, 4.2

**Files likely touched:**
- `src/store/deckStore.ts`
- `src/pages/Home.tsx`
- `src/pages/Library.tsx` (new)
- `src/pages/Library.module.css` (new)
- `src/router/AppRouter.tsx`

**Estimated scope:** Medium (5 files)

### Checkpoint: Phase 4

- [ ] All tests pass
- [ ] Build succeeds
- [ ] Fresh visitor -> login page -> "Continue as Guest" -> home with Chinese decks
- [ ] Login with credentials -> home with synced decks
- [ ] Logout -> returns to login page
- [ ] Deep links redirect through login correctly
- [ ] Library decks browsable and importable

---

## Phase 5: User Content Creation (15 points)

### Slice 5.1: Create deck form (M, 5 pts) -- DONE

**Description:** UI form for creating a new deck. Fields: deck name, description, category, difficulty. Creates an empty deck in IndexedDB and navigates to the card editor. Queues for sync if logged in.

**Acceptance criteria:**
- [ ] "New Deck" button on home page
- [ ] Form: name (required), description, category (dropdown), difficulty (dropdown)
- [ ] Submit creates deck with generated UUID in IndexedDB
- [ ] Navigates to `/deck/:newDeckId/edit` after creation
- [ ] Validation: name required, max 100 chars
- [ ] Mobile-first, semi-transparent design

**Verification:**
- [ ] `npm run type-check` passes
- [ ] Screenshot: create deck form on mobile + desktop
- [ ] Manual: create deck, verify it appears on home page

**Dependencies:** Slice 4.4

**Files likely touched:**
- `src/pages/CreateDeck.tsx` (new)
- `src/pages/CreateDeck.module.css` (new)
- `src/store/deckStore.ts` (add createDeck action)
- `src/router/AppRouter.tsx`

**Estimated scope:** Medium (4 files)

### Slice 5.2: Card editor within deck (M, 5 pts) -- DONE

**Description:** UI for adding/editing/deleting cards within a deck. Each card has side_a through side_f (a and b required, c-f optional). List view of existing cards with inline edit. "Add Card" button at bottom. Matches the multi-sided card system from the spec.

**Acceptance criteria:**
- [ ] `/deck/:deckId/edit` route shows card list + editor
- [ ] Each card row: side_a, side_b visible; expand to show side_c through side_f
- [ ] "Add Card" creates a new card with empty sides
- [ ] Inline edit: tap a card to edit, save on blur/enter
- [ ] Delete card with confirmation
- [ ] Reorder cards via drag handle (or move up/down buttons on mobile)
- [ ] Changes saved to IndexedDB immediately, queued for sync
- [ ] Card count displayed in header

**Verification:**
- [ ] `npm run type-check` passes
- [ ] Screenshot: card editor with several cards on mobile + desktop
- [ ] Manual: add card, edit sides, delete card, verify persistence

**Dependencies:** Slice 5.1

**Files likely touched:**
- `src/pages/DeckEditor.tsx` (new)
- `src/pages/DeckEditor.module.css` (new)
- `src/components/cards/CardEditor.tsx` (new)
- `src/components/cards/CardEditor.module.css` (new)
- `src/router/AppRouter.tsx`
- `src/store/deckStore.ts` (add card CRUD actions)

**Estimated scope:** Medium (6 files)

### Slice 5.3: JSON deck import/export (M, 5 pts) -- DONE

**Description:** Allow users to import a deck from a JSON file (matching existing deck JSON schema) and export any deck as JSON. Import via file input or paste. Export as download.

**Acceptance criteria:**
- [ ] "Import Deck" button on home page opens file picker (`.json`)
- [ ] Validates JSON structure against deck schema before import
- [ ] On valid import: creates deck in IndexedDB, queues for sync, navigates to deck view
- [ ] On invalid: shows specific error message (missing fields, wrong format)
- [ ] "Export" action on deck context menu downloads `{deck_name}.json`
- [ ] Exported JSON matches the canonical deck format in `public/data/decks/`
- [ ] Also supports paste-from-clipboard import (textarea fallback)

**Verification:**
- [ ] `npm run type-check` passes
- [ ] Manual: export a library deck, import it back, verify identical
- [ ] Manual: import malformed JSON, verify error message
- [ ] Screenshot: import dialog on mobile

**Dependencies:** Slice 5.1

**Files likely touched:**
- `src/components/common/DeckImport.tsx` (new)
- `src/components/common/DeckExport.tsx` (new)
- `src/utils/deckValidation.ts` (new)
- `src/pages/Home.tsx`

**Estimated scope:** Medium (4 files)

### Checkpoint: Phase 5

- [ ] All tests pass
- [ ] Build succeeds
- [ ] User can create a deck, add cards, edit cards, delete cards
- [ ] User can import a deck from JSON file
- [ ] User can export any deck as JSON
- [ ] All content changes persist to IndexedDB and sync to server

---

## Phase 6: First-Time Guest Walkthrough (12 points)

### Slice 6.1: Walkthrough overlay component (M, 5 pts) -- DONE

**Description:** Build a reusable walkthrough/tooltip overlay system. Shows a sequence of highlighted UI elements with explanation text. Dismissable, with "Next" / "Skip" / "Done" controls. Completion state persisted to localStorage so it only shows once.

**Acceptance criteria:**
- [ ] `WalkthroughOverlay` component accepts steps: `{ targetSelector, title, description, position }`
- [ ] Highlights target element with a spotlight cutout in a semi-transparent overlay
- [ ] Step counter: "1 of 5"
- [ ] "Next", "Back", "Skip" buttons
- [ ] Completion stored in localStorage key `quizly_walkthrough_complete`
- [ ] Reduced motion: no animations if `prefers-reduced-motion`
- [ ] Works on mobile and desktop

**Verification:**
- [ ] `npm run type-check` passes
- [ ] Screenshot: walkthrough step on mobile + desktop
- [ ] Manual: complete walkthrough, refresh, verify it doesn't show again

**Dependencies:** Phase 4 complete

**Files likely touched:**
- `src/components/common/WalkthroughOverlay.tsx` (new)
- `src/components/common/WalkthroughOverlay.module.css` (new)

**Estimated scope:** Medium (2 files)

### Slice 6.2: Guest onboarding flow content (M, 4 pts) -- DONE

**Description:** Define the walkthrough steps for a first-time guest. Steps: (1) Welcome + what Quizly is, (2) deck grid + how to pick a deck, (3) learning modes explanation, (4) "Sign in to sync across devices" callout, (5) "Get started" pointing at first deck.

**Acceptance criteria:**
- [ ] 5 walkthrough steps defined with targets, titles, descriptions
- [ ] Triggered on first guest visit after Chinese decks are loaded
- [ ] Not triggered for logged-in users (they've already been onboarded elsewhere)
- [ ] "Sign in to sync" step has a "Sign In" button that navigates to `/login`
- [ ] Final step has "Start Learning" button that opens first deck

**Verification:**
- [ ] Manual: fresh guest -> walkthrough appears -> complete all steps
- [ ] Manual: logged-in user -> no walkthrough
- [ ] Screenshot: each walkthrough step on mobile

**Dependencies:** Slice 6.1

**Files likely touched:**
- `src/pages/Home.tsx` (trigger walkthrough)
- `src/data/walkthroughSteps.ts` (new)

**Estimated scope:** Small (2 files)

### Slice 6.3: Empty states for logged-in users with no decks (S, 3 pts) -- DONE

**Description:** When a logged-in user has no decks (fresh account), show an encouraging empty state with actions: "Browse Library" and "Create New Deck" and "Import from JSON". Replace the blank grid with a purposeful onboarding card.

**Acceptance criteria:**
- [ ] Empty state component shown when `userDecks.length === 0` and user is not guest
- [ ] Three action buttons: Browse Library, Create Deck, Import JSON
- [ ] Friendly illustration or icon (SVG, not emoji)
- [ ] Semi-transparent design matching app style

**Verification:**
- [ ] Screenshot: empty state on mobile + desktop
- [ ] Manual: fresh logged-in user sees empty state, not blank page

**Dependencies:** Slice 4.4, Slice 5.1

**Files likely touched:**
- `src/components/common/EmptyDeckState.tsx` (new)
- `src/components/common/EmptyDeckState.module.css` (new)
- `src/pages/Home.tsx`

**Estimated scope:** Small (3 files)

### Checkpoint: Phase 6 (Final)

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Lint passes (`npm run lint`)
- [ ] Complete user flows verified in browser:
  - [ ] Fresh visit -> login page -> "Continue as Guest" -> walkthrough -> Chinese decks -> study
  - [ ] Fresh visit -> login page -> sign in -> empty state -> browse library -> import deck -> study
  - [ ] Create deck -> add cards -> study with flashcards/learn/match
  - [ ] Import JSON deck -> verify cards -> study
  - [ ] Export deck -> verify JSON format
  - [ ] Login on second device -> decks sync automatically
  - [ ] Make changes offline -> come online -> changes sync
  - [ ] Logout -> login again -> data intact

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| IndexedDB migration corrupts existing localStorage data | High | Slice 1.2-1.3 include migration with fallback: if IndexedDB write fails, keep localStorage data intact. Never delete old key until new store confirmed written. |
| Sync conflicts lose user data | High | LWW with timestamps is simple but can lose concurrent edits. Accept this tradeoff (matches shredly). Log conflicts server-side for debugging. |
| iOS Safari IndexedDB quota/eviction | Medium | Keep IndexedDB usage under 50MB. Add integrity check on app launch. Display warning if storage is getting full. |
| Port conflict with shredly on wabbazzar-ice | Low | Use port 3001 for quizly server (shredly uses 3000). |
| Caddy config conflict | Low | Add `api.quizly.me` as a separate site block in the existing Caddyfile, or use a separate Caddyfile with `caddy adapt`. |

## Open Questions

- **Registration flow**: Currently admin-only user creation. Do we want self-registration later? (Deferred -- not in this ticket.)
- **Deck sharing between users**: Should users be able to share deck links? (Deferred to a future ticket.)
- **Sync conflict UI**: Should we show users when a sync conflict occurred? (Start silent like shredly, add UI later if needed.)
