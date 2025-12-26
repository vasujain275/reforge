-- name: CreatePattern :one
INSERT INTO patterns (title, description)
VALUES (?, ?)
RETURNING id, title, description;

-- name: GetPattern :one
SELECT * FROM patterns
WHERE id = ? LIMIT 1;

-- name: ListPatterns :many
SELECT * FROM patterns
ORDER BY title;

-- name: GetPatternsByIDs :many
SELECT * FROM patterns
WHERE id IN (sqlc.slice('ids'));
