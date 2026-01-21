package auth

import "database/sql"

// UserResponse represents user data returned to clients (without sensitive fields)
type UserResponse struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Role      string `json:"role"` // Always "user" or "admin", never null in response
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

// toUserResponse converts DB row to UserResponse
func toUserResponse(id int64, email, name string, role sql.NullString, isActive sql.NullBool, createdAt sql.NullString) UserResponse {
	// Default values for nullable fields
	roleStr := "user"
	if role.Valid && role.String != "" {
		roleStr = role.String
	}

	activeStatus := true
	if isActive.Valid {
		activeStatus = isActive.Bool
	}

	createdAtStr := ""
	if createdAt.Valid {
		createdAtStr = createdAt.String
	}

	return UserResponse{
		ID:        id,
		Email:     email,
		Name:      name,
		Role:      roleStr,
		IsActive:  activeStatus,
		CreatedAt: createdAtStr,
	}
}
