package admin

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/vasujain275/reforge/internal/auth"
	"github.com/vasujain275/reforge/internal/utils"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{
		service: service,
	}
}

// ListUsers - GET /api/v1/admin/users
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	users, err := h.service.ListUsers(r.Context(), page, limit)
	if err != nil {
		slog.Error("Failed to list users", "error", err)
		utils.InternalServerError(w, "Failed to list users")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, users)
}

// UpdateUserRole - POST /api/v1/admin/users/:id/role
func (h *Handler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid user ID format", nil)
		return
	}

	adminID := r.Context().Value(auth.UserKey).(uuid.UUID)

	var req UpdateRoleRequest
	if err := utils.Read(r, &req); err != nil {
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	if err := h.service.UpdateUserRole(r.Context(), adminID, targetUserID, req.Role); err != nil {
		if err == ErrSelfRoleChange {
			utils.BadRequest(w, "Cannot change your own role", nil)
			return
		}
		if err == ErrLastAdmin {
			utils.BadRequest(w, "Cannot demote the last admin", nil)
			return
		}
		slog.Error("Failed to update user role", "error", err)
		utils.InternalServerError(w, "Failed to update user role")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "Role updated successfully"})
}

// DeactivateUser - POST /api/v1/admin/users/:id/deactivate
func (h *Handler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid user ID format", nil)
		return
	}

	adminID := r.Context().Value(auth.UserKey).(uuid.UUID)

	if err := h.service.DeactivateUser(r.Context(), adminID, targetUserID); err != nil {
		if err == ErrSelfDeactivation {
			utils.BadRequest(w, "Cannot deactivate your own account", nil)
			return
		}
		slog.Error("Failed to deactivate user", "error", err)
		utils.InternalServerError(w, "Failed to deactivate user")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "User deactivated successfully"})
}

// ReactivateUser - POST /api/v1/admin/users/:id/reactivate
func (h *Handler) ReactivateUser(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid user ID format", nil)
		return
	}

	adminID := r.Context().Value(auth.UserKey).(uuid.UUID)

	if err := h.service.ReactivateUser(r.Context(), adminID, targetUserID); err != nil {
		slog.Error("Failed to reactivate user", "error", err)
		utils.InternalServerError(w, "Failed to reactivate user")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "User reactivated successfully"})
}

// DeleteUser - DELETE /api/v1/admin/users/:id
func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid user ID format", nil)
		return
	}

	adminID := r.Context().Value(auth.UserKey).(uuid.UUID)

	if err := h.service.DeleteUser(r.Context(), adminID, targetUserID); err != nil {
		if err == ErrSelfDeactivation {
			utils.BadRequest(w, "Cannot delete your own account", nil)
			return
		}
		if err == ErrLastAdmin {
			utils.BadRequest(w, "Cannot delete the last admin", nil)
			return
		}
		slog.Error("Failed to delete user", "error", err)
		utils.InternalServerError(w, "Failed to delete user")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "User deleted successfully"})
}

// InitiatePasswordReset - POST /api/v1/admin/users/:id/reset-password
func (h *Handler) InitiatePasswordReset(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid user ID format", nil)
		return
	}

	adminID := r.Context().Value(auth.UserKey).(uuid.UUID)

	response, err := h.service.InitiatePasswordReset(r.Context(), adminID, targetUserID)
	if err != nil {
		slog.Error("Failed to initiate password reset", "error", err)
		utils.InternalServerError(w, "Failed to initiate password reset")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, response)
}

// CreateInviteCode - POST /api/v1/admin/invites
func (h *Handler) CreateInviteCode(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(auth.UserKey).(uuid.UUID)

	var req CreateInviteCodeRequest
	if err := utils.Read(r, &req); err != nil {
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	response, err := h.service.CreateInviteCode(r.Context(), adminID, req.MaxUses, req.ExpiresIn)
	if err != nil {
		slog.Error("Failed to create invite code", "error", err)
		utils.InternalServerError(w, "Failed to create invite code")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, response)
}

// ListInviteCodes - GET /api/v1/admin/invites
func (h *Handler) ListInviteCodes(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListInviteCodes(r.Context())
	if err != nil {
		slog.Error("Failed to list invite codes", "error", err)
		utils.InternalServerError(w, "Failed to list invite codes")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, response)
}

// DeleteInviteCode - DELETE /api/v1/admin/invites/:id
func (h *Handler) DeleteInviteCode(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	codeID, err := uuid.Parse(idStr)
	if err != nil {
		utils.BadRequest(w, "Invalid invite code ID format", nil)
		return
	}

	if err := h.service.DeleteInviteCode(r.Context(), codeID); err != nil {
		slog.Error("Failed to delete invite code", "error", err)
		utils.InternalServerError(w, "Failed to delete invite code")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "Invite code deleted successfully"})
}

// GetSignupSettings - GET /api/v1/admin/settings/signup
func (h *Handler) GetSignupSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.service.GetSignupSettings(r.Context())
	if err != nil {
		slog.Error("Failed to get signup settings", "error", err)
		utils.InternalServerError(w, "Failed to get signup settings")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, settings)
}

// UpdateSignupEnabled - PUT /api/v1/admin/settings/signup/enabled
func (h *Handler) UpdateSignupEnabled(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(auth.UserKey).(uuid.UUID)

	var req UpdateSignupEnabledRequest
	if err := utils.Read(r, &req); err != nil {
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	if err := h.service.UpdateSignupEnabled(r.Context(), adminID, req.Enabled); err != nil {
		slog.Error("Failed to update signup enabled setting", "error", err)
		utils.InternalServerError(w, "Failed to update setting")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "Signup setting updated successfully"})
}

// UpdateInviteCodesEnabled - PUT /api/v1/admin/settings/signup/invites
func (h *Handler) UpdateInviteCodesEnabled(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(auth.UserKey).(uuid.UUID)

	var req UpdateSignupEnabledRequest
	if err := utils.Read(r, &req); err != nil {
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	if err := h.service.UpdateInviteCodesEnabled(r.Context(), adminID, req.Enabled); err != nil {
		slog.Error("Failed to update invite codes enabled setting", "error", err)
		utils.InternalServerError(w, "Failed to update setting")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "Invite code setting updated successfully"})
}
