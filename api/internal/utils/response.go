package utils

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// APIResponse represents a standardized API response structure
type APIResponse struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   *Error `json:"error,omitempty"`
}

// Error represents a standardized error structure
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

// WriteJSON writes a JSON response with the given status code and data
func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("failed to encode response", "error", err)
	}
}

// WriteSuccess writes a standardized success response
func WriteSuccess(w http.ResponseWriter, status int, data any) {
	response := APIResponse{
		Success: true,
		Data:    data,
	}
	WriteJSON(w, status, response)
}

// WriteError writes a standardized error response
func WriteError(w http.ResponseWriter, status int, code, message string, details any) {
	response := APIResponse{
		Success: false,
		Error: &Error{
			Code:    code,
			Message: message,
			Details: details,
		},
	}
	WriteJSON(w, status, response)
}

// Common error codes
const (
	ErrCodeBadRequest         = "BAD_REQUEST"
	ErrCodeUnauthorized       = "UNAUTHORIZED"
	ErrCodeForbidden          = "FORBIDDEN"
	ErrCodeNotFound           = "NOT_FOUND"
	ErrCodeConflict           = "CONFLICT"
	ErrCodeValidation         = "VALIDATION_ERROR"
	ErrCodeInternalServer     = "INTERNAL_SERVER_ERROR"
	ErrCodeServiceUnavailable = "SERVICE_UNAVAILABLE"
)

// Helper functions for common error responses

// BadRequest writes a 400 Bad Request error response
func BadRequest(w http.ResponseWriter, message string, details any) {
	WriteError(w, http.StatusBadRequest, ErrCodeBadRequest, message, details)
}

// Unauthorized writes a 401 Unauthorized error response
func Unauthorized(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusUnauthorized, ErrCodeUnauthorized, message, nil)
}

// Forbidden writes a 403 Forbidden error response
func Forbidden(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusForbidden, ErrCodeForbidden, message, nil)
}

// NotFound writes a 404 Not Found error response
func NotFound(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusNotFound, ErrCodeNotFound, message, nil)
}

// Conflict writes a 409 Conflict error response
func Conflict(w http.ResponseWriter, message string, details any) {
	WriteError(w, http.StatusConflict, ErrCodeConflict, message, details)
}

// ValidationError writes a 422 Validation Error response
func ValidationError(w http.ResponseWriter, message string, details any) {
	WriteError(w, http.StatusUnprocessableEntity, ErrCodeValidation, message, details)
}

// InternalServerError writes a 500 Internal Server Error response
func InternalServerError(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusInternalServerError, ErrCodeInternalServer, message, nil)
}

// ServiceUnavailable writes a 503 Service Unavailable error response
func ServiceUnavailable(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusServiceUnavailable, ErrCodeServiceUnavailable, message, nil)
}
