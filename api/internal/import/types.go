package dataimport

// CSVRow represents a single row from the import CSV
type CSVRow struct {
	Title      string `json:"title"`
	URL        string `json:"url"`
	Source     string `json:"source"`
	Difficulty string `json:"difficulty"`
	Patterns   string `json:"patterns"` // Comma-separated pattern names
}

// ParsedProblem is a validated problem ready for import
type ParsedProblem struct {
	Title      string   `json:"title"`
	URL        string   `json:"url"`
	Source     string   `json:"source"`
	Difficulty string   `json:"difficulty"`
	Patterns   []string `json:"patterns"`
	RowNumber  int      `json:"row_number"`
}

// InvalidRow represents a row that failed validation
type InvalidRow struct {
	RowNumber int    `json:"row_number"`
	Error     string `json:"error"`
	Title     string `json:"title,omitempty"` // For context in error display
}

// BundledDataset represents a pre-packaged dataset
type BundledDataset struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	Description  string         `json:"description"`
	FileName     string         `json:"file_name"`
	ProblemCount int            `json:"problem_count"`
	PatternCount int            `json:"pattern_count"`
	Difficulties map[string]int `json:"difficulties"` // easy/medium/hard counts
}

// ParseResult is returned after parsing a CSV file
type ParseResult struct {
	TotalRows        int            `json:"total_rows"`
	ValidRows        int            `json:"valid_rows"`
	InvalidRows      []InvalidRow   `json:"invalid_rows"`
	PatternsToCreate []string       `json:"patterns_to_create"` // New patterns that will be created
	ExistingPatterns []string       `json:"existing_patterns"`  // Patterns already in DB
	DuplicateCount   int            `json:"duplicate_count"`    // Problems that already exist
	Difficulties     map[string]int `json:"difficulties"`       // easy/medium/hard counts
}

// ImportOptions configures the import execution
type ImportOptions struct {
	UseBundled   bool   `json:"use_bundled"`
	DatasetID    string `json:"dataset_id,omitempty"`    // If using bundled dataset
	SkipPatterns bool   `json:"skip_patterns,omitempty"` // Don't create/link patterns
}

// ImportProgress is sent via SSE during import
type ImportProgress struct {
	Phase             string  `json:"phase"`              // "patterns", "problems", "complete", "error"
	CurrentItem       string  `json:"current_item"`       // Current problem/pattern name
	CurrentIndex      int     `json:"current_index"`      // 0-based index
	TotalItems        int     `json:"total_items"`        // Total to process
	ProblemsCreated   int     `json:"problems_created"`   // Running count
	PatternsCreated   int     `json:"patterns_created"`   // Running count
	DuplicatesSkipped int     `json:"duplicates_skipped"` // Running count
	Percentage        float64 `json:"percentage"`         // 0-100
	Error             string  `json:"error,omitempty"`    // Error message if phase is "error"

	// Recent items for UI display (last N processed)
	RecentItems []RecentItem `json:"recent_items,omitempty"`
}

// RecentItem shows recently processed items in the UI
type RecentItem struct {
	Title      string `json:"title"`
	Difficulty string `json:"difficulty"`
	Status     string `json:"status"` // "created", "skipped", "error"
}

// ImportResult is the final result after import completes
type ImportResult struct {
	Success           bool          `json:"success"`
	ProblemsCreated   int           `json:"problems_created"`
	PatternsCreated   int           `json:"patterns_created"`
	DuplicatesSkipped int           `json:"duplicates_skipped"`
	Errors            []ImportError `json:"errors,omitempty"`
	Duration          string        `json:"duration"` // Human-readable duration
}

// ImportError represents an error during import
type ImportError struct {
	RowNumber int    `json:"row_number"`
	Title     string `json:"title"`
	Error     string `json:"error"`
}

// --- Request/Response types for HTTP handlers ---

// ParseCSVRequest is the request body for parsing CSV
type ParseCSVRequest struct {
	UseBundled bool   `json:"use_bundled"`
	DatasetID  string `json:"dataset_id,omitempty"`
}

// ExecuteImportRequest starts the import process
type ExecuteImportRequest struct {
	UseBundled bool   `json:"use_bundled"`
	DatasetID  string `json:"dataset_id,omitempty"`
}
