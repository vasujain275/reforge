-- name: CreateUser :one
INSERT INTO users (email, password_hash, name)
VALUES (?, ?, ?)
RETURNING id, email, name, created_at;

-- name: GetUserByEmail :one
-- Used for Login: Fetch everything including the password_hash
SELECT id, email, password_hash, name, created_at
FROM users
WHERE email = ? LIMIT 1;

-- name: GetUserByID :one
-- Used for Session/Context: Fetch user details without the sensitive hash
SELECT id, email, name, created_at
FROM users
WHERE id = ? LIMIT 1;

-- name: UpdateUserPassword :exec
UPDATE users
SET password_hash = ?
WHERE id = ?;

-- name: UpdateUserEmail :exec
UPDATE users
SET email = ?
where id = ?;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = ?;

-- name: CountUsers :one
-- Used for checking if the system has been initialized (seed logic)
SELECT count(*) FROM users;