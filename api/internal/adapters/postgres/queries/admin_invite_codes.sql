-- name: CreateInviteCode :one
INSERT INTO admin_invite_codes (code, created_by_admin_id, max_uses, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING id, code, created_by_admin_id, max_uses, current_uses, expires_at, created_at;

-- name: GetInviteCodeByCode :one
SELECT id, code, created_by_admin_id, max_uses, current_uses, expires_at, created_at
FROM admin_invite_codes
WHERE code = $1
LIMIT 1;

-- name: GetInviteCodeByID :one
SELECT id, code, created_by_admin_id, max_uses, current_uses, expires_at, created_at
FROM admin_invite_codes
WHERE id = $1
LIMIT 1;

-- name: ListInviteCodes :many
-- Admin: List all invite codes with pagination
SELECT id, code, created_by_admin_id, max_uses, current_uses, expires_at, created_at
FROM admin_invite_codes
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountInviteCodes :one
SELECT COUNT(*) FROM admin_invite_codes;

-- name: IncrementInviteCodeUses :exec
UPDATE admin_invite_codes
SET current_uses = current_uses + 1
WHERE id = $1;

-- name: DeleteInviteCode :exec
DELETE FROM admin_invite_codes
WHERE id = $1;

-- name: DeleteExpiredInviteCodes :exec
-- Cleanup job: Remove expired codes
DELETE FROM admin_invite_codes
WHERE expires_at IS NOT NULL 
  AND expires_at < NOW();
