-- name: CreateUser :one
INSERT INTO users (email, password_hash, name, role)
VALUES ($1, $2, $3, $4)
RETURNING id, email, name, role, is_active, created_at;

-- name: GetUserByEmail :one
-- Used for Login: Fetch everything including the password_hash
SELECT id, email, password_hash, name, role, is_active, created_at
FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
-- Used for Session/Context: Fetch user details without the sensitive hash
SELECT id, email, name, role, is_active, created_at
FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByIDWithPassword :one
-- Used for password verification: Fetch user with password hash
SELECT id, email, password_hash, name, role, is_active, created_at
FROM users
WHERE id = $1 LIMIT 1;

-- name: GetAllUsers :many
-- Admin: List all users (supports pagination)
SELECT id, email, name, role, is_active, created_at
FROM users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountAllUsers :one
-- Used for pagination and checking if admin exists
SELECT COUNT(*) FROM users;

-- name: CountAdmins :one
-- Check if any admin exists (used for seeding)
SELECT COUNT(*) FROM users WHERE role = 'admin';

-- name: UpdateUserPassword :exec
UPDATE users
SET password_hash = $1
WHERE id = $2;

-- name: UpdateUserEmail :exec
UPDATE users
SET email = $1
WHERE id = $2;

-- name: UpdateUserRole :exec
-- Admin: Promote/Demote users
UPDATE users
SET role = $1
WHERE id = $2;

-- name: UpdateUserActiveStatus :exec
-- Admin: Soft activate/deactivate users
UPDATE users
SET is_active = $1
WHERE id = $2;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;
