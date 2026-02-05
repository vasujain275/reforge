package auth

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// UserResponse represents user data returned to clients (without sensitive fields)
type UserResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Role      string `json:"role"` // Always "user" or "admin", never null in response
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

// toUserResponse converts DB row to UserResponse
func toUserResponse(id uuid.UUID, email, name string, role pgtype.Text, isActive pgtype.Bool, createdAt pgtype.Timestamptz) UserResponse {
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
		createdAtStr = createdAt.Time.Format("2006-01-02T15:04:05Z07:00")
	}

	return UserResponse{
		ID:        id.String(),
		Email:     email,
		Name:      name,
		Role:      roleStr,
		IsActive:  activeStatus,
		CreatedAt: createdAtStr,
	}
}
