-- name: CreateUserSessionTemplate :one
INSERT INTO user_session_templates (
    user_id,
    template_name,
    template_key,
    config_json,
    is_favorite
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetUserSessionTemplate :one
SELECT * FROM user_session_templates
WHERE id = $1 AND user_id = $2
LIMIT 1;

-- name: ListUserSessionTemplates :many
SELECT * FROM user_session_templates
WHERE user_id = $1
ORDER BY is_favorite DESC, last_used_at DESC, created_at DESC;

-- name: ListFavoriteTemplates :many
SELECT * FROM user_session_templates
WHERE user_id = $1 AND is_favorite = true
ORDER BY last_used_at DESC, created_at DESC;

-- name: UpdateUserSessionTemplate :exec
UPDATE user_session_templates
SET 
    template_name = COALESCE($1, template_name),
    config_json = COALESCE($2, config_json),
    is_favorite = COALESCE($3, is_favorite),
    updated_at = NOW()
WHERE id = $4 AND user_id = $5;

-- name: DeleteUserSessionTemplate :exec
DELETE FROM user_session_templates
WHERE id = $1 AND user_id = $2;

-- name: IncrementTemplateUseCount :exec
UPDATE user_session_templates
SET 
    use_count = use_count + 1,
    last_used_at = NOW()
WHERE id = $1 AND user_id = $2;

-- name: GetTemplateUseCount :one
SELECT use_count FROM user_session_templates
WHERE id = $1 AND user_id = $2
LIMIT 1;
