-- Import-specific queries for bulk operations

-- name: GetPatternByTitle :one
-- Case-insensitive pattern lookup
SELECT * FROM patterns 
WHERE LOWER(title) = LOWER(?) 
LIMIT 1;

-- name: GetProblemByTitleAndSource :one
-- Check for duplicate problems
SELECT * FROM problems 
WHERE title = ? AND source = ? 
LIMIT 1;

-- name: GetProblemByTitleSourceURL :one
-- More precise duplicate check including URL
SELECT * FROM problems 
WHERE title = ? AND (source = ? OR (source IS NULL AND ? IS NULL))
LIMIT 1;

-- name: CountProblems :one
-- Get total problem count
SELECT COUNT(*) as count FROM problems;

-- name: CountPatterns :one
-- Get total pattern count
SELECT COUNT(*) as count FROM patterns;

-- name: LinkProblemToPatternIfNotExists :exec
-- Idempotent pattern linking (ignore if already linked)
INSERT OR IGNORE INTO problem_patterns (problem_id, pattern_id)
VALUES (?, ?);
