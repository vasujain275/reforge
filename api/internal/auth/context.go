package auth

type contextKey string

const (
	UserKey contextKey = "userID"
	RoleKey contextKey = "role"
)
