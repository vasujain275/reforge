-- +goose Up
-- +goose StatementBegin

-- ============================================================================
-- SYSTEM CONFIGURATION
-- ============================================================================

-- 1. System Settings (Global tuning parameters)
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,        -- e.g., 'w_conf'
    value TEXT NOT NULL,         -- Stored as string, app casts to float/int
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default values
INSERT INTO system_settings (key, value, description) VALUES 
('w_conf', '0.30', 'Weight for confidence urgency'),
('w_days', '0.20', 'Weight for time since last attempt'),
('w_attempts', '0.10', 'Weight for attempt count'),
('w_time', '0.05', 'Weight for solve duration'),
('w_difficulty', '0.15', 'Weight for problem difficulty'),
('w_failed', '0.10', 'Weight for last outcome failure'),
('w_pattern', '0.10', 'Weight for pattern weakness aggregate'),
('signup_enabled', 'true', 'Allow new user registration'),
('invite_codes_enabled', 'true', 'Require invite codes when signup is disabled');

-- ============================================================================
-- AUTHENTICATION & USERS
-- ============================================================================

-- 2. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,       -- Used for login
    password_hash TEXT NOT NULL,      -- Bcrypt/Argon2 hash
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,   -- Soft delete/deactivation flag
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- 3. Refresh Tokens (Stateful Auth)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL,         -- Store hash of the token
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- 4. Admin Invite Codes
CREATE TABLE admin_invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,            -- UUID v4
    created_by_admin_id UUID NOT NULL,
    max_uses INTEGER DEFAULT 1,           -- How many signups allowed
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,               -- NULL = never expires
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_invite_codes_code ON admin_invite_codes(code);
CREATE INDEX idx_invite_codes_admin ON admin_invite_codes(created_by_admin_id);

-- 5. Password Reset Tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_by_admin_id UUID,             -- NULL if self-initiated
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,                  -- NULL = not used yet
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- ============================================================================
-- CORE DOMAIN (Problems & Patterns)
-- ============================================================================

-- 6. Problems
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source TEXT,                      -- e.g., "LeetCode", "NeetCode 150"
    url TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Patterns
CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,              -- Display name e.g., 'Sliding Window'
    description TEXT
);

-- 8. Problem <-> Patterns (Many-to-Many)
CREATE TABLE problem_patterns (
    problem_id UUID NOT NULL,
    pattern_id UUID NOT NULL,

    PRIMARY KEY (problem_id, pattern_id),
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);

CREATE INDEX idx_problem_patterns_pattern ON problem_patterns(pattern_id);

-- ============================================================================
-- USER PROGRESS & STATS
-- ============================================================================

-- 9. Revision Sessions (Study sessions history)
CREATE TABLE revision_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    template_key TEXT,                -- e.g., 'daily_revision'
    session_name TEXT,
    is_custom BOOLEAN DEFAULT false,
    custom_config_json TEXT,          -- Store CustomSessionConfig if is_custom=true
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,         -- NULL if in-progress, timestamp when completed
    planned_duration_min INTEGER,
    items_ordered TEXT,               -- JSON Array of planned problems
    
    -- Timer fields
    elapsed_time_seconds INTEGER DEFAULT 0,
    timer_state TEXT CHECK (timer_state IN ('idle', 'running', 'paused')) DEFAULT 'idle',
    timer_last_updated_at TIMESTAMPTZ,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Attempts (The detailed log of every practice run)
CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL,
    session_id UUID,                  -- Nullable (can solve outside a session)

    confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
    duration_seconds INTEGER,
    outcome TEXT CHECK (outcome IN ('passed', 'failed')),
    notes TEXT,                       -- Optional user reflection
    performed_at TIMESTAMPTZ DEFAULT NOW(),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES revision_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_attempts_user_problem ON attempts(user_id, problem_id);
CREATE INDEX idx_attempts_performed_at ON attempts(user_id, performed_at);

-- 11. User Problem Stats (The "Brain" of the scoring system)
-- This is an aggregate table updated after every attempt to make scoring fast.
CREATE TABLE user_problem_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL,

    -- Status
    status TEXT CHECK (status IN ('unsolved','solved','abandoned')) DEFAULT 'unsolved',

    -- Scoring Features
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100) DEFAULT 50,
    avg_confidence INTEGER CHECK (avg_confidence BETWEEN 0 AND 100) DEFAULT 50,

    -- Temporal & Frequency data
    last_attempt_at TIMESTAMPTZ,      -- ISO8601 Timestamp
    total_attempts INTEGER DEFAULT 0,
    avg_time_seconds INTEGER,
    last_outcome TEXT,                -- 'passed' or 'failed'

    -- Lightweight JSON cache of recent attempts for quick UI display
    recent_history_json TEXT, 

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, problem_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE INDEX idx_stats_user_lookup ON user_problem_stats(user_id);
CREATE INDEX idx_stats_urgency ON user_problem_stats(user_id, last_attempt_at);

-- 12. User Pattern Stats (Aggregates for "weakness" analysis)
CREATE TABLE user_pattern_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    pattern_id UUID NOT NULL,

    times_revised INTEGER DEFAULT 0,
    avg_confidence INTEGER DEFAULT 50,
    last_revised_at TIMESTAMPTZ,

    UNIQUE(user_id, pattern_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);

-- 13. User Saved Session Templates
CREATE TABLE user_session_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    template_name TEXT NOT NULL,
    template_key TEXT,                -- Optional: maps to preset template if forked
    config_json TEXT NOT NULL,        -- Full CustomSessionConfig as JSON
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT false,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_templates ON user_session_templates(user_id, is_favorite);

-- 14. Pattern Mastery Tracking (for graduation feature)
CREATE TABLE user_pattern_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    pattern_id UUID NOT NULL,
    milestone_type TEXT CHECK (milestone_type IN ('started', 'improved', 'graduated', 'mastered')),
    confidence_before INTEGER,
    confidence_after INTEGER,
    notes TEXT,
    achieved_at TIMESTAMPTZ DEFAULT NOW(),
    session_id UUID,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES revision_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_pattern_milestones ON user_pattern_milestones(user_id, pattern_id, achieved_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update 'updated_at' when stats change
CREATE TRIGGER update_user_problem_stats_timestamp
    BEFORE UPDATE ON user_problem_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS update_user_problem_stats_timestamp ON user_problem_stats;
DROP FUNCTION IF EXISTS update_modified_column();
DROP TABLE IF EXISTS user_pattern_milestones;
DROP TABLE IF EXISTS user_session_templates;
DROP TABLE IF EXISTS user_pattern_stats;
DROP TABLE IF EXISTS user_problem_stats;
DROP TABLE IF EXISTS attempts;
DROP TABLE IF EXISTS revision_sessions;
DROP TABLE IF EXISTS problem_patterns;
DROP TABLE IF EXISTS patterns;
DROP TABLE IF EXISTS problems;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS admin_invite_codes;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS system_settings;
-- +goose StatementEnd
