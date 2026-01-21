package admin

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/security"
)

type Service interface {
	// User Management
	ListUsers(ctx context.Context, page, limit int) (UserListResponse, error)
	UpdateUserRole(ctx context.Context, adminID, targetUserID int64, newRole string) error
	DeactivateUser(ctx context.Context, adminID, targetUserID int64) error
	ReactivateUser(ctx context.Context, adminID, targetUserID int64) error
	DeleteUser(ctx context.Context, adminID, targetUserID int64) error

	// Password Reset
	InitiatePasswordReset(ctx context.Context, adminID, targetUserID int64) (InitiatePasswordResetResponse, error)

	// Invite System
	CreateInviteCode(ctx context.Context, adminID int64, maxUses int, expiresIn *int) (InviteCodeResponse, error)
	ListInviteCodes(ctx context.Context) (InviteCodeListResponse, error)
	DeleteInviteCode(ctx context.Context, codeID int64) error
	ValidateInviteCode(ctx context.Context, code string) error
	UseInviteCode(ctx context.Context, code string) error

	// Settings Management
	GetSignupSettings(ctx context.Context) (SignupSettingsResponse, error)
	UpdateSignupEnabled(ctx context.Context, adminID int64, enabled bool) error
	UpdateInviteCodesEnabled(ctx context.Context, adminID int64, enabled bool) error
}

type adminService struct {
	repo repo.Querier
}

func NewService(repo repo.Querier) Service {
	return &adminService{
		repo: repo,
	}
}

