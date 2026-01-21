-- name: GetUserPatternStats :one
SELECT * FROM user_pattern_stats
WHERE user_id = ? AND pattern_id = ?
LIMIT 1;

-- name: UpsertUserPatternStats :one
INSERT INTO user_pattern_stats (user_id, pattern_id, times_revised, avg_confidence, last_revised_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(user_id, pattern_id) DO UPDATE SET
    times_revised = excluded.times_revised,
    avg_confidence = excluded.avg_confidence,
    last_revised_at = excluded.last_revised_at
RETURNING *;

-- name: ListUserPatternStats :many
SELECT * FROM user_pattern_stats
WHERE user_id = ?
ORDER BY avg_confidence ASC;

-- name: GetWeakestPattern :one
SELECT ups.*, p.title as pattern_title
FROM user_pattern_stats ups
JOIN patterns p ON ups.pattern_id = p.id
WHERE ups.user_id = ?
ORDER BY ups.avg_confidence ASC
LIMIT 1;

-- name: GetPatternsWithStats :many
SELECT p.*, ups.times_revised, ups.avg_confidence, ups.last_revised_at
FROM patterns p
LEFT JOIN user_pattern_stats ups ON p.id = ups.pattern_id AND ups.user_id = ?
ORDER BY p.title;
