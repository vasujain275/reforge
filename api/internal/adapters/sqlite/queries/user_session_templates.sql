-- name: CreateUserSessionTemplate :one
INSERT INTO user_session_templates (
    user_id,
    template_name,
    template_key,
    config_json,
    is_favorite
) VALUES (?, ?, ?, ?, ?)
RETURNING *;

-- name: GetUserSessionTemplate :one
SELECT * FROM user_session_templates
WHERE id = ? AND user_id = ?
LIMIT 1;

-- name: ListUserSessionTemplates :many
SELECT * FROM user_session_templates
WHERE user_id = ?
ORDER BY is_favorite DESC, last_used_at DESC, created_at DESC;

-- name: ListFavoriteTemplates :many
SELECT * FROM user_session_templates
WHERE user_id = ? AND is_favorite = 1
ORDER BY last_used_at DESC, created_at DESC;

-- name: UpdateUserSessionTemplate :exec
UPDATE user_session_templates
SET 
    template_name = COALESCE(?, template_name),
    config_json = COALESCE(?, config_json),
    is_favorite = COALESCE(?, is_favorite),
    updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND user_id = ?;

-- name: DeleteUserSessionTemplate :exec
DELETE FROM user_session_templates
WHERE id = ? AND user_id = ?;

-- name: IncrementTemplateUseCount :exec
UPDATE user_session_templates
SET 
    use_count = use_count + 1,
    last_used_at = CURRENT_TIMESTAMP
WHERE id = ? AND user_id = ?;

-- name: GetTemplateUseCount :one
SELECT use_count FROM user_session_templates
WHERE id = ? AND user_id = ?
LIMIT 1;
