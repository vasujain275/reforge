package users

import (
	"log/slog"
	"net/http"

	"github.com/vasujain275/reforge/internal/auth"
	"github.com/vasujain275/reforge/internal/utils"
)

type handler struct {
	service Service
}

func NewHandler(service Service) *handler {
	return &handler{
		service: service,
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

	user, err := h.service.CreateUser(r.Context(), body)
	if err != nil {
		slog.Error("Failed to create user", "error", err)
		utils.InternalServerError(w, "Failed to create user")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, user)
}

func (h *handler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	
	// Get ID from context
	userID, ok := r.Context().Value(auth.UserKey).(int64)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}
	
	// Use the ID to fetch data
	user, err := h.service.GetUserByID(r.Context(),userID)
	if err != nil {
		utils.NotFound(w,"User not found")
		return
	}
	
	utils.WriteSuccess(w, http.StatusOK, user)
}