package sessions

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

func (h *handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(int64)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	var body CreateSessionBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	session, err := h.service.CreateSession(r.Context(), userID, body)
	if err != nil {
		slog.Error("Failed to create session", "error", err)
		utils.InternalServerError(w, "Failed to create session")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, session)
}

func (h *handler) GetSession(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(int64)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	sessionIDStr := chi.URLParam(r, "id")
	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil {
		utils.BadRequest(w, "Invalid session ID", nil)
		return
	}

	session, err := h.service.GetSession(r.Context(), userID, sessionID)
	if err != nil {
		slog.Error("Failed to get session", "error", err)
		utils.NotFound(w, "Session not found")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, session)
}

func (h *handler) ListSessionsForUser(w http.ResponseWriter, r *http.Request) {
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

	sessions, err := h.service.ListSessionsForUser(r.Context(), userID, limit, offset)
	if err != nil {
		slog.Error("Failed to list sessions", "error", err)
		utils.InternalServerError(w, "Failed to list sessions")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, sessions)
}

func (h *handler) GenerateSession(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(int64)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	var body GenerateSessionBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	session, err := h.service.GenerateSession(r.Context(), userID, body)
	if err != nil {
		slog.Error("Failed to generate session", "error", err)
		utils.InternalServerError(w, "Failed to generate session")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, session)
}
