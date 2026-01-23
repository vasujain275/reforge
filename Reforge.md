> **Tagline:** Local-first, self-hostable tool to drive consistent, explainable DSA revision for coding interviews.
> **Design goal:** Minimal ops, maximum clarity — one Go binary serving a React SPA, SQLite as single source of truth, no ML, fully explainable selection logic.

---

# Table of contents

1. Problem statement
2. High-level solution overview
3. Architectural decisions (rationale)
4. **Authentication & Security** *(implemented)*
5. Deep dive: scoring formula (math, features, tuning)
6. Database schema (DDL + explanations)
7. Selection & session-building algorithm (pseudocode / constraints)
8. Revision templates (catalog + when to use each)
9. API surface & UX flow (what the SPA will call)
10. Deployment, backup, security, migration notes
11. Roadmap & next steps

---

# 1. Problem statement

Preparing for technical interviews requires repeated practice and revision of coding problems and patterns. The core problems we solve:

* You forget or under-prioritize problems that need revision.
* You don’t have a reliable, explainable way to decide *which* problems to revisit and *when*.
* Many tools are cloud-centric, opaque, or require complex setups.
* You want a minimal, local-first solution that is self-hostable, deterministic, and auditable.

**Primary user story:**
“I want to open a local app, choose a revision template, start a session, and have the app produce a curated, time-budgeted list of problems I should revise now — with a clear explanation for each choice.”

---

# 2. High-level solution overview

**Core idea:** Use a deterministic, explainable scoring function computed from structured per-problem and per-pattern metadata to prioritize and schedule revision sessions. No AI decision-making — the system is simple, predictable, and auditable.

**System components:**

* Single Go backend binary:

  * Serves REST API + static React SPA (built assets embedded in the binary).
  * Uses SQLite as the single source of truth.
  * Handles scoring, session-building, imports/exports, and all business logic.
* React SPA (desktop-first):

  * UI for adding problems, editing metadata, starting sessions, logging attempts.
  * Shows breakdowns (why a problem was chosen).
* No external services required; self-hostable via `./dsa-sensei` or Docker image.

**Key properties:**

* Single source of truth (SQLite)
* Deterministic & testable scoring
* Explainable decisions (show feature-by-feature contribution)
* Extensible templates (user chooses intent)
* Minimal operations — easy to run on a personal machine

---

# 3. Architectural decisions (rationale)

1. **Go backend + SQLite**

   * Single binary deployable everywhere (Linux, Mac, Windows).
   * Low memory, fast startup, stable.
   * SQLite is local-first and simple to backup.
   * All business logic in one compiled artefact simplifies trust & security.

2. **React SPA served by the Go binary**

   * Desktop-focused UI with familiar UX patterns.
   * No PWA/ServiceWorker complexity — simpler offline model.
   * Embedding static assets into binary simplifies deployment.

3. **No AI in core decision-making**

   * Your revision needs are rule-based and explainable; deterministic heuristics suffice and build trust.
   * AI introduces non-determinism and a maintenance burden without proportionate benefit for this problem.

4. **Pattern/problem normalization**

   * Keep patterns as first-class entities (many-to-many with problems).
   * Track both problem-level and pattern-level user stats for smarter decisions.

---

# 4. Authentication & Security *(Implemented)*

The system implements a stateful JWT-based authentication flow with refresh tokens. This was added to support multi-user environments and secure personal data.

## Authentication Flow

1. **Registration:** User provides email, password, and name. Password is hashed using bcrypt before storage.
2. **Login:** User submits email/password → backend validates credentials → returns short-lived JWT access token (15 min) + long-lived refresh token (7 days) stored as HTTP-only cookies.
3. **Protected Routes:** Access token is validated via middleware. If expired, client uses refresh token to obtain new access token.
4. **Logout:** Invalidates the refresh token in the database, removing the session.

## Token Storage

* **Access Token:** Short-lived JWT (15 minutes), stored in HTTP-only cookie.
* **Refresh Token:** Long-lived token (7 days), hashed and stored in `refresh_tokens` table.
* **Stateful Refresh:** Refresh tokens are stored server-side, allowing for explicit revocation and session management.

## Security Considerations

* Passwords hashed with bcrypt (cost factor 10+).
* HTTP-only cookies prevent XSS access to tokens.
* CSRF protection via SameSite cookie attribute.
* Refresh tokens are hashed before storage.
* Token expiry prevents indefinite session persistence.

