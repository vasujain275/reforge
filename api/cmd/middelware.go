package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	repo "github.com/vasujain275/reforge/internal/adapters/postgres/sqlc"
	"github.com/vasujain275/reforge/internal/auth"
	"github.com/vasujain275/reforge/internal/utils"
)

func (app *application) AuthTokenMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Get Acess Token from cookie
		cookie, err := r.Cookie("access_token")
		if err != nil {
			utils.Unauthorized(w, "Authentication Required!")
			return
		}

		tokenString := cookie.Value

		// 2. Parse and Validate the JWT
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Ensure the signing method is HMAC
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			// Return the secret key from your app config
			return []byte(app.config.auth.secret), nil
		})
		// 3. Check Validity
		if err != nil || !token.Valid {
			utils.Unauthorized(w, "Invalid or expired token")
			return
		}

		// 4. Extract Claims (User ID and Role)
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			utils.Unauthorized(w, "Invalid token claims")
			return
		}

		// Extract sub as string (UUID)
		userIDStr, ok := claims["sub"].(string)
		if !ok {
			utils.Unauthorized(w, "Invalid user ID in token")
			return
		}
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			utils.Unauthorized(w, "Invalid user ID format in token")
			return
		}

		// Extract role (default to "user" if not present)
		role, _ := claims["role"].(string)
		if role == "" {
			role = "user"
		}

		// 5. Add User ID and Role to Context
		ctx := context.WithValue(r.Context(), auth.UserKey, userID)
		ctx = context.WithValue(ctx, auth.RoleKey, role)

		// 6. Serve the next handler with the new context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAdminMiddleware ensures the user has admin role
func (app *application) RequireAdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(auth.RoleKey).(string)
		if !ok || role != "admin" {
			utils.Forbidden(w, "Admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// PreventLastAdminDeletionMiddleware prevents deleting/demoting the last admin
// This should be used on user deletion and role change endpoints
func (app *application) PreventLastAdminDeletionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create queries instance
		queries := repo.New(app.pool)

		// Check admin count
		adminCount, err := queries.CountAdmins(r.Context())
		if err != nil {
			utils.InternalServerError(w, "Failed to check admin count")
			return
		}

		if adminCount <= 1 {
			utils.BadRequest(w, "Cannot delete or demote the last admin", nil)
			return
		}

		next.ServeHTTP(w, r)
	})
}
