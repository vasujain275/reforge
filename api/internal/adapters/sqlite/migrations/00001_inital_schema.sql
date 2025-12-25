-- +goose Up
-- +goose StatementBegin

-- 1. Enable Foreign Key support (Critical for SQLite)
PRAGMA foreign_keys = ON;

-- ============================================================================
-- AUTHENTICATION & USERS
-- ============================================================================

-- 2. Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,       -- Used for login
    password_hash TEXT NOT NULL,      -- Bcrypt/Argon2 hash
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Refresh Tokens (Stateful Auth)
-- Allows multiple devices/sessions per user. Revocable.
CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,         -- Store hash of the token, not raw token
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,                  -- Optional: "Chrome on MacOS"
    ip_address TEXT,                  -- Optional: Security auditing

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================================
-- CORE DOMAIN (Problems & Patterns)
-- ============================================================================

-- 4. Problems
CREATE TABLE problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT,                      -- e.g., "LeetCode", "NeetCode 150"
    url TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Patterns
CREATE TABLE patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,         -- Immutable key for code lookups e.g., 'sliding-window'
    title TEXT NOT NULL,              -- Display name e.g., 'Sliding Window'
    description TEXT
);

-- 6. Problem <-> Patterns (Many-to-Many)
CREATE TABLE problem_patterns (
    problem_id INTEGER NOT NULL,
    pattern_id INTEGER NOT NULL,

    PRIMARY KEY (problem_id, pattern_id),
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);

CREATE INDEX idx_problem_patterns_pattern ON problem_patterns(pattern_id);

-- ============================================================================
-- USER PROGRESS & STATS
-- ============================================================================

-- 7. User Problem Stats (The "Brain" of the scoring system)
CREATE TABLE user_problem_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,

    -- Status
    status TEXT CHECK (status IN ('unsolved','solved','abandoned')) DEFAULT 'unsolved',

    -- Scoring Features
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100) DEFAULT 50,
    avg_confidence INTEGER CHECK (avg_confidence BETWEEN 0 AND 100) DEFAULT 50,

    -- Temporal & Frequency data
    last_attempt_at TEXT,             -- ISO8601 Timestamp
    total_attempts INTEGER DEFAULT 0,
    avg_time_seconds INTEGER,
    last_outcome TEXT,                -- 'passed' or 'failed'

    -- Audit trail (JSON Array string)
    revision_history TEXT,

    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, problem_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE INDEX idx_stats_user_lookup ON user_problem_stats(user_id);
CREATE INDEX idx_stats_urgency ON user_problem_stats(user_id, last_attempt_at);

-- 8. User Pattern Stats (Aggregates for "weakness" analysis)
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

-- 9. Revision Sessions (Study sessions history)
-- Renamed from 'sessions' to avoid conflict with Auth sessions
CREATE TABLE revision_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    template_key TEXT,                -- e.g., 'daily_quick_win'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    planned_duration_min INTEGER,
    items_ordered TEXT,               -- JSON Array of intended problems

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update 'updated_at' when stats change
CREATE TRIGGER update_user_problem_stats_timestamp
AFTER UPDATE ON user_problem_stats
BEGIN
    UPDATE user_problem_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS update_user_problem_stats_timestamp;
DROP TABLE IF EXISTS revision_sessions;
DROP TABLE IF EXISTS user_pattern_stats;
DROP TABLE IF EXISTS user_problem_stats;
DROP TABLE IF EXISTS problem_patterns;
DROP TABLE IF EXISTS patterns;
DROP TABLE IF EXISTS problems;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
-- +goose StatementEnd
