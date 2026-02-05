package admin

import (
	"errors"
	"time"
)

var (
	ErrLastAdmin         = errors.New("cannot delete or demote the last admin")
	ErrUserNotFound      = errors.New("user not found")
	ErrInviteCodeInvalid = errors.New("invite code is invalid or expired")
	ErrSelfRoleChange    = errors.New("cannot change your own role")
	ErrSelfDeactivation  = errors.New("cannot deactivate your own account")
)

// User Management Types

type UserListResponse struct {
	Users []UserInfo `json:"users"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Limit int        `json:"limit"`
}

type UserInfo struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Role      string `json:"role"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

type UpdateRoleRequest struct {
	Role string `json:"role" validate:"required,oneof=user admin"`
}

// Invite Code Types

type CreateInviteCodeRequest struct {
	MaxUses   int  `json:"max_uses" validate:"required,min=1"`
	ExpiresIn *int `json:"expires_in"` // Hours until expiration (nil = never expires)
}

type InviteCodeResponse struct {
	ID               string  `json:"id"`
	Code             string  `json:"code"`
	CreatedByAdminID string  `json:"created_by_admin_id"`
	MaxUses          int     `json:"max_uses"`
	CurrentUses      int     `json:"current_uses"`
	ExpiresAt        *string `json:"expires_at"`
	CreatedAt        string  `json:"created_at"`
}

type InviteCodeListResponse struct {
	InviteCodes []InviteCodeResponse `json:"invite_codes"`
	Total       int64                `json:"total"`
}

// Password Reset Types

type InitiatePasswordResetResponse struct {
	ResetToken string    `json:"reset_token"`
	ExpiresAt  time.Time `json:"expires_at"`
	ResetLink  string    `json:"reset_link"` // For admin to copy and send
}

// Settings Types

type SignupSettingsResponse struct {
	SignupEnabled      bool `json:"signup_enabled"`
	InviteCodesEnabled bool `json:"invite_codes_enabled"`
}

type UpdateSignupEnabledRequest struct {
	Enabled bool `json:"enabled"`
}
