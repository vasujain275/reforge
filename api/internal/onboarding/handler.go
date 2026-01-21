package onboarding

import (
	"net/http"

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

type InitStatusResponse struct {
	Initialized bool `json:"initialized"`
}

type CreateAdminRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name" validate:"required,min=2"`
}

// GetInitStatus returns whether the system has been initialized (has users)
func (h *Handler) GetInitStatus(w http.ResponseWriter, r *http.Request) {
	initialized, err := h.service.IsSystemInitialized(r.Context())
	if err != nil {
		utils.InternalServerError(w, "Failed to check system status")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, InitStatusResponse{
		Initialized: initialized,
	})
}

// CreateFirstAdmin creates the first admin user during system initialization
// This endpoint is only accessible when no users exist
func (h *Handler) CreateFirstAdmin(w http.ResponseWriter, r *http.Request) {
	var req CreateAdminRequest
	if err := utils.Read(r, &req); err != nil {
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	// Check if system is already initialized
	initialized, err := h.service.IsSystemInitialized(r.Context())
	if err != nil {
		utils.InternalServerError(w, "Failed to check system status")
		return
	}

	if initialized {
		utils.BadRequest(w, "System already initialized. Please use the login page.", nil)
		return
	}

	// Create first admin
	err = h.service.CreateFirstAdmin(r.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		if err == ErrSystemAlreadyInitialized {
			utils.BadRequest(w, "System already initialized", nil)
			return
		}
		utils.InternalServerError(w, "Failed to create admin user")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, map[string]string{
		"message": "Admin user created successfully. You can now login.",
	})
}
