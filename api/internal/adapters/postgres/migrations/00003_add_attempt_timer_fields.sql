-- +goose Up
-- +goose StatementBegin

-- Add timer-related fields to attempts table for stopwatch functionality
-- status: tracks attempt lifecycle (in_progress, completed, abandoned)
-- elapsed_time_seconds: current elapsed time, synced every 10 seconds
-- timer_state: current timer state (idle, running, paused)
-- timer_last_updated_at: timestamp of last timer sync
-- started_at: when the attempt was started

ALTER TABLE attempts ADD COLUMN status TEXT 
    CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'completed';

ALTER TABLE attempts ADD COLUMN elapsed_time_seconds INTEGER DEFAULT 0;

ALTER TABLE attempts ADD COLUMN timer_state TEXT 
    CHECK (timer_state IN ('idle', 'running', 'paused')) DEFAULT 'idle';

ALTER TABLE attempts ADD COLUMN timer_last_updated_at TIMESTAMPTZ;

ALTER TABLE attempts ADD COLUMN started_at TIMESTAMPTZ;

-- Update existing attempts to have completed status and set started_at from performed_at
UPDATE attempts SET status = 'completed', started_at = performed_at WHERE status IS NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- PostgreSQL supports DROP COLUMN directly
ALTER TABLE attempts DROP COLUMN IF EXISTS status;
ALTER TABLE attempts DROP COLUMN IF EXISTS elapsed_time_seconds;
ALTER TABLE attempts DROP COLUMN IF EXISTS timer_state;
ALTER TABLE attempts DROP COLUMN IF EXISTS timer_last_updated_at;
ALTER TABLE attempts DROP COLUMN IF EXISTS started_at;

-- +goose StatementEnd
