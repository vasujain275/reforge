package auth

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/security"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrTokenExpired       = errors.New("refresh token expired")
	ErrInvalidToken       = errors.New("invalid refresh token")
)

type Service interface {
	Login(ctx context.Context, email, password, userAgent, ip string) (string, string, error)
	Refresh(ctx context.Context, rawRefreshToken string) (string, error)
	Logout(ctx context.Context, rawRefreshToken string) error
}

type authService struct {
	repo      repo.Querier
	jwtSecret []byte
}

func NewService(repo repo.Querier, jwtSecret string) Service {
	return &authService{
		repo:      repo,
		jwtSecret: []byte(jwtSecret),
	}
}

// Login validates user, returns (AccessToken, RefreshToken, error)
func (s *authService) Login(ctx context.Context, email, password, userAgent, ip string) (string, string, error) {

	// Fetch user
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return "", "", ErrInvalidCredentials
	}

	// Verify Password
	if !security.CheckPasswordHash(password, user.PasswordHash) {
		return "", "", ErrInvalidCredentials
	}

	// Generate Access Token (JWT)
	accessToken, err := s.generateJWT(user.ID, user.Email)
	if err != nil {
		return "", "", err
	}

	// Generate Refresh Token (Random String)
	rawRefreshToken, err := security.GenerateSecureToken(32)
	if err != nil {
		return "", "", err
	}

	// Hash Refresh Token for DB Storage
	tokenHash := security.HashToken(rawRefreshToken)

	// Store in DB
	expiresAt := time.Now().Add(30 * 24 * time.Hour).Format(time.RFC3339)

	params := repo.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
		UserAgent: toNullString(userAgent),
		IpAddress: toNullString(ip),
	}

	_, err = s.repo.CreateRefreshToken(ctx, params)
	if err != nil {
		return "", "", err
	}

	return accessToken, rawRefreshToken, nil
}

// Refresh validates the raw token and issues a new Access Token
func (s *authService) Refresh(ctx context.Context, rawRefreshToken string) (string, error) {

	tokenHash := security.HashToken(rawRefreshToken)

	storedToken, err := s.repo.GetRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		return "", ErrInvalidToken
	}

	// Parse ISO8601 string from SQLite
	expiry, err := time.Parse(time.RFC3339, storedToken.ExpiresAt)
	if err != nil || time.Now().After(expiry) {
		_ = s.repo.RevokeRefreshToken(ctx, storedToken.TokenHash) // Cleanup
		return "", ErrTokenExpired
	}

	// Fetch User to Ensure they still exist
	user, err := s.repo.GetUserByID(ctx, storedToken.UserID)
	if err != nil {
		return "", ErrInvalidToken
	}

	return s.generateJWT(user.ID, user.Email)
}

func (s *authService) Logout(ctx context.Context, rawRefreshToken string) error {
	tokenHash := security.HashToken(rawRefreshToken)
	return s.repo.RevokeRefreshToken(ctx, tokenHash)
}

// --- Helpers ---

func (s *authService) generateJWT(userID int64, email string) (string, error) {
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"iss":   "reforge-api",
		"exp":   time.Now().Add(30 * time.Minute).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func toNullString(s string) sql.NullString {
	return sql.NullString{
		String: s,
		Valid:  s != "",
	}
}
