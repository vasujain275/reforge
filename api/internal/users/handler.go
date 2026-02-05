package users

import (
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/vasujain275/reforge/internal/admin"
	"github.com/vasujain275/reforge/internal/auth"
	"github.com/vasujain275/reforge/internal/utils"
)

type handler struct {
	service      Service
	adminService admin.Service
}

func NewHandler(service Service, adminService admin.Service) *handler {
	return &handler{
		service:      service,
		adminService: adminService,
	}
}

func (h *handler) CreateUser(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()

	var body CreateUserBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, err.Error(), nil)
		return
	}

	// Check signup settings
	settings, err := h.adminService.GetSignupSettings(r.Context())
	if err != nil {
		slog.Error("Failed to get signup settings", "error", err)
		utils.InternalServerError(w, "Failed to check signup settings")
		return
	}

	// Check if signup is enabled
	if !settings.SignupEnabled {
		utils.Forbidden(w, "Registration is currently disabled")
		return
	}

	// Check if invite codes are required
	var inviteCodeToUse string
	if settings.InviteCodesEnabled {
		if body.InviteCode == nil || *body.InviteCode == "" {
			utils.BadRequest(w, "Invite code is required", nil)
			return
		}

		// Validate invite code (but don't consume it yet)
		if err := h.adminService.ValidateInviteCode(r.Context(), *body.InviteCode); err != nil {
			utils.BadRequest(w, "Invalid or expired invite code", nil)
			return
		}

		// Store the code to use after successful user creation
		inviteCodeToUse = *body.InviteCode
	}

	// Create the user first
	user, err := h.service.CreateUser(r.Context(), body)
	if err != nil {
		slog.Error("Failed to create user", "error", err)
		utils.InternalServerError(w, "Failed to create user")
		return
	}

	// Only consume the invite code after successful user creation
	if inviteCodeToUse != "" {
		if err := h.adminService.UseInviteCode(r.Context(), inviteCodeToUse); err != nil {
			// User was created but invite code consumption failed
			// Log the error but don't fail the request - user is already created
			slog.Error("Failed to consume invite code after user creation", "error", err, "user_id", user.ID)
		}
	}

	utils.WriteSuccess(w, http.StatusCreated, user)
}

func (h *handler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {

	// Get ID from context
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	// Use the ID to fetch data
	user, err := h.service.GetUserByID(r.Context(), userID)
	if err != nil {
		utils.NotFound(w, "User not found")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, user)
}

func (h *handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	var body ChangePasswordBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, err.Error(), nil)
		return
	}

	err := h.service.ChangePassword(r.Context(), userID, body.OldPassword, body.NewPassword)
	if err != nil {
		if err == ErrInvalidPassword {
			utils.Unauthorized(w, "Current password is incorrect")
			return
		}
		slog.Error("Failed to change password", "error", err)
		utils.InternalServerError(w, "Failed to change password")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{
		"message": "Password changed successfully",
	})
}

func (h *handler) DeleteOwnAccount(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	var body DeleteAccountBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, err.Error(), nil)
		return
	}

	err := h.service.DeleteOwnAccount(r.Context(), userID, body.Password)
	if err != nil {
		if err == ErrInvalidPassword {
			utils.Unauthorized(w, "Password is incorrect")
			return
		}
		slog.Error("Failed to delete account", "error", err)
		utils.InternalServerError(w, "Failed to delete account")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{
		"message": "Account deleted successfully",
	})
}

// ResetPassword - POST /api/v1/users/reset-password (Public - no auth required)
func (h *handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body ResetPasswordBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, err.Error(), nil)
		return
	}

	err := h.service.ResetPasswordWithToken(r.Context(), body.Token, body.NewPassword)
	if err != nil {
		if err == ErrInvalidResetToken {
			utils.BadRequest(w, "Invalid or expired reset link", nil)
			return
		}
		if err == ErrResetTokenUsed {
			utils.BadRequest(w, "This reset link has already been used", nil)
			return
		}
		slog.Error("Failed to reset password", "error", err)
		utils.InternalServerError(w, "Failed to reset password")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{
		"message": "Password reset successfully. You can now login with your new password.",
	})
}
