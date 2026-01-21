-- +goose Up
-- +goose StatementBegin

-- ============================================================================
-- ENHANCED SESSION SYSTEM
-- Adds support for custom session builder and saved templates
-- ============================================================================

-- Add custom session fields to revision_sessions
ALTER TABLE revision_sessions ADD COLUMN session_name TEXT;
ALTER TABLE revision_sessions ADD COLUMN is_custom BOOLEAN DEFAULT 0;
ALTER TABLE revision_sessions ADD COLUMN custom_config_json TEXT; -- Store CustomSessionConfig if is_custom=1

-- User saved templates table
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

-- Pattern mastery tracking for graduation feature
CREATE TABLE user_pattern_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pattern_id INTEGER NOT NULL,
    milestone_type TEXT CHECK (milestone_type IN ('started', 'improved', 'graduated', 'mastered')),
    confidence_before INTEGER,
    confidence_after INTEGER,
    notes TEXT,                       -- Optional: user notes or system-generated description
    achieved_at TEXT DEFAULT CURRENT_TIMESTAMP,
    session_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES revision_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_pattern_milestones ON user_pattern_milestones(user_id, pattern_id, achieved_at);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop new tables
DROP TABLE IF EXISTS user_pattern_milestones;
DROP TABLE IF EXISTS user_session_templates;

-- Note: SQLite doesn't support DROP COLUMN, so we can't cleanly remove the ALTER TABLE changes
-- In a real migration system, you'd need to recreate the table without those columns
-- For now, we'll leave them (they won't hurt if empty)

-- +goose StatementEnd
