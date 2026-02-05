package attempts

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
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
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
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
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
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

	attempts, err := h.service.ListAttemptsForUser(r.Context(), userID, int32(limit), int32(offset))
	if err != nil {
		slog.Error("Failed to list attempts", "error", err)
		utils.InternalServerError(w, "Failed to list attempts")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, attempts)
}

func (h *handler) ListAttemptsForProblem(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	problemIDStr := chi.URLParam(r, "id")
	problemID, err := uuid.Parse(problemIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid problem ID format", nil)
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

// ============================================================================
// ATTEMPT TIMER HANDLERS (for stopwatch functionality)
// ============================================================================

// StartAttempt creates a new in-progress attempt with timer
func (h *handler) StartAttempt(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	var body StartAttemptBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	attempt, err := h.service.StartAttempt(r.Context(), userID, body)
	if err != nil {
		slog.Error("Failed to start attempt", "error", err)
		utils.InternalServerError(w, "Failed to start attempt")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, attempt)
}

// GetInProgressAttempt retrieves an existing in-progress attempt for a problem
func (h *handler) GetInProgressAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	problemIDStr := r.URL.Query().Get("problem_id")
	if problemIDStr == "" {
		utils.BadRequest(w, "problem_id is required", nil)
		return
	}

	problemID, err := uuid.Parse(problemIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid problem_id format", nil)
		return
	}

	attempt, err := h.service.GetInProgressAttempt(r.Context(), userID, problemID)
	if err != nil {
		slog.Error("Failed to get in-progress attempt", "error", err)
		utils.InternalServerError(w, "Failed to get in-progress attempt")
		return
	}

	if attempt == nil {
		utils.WriteSuccess(w, http.StatusOK, nil)
		return
	}

	utils.WriteSuccess(w, http.StatusOK, attempt)
}

// GetAttemptByID retrieves an attempt by its ID
func (h *handler) GetAttemptByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	attemptIDStr := chi.URLParam(r, "id")
	attemptID, err := uuid.Parse(attemptIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid attempt ID format", nil)
		return
	}

	attempt, err := h.service.GetAttemptByID(r.Context(), userID, attemptID)
	if err != nil {
		slog.Error("Failed to get attempt", "error", err)
		utils.NotFound(w, "Attempt not found")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, attempt)
}

// UpdateAttemptTimer updates the timer state for an in-progress attempt
func (h *handler) UpdateAttemptTimer(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	attemptIDStr := chi.URLParam(r, "id")
	attemptID, err := uuid.Parse(attemptIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid attempt ID format", nil)
		return
	}

	var body UpdateAttemptTimerBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	if err := h.service.UpdateAttemptTimer(r.Context(), userID, attemptID, body); err != nil {
		slog.Error("Failed to update attempt timer", "error", err)
		utils.InternalServerError(w, "Failed to update attempt timer")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{
		"message": "Timer updated successfully",
	})
}

// CompleteAttempt completes an in-progress attempt with final data
func (h *handler) CompleteAttempt(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	attemptIDStr := chi.URLParam(r, "id")
	attemptID, err := uuid.Parse(attemptIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid attempt ID format", nil)
		return
	}

	var body CompleteAttemptBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	attempt, err := h.service.CompleteAttempt(r.Context(), userID, attemptID, body)
	if err != nil {
		slog.Error("Failed to complete attempt", "error", err)
		utils.InternalServerError(w, "Failed to complete attempt")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, attempt)
}

// AbandonAttempt marks an in-progress attempt as abandoned
func (h *handler) AbandonAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	attemptIDStr := chi.URLParam(r, "id")
	attemptID, err := uuid.Parse(attemptIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid attempt ID format", nil)
		return
	}

	if err := h.service.AbandonAttempt(r.Context(), userID, attemptID); err != nil {
		slog.Error("Failed to abandon attempt", "error", err)
		utils.InternalServerError(w, "Failed to abandon attempt")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{
		"message": "Attempt abandoned successfully",
	})
}
