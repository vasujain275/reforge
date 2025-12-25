package users

import (
	"context"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/security"
)

type Service interface {
	CreateUser(ctx context.Context, body CreateUserBody) (repo.CreateUserRow, error)
}

type userService struct {
	repo repo.Querier
}

func NewService(repo repo.Querier) Service {
	return &userService{
		repo: repo,
	}
}

func (s *userService) CreateUser(ctx context.Context, body CreateUserBody) (repo.CreateUserRow, error) {

	passwordHash, err := security.HashPassword(body.Password)

	if err != nil {
		return repo.CreateUserRow{}, err
	}

	params := repo.CreateUserParams{
		Email:        body.Email,
		Name:         body.Name,
		PasswordHash: passwordHash,
	}

	return s.repo.CreateUser(ctx, params)

}
