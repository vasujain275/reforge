package onboarding

import (
	"context"
	"database/sql"
	"errors"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/security"
)

var (
	ErrSystemAlreadyInitialized = errors.New("system already has users")
)

type Service interface {
	IsSystemInitialized(ctx context.Context) (bool, error)
	CreateFirstAdmin(ctx context.Context, email, password, name string) error
}

type onboardingService struct {
	repo repo.Querier
}

func NewService(repo repo.Querier) Service {
	return &onboardingService{
		repo: repo,
	}
}

// IsSystemInitialized checks if any users exist in the system
func (s *onboardingService) IsSystemInitialized(ctx context.Context) (bool, error) {
	count, err := s.repo.CountAllUsers(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CreateFirstAdmin creates the first admin user during onboarding
// This endpoint is only accessible when no users exist
func (s *onboardingService) CreateFirstAdmin(ctx context.Context, email, password, name string) error {
	// Double-check no users exist
	initialized, err := s.IsSystemInitialized(ctx)
	if err != nil {
		return err
	}
	if initialized {
		return ErrSystemAlreadyInitialized
	}

	// Hash password
	passwordHash, err := security.HashPassword(password)
	if err != nil {
		return err
	}

	// Create admin user
	_, err = s.repo.CreateUser(ctx, repo.CreateUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		Name:         name,
		Role:         sql.NullString{String: "admin", Valid: true},
	})

	return err
}
