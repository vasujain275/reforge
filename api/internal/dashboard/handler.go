package dashboard

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

func (h *handler) GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(int64)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	stats, err := h.service.GetDashboardStats(r.Context(), userID)
	if err != nil {
		slog.Error("Failed to get dashboard stats", "error", err)
		utils.InternalServerError(w, "Failed to get dashboard stats")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, stats)
}
