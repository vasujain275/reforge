package admin

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	repo "github.com/vasujain275/reforge/internal/adapters/postgres/sqlc"
	"github.com/vasujain275/reforge/internal/security"
)

type Service interface {
	// User Management
	ListUsers(ctx context.Context, page, limit int) (UserListResponse, error)
	UpdateUserRole(ctx context.Context, adminID, targetUserID uuid.UUID, newRole string) error
	DeactivateUser(ctx context.Context, adminID, targetUserID uuid.UUID) error
	ReactivateUser(ctx context.Context, adminID, targetUserID uuid.UUID) error
	DeleteUser(ctx context.Context, adminID, targetUserID uuid.UUID) error

	// Password Reset
	InitiatePasswordReset(ctx context.Context, adminID, targetUserID uuid.UUID) (InitiatePasswordResetResponse, error)

	// Invite System
	CreateInviteCode(ctx context.Context, adminID uuid.UUID, maxUses int, expiresIn *int) (InviteCodeResponse, error)
	ListInviteCodes(ctx context.Context) (InviteCodeListResponse, error)
	DeleteInviteCode(ctx context.Context, codeID uuid.UUID) error
	ValidateInviteCode(ctx context.Context, code string) error
	UseInviteCode(ctx context.Context, code string) error

	// Settings Management
	GetSignupSettings(ctx context.Context) (SignupSettingsResponse, error)
	UpdateSignupEnabled(ctx context.Context, adminID uuid.UUID, enabled bool) error
	UpdateInviteCodesEnabled(ctx context.Context, adminID uuid.UUID, enabled bool) error
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
		Limit:  int32(limit),
		Offset: int32(offset),
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
			ID:        u.ID.String(),
			Email:     u.Email,
			Name:      u.Name,
			Role:      u.Role.String,
			IsActive:  u.IsActive.Bool,
			CreatedAt: u.CreatedAt.Time.Format(time.RFC3339),
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
func (s *adminService) UpdateUserRole(ctx context.Context, adminID, targetUserID uuid.UUID, newRole string) error {
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
		Role: pgtype.Text{String: newRole, Valid: true},
		ID:   targetUserID,
	})
}

// DeactivateUser soft-deletes a user account
func (s *adminService) DeactivateUser(ctx context.Context, adminID, targetUserID uuid.UUID) error {
	if adminID == targetUserID {
		return ErrSelfDeactivation
	}

	return s.repo.UpdateUserActiveStatus(ctx, repo.UpdateUserActiveStatusParams{
		IsActive: pgtype.Bool{Bool: false, Valid: true},
		ID:       targetUserID,
	})
}

// ReactivateUser reactivates a deactivated user
func (s *adminService) ReactivateUser(ctx context.Context, adminID, targetUserID uuid.UUID) error {
	return s.repo.UpdateUserActiveStatus(ctx, repo.UpdateUserActiveStatusParams{
		IsActive: pgtype.Bool{Bool: true, Valid: true},
		ID:       targetUserID,
	})
}

// DeleteUser permanently deletes a user
func (s *adminService) DeleteUser(ctx context.Context, adminID, targetUserID uuid.UUID) error {
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
func (s *adminService) InitiatePasswordReset(ctx context.Context, adminID, targetUserID uuid.UUID) (InitiatePasswordResetResponse, error) {
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
		CreatedByAdminID: pgtype.UUID{Bytes: adminID, Valid: true},
		ExpiresAt:        expiresAt,
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
func (s *adminService) CreateInviteCode(ctx context.Context, adminID uuid.UUID, maxUses int, expiresIn *int) (InviteCodeResponse, error) {
	// Generate UUID as invite code
	code := uuid.New().String()

	var expiresAt pgtype.Timestamptz
	if expiresIn != nil {
		expiry := time.Now().Add(time.Duration(*expiresIn) * time.Hour)
		expiresAt = pgtype.Timestamptz{
			Time:  expiry,
			Valid: true,
		}
	}

	inviteCode, err := s.repo.CreateInviteCode(ctx, repo.CreateInviteCodeParams{
		Code:             code,
		CreatedByAdminID: adminID,
		MaxUses:          pgtype.Int4{Int32: int32(maxUses), Valid: true},
		ExpiresAt:        expiresAt,
	})
	if err != nil {
		return InviteCodeResponse{}, err
	}

	return InviteCodeResponse{
		ID:               inviteCode.ID.String(),
		Code:             inviteCode.Code,
		CreatedByAdminID: inviteCode.CreatedByAdminID.String(),
		MaxUses:          int(inviteCode.MaxUses.Int32),
		CurrentUses:      int(inviteCode.CurrentUses.Int32),
		ExpiresAt:        toTimestampPtr(inviteCode.ExpiresAt),
		CreatedAt:        inviteCode.CreatedAt.Time.Format(time.RFC3339),
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
			ID:               code.ID.String(),
			Code:             code.Code,
			CreatedByAdminID: code.CreatedByAdminID.String(),
			MaxUses:          int(code.MaxUses.Int32),
			CurrentUses:      int(code.CurrentUses.Int32),
			ExpiresAt:        toTimestampPtr(code.ExpiresAt),
			CreatedAt:        code.CreatedAt.Time.Format(time.RFC3339),
		}
	}

	return InviteCodeListResponse{
		InviteCodes: responses,
		Total:       total,
	}, nil
}

// DeleteInviteCode removes an invite code
func (s *adminService) DeleteInviteCode(ctx context.Context, codeID uuid.UUID) error {
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
		if time.Now().After(inviteCode.ExpiresAt.Time) {
			return ErrInviteCodeInvalid
		}
	}

	// Check max uses
	if inviteCode.CurrentUses.Int32 >= inviteCode.MaxUses.Int32 {
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
func (s *adminService) UpdateSignupEnabled(ctx context.Context, adminID uuid.UUID, enabled bool) error {
	value := "false"
	if enabled {
		value = "true"
	}

	_, err := s.repo.UpsertSystemSetting(ctx, repo.UpsertSystemSettingParams{
		Key:         "signup_enabled",
		Value:       value,
		Description: pgtype.Text{String: "Allow new user registration", Valid: true},
	})
	return err
}

// UpdateInviteCodesEnabled toggles invite code requirement
func (s *adminService) UpdateInviteCodesEnabled(ctx context.Context, adminID uuid.UUID, enabled bool) error {
	value := "false"
	if enabled {
		value = "true"
	}

	_, err := s.repo.UpsertSystemSetting(ctx, repo.UpsertSystemSettingParams{
		Key:         "invite_codes_enabled",
		Value:       value,
		Description: pgtype.Text{String: "Require invite codes when signup is disabled", Valid: true},
	})
	return err
}

// Helper functions

func toTimestampPtr(ts pgtype.Timestamptz) *string {
	if !ts.Valid {
		return nil
	}
	s := ts.Time.Format(time.RFC3339)
	return &s
}
