-- name: CreateProblem :one
INSERT INTO problems (title, source, url, difficulty)
VALUES (?, ?, ?, ?)
RETURNING id, title, source, url, difficulty, created_at;

-- name: GetProblem :one
SELECT * FROM problems
WHERE id = ? LIMIT 1;

-- name: ListProblems :many
SELECT * FROM problems
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: LinkProblemToPattern :exec
INSERT INTO problem_patterns (problem_id, pattern_id)
VALUES (?, ?);

-- name: GetPatternsForProblem :many
SELECT p.id, p.title, p.description
FROM patterns p
JOIN problem_patterns pp ON p.id = pp.pattern_id
WHERE pp.problem_id = ?;

-- name: DeleteProblemPatterns :exec
DELETE FROM problem_patterns
WHERE problem_id = ?;
