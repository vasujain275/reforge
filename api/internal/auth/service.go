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
	Login(ctx context.Context, email, password, userAgent, ip string) (string, string, UserResponse, error)
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

// Login validates user, returns (AccessToken, RefreshToken, UserData, error)
func (s *authService) Login(ctx context.Context, email, password, userAgent, ip string) (string, string, UserResponse, error) {

	// Fetch user
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return "", "", UserResponse{}, ErrInvalidCredentials
	}

	// Check if user is active
	if user.IsActive.Valid && !user.IsActive.Bool {
		return "", "", UserResponse{}, errors.New("account is deactivated")
	}

	// Verify Password
	if !security.CheckPasswordHash(password, user.PasswordHash) {
		return "", "", UserResponse{}, ErrInvalidCredentials
	}

	// Extract role (default to 'user' if not set)
	role := "user"
	if user.Role.Valid {
		role = user.Role.String
	}

	// Generate Access Token (JWT) - includes role
	accessToken, err := s.generateJWT(user.ID, user.Email, role)
	if err != nil {
		return "", "", UserResponse{}, err
	}

	// Generate Refresh Token (Random String)
	rawRefreshToken, err := security.GenerateSecureToken(32)
	if err != nil {
		return "", "", UserResponse{}, err
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
		return "", "", UserResponse{}, err
	}

	// Fetch user data (without password hash)
	userData, err := s.repo.GetUserByID(ctx, user.ID)
	if err != nil {
		return "", "", UserResponse{}, err
	}

	// Convert to UserResponse
	userResponse := toUserResponse(userData.ID, userData.Email, userData.Name, userData.Role, userData.IsActive, userData.CreatedAt)

	return accessToken, rawRefreshToken, userResponse, nil
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

	// Fetch User to Ensure they still exist and get their role
	user, err := s.repo.GetUserByID(ctx, storedToken.UserID)
	if err != nil {
		return "", ErrInvalidToken
	}

	// Extract role (default to 'user' if not set)
	role := "user"
	if user.Role.Valid {
		role = user.Role.String
	}

	return s.generateJWT(user.ID, user.Email, role)
}

func (s *authService) Logout(ctx context.Context, rawRefreshToken string) error {
	tokenHash := security.HashToken(rawRefreshToken)
	return s.repo.RevokeRefreshToken(ctx, tokenHash)
}

// --- Helpers ---

func (s *authService) generateJWT(userID int64, email, role string) (string, error) {
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"role":  role,
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