## Database Tables for Auth

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,       -- Used for login
    password_hash TEXT NOT NULL,      -- Bcrypt hash
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens (Stateful Auth)
CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,         -- Store hash of the token
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

# 5. Deep dive — THE scoring formula

This is the heart of the system: a normalized, weighted feature aggregation producing a `score ∈ [0, 1]`, where higher = more urgent.

## Goals for formula

* Explainable (show contributions)
* Tunable by weight config
* Robust to missing data (defaults)
* Mixes immediate personal signals (confidence, last failure) with temporal signals (age) and difficulty

## Inputs (user_problem_stats + user_pattern_stats)

For each problem (per-user):

* `confidence` (0–100): self-reported confidence from the most recent attempt.
* `avg_confidence` (0–100): average confidence across all attempts for a problem.
* `last_attempt_at` (nullable timestamp)
* `total_attempts` (integer)
* `avg_time_seconds` (nullable number)
* `last_outcome` (`passed` / `failed` / null)
* `difficulty` (`easy` / `medium` / `hard`)
* associated `patterns` (list) and their `avg_confidence` per user

## Features (normalized to 0..1)

All features are defined so that **higher → more urgent**.

1. **f_conf** — confidence urgency

   ```
   f_conf = (100 - confidence) / 100
   ```

   Example: confidence 40 → f_conf = 0.60.

2. **f_days** — age urgency (how long since last attempt, with exponential backoff)

   To prevent mastered problems from appearing too frequently, the time-based urgency uses a dynamic cap that increases with mastery. A `mastery_multiplier` extends the revision period based on historical performance.

   ```
   // Based on total attempts and average confidence for the problem.
   if total_attempts > 3 and avg_confidence > 90:
       mastery_multiplier = 4.0
   elif total_attempts > 1 and avg_confidence > 80:
       mastery_multiplier = 2.0
   else:
       mastery_multiplier = 1.0

   days = days_since_last_attempt (if null, use LARGE_DEFAULT e.g., 365)
   dynamic_days_cap = 90 * mastery_multiplier // Cap becomes 90, 180, or 360 days
   f_days = min(days, dynamic_days_cap) / dynamic_days_cap
   ```

   Recent attempts → small value. Old attempts → value close to 1. High mastery extends the time before a problem is considered "urgent" again.

3. **f_attempts** — attempt-based signal

   ```
   f_attempts = min(total_attempts, ATTEMPT_CAP) / ATTEMPT_CAP   // ATTEMPT_CAP = 10
   ```

   More attempts indicates persistent difficulty; we treat that as higher urgency to revisit.

4. **f_time** — time-based complexity (if available)

   ```
   f_time = min(avg_time_seconds, TIME_CAP) / TIME_CAP  // TIME_CAP = 3600 (1 hour)
   ```

   Longer avg time → higher urgency.

5. **f_difficulty** — difficulty indicator

   ```
   easy -> 0.20
   medium -> 0.50
   hard -> 1.00
   ```

6. **f_failed** — last outcome failure flag

   ```
   f_failed = 1 if last_outcome == 'failed' else 0
   ```

7. **f_pattern** — pattern weakness (aggregated)
   For a problem associated with multiple patterns:

   ```
   per-pattern weakness = 1 - (pattern_avg_confidence/100)
   f_pattern = mean(per-pattern weakness)  // if no pattern stats, fallback 0.5
   ```

## Weights (default, sum to 1.0)

These are our recommended starting weights — **configurable via Settings UI and stored in environment variables**.

* `w_conf = 0.30`
* `w_days = 0.20`
* `w_attempts = 0.10`
* `w_time = 0.05`
* `w_difficulty = 0.15`
* `w_failed = 0.10`
* `w_pattern = 0.10`

**(Sanity check)**
0.30 + 0.20 + 0.10 + 0.05 + 0.15 + 0.10 + 0.10 = 1.00

**Configuration:**
- Default weights are loaded from environment variables (`DEFAULT_W_CONF`, `DEFAULT_W_DAYS`, etc.)
- Users can customize weights via the Settings page (`/dashboard/settings`)
- Weight changes are persisted to the database (`system_settings` table using UPSERT)
- A "Reset to Defaults" button restores environment-configured values
- The UI validates that weights sum to 1.00 for optimal scoring

