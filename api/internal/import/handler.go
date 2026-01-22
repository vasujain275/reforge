package dataimport

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/vasujain275/reforge/internal/utils"
)

// Handler handles HTTP requests for import operations
type Handler struct {
	service Service
}

// NewHandler creates a new import handler
func NewHandler(service Service) *Handler {
	return &Handler{
		service: service,
	}
}

// GetBundledDatasets - GET /api/v1/admin/import/datasets
// Returns list of available bundled datasets
func (h *Handler) GetBundledDatasets(w http.ResponseWriter, r *http.Request) {
	datasets, err := h.service.GetBundledDatasets(r.Context())
	if err != nil {
		slog.Error("Failed to get bundled datasets", "error", err)
		utils.InternalServerError(w, "Failed to get bundled datasets")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, datasets)
}

// ParseBundledDataset - POST /api/v1/admin/import/parse
// Parses a bundled dataset and returns analysis without importing
func (h *Handler) ParseBundledDataset(w http.ResponseWriter, r *http.Request) {
	var req ParseCSVRequest
	if err := utils.Read(r, &req); err != nil {
		utils.BadRequest(w, "Invalid request body", nil)
		return
	}

	if !req.UseBundled || req.DatasetID == "" {
		utils.BadRequest(w, "dataset_id is required when use_bundled is true", nil)
		return
	}

	result, err := h.service.ParseBundledDataset(r.Context(), req.DatasetID)
	if err != nil {
		slog.Error("Failed to parse bundled dataset", "error", err, "dataset_id", req.DatasetID)
		utils.InternalServerError(w, fmt.Sprintf("Failed to parse dataset: %v", err))
		return
	}

	utils.WriteSuccess(w, http.StatusOK, result)
}

// ParseUploadedCSV - POST /api/v1/admin/import/parse-upload
// Parses an uploaded CSV file and returns analysis without importing
func (h *Handler) ParseUploadedCSV(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.BadRequest(w, "Failed to parse form data", nil)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		utils.BadRequest(w, "CSV file is required", nil)
		return
	}
	defer file.Close()

	result, err := h.service.ParseCSV(r.Context(), file)
	if err != nil {
		slog.Error("Failed to parse uploaded CSV", "error", err)
		utils.BadRequest(w, fmt.Sprintf("Failed to parse CSV: %v", err), nil)
		return
	}

	utils.WriteSuccess(w, http.StatusOK, result)
}

// ExecuteImport - GET /api/v1/admin/import/execute (SSE endpoint)
// Executes import with real-time progress updates via Server-Sent Events
func (h *Handler) ExecuteImport(w http.ResponseWriter, r *http.Request) {
	// Get query parameters
	useBundled := r.URL.Query().Get("use_bundled") == "true"
	datasetID := r.URL.Query().Get("dataset_id")

	if useBundled && datasetID == "" {
		http.Error(w, "dataset_id is required when use_bundled is true", http.StatusBadRequest)
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get flusher for streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Send initial connection event
	sendSSEEvent(w, flusher, "connected", map[string]string{"status": "connected"})

	// Progress callback for SSE
	progressFn := func(progress ImportProgress) {
		sendSSEEvent(w, flusher, "progress", progress)
	}

	// Execute import
	opts := ImportOptions{
		UseBundled: useBundled,
		DatasetID:  datasetID,
	}

	result, err := h.service.ExecuteImport(r.Context(), opts, progressFn)
	if err != nil {
		slog.Error("Import failed", "error", err)
		sendSSEEvent(w, flusher, "error", map[string]string{"error": err.Error()})
		return
	}

	// Send final result
	sendSSEEvent(w, flusher, "complete", result)
}

// ExecuteUploadImport - POST /api/v1/admin/import/execute-upload (SSE endpoint)
// Executes import from uploaded CSV with real-time progress
func (h *Handler) ExecuteUploadImport(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "CSV file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get flusher for streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Send initial connection event
	sendSSEEvent(w, flusher, "connected", map[string]string{"status": "connected"})

	// Progress callback for SSE
	progressFn := func(progress ImportProgress) {
		sendSSEEvent(w, flusher, "progress", progress)
	}

	// Execute import
	result, err := h.service.ExecuteImportFromReader(r.Context(), file, progressFn)
	if err != nil {
		slog.Error("Import failed", "error", err)
		sendSSEEvent(w, flusher, "error", map[string]string{"error": err.Error()})
		return
	}

	// Send final result
	sendSSEEvent(w, flusher, "complete", result)
}

// sendSSEEvent sends a Server-Sent Event
func sendSSEEvent(w http.ResponseWriter, flusher http.Flusher, eventType string, data interface{}) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		slog.Error("Failed to marshal SSE data", "error", err)
		return
	}

	fmt.Fprintf(w, "event: %s\n", eventType)
	fmt.Fprintf(w, "data: %s\n\n", jsonData)
	flusher.Flush()
}
