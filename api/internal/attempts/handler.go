package attempts

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
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

func (h *handler) CreateAttempt(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(int64)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	var body CreateAttemptBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	attempt, err := h.service.CreateAttempt(r.Context(), userID, body)
	if err != nil {
		slog.Error("Failed to create attempt", "error", err)
		utils.InternalServerError(w, "Failed to create attempt")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, attempt)
}

func (h *handler) ListAttemptsForUser(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(int64)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	// Parse pagination params
	limit := int64(20)
	offset := int64(0)

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.ParseInt(limitStr, 10, 64); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.ParseInt(offsetStr, 10, 64); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	attempts, err := h.service.ListAttemptsForUser(r.Context(), userID, limit, offset)
	if err != nil {
		slog.Error("Failed to list attempts", "error", err)
		utils.InternalServerError(w, "Failed to list attempts")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, attempts)
}

func (h *handler) ListAttemptsForProblem(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(int64)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	problemIDStr := chi.URLParam(r, "id")
	problemID, err := strconv.ParseInt(problemIDStr, 10, 64)
	if err != nil {
		utils.BadRequest(w, "Invalid problem ID", nil)
		return
	}

	attempts, err := h.service.ListAttemptsForProblem(r.Context(), userID, problemID)
	if err != nil {
		slog.Error("Failed to list attempts for problem", "error", err)
		utils.InternalServerError(w, "Failed to list attempts for problem")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, attempts)
}
