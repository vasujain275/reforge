package users

import (
	"context"
	"database/sql"
	"time"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/security"
)

type Service interface {
	CreateUser(ctx context.Context, body CreateUserBody) (UserResponse, error)
	GetUserByID(ctx context.Context, userID int64) (UserResponse, error)
	ChangePassword(ctx context.Context, userID int64, oldPassword, newPassword string) error
	DeleteOwnAccount(ctx context.Context, userID int64, password string) error
	ResetPasswordWithToken(ctx context.Context, token, newPassword string) error
}

type userService struct {
	repo repo.Querier
}

func NewService(repo repo.Querier) Service {
	return &userService{
		repo: repo,
	}
}

func (s *userService) CreateUser(ctx context.Context, body CreateUserBody) (UserResponse, error) {

	passwordHash, err := security.HashPassword(body.Password)

	if err != nil {
		return UserResponse{}, err
	}

	params := repo.CreateUserParams{
		Email:        body.Email,
		Name:         body.Name,
		PasswordHash: passwordHash,
		Role:         sql.NullString{String: "user", Valid: true}, // Default role
	}

	user, err := s.repo.CreateUser(ctx, params)
	if err != nil {
		return UserResponse{}, err
	}

	return ToUserResponse(user.ID, user.Email, user.Name, user.Role, user.IsActive, user.CreatedAt), nil
}

func (s *userService) GetUserByID(ctx context.Context, userID int64) (UserResponse, error) {

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return UserResponse{}, err
	}

	return ToUserResponse(user.ID, user.Email, user.Name, user.Role, user.IsActive, user.CreatedAt), nil
}

// ToUserResponse converts DB row to UserResponse (exported for use by auth package)
func ToUserResponse(id int64, email, name string, role sql.NullString, isActive sql.NullBool, createdAt sql.NullString) UserResponse {
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

func (s *userService) ChangePassword(ctx context.Context, userID int64, oldPassword, newPassword string) error {
	// Fetch user with password hash to verify old password
	user, err := s.repo.GetUserByIDWithPassword(ctx, userID)
	if err != nil {
		return err
	}

	// Verify old password
	if !security.CheckPasswordHash(oldPassword, user.PasswordHash) {
		return ErrInvalidPassword
	}

	newHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}

	return s.repo.UpdateUserPassword(ctx, repo.UpdateUserPasswordParams{
		PasswordHash: newHash,
		ID:           userID,
	})
}

func (s *userService) DeleteOwnAccount(ctx context.Context, userID int64, password string) error {
	// Verify password before deletion
	user, err := s.repo.GetUserByIDWithPassword(ctx, userID)
	if err != nil {
		return err
	}

	// Verify password
	if !security.CheckPasswordHash(password, user.PasswordHash) {
		return ErrInvalidPassword
	}

	return s.repo.DeleteUser(ctx, userID)
}

// ResetPasswordWithToken validates the token and resets the user's password
func (s *userService) ResetPasswordWithToken(ctx context.Context, token, newPassword string) error {
	// Hash the incoming token to look up in database
	tokenHash := security.HashToken(token)

	// Find the token record
	resetToken, err := s.repo.GetPasswordResetToken(ctx, tokenHash)
	if err != nil {
		return ErrInvalidResetToken
	}

	// Check if token was already used
	if resetToken.UsedAt.Valid {
		return ErrResetTokenUsed
	}

	// Check expiration
	expiresAt, err := time.Parse(time.RFC3339, resetToken.ExpiresAt)
	if err != nil {
		return ErrInvalidResetToken
	}
	if time.Now().After(expiresAt) {
		return ErrInvalidResetToken
	}

	// Hash the new password
	newHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}

	// Update the user's password
	err = s.repo.UpdateUserPassword(ctx, repo.UpdateUserPasswordParams{
		PasswordHash: newHash,
		ID:           resetToken.UserID,
	})
	if err != nil {
		return err
	}

	// Mark the token as used
	return s.repo.MarkPasswordResetTokenUsed(ctx, resetToken.ID)
}
