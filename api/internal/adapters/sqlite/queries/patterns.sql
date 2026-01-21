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

-- name: UpdatePattern :one
UPDATE patterns
SET title = ?, description = ?
WHERE id = ?
RETURNING id, title, description;

-- name: DeletePattern :exec
DELETE FROM patterns
WHERE id = ?;

-- name: GetPatternProblemCount :one
SELECT COUNT(*) as count
FROM problem_patterns
WHERE pattern_id = ?;

-- name: GetProblemsForPattern :many
SELECT p.* FROM problems p
INNER JOIN problem_patterns pp ON p.id = pp.problem_id
WHERE pp.pattern_id = ?;