## Final score

```
score = w_conf*f_conf
      + w_days*f_days
      + w_attempts*f_attempts
      + w_time*f_time
      + w_difficulty*f_difficulty
      + w_failed*f_failed
      + w_pattern*f_pattern
```

**Interpretation**

* `score ≈ 0.7-1.0`: high priority (pick for today unless time is tiny).
* `score ≈ 0.4-0.7`: medium priority.
* `score < 0.4`: low priority.

## Reasoning & properties

* **Confidence** is strongest signal because it encodes both self-knowledge and recent practice effects.
* **Days** gives spacing: even confident items should be rechecked after long gaps.
* **Attempts** and **failed** capture difficulty that may not be shown purely by confidence.
* **Pattern-level** stats ensure we pay attention to systemic weaknesses (e.g., many problems in Sliding Window are low-confidence → recommend multiple pattern items).
* **Difficulty** nudges heavier problems up so medium-to-hard weak areas get adequate attention.

## Handling missing data

* Missing `last_attempt_at` → treat as very old (use 365 days cap).
* Missing `avg_time_seconds` → set `w_time = 0` and redistribute the 0.05 weight into `w_conf` or make `w_time` configurable at runtime.
* Missing pattern stats → fallback `f_pattern = 0.5`.

## Example (digit-by-digit)

A worked example is included in the internal docs and shown dynamically in the UI per problem (the UI will show each contribution and the final score).

---

# 6. Database schema (DDL + explanation)

**Goal:** explicit, normalized, queryable. Avoid heavy JSON for important fields.

> NOTE: This is the **implemented** SQLite schema. Uses `INTEGER PRIMARY KEY AUTOINCREMENT` for IDs and ISO timestamps.

## System Configuration

```sql
-- System Settings (Global tuning parameters for scoring weights)
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,        -- e.g., 'w_conf'
    value TEXT NOT NULL,         -- Stored as string, app casts to float/int
    description TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Default scoring weights (loaded from environment variables)
-- DEFAULT_W_CONF=0.30, DEFAULT_W_DAYS=0.20, DEFAULT_W_ATTEMPTS=0.10, 
-- DEFAULT_W_TIME=0.05, DEFAULT_W_DIFFICULTY=0.15, DEFAULT_W_FAILED=0.10, 
-- DEFAULT_W_PATTERN=0.10
--
-- Note: Weights are persisted to system_settings table when changed via Settings UI.
-- The GetScoringWeights service method starts with defaults from env, then overrides
-- with any values stored in the database (using UPSERT for updates).
```

## Authentication Tables

```sql
-- Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,       -- Used for login
    password_hash TEXT NOT NULL,      -- Bcrypt/Argon2 hash
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens (Stateful Auth)
CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,         -- Store hash of the token
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Core Domain Tables

```sql
-- Problems
CREATE TABLE problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT,                      -- e.g., "LeetCode", "NeetCode 150"
    url TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Patterns
CREATE TABLE patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,              -- Display name e.g., 'Sliding Window'
    description TEXT
);

-- Problem <-> Patterns (Many-to-Many)
CREATE TABLE problem_patterns (
    problem_id INTEGER NOT NULL,
    pattern_id INTEGER NOT NULL,
    PRIMARY KEY (problem_id, pattern_id),
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);
```

## User Progress & Stats Tables

```sql
-- Revision Sessions (Study sessions history)
CREATE TABLE revision_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    template_key TEXT,                -- e.g., 'daily_revision'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    planned_duration_min INTEGER,
    items_ordered TEXT,               -- JSON Array of planned problems
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attempts (The detailed log of every practice run)
-- NEW: This table captures every individual attempt for detailed analytics
CREATE TABLE attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    session_id INTEGER,               -- Nullable (can solve outside a session)
    confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
    duration_seconds INTEGER,
    outcome TEXT CHECK (outcome IN ('passed', 'failed')),
    notes TEXT,                       -- Optional user reflection
    performed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES revision_sessions(id) ON DELETE SET NULL
);

