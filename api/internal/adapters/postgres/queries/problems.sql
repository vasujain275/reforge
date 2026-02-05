-- name: CreateProblem :one
INSERT INTO problems (title, source, url, difficulty)
VALUES ($1, $2, $3, $4)
RETURNING id, title, source, url, difficulty, created_at;

-- name: GetProblem :one
SELECT * FROM problems
WHERE id = $1 LIMIT 1;

-- name: ListProblems :many
SELECT * FROM problems
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListAllProblems :many
SELECT * FROM problems
ORDER BY created_at DESC;

-- name: UpdateProblem :one
UPDATE problems
SET title = $1, source = $2, url = $3, difficulty = $4
WHERE id = $5
RETURNING id, title, source, url, difficulty, created_at;

-- name: DeleteProblem :exec
DELETE FROM problems
WHERE id = $1;

-- name: LinkProblemToPattern :exec
INSERT INTO problem_patterns (problem_id, pattern_id)
VALUES ($1, $2);

-- name: GetPatternsForProblem :many
SELECT p.id, p.title, p.description
FROM patterns p
JOIN problem_patterns pp ON p.id = pp.pattern_id
WHERE pp.problem_id = $1;

-- name: DeleteProblemPatterns :exec
DELETE FROM problem_patterns
WHERE problem_id = $1;

-- name: GetProblemsForUser :many
SELECT p.*, ups.status, ups.confidence, ups.avg_confidence, 
       ups.last_attempt_at, ups.total_attempts, ups.last_outcome, ups.updated_at
FROM problems p
LEFT JOIN user_problem_stats ups ON p.id = ups.problem_id AND ups.user_id = $1
ORDER BY p.created_at DESC;

-- name: SearchProblemsForUser :many
SELECT p.*, ups.status, ups.confidence, ups.avg_confidence, 
       ups.last_attempt_at, ups.total_attempts, ups.last_outcome, ups.updated_at
FROM problems p
LEFT JOIN user_problem_stats ups ON p.id = ups.problem_id AND ups.user_id = sqlc.arg(user_id)
WHERE (sqlc.arg(search_query) = '' OR p.title LIKE '%' || sqlc.arg(search_query) || '%' OR p.source LIKE '%' || sqlc.arg(search_query) || '%')
  AND (sqlc.arg(difficulty) = '' OR p.difficulty = sqlc.arg(difficulty))
  AND (sqlc.arg(status) = '' OR ups.status = sqlc.arg(status) OR (ups.status IS NULL AND sqlc.arg(status) = 'unsolved'))
ORDER BY p.created_at DESC
LIMIT sqlc.arg(limit_val) OFFSET sqlc.arg(offset_val);

-- name: CountProblemsForUser :one
SELECT COUNT(DISTINCT p.id) as count
FROM problems p
LEFT JOIN user_problem_stats ups ON p.id = ups.problem_id AND ups.user_id = sqlc.arg(user_id)
WHERE (sqlc.arg(search_query) = '' OR p.title LIKE '%' || sqlc.arg(search_query) || '%' OR p.source LIKE '%' || sqlc.arg(search_query) || '%')
  AND (sqlc.arg(difficulty) = '' OR p.difficulty = sqlc.arg(difficulty))
  AND (sqlc.arg(status) = '' OR ups.status = sqlc.arg(status) OR (ups.status IS NULL AND sqlc.arg(status) = 'unsolved'));
