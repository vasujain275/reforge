-- Import-specific queries for bulk operations

-- name: GetPatternByTitle :one
-- Case-insensitive pattern lookup
SELECT * FROM patterns 
WHERE LOWER(title) = LOWER($1) 
LIMIT 1;

-- name: GetProblemByTitleAndSource :one
-- Check for duplicate problems
SELECT * FROM problems 
WHERE title = $1 AND source = $2 
LIMIT 1;

-- name: GetProblemByTitleSourceURL :one
-- More precise duplicate check including URL
SELECT * FROM problems 
WHERE title = $1 AND (source = $2 OR (source IS NULL AND $3 IS NULL))
LIMIT 1;

-- name: CountProblems :one
-- Get total problem count
SELECT COUNT(*) as count FROM problems;

-- name: CountPatterns :one
-- Get total pattern count
SELECT COUNT(*) as count FROM patterns;

-- name: LinkProblemToPatternIfNotExists :exec
-- Idempotent pattern linking (ignore if already linked)
INSERT INTO problem_patterns (problem_id, pattern_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;
