-- +goose Up
-- +goose StatementBegin

-- 1. Enable Foreign Key support (Critical for SQLite)
PRAGMA foreign_keys = ON;

-- ============================================================================
-- SYSTEM CONFIGURATION
-- ============================================================================

-- 2. System Settings (Global tuning parameters)
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,        -- e.g., 'w_conf'
    value TEXT NOT NULL,         -- Stored as string, app casts to float/int
    description TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed default values
INSERT INTO system_settings (key, value, description) VALUES 
('w_conf', '0.30', 'Weight for confidence urgency'),
('w_days', '0.20', 'Weight for time since last attempt'),
('w_attempts', '0.10', 'Weight for attempt count'),
('w_time', '0.05', 'Weight for solve duration'),
('w_difficulty', '0.15', 'Weight for problem difficulty'),
('w_failed', '0.10', 'Weight for last outcome failure'),
('w_pattern', '0.10', 'Weight for pattern weakness aggregate');

-- ============================================================================
-- AUTHENTICATION & USERS
-- ============================================================================

-- 3. Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,       -- Used for login
    password_hash TEXT NOT NULL,      -- Bcrypt/Argon2 hash
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Refresh Tokens (Stateful Auth)
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

CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================================
-- CORE DOMAIN (Problems & Patterns)
-- ============================================================================

-- 5. Problems
CREATE TABLE problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT,                      -- e.g., "LeetCode", "NeetCode 150"
    url TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Patterns
CREATE TABLE patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,              -- Display name e.g., 'Sliding Window'
    description TEXT
);

-- 7. Problem <-> Patterns (Many-to-Many)
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

-- 8. Revision Sessions (Study sessions history)
CREATE TABLE revision_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    template_key TEXT,                -- e.g., 'daily_revision'
    session_name TEXT,
    is_custom BOOLEAN DEFAULT 0,
    custom_config_json TEXT,          -- Store CustomSessionConfig if is_custom=1
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,                -- NULL if in-progress, timestamp when completed
    planned_duration_min INTEGER,
    items_ordered TEXT,               -- JSON Array of planned problems
    
    -- Timer fields
    elapsed_time_seconds INTEGER DEFAULT 0,
    timer_state TEXT CHECK (timer_state IN ('idle', 'running', 'paused')) DEFAULT 'idle',
    timer_last_updated_at TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Attempts (The detailed log of every practice run)
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

CREATE INDEX idx_attempts_user_problem ON attempts(user_id, problem_id);
CREATE INDEX idx_attempts_performed_at ON attempts(user_id, performed_at);

-- 10. User Problem Stats (The "Brain" of the scoring system)
-- This is an aggregate table updated after every attempt to make scoring fast.
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

    -- NOTE: 'revision_history' removed or kept as lightweight JSON cache?
    -- Since we have a proper 'attempts' table now, we don't strictly need it,
    -- but we can keep it as a small JSON array of the last 3-5 dates for quick UI display.
    recent_history_json TEXT, 

    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, problem_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE INDEX idx_stats_user_lookup ON user_problem_stats(user_id);
CREATE INDEX idx_stats_urgency ON user_problem_stats(user_id, last_attempt_at);

-- 11. User Pattern Stats (Aggregates for "weakness" analysis)
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

-- 12. User Saved Session Templates
CREATE TABLE user_session_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    template_name TEXT NOT NULL,
    template_key TEXT,                -- Optional: maps to preset template if forked
    config_json TEXT NOT NULL,        -- Full CustomSessionConfig as JSON
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT,
    use_count INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_templates ON user_session_templates(user_id, is_favorite);

-- 13. Pattern Mastery Tracking (for graduation feature)
CREATE TABLE user_pattern_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pattern_id INTEGER NOT NULL,
    milestone_type TEXT CHECK (milestone_type IN ('started', 'improved', 'graduated', 'mastered')),
    confidence_before INTEGER,
    confidence_after INTEGER,
    notes TEXT,
    achieved_at TEXT DEFAULT CURRENT_TIMESTAMP,
    session_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES revision_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_pattern_milestones ON user_pattern_milestones(user_id, pattern_id, achieved_at);

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
DROP TABLE IF EXISTS user_pattern_milestones;
DROP TABLE IF EXISTS user_session_templates;
DROP TABLE IF EXISTS user_pattern_stats;
DROP TABLE IF EXISTS user_problem_stats;
DROP TABLE IF EXISTS attempts;
DROP TABLE IF EXISTS revision_sessions;
DROP TABLE IF EXISTS problem_patterns;
DROP TABLE IF EXISTS patterns;
DROP TABLE IF EXISTS problems;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS system_settings;
-- +goose StatementEnd