-- User Problem Stats (The "Brain" of the scoring system)
-- This is an aggregate table updated after every attempt to make scoring fast.
CREATE TABLE user_problem_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    status TEXT CHECK (status IN ('unsolved','solved','abandoned')) DEFAULT 'unsolved',
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100) DEFAULT 50,
    avg_confidence INTEGER CHECK (avg_confidence BETWEEN 0 AND 100) DEFAULT 50,
    last_attempt_at TEXT,             -- ISO8601 Timestamp
    total_attempts INTEGER DEFAULT 0,
    avg_time_seconds INTEGER,
    last_outcome TEXT,                -- 'passed' or 'failed'
    recent_history_json TEXT,         -- JSON array of last 3-5 attempts for quick UI display
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, problem_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

-- User Pattern Stats (Aggregates for "weakness" analysis)
CREATE TABLE user_pattern_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pattern_id INTEGER NOT NULL,
    times_revised INTEGER DEFAULT 0,
    avg_confidence INTEGER DEFAULT 50,
    last_revised_at TEXT,
    UNIQUE(user_id, pattern_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);
```

## Indexes

```sql
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_problem_patterns_pattern ON problem_patterns(pattern_id);
CREATE INDEX idx_attempts_user_problem ON attempts(user_id, problem_id);
CREATE INDEX idx_attempts_performed_at ON attempts(user_id, performed_at);
CREATE INDEX idx_stats_user_lookup ON user_problem_stats(user_id);
CREATE INDEX idx_stats_urgency ON user_problem_stats(user_id, last_attempt_at);
```

## Triggers

```sql
-- Auto-update 'updated_at' when stats change
CREATE TRIGGER update_user_problem_stats_timestamp
AFTER UPDATE ON user_problem_stats
BEGIN
    UPDATE user_problem_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

## Schema Notes

* **`attempts` table** (NEW): Captures every individual practice attempt with full details. This allows for detailed analytics, progress charts, and session replays. The `user_problem_stats` table is an aggregate/cache derived from this data.
* **`recent_history_json`**: A lightweight JSON cache of recent attempts for quick UI display, avoiding the need to query the full `attempts` table for simple displays.
* **`session_id` in attempts**: Nullable because users can practice problems outside of formal sessions.
* **`system_settings`**: Stores scoring weights and other tunable parameters, allowing runtime adjustments without code changes.

---

# 7. Selection & session-building algorithm

We need to produce actionable sessions that:

* respect time budget
* include at least one quick win
* limit pattern repetition
* prefer high-score problems

## Steps (high-level)

1. **Resolve template** → get `planned_duration_min` and template constraints (`max_same_pattern`, `quick_win_cutoff_min`, `max_difficulty`, etc.).

2. **Query & compute features** for all `user_problem_stats` for the user (join problem & pattern aggregates).

3. **Compute `score`** for each problem using the formula.

4. **Filter**: remove `status = abandoned`, apply template-level filters (e.g., if template says `max_difficulty = medium`).

5. **Sort candidates by `score DESC`**.

6. **Greedy session builder**:

   * Start with sorted candidates.
   * Maintain `remaining_time = planned_duration_min`.
   * For each candidate:

     * `est_min = ceil(avg_time_seconds / 60)` if present, else difficulty default (easy=12, medium=25, hard=45).
     * If `est_min > remaining_time` → skip.
     * If adding the problem breaks `max_same_pattern` constraint → skip.
     * Add problem to session, decrement `remaining_time`.
   * Post-check: ensure at least one `quick win` (planned_min <= `quick_win_cutoff_min`). If none, try to swap in an easy candidate.

7. **Return session** as ordered list with reasons (each reason is a short string derived from the top contributing features, e.g., "Low confidence (40), failed last attempt, 17 days since last").

## Greedy builder pseudocode (Go-flavored pseudocode)

```go
type Candidate struct {
  ProblemID string
  Score float64
  Patterns []string
  EstMin int
  Difficulty string
  Features map[string]float64
}

func BuildSession(candidates []Candidate, budgetMin int, constraints Constraints) []SessionItem {
  // candidates already sorted by Score desc
  var session []SessionItem
  remaining := budgetMin
  patternCounts := map[string]int{}

  for _, c := range candidates {
    if c.EstMin > remaining { continue }
    if exceedsPatternLimit(c.Patterns, patternCounts, constraints.MaxSamePattern) { continue }
    if !allowedDifficulty(c.Difficulty, constraints.MaxDifficulty) { continue }

    // Accept
    session = append(session, SessionItem{ProblemID: c.ProblemID, PlannedMin: c.EstMin, Reason: reasonFromTopFeatures(c)})
    remaining -= c.EstMin

    for _, p := range c.Patterns {
      patternCounts[p]++
    }
    if remaining <= 0 { break }
  }

  // ensure quick win
  if !hasQuickWin(session, constraints.QuickWinCutoffMin) {
    // try to add/replace
    for _, c := range candidates {
      if c.EstMin <= constraints.QuickWinCutoffMin && !inSession(c.ProblemID, session) {
         // find candidate to remove or skip substitution logic if no time
         // simple approach: if remaining >= c.EstMin add; else try to replace a lower-score long item
      }
    }
  }
  return session
}
```

