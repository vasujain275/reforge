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

-- name: ListAllProblems :many
SELECT * FROM problems
ORDER BY created_at DESC;

-- name: UpdateProblem :one
UPDATE problems
SET title = ?, source = ?, url = ?, difficulty = ?
WHERE id = ?
RETURNING id, title, source, url, difficulty, created_at;

-- name: DeleteProblem :exec
DELETE FROM problems
WHERE id = ?;

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

-- name: GetProblemsForUser :many
SELECT p.*, ups.status, ups.confidence, ups.avg_confidence, 
       ups.last_attempt_at, ups.total_attempts, ups.last_outcome, ups.updated_at
FROM problems p
LEFT JOIN user_problem_stats ups ON p.id = ups.problem_id AND ups.user_id = ?
ORDER BY p.created_at DESC;
