-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
VALUES (?, ?, ?, ?, ?)
RETURNING id, user_id, token_hash, expires_at, created_at;

-- name: GetRefreshTokenByHash :one
SELECT id, user_id, token_hash, expires_at
FROM refresh_tokens
WHERE token_hash = ? LIMIT 1;

-- name: RevokeRefreshToken :exec
DELETE FROM refresh_tokens
WHERE token_hash = ?;

-- name: DeleteExpiredTokens :exec
DELETE FROM refresh_tokens
WHERE expires_at < CURRENT_TIMESTAMP;