**Why greedy?**
Greedy is simple and deterministic and works well when candidate pool is pre-ranked and time budgets are moderate. If you want more optimal packing you can extend to knapsack-like algorithms later, but not necessary for MVP.

---

# 8. Revision templates (catalog + when to use)

Each template has:

* `display_name`
* `template_key` (internal)
* `planned_duration_min`
* filter constraints (max difficulty, patterns, min_confidence etc.)
* session construction rules (min quick wins, max same pattern)

Below is a recommended set tailored for interview prep. You can expand or edit these later.

> Note: your existing human labels are preserved and used as display names — the system will map these to a machine spec. (Templates are inspired by your earlier list.)

## Template definitions

### 1. `daily_revision` — ⚡ Daily Revision (35 min)

* **When to use:** Daily short sessions when you want consistent exposure to weak problems.
* **Duration:** 35 min
* **Filters:** difficulty ≤ medium
* **Emphasis:** low confidence, failed attempts
* **Constraints:** at least 2 quick wins (≤ 15 min); max 2 same pattern
* **Goal:** keep streak, address immediate weaknesses

### 2. `daily_mixed` — 📚 Daily Mixed Practice (55 min)

* **When:** when you have more time and want to mix revision with slightly harder practice.
* **Duration:** 55 min
* **Filters:** difficulty ≤ hard (allow 1-2 hards)
* **Emphasis:** blend of weak problems + 1 new/harder item
* **Constraints:** at least 1 quick win; max 2 same pattern

### 3. `weekend_comprehensive` — 🏖️ Weekend Comprehensive (150 min)

* **When:** weekend deep session to consolidate patterns.
* **Duration:** 150 min
* **Filters:** no difficulty filter
* **Emphasis:** pattern mastery; include 3-4 problems from weakest patterns
* **Constraints:** max 3 same pattern; ensure at least one hard problem

### 4. `weekend_weak_patterns` — 🚨 Weekend Weak Focus (120 min)

* **When:** you want to attack your weakest patterns intensively.
* **Duration:** 120 min
* **Emphasis:** problems drawn from top-N weakest patterns (N=2)
* **Constraints:** max 3 different patterns; allow multiple problems from same pattern by design

### 5. `pattern_deep_dive` — 🎯 Pattern Deep Dive (90 min)

* **When:** you need to master one pattern (e.g., Sliding Window).
* **Duration:** 90 min
* **Filters:** patterns == pattern_key (user selects)
* **Emphasis:** same-pattern problems
* **Constraints:** allow up to 5 problems from same pattern; include easy-to-medium mix

### 6. `confidence_booster` — 💪 Confidence Booster (45 min)

* **When:** you need a confidence lift (pre-interview warmup).
* **Duration:** 45 min
* **Emphasis:** include 3 quick wins (easy) and 1 medium
* **Constraints:** difficulty <= medium; quick-win heavy

### 7. `challenge_mode` — 🔥 Challenge Mode (100 min)

* **When:** simulate interview stress / practice harder problems.
* **Duration:** 100 min
* **Filters:** difficulty >= medium (prefer hard)
* **Emphasis:** hardest problems across weak patterns
* **Constraints:** ensure at least 1 hard; max 2 easy

## How to choose a template (UI guidance)

* **Daily (short)**: choose `daily_revision` when tired or on a short break; `daily_mixed` when you have more time.
* **Weekend (long)**: choose `weekend_comprehensive` or `weekend_weak_patterns` depending on whether you want breadth or depth.
* **Pattern work**: `pattern_deep_dive` when you feel a specific pattern is weak.
* **Confidence**: `confidence_booster` the day before an interview to get wins.
* **Challenge**: `challenge_mode` for heavy practice and time-boxing.

