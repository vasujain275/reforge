package patterns

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

func (h *handler) CreatePattern(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body CreatePatternBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	pattern, err := h.service.CreatePattern(r.Context(), body)
	if err != nil {
		slog.Error("Failed to create pattern", "error", err)
		utils.InternalServerError(w, "Failed to create pattern")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, pattern)
}

func (h *handler) GetPattern(w http.ResponseWriter, r *http.Request) {
	patternIDStr := chi.URLParam(r, "id")
	patternID, err := uuid.Parse(patternIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid pattern ID format", nil)
		return
	}

	pattern, err := h.service.GetPattern(r.Context(), patternID)
	if err != nil {
		slog.Error("Failed to get pattern", "error", err)
		utils.NotFound(w, "Pattern not found")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, pattern)
}

func (h *handler) UpdatePattern(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	patternIDStr := chi.URLParam(r, "id")
	patternID, err := uuid.Parse(patternIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid pattern ID format", nil)
		return
	}

	var body UpdatePatternBody
	if err := utils.Read(r, &body); err != nil {
		slog.Error("Failed to parse request body", "error", err)
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	pattern, err := h.service.UpdatePattern(r.Context(), patternID, body)
	if err != nil {
		slog.Error("Failed to update pattern", "error", err)
		utils.InternalServerError(w, "Failed to update pattern")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, pattern)
}

func (h *handler) DeletePattern(w http.ResponseWriter, r *http.Request) {
	patternIDStr := chi.URLParam(r, "id")
	patternID, err := uuid.Parse(patternIDStr)
	if err != nil {
		utils.BadRequest(w, "Invalid pattern ID format", nil)
		return
	}

	if err := h.service.DeletePattern(r.Context(), patternID); err != nil {
		slog.Error("Failed to delete pattern", "error", err)
		utils.InternalServerError(w, "Failed to delete pattern")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "Pattern deleted successfully"})
}

func (h *handler) ListPatternsWithStats(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(auth.UserKey).(uuid.UUID)
	if !ok {
		utils.InternalServerError(w, "User ID is missing from context")
		return
	}

	// Check if we should use search/pagination
	query := r.URL.Query().Get("q")
	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("page_size")
	sortBy := r.URL.Query().Get("sort_by")

	// If any search/pagination params are present, use the search endpoint
	if query != "" || pageStr != "" || pageSizeStr != "" || sortBy != "" {
		h.searchPatternsWithStats(w, r, userID, query, pageStr, pageSizeStr, sortBy)
		return
	}

	patterns, err := h.service.ListPatternsWithStats(r.Context(), userID)
	if err != nil {
		slog.Error("Failed to list patterns", "error", err)
		utils.InternalServerError(w, "Failed to list patterns")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, patterns)
}

func (h *handler) searchPatternsWithStats(w http.ResponseWriter, r *http.Request, userID uuid.UUID, query, pageStr, pageSizeStr, sortBy string) {
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

	params := SearchPatternsParams{
		Query:  query,
		SortBy: sortBy,
		Limit:  pageSize,
		Offset: offset,
	}

	result, err := h.service.SearchPatternsWithStats(r.Context(), userID, params)
	if err != nil {
		slog.Error("Failed to search patterns", "error", err)
		utils.InternalServerError(w, "Failed to search patterns")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, result)
}
