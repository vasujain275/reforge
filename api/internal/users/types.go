package users

import "errors"

var (
	ErrInvalidPassword    = errors.New("invalid password")
	ErrUserNotFound       = errors.New("user not found")
	ErrSignupDisabled     = errors.New("registration is currently disabled")
	ErrInviteCodeRequired = errors.New("invite code is required")
	ErrInvalidResetToken  = errors.New("invalid or expired reset token")
	ErrResetTokenUsed     = errors.New("reset token has already been used")
)

// Request types
type CreateUserBody struct {
	Name       string  `json:"name" validate:"required"`
	Email      string  `json:"email" validate:"required,email"`
	Password   string  `json:"password" validate:"required,min=8"`
	InviteCode *string `json:"invite_code"` // Optional invite code
}

type ChangePasswordBody struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

type DeleteAccountBody struct {
	Password string `json:"password" validate:"required"`
}

type ResetPasswordBody struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// Response types
type UserResponse struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Role      string `json:"role"` // Always "user" or "admin", never null in response
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}