---

# 9. API surface & UX flow

All endpoints are prefixed with `/api/v1`. Protected routes require a valid JWT access token (sent via HTTP-only cookie).

## Implemented Endpoints ✅

### Health Check
* `GET /api/v1/health` — Health check (returns 200 OK)

### Authentication
* `POST /api/v1/auth/login` — Login with email/password → returns access token + refresh token (HTTP-only cookies)
* `POST /api/v1/auth/logout` — Logout, invalidates refresh token
* `POST /api/v1/auth/refresh` — Refresh access token using refresh token

### Users
* `POST /api/v1/users` — Create user (email, password, name) → returns user info (public registration)
* `GET /api/v1/users/me` — Get current authenticated user *(protected)*

## Required Endpoints (To Be Implemented) 🔧

### Dashboard
* `GET /api/v1/dashboard/stats` *(protected)* — Returns aggregate stats for dashboard home
  ```json
  {
    "total_problems": 45,
    "problems_solved": 32,
    "patterns_covered": 12,
    "avg_confidence": 72,
    "current_streak": 5,
    "total_sessions": 18,
    "problems_due": 8
  }
  ```

### Problems
* `GET /api/v1/problems` *(protected)* — List all problems with user stats
  ```json
  {
    "problems": [{
      "id": 1,
      "title": "Two Sum",
      "source": "LeetCode",
      "url": "https://...",
      "difficulty": "easy",
      "patterns": ["arrays", "hash-table"],
      "confidence": 85,
      "last_attempt_at": "2024-01-15T10:30:00Z",
      "total_attempts": 3,
      "status": "solved",
      "score": 0.42
    }]
  }
  ```
* `GET /api/v1/problems/urgent` *(protected)* — Get top N problems needing revision (sorted by score desc)
* `GET /api/v1/problems/:id` *(protected)* — Get single problem with full details
* `POST /api/v1/problems` *(protected)* — Create new problem
  ```json
  {
    "title": "Two Sum",
    "source": "LeetCode",
    "url": "https://...",
    "difficulty": "easy",
    "patterns": [1, 2]  // pattern IDs
  }
  ```
* `PUT /api/v1/problems/:id` *(protected)* — Update problem
* `DELETE /api/v1/problems/:id` *(protected)* — Delete problem

### Patterns
* `GET /api/v1/patterns` *(protected)* — List all patterns with user stats
  ```json
  {
    "patterns": [{
      "id": 1,
      "title": "Sliding Window",
      "description": "...",
      "problem_count": 8,
      "avg_confidence": 65,
      "times_revised": 12
    }]
  }
  ```
* `POST /api/v1/patterns` *(protected)* — Create new pattern
* `PUT /api/v1/patterns/:id` *(protected)* — Update pattern
* `DELETE /api/v1/patterns/:id` *(protected)* — Delete pattern

### Sessions
* `GET /api/v1/sessions` *(protected)* — List all revision sessions for user
  ```json
  {
    "sessions": [{
      "id": 1,
      "template_key": "daily_revision",
      "created_at": "2024-01-15T10:00:00Z",
      "planned_duration_min": 35,
      "problems_count": 5,
      "completed": true
    }]
  }
  ```
* `GET /api/v1/sessions/:id` *(protected)* — Get session details with problems
* `POST /api/v1/sessions/generate` *(protected)* — Generate session preview (does not save)
  ```json
  // Request
  { "template_key": "daily_revision" }
  // Response: preview of problems with reasons
  {
    "template_key": "daily_revision",
    "planned_duration_min": 35,
    "problems": [{
      "problem_id": 1,
      "title": "Two Sum",
      "planned_min": 12,
      "score": 0.82,
      "reason": "Low confidence (40), failed last attempt, 17 days since last"
    }]
  }
  ```
* `POST /api/v1/sessions` *(protected)* — Create and start a session
* `PUT /api/v1/sessions/:id/complete` *(protected)* — Mark session as complete

### Attempts
* `POST /api/v1/attempts` *(protected)* — Record a problem attempt
  ```json
  {
    "problem_id": 1,
    "session_id": 5,        // optional
    "confidence_score": 75,
    "duration_seconds": 1200,
    "outcome": "passed",
    "notes": "Got stuck on edge case initially"
  }
  ```
  * Backend updates `user_problem_stats` aggregate table automatically
