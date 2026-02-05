-- name: CreatePasswordResetToken :one
INSERT INTO password_reset_tokens (user_id, token_hash, created_by_admin_id, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING id, user_id, token_hash, created_by_admin_id, expires_at, used_at, created_at;

-- name: GetPasswordResetToken :one
SELECT id, user_id, token_hash, created_by_admin_id, expires_at, used_at, created_at
FROM password_reset_tokens
WHERE token_hash = $1
LIMIT 1;

-- name: MarkPasswordResetTokenUsed :exec
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE id = $1;

-- name: DeletePasswordResetToken :exec
DELETE FROM password_reset_tokens
WHERE id = $1;

-- name: DeleteExpiredPasswordResetTokens :exec
-- Cleanup job: Remove expired tokens
DELETE FROM password_reset_tokens
WHERE expires_at < NOW();

-- name: DeleteUsedPasswordResetTokens :exec
-- Cleanup job: Remove tokens that were already used
DELETE FROM password_reset_tokens
WHERE used_at IS NOT NULL;
