package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
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

		// 4. Extract Claims (User ID)
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			utils.Unauthorized(w, "Invalid token claims")
			return
		}

		// JSON numbers are float64 by default in JWT parser
		userIDFloat, ok := claims["sub"].(float64)
		if !ok {
			utils.Unauthorized(w, "Invalid user ID in token")
			return
		}
		userID := int64(userIDFloat)

		// 5. Add User ID to Context
		ctx := context.WithValue(r.Context(), auth.UserKey, userID)
		
		// 6. Serve the next handler with the new context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}