* `GET /api/v1/attempts` *(protected)* — List recent attempts (with pagination)
* `GET /api/v1/problems/:id/attempts` *(protected)* — Get attempts for a specific problem

### User Settings
* `GET /api/v1/users/settings` *(protected)* — Get user preferences
* `PUT /api/v1/users/settings` *(protected)* — Update user preferences

### Admin / Weights ✅
* `GET /api/v1/settings/weights` *(protected)* — Get current scoring weights
* `GET /api/v1/settings/weights/defaults` *(protected)* — Get default weights from environment config
* `PUT /api/v1/settings/weights` *(protected)* — Update scoring weights (uses UPSERT to handle missing rows)

### Export
* `GET /api/v1/export/markdown` *(protected)* — Export all problems/notes to markdown (Obsidian-style)
* `GET /api/v1/export/json` *(protected)* — Export all data as JSON backup

## UI flows

1. **Onboarding**: Register → Login → Add a few patterns (one-time) → Add problems as you solve them.
2. **Home (Dashboard)**: Summary — weak patterns, suggested session (quick create), streaks, urgent problems.
3. **Start session**: Choose template → preview (`/sessions/generate`) → `Create session` (`POST /sessions`) → shows items with reasons and estimated times → `Start`.
4. **Do problem**: Click `Open` (opens URL in new tab), do problem, return to app, click `Record attempt` (`POST /attempts`).
5. **Session summary**: show updated stats, changes in scores; option to export session to markdown.

**UI requirement:** For each recommended problem, show an **explainability panel** that lists feature contributions (f_conf * w_conf = x, f_days * w_days = y, ...). This builds trust.

---

# 10. Deployment, backup, security, migration notes

## Deployment

* Preferred: run the single Go binary:

  ```bash
  ./dsa-sensei serve --data ./data
  ```

  This will create `data/dsa.db` (SQLite), provide HTTP server on `localhost:9173` by default, and serve the React SPA.

* Docker (optional):

  ```yaml
  version: "3"
  services:
    dsa:
      image: vasujain/dsa-sensei:latest
      volumes:
        - ./data:/app/data
       ports:
         - "9173:9173"
  ```

## Backups

* Backup the SQLite DB file `dsa.db` regularly. Provide `export` endpoints (JSON/Markdown) for portability.
* Recommended: one-line backup script:

  ```bash
  cp data/dsa.db backups/dsa.db.$(date +%F-%H%M)
  ```

## Security & privacy

* Default listen only on `127.0.0.1`. To expose on LAN, require an explicit flag `--bind 0.0.0.0`.
* No telemetry by default.
* Optional: encrypt DB at rest (if user wants), or provide a guide to store DB on an encrypted filesystem.

## Data migration & portability

* `GET /api/v1/export/markdown` will map to your Problem & Pattern templates for Obsidian-style export. (Your problem & pattern templates are the canonical export format; see the pattern & problem templates you provided for structure.)
* Future migration path to Postgres or PocketBase is straightforward because schema is normalized and small.

---

# 11. Roadmap & Progress

## Completed ✅

### Foundation
* [x] Go backend skeleton with Chi router
* [x] SQLite database with goose migrations
* [x] Full database schema (11 tables including `attempts` for detailed logging)
* [x] SQLC query generation setup

### Authentication (Originally Post-MVP, Now Complete)
* [x] User registration (email/password)
* [x] JWT-based authentication with access tokens
* [x] Stateful refresh tokens with database storage
* [x] Login/Logout/Refresh endpoints
* [x] Auth middleware for protected routes
* [x] Password hashing with bcrypt

### Frontend Foundation
* [x] React + Vite + TypeScript setup
* [x] Shadcn UI component library
* [x] Custom "Nerdy Linux" theme (see `STYLE-GUIDE.md`)
* [x] Zustand state management for auth
* [x] Axios API client with interceptors
* [x] Protected routes with auth guards
* [x] Landing page with login/register
* [x] Dashboard layout with sidebar navigation
* [x] All dashboard pages (Home, Problems, Sessions, Patterns, New Session, New Problem, Settings)
* [x] API error handling components
* [x] Settings page with scoring weights configuration
* [x] Reset to defaults functionality with backend integration