// ListUsers returns paginated list of all users
func (s *adminService) ListUsers(ctx context.Context, page, limit int) (UserListResponse, error) {
	offset := (page - 1) * limit

	users, err := s.repo.GetAllUsers(ctx, repo.GetAllUsersParams{
		Limit:  int64(limit),
		Offset: int64(offset),
	})
	if err != nil {
		return UserListResponse{}, err
	}

	total, err := s.repo.CountAllUsers(ctx)
	if err != nil {
		return UserListResponse{}, err
	}

	userInfos := make([]UserInfo, len(users))
	for i, u := range users {
		userInfos[i] = UserInfo{
			ID:        u.ID,
			Email:     u.Email,
			Name:      u.Name,
			Role:      u.Role.String,
			IsActive:  u.IsActive.Bool,
			CreatedAt: u.CreatedAt.String,
		}
	}

	return UserListResponse{
		Users: userInfos,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

// UpdateUserRole changes a user's role (admin cannot change own role)
func (s *adminService) UpdateUserRole(ctx context.Context, adminID, targetUserID int64, newRole string) error {
	if adminID == targetUserID {
		return ErrSelfRoleChange
	}

	// If demoting an admin, check we won't leave zero admins
	targetUser, err := s.repo.GetUserByID(ctx, targetUserID)
	if err != nil {
		return ErrUserNotFound
	}

	if targetUser.Role.String == "admin" && newRole == "user" {
		adminCount, err := s.repo.CountAdmins(ctx)
		if err != nil {
			return err
		}
		if adminCount <= 1 {
			return ErrLastAdmin
		}
	}

	return s.repo.UpdateUserRole(ctx, repo.UpdateUserRoleParams{
		Role: sql.NullString{String: newRole, Valid: true},
		ID:   targetUserID,
	})
}

// DeactivateUser soft-deletes a user account
func (s *adminService) DeactivateUser(ctx context.Context, adminID, targetUserID int64) error {
	if adminID == targetUserID {
		return ErrSelfDeactivation
	}

	return s.repo.UpdateUserActiveStatus(ctx, repo.UpdateUserActiveStatusParams{
		IsActive: sql.NullBool{Bool: false, Valid: true},
		ID:       targetUserID,
	})
}

// ReactivateUser reactivates a deactivated user
func (s *adminService) ReactivateUser(ctx context.Context, adminID, targetUserID int64) error {
	return s.repo.UpdateUserActiveStatus(ctx, repo.UpdateUserActiveStatusParams{
		IsActive: sql.NullBool{Bool: true, Valid: true},
		ID:       targetUserID,
	})
}

// DeleteUser permanently deletes a user
func (s *adminService) DeleteUser(ctx context.Context, adminID, targetUserID int64) error {
	if adminID == targetUserID {
		return ErrSelfDeactivation
	}

	// Check if target is admin
	targetUser, err := s.repo.GetUserByID(ctx, targetUserID)
	if err != nil {
		return ErrUserNotFound
	}

	if targetUser.Role.String == "admin" {
		adminCount, err := s.repo.CountAdmins(ctx)
		if err != nil {
			return err
		}
		if adminCount <= 1 {
			return ErrLastAdmin
		}
	}

	return s.repo.DeleteUser(ctx, targetUserID)
}

// InitiatePasswordReset creates a password reset token for a user
func (s *adminService) InitiatePasswordReset(ctx context.Context, adminID, targetUserID int64) (InitiatePasswordResetResponse, error) {
	// Generate secure random token
	rawToken, err := security.GenerateSecureToken(32)
	if err != nil {
		return InitiatePasswordResetResponse{}, err
	}

	// Hash token for storage
	tokenHash := security.HashToken(rawToken)

	// 24 hour expiration
	expiresAt := time.Now().Add(24 * time.Hour)

	_, err = s.repo.CreatePasswordResetToken(ctx, repo.CreatePasswordResetTokenParams{
		UserID:           targetUserID,
		TokenHash:        tokenHash,
		CreatedByAdminID: sql.NullInt64{Int64: adminID, Valid: true},
		ExpiresAt:        expiresAt.Format(time.RFC3339),
	})
	if err != nil {
		return InitiatePasswordResetResponse{}, err
	}

	// Return response with token (admin will copy this to send to user)
	resetLink := fmt.Sprintf("/reset-password?token=%s", rawToken)

	return InitiatePasswordResetResponse{
		ResetToken: rawToken,
		ExpiresAt:  expiresAt,
		ResetLink:  resetLink,
	}, nil
}

// CreateInviteCode generates a new invite code
func (s *adminService) CreateInviteCode(ctx context.Context, adminID int64, maxUses int, expiresIn *int) (InviteCodeResponse, error) {
	// Generate UUID as invite code
	code := uuid.New().String()

	var expiresAt sql.NullString
	if expiresIn != nil {
		expiry := time.Now().Add(time.Duration(*expiresIn) * time.Hour)
		expiresAt = sql.NullString{
			String: expiry.Format(time.RFC3339),
			Valid:  true,
		}
	}

	inviteCode, err := s.repo.CreateInviteCode(ctx, repo.CreateInviteCodeParams{
		Code:             code,
		CreatedByAdminID: adminID,
		MaxUses:          sql.NullInt64{Int64: int64(maxUses), Valid: true},
		ExpiresAt:        expiresAt,
	})
	if err != nil {
		return InviteCodeResponse{}, err
	}

	return InviteCodeResponse{
		ID:               inviteCode.ID,
		Code:             inviteCode.Code,
		CreatedByAdminID: inviteCode.CreatedByAdminID,
		MaxUses:          int(inviteCode.MaxUses.Int64),
		CurrentUses:      int(inviteCode.CurrentUses.Int64),
		ExpiresAt:        toStringPtr(inviteCode.ExpiresAt),
		CreatedAt:        inviteCode.CreatedAt.String,
	}, nil
}

// ListInviteCodes returns all invite codes
func (s *adminService) ListInviteCodes(ctx context.Context) (InviteCodeListResponse, error) {
	codes, err := s.repo.ListInviteCodes(ctx, repo.ListInviteCodesParams{
		Limit:  1000, // Get all
		Offset: 0,
	})
	if err != nil {
		return InviteCodeListResponse{}, err
	}

	total, err := s.repo.CountInviteCodes(ctx)
	if err != nil {
		return InviteCodeListResponse{}, err
	}

	responses := make([]InviteCodeResponse, len(codes))
	for i, code := range codes {
		responses[i] = InviteCodeResponse{
			ID:               code.ID,
			Code:             code.Code,
			CreatedByAdminID: code.CreatedByAdminID,
			MaxUses:          int(code.MaxUses.Int64),
			CurrentUses:      int(code.CurrentUses.Int64),
			ExpiresAt:        toStringPtr(code.ExpiresAt),
			CreatedAt:        code.CreatedAt.String,
		}
	}

	return InviteCodeListResponse{
		InviteCodes: responses,
		Total:       total,
	}, nil
}

// DeleteInviteCode removes an invite code
func (s *adminService) DeleteInviteCode(ctx context.Context, codeID int64) error {
	return s.repo.DeleteInviteCode(ctx, codeID)
}

// ValidateInviteCode checks if an invite code is valid and not expired
func (s *adminService) ValidateInviteCode(ctx context.Context, code string) error {
	inviteCode, err := s.repo.GetInviteCodeByCode(ctx, code)
	if err != nil {
		return ErrInviteCodeInvalid
	}

	// Check expiration
	if inviteCode.ExpiresAt.Valid {
		expiry, err := time.Parse(time.RFC3339, inviteCode.ExpiresAt.String)
		if err != nil || time.Now().After(expiry) {
			return ErrInviteCodeInvalid
		}
	}

	// Check max uses
	if inviteCode.CurrentUses.Int64 >= inviteCode.MaxUses.Int64 {
		return ErrInviteCodeInvalid
	}

	return nil
}

// UseInviteCode increments the usage count of an invite code
func (s *adminService) UseInviteCode(ctx context.Context, code string) error {
	// Validate first
	if err := s.ValidateInviteCode(ctx, code); err != nil {
		return err
	}

	// Get the code ID
	inviteCode, err := s.repo.GetInviteCodeByCode(ctx, code)
	if err != nil {
		return err
	}

	// Increment usage
	return s.repo.IncrementInviteCodeUses(ctx, inviteCode.ID)
}

// GetSignupSettings retrieves current signup settings
func (s *adminService) GetSignupSettings(ctx context.Context) (SignupSettingsResponse, error) {
	settings, err := s.repo.GetSignupSettings(ctx)
	if err != nil {
		return SignupSettingsResponse{}, err
	}

	response := SignupSettingsResponse{
		SignupEnabled:      true,
		InviteCodesEnabled: true,
	}

	for _, setting := range settings {
		switch setting.Key {
		case "signup_enabled":
			response.SignupEnabled = setting.Value == "true"
		case "invite_codes_enabled":
			response.InviteCodesEnabled = setting.Value == "true"
		}
	}

	return response, nil
}

// UpdateSignupEnabled toggles new user registration
func (s *adminService) UpdateSignupEnabled(ctx context.Context, adminID int64, enabled bool) error {
	value := "false"
	if enabled {
		value = "true"
	}

	_, err := s.repo.UpsertSystemSetting(ctx, repo.UpsertSystemSettingParams{
		Key:         "signup_enabled",
		Value:       value,
		Description: sql.NullString{String: "Allow new user registration", Valid: true},
	})
	return err
}

// UpdateInviteCodesEnabled toggles invite code requirement
func (s *adminService) UpdateInviteCodesEnabled(ctx context.Context, adminID int64, enabled bool) error {
	value := "false"
	if enabled {
		value = "true"
	}

	_, err := s.repo.UpsertSystemSetting(ctx, repo.UpsertSystemSettingParams{
		Key:         "invite_codes_enabled",
		Value:       value,
		Description: sql.NullString{String: "Require invite codes when signup is disabled", Valid: true},
	})
	return err
}

// Helper functions

func toStringPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	return &ns.String
}
