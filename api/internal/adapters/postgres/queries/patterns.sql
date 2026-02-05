-- name: CreatePattern :one
INSERT INTO patterns (title, description)
VALUES ($1, $2)
RETURNING id, title, description;

-- name: GetPattern :one
SELECT * FROM patterns
WHERE id = $1 LIMIT 1;

-- name: ListPatterns :many
SELECT * FROM patterns
ORDER BY title;

-- name: SearchPatterns :many
SELECT * FROM patterns
WHERE (sqlc.arg(search_query) = '' OR title LIKE '%' || sqlc.arg(search_query) || '%' OR description LIKE '%' || sqlc.arg(search_query) || '%')
ORDER BY title
LIMIT sqlc.arg(limit_val) OFFSET sqlc.arg(offset_val);

-- name: CountSearchPatterns :one
SELECT COUNT(*) as count
FROM patterns
WHERE (sqlc.arg(search_query) = '' OR title LIKE '%' || sqlc.arg(search_query) || '%' OR description LIKE '%' || sqlc.arg(search_query) || '%');

-- name: GetPatternsByIDs :many
SELECT * FROM patterns
WHERE id = ANY(sqlc.arg('ids')::uuid[]);

-- name: UpdatePattern :one
UPDATE patterns
SET title = $1, description = $2
WHERE id = $3
RETURNING id, title, description;

-- name: DeletePattern :exec
DELETE FROM patterns
WHERE id = $1;

-- name: GetPatternProblemCount :one
SELECT COUNT(*) as count
FROM problem_patterns
WHERE pattern_id = $1;

-- name: GetProblemsForPattern :many
SELECT p.* FROM problems p
INNER JOIN problem_patterns pp ON p.id = pp.problem_id
WHERE pp.pattern_id = $1;

-- name: SearchPatternsWithStats :many
SELECT 
    p.id,
    p.title,
    p.description,
    COALESCE(ups.times_revised, 0) as times_revised,
    COALESCE(ups.avg_confidence, 0) as avg_confidence,
    ups.last_revised_at,
    COALESCE(pc.problem_count, 0) as problem_count
FROM patterns p
LEFT JOIN user_pattern_stats ups ON p.id = ups.pattern_id AND ups.user_id = sqlc.arg(user_id)
LEFT JOIN (
    SELECT pattern_id, COUNT(*) as problem_count
    FROM problem_patterns
    GROUP BY pattern_id
) pc ON p.id = pc.pattern_id
WHERE (sqlc.arg(search_query) = '' OR p.title LIKE '%' || sqlc.arg(search_query) || '%' OR p.description LIKE '%' || sqlc.arg(search_query) || '%')
ORDER BY p.title ASC
LIMIT sqlc.arg(limit_val) OFFSET sqlc.arg(offset_val);

-- name: CountSearchPatternsWithStats :one
SELECT COUNT(DISTINCT p.id) as count
FROM patterns p
WHERE (sqlc.arg(search_query) = '' OR p.title LIKE '%' || sqlc.arg(search_query) || '%' OR p.description LIKE '%' || sqlc.arg(search_query) || '%');

-- name: GetUniqueProblemCount :one
-- Returns the count of unique problems across all patterns (no double-counting)
SELECT COUNT(DISTINCT pp.problem_id) as count
FROM problem_patterns pp;
