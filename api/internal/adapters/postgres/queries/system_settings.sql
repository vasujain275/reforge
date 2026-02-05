-- name: GetSystemSetting :one
SELECT * FROM system_settings
WHERE key = $1
LIMIT 1;

-- name: ListSystemSettings :many
SELECT * FROM system_settings
ORDER BY key;

-- name: UpdateSystemSetting :one
UPDATE system_settings
SET value = $1, updated_at = NOW()
WHERE key = $2
RETURNING *;

-- name: UpsertSystemSetting :one
INSERT INTO system_settings (key, value, description)
VALUES ($1, $2, $3)
ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = NOW()
RETURNING *;

-- name: GetScoringWeights :many
SELECT key, value FROM system_settings
WHERE key IN ('w_conf', 'w_days', 'w_attempts', 'w_time', 'w_difficulty', 'w_failed', 'w_pattern');

-- name: GetSignupSettings :many
SELECT key, value FROM system_settings
WHERE key IN ('signup_enabled', 'invite_codes_enabled');
