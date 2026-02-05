package problems

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

func (h *handler) CreateProblem(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	var body CreateProblemBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	problem, err := h.service.CreateProblem(r.Context(), userID, body)
	if err != nil {
		slog.Error("Failed to create problem", "error", err)
		utils.InternalServerError(w, "Failed to create problem")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, problem)
}

func (h *handler) GetProblem(w http.ResponseWriter, r *http.Request) {
	problemIDStr := chi.URLParam(r, "id")
	problemID, err := uuid.Parse(problemIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid problem ID format", nil)
		return
	}

	problem, err := h.service.GetProblem(r.Context(), problemID)
	if err != nil {
		slog.Error("Failed to get problem", "error", err)
		utils.NotFound(w, "Problem not found")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, problem)
}

func (h *handler) UpdateProblem(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	problemIDStr := chi.URLParam(r, "id")
	problemID, err := uuid.Parse(problemIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid problem ID format", nil)
		return
	}

	var body UpdateProblemBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	problem, err := h.service.UpdateProblem(r.Context(), problemID, body)
	if err != nil {
		slog.Error("Failed to update problem", "error", err)
		utils.InternalServerError(w, "Failed to update problem")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, problem)
}

func (h *handler) DeleteProblem(w http.ResponseWriter, r *http.Request) {
	problemIDStr := chi.URLParam(r, "id")
	problemID, err := uuid.Parse(problemIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid problem ID format", nil)
		return
	}

	if err := h.service.DeleteProblem(r.Context(), problemID); err != nil {
		slog.Error("Failed to delete problem", "error", err)
		utils.InternalServerError(w, "Failed to delete problem")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "Problem deleted successfully"})
}

func (h *handler) ListProblemsForUser(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	// Check if we should use search/pagination
	query := r.URL.Query().Get("q")
	difficulty := r.URL.Query().Get("difficulty")
	status := r.URL.Query().Get("status")
	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("page_size")

	// If any search/pagination params are present, use the search endpoint
	if query != "" || difficulty != "" || status != "" || pageStr != "" || pageSizeStr != "" {
		h.searchProblemsForUser(w, r, userID, query, difficulty, status, pageStr, pageSizeStr)
		return
	}

	// Otherwise, return all problems (backward compatibility)
	problems, err := h.service.ListProblemsForUser(r.Context(), userID)
	if err != nil {
		slog.Error("Failed to list problems", "error", err)
		utils.InternalServerError(w, "Failed to list problems")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, problems)
}

func (h *handler) searchProblemsForUser(w http.ResponseWriter, r *http.Request, userID uuid.UUID, query, difficulty, status, pageStr, pageSizeStr string) {
	// Parse pagination params
	page := int64(1)
	pageSize := int64(20)

	if pageStr != "" {
		if parsedPage, err := strconv.ParseInt(pageStr, 10, 64); err == nil && parsedPage > 0 {
			page = parsedPage
		}
	}

	if pageSizeStr != "" {
		if parsedSize, err := strconv.ParseInt(pageSizeStr, 10, 64); err == nil && parsedSize > 0 && parsedSize <= 100 {
			pageSize = parsedSize
		}
	}

	offset := (page - 1) * pageSize

	params := SearchProblemsParams{
		Query:      query,
		Difficulty: difficulty,
		Status:     status,
		Limit:      int32(pageSize),
		Offset:     int32(offset),
	}

	result, err := h.service.SearchProblemsForUser(r.Context(), userID, params)
	if err != nil {
		slog.Error("Failed to search problems", "error", err)
		utils.InternalServerError(w, "Failed to search problems")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, result)
}

func (h *handler) GetUrgentProblems(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	// Default limit is 5
	limit := int64(5)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.ParseInt(limitStr, 10, 64); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	problems, err := h.service.GetUrgentProblems(r.Context(), userID, int32(limit))
	if err != nil {
		slog.Error("Failed to get urgent problems", "error", err)
		utils.InternalServerError(w, "Failed to get urgent problems")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, problems)
}