### Settings Management ✅
* [x] Environment-based default weights configuration (`.env` file)
* [x] `GetFloat()` helper in env package for parsing float environment variables
* [x] Scoring weights config structure in main application config
* [x] Settings service with injected default weights
* [x] `GetScoringWeights` endpoint - returns DB weights or falls back to defaults
* [x] `GetDefaultWeights` endpoint - returns environment-configured defaults
* [x] `UpdateScoringWeights` endpoint - uses UPSERT to persist weight changes
* [x] Settings page UI with sliders for all 7 weights
* [x] Weight sum validation indicator (green when sum = 1.00)
* [x] Reset to defaults button with confirmation dialog

## In Progress 🔧

### Backend API Endpoints
* [x] Dashboard stats endpoint (`GET /dashboard/stats`)
* [x] Problems CRUD endpoints (list, get, create, update, delete)
* [x] Patterns CRUD endpoints (list, get, create, update, delete)
* [x] Sessions endpoints (list, get, create, generate)
* [x] Attempts endpoint (`POST /attempts`, `GET /attempts`, `GET /problems/:id/attempts`)
* [x] Settings/weights endpoints (get, get defaults, update)
* [ ] User settings endpoints (preferences)

### Core Business Logic
* [x] Scoring formula implementation in Go
* [x] Session generation algorithm (greedy builder)
* [x] Stats aggregation on attempt recording
* [x] Score computation with explainability breakdown

## Remaining (MVP)

* [ ] Export endpoints (`/export/markdown`, `/export/json`)
* [ ] Docker file and single binary distribution
* [ ] User preferences/settings (non-scoring related)

## Post-MVP (Quality of Life)

* [ ] Add optional Electron/Tauri wrapper for native app experience
* [ ] Add a "session replay" or "progress charts" dashboard
* [ ] CSV/JSON import for bulk problem upload
* [ ] Add an optional AI re-ranking plugin as a local Python micro-service (kept completely optional and disabled by default)

## Future (Long-term)

* Generic plugin system for custom heuristics
* Importers for other platforms
* Team features (if you decide to support small teams)

---

# Appendix A — Example problem entry (UI fields)

* Title (string)
* ID (string, auto)
* Source (string)
* URL (string)
* Difficulty (easy/medium/hard)
* Patterns (multi-select; create new)
* Confidence (0–100; default 50)
* Avg time (minutes; optional)
* Add initial `user_problem_stats` if this is a solved problem (last_attempt_at, total_attempts, last_outcome)

**Note:** Problem & Pattern templates for markdown export/import follow the structure you already use — we will keep compatibility for that export.

---

# Appendix B — Example session creation use-case (concrete)

**User:** opens app, chooses `daily_revision` (35 min).
**Backend flow:**

1. Query user_problem_stats, join patterns → compute features.
2. Compute score for 120 candidate problems.
3. Filter to difficulty ≤ medium.
4. Sort by score desc.
5. Build session via greedy algorithm until 35 min budget filled (ensuring 2 quick wins and ≤ 2 same pattern).
6. Return session JSON with each problem and explanation.

**Result:** User sees 5–6 prioritized problems, each annotated with a human-readable reason like:

* “Problem A — score 0.82 — Low confidence (f_conf:0.8) + failed last time (f_failed:1.0) + 30 days since last (f_days:0.33)”

---

# Closing notes — Philosophy & Why this will work

* You asked for **clean, minimal, self-hostable**. This architecture maximizes all three.
* The deterministic scoring is **explainable** and **iterable**; you can tune weights and see measurable effects.
* Removing AI from the core is not conservative — it’s engineering discipline: AI would add cost and uncertainty without meaningful advantage for this problem.
* Serving the React SPA from the Go binary gives a single artifact to run — perfect for personal, self-hosted usage.
* **Authentication** was added early to support multi-user environments and protect personal practice data, even though it was originally planned for post-MVP.

---

# Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Backend | Go (Chi router, goose migrations, SQLC) |
| Database | SQLite |
| Frontend | React + TypeScript + Vite |
| State | Zustand |
| UI | Shadcn UI + Tailwind CSS |
| Auth | JWT (stateful refresh tokens, bcrypt) |
| API Client | Axios with interceptors |

---

*Last updated: Reflects current implementation state with auth, attempts table, and updated schema.*
