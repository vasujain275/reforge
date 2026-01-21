-- name: CreateUser :one
INSERT INTO users (email, password_hash, name, role)
VALUES (?, ?, ?, ?)
RETURNING id, email, name, role, is_active, created_at;

-- name: GetUserByEmail :one
-- Used for Login: Fetch everything including the password_hash
SELECT id, email, password_hash, name, role, is_active, created_at
FROM users
WHERE email = ? LIMIT 1;

-- name: GetUserByID :one
-- Used for Session/Context: Fetch user details without the sensitive hash
SELECT id, email, name, role, is_active, created_at
FROM users
WHERE id = ? LIMIT 1;

-- name: GetUserByIDWithPassword :one
-- Used for password verification: Fetch user with password hash
SELECT id, email, password_hash, name, role, is_active, created_at
FROM users
WHERE id = ? LIMIT 1;

-- name: GetAllUsers :many
-- Admin: List all users (supports pagination)
SELECT id, email, name, role, is_active, created_at
FROM users
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountAllUsers :one
-- Used for pagination and checking if admin exists
SELECT COUNT(*) FROM users;

-- name: CountAdmins :one
-- Check if any admin exists (used for seeding)
SELECT COUNT(*) FROM users WHERE role = 'admin';

-- name: UpdateUserPassword :exec
UPDATE users
SET password_hash = ?
WHERE id = ?;

-- name: UpdateUserEmail :exec
UPDATE users
SET email = ?
WHERE id = ?;

-- name: UpdateUserRole :exec
-- Admin: Promote/Demote users
UPDATE users
SET role = ?
WHERE id = ?;

-- name: UpdateUserActiveStatus :exec
-- Admin: Soft activate/deactivate users
UPDATE users
SET is_active = ?
WHERE id = ?;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = ?;