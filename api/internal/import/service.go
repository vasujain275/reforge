package dataimport

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
)

const (
	// BatchSize defines how many problems to commit in each batch
	BatchSize = 50
	// RecentItemsCount is the number of recent items to show in progress
	RecentItemsCount = 8
)

// ProgressCallback is called during import to report progress
type ProgressCallback func(progress ImportProgress)

// Service handles bulk import operations
type Service interface {
	// GetBundledDatasets returns available pre-packaged datasets
	GetBundledDatasets(ctx context.Context) ([]BundledDataset, error)

	// ParseCSV parses a CSV and returns analysis (doesn't import)
	ParseCSV(ctx context.Context, reader io.Reader) (*ParseResult, error)

	// ParseBundledDataset parses a bundled dataset and returns analysis
	ParseBundledDataset(ctx context.Context, datasetID string) (*ParseResult, error)

	// ExecuteImport runs the actual import with progress callbacks
	ExecuteImport(ctx context.Context, opts ImportOptions, progressFn ProgressCallback) (*ImportResult, error)

	// ExecuteImportFromReader imports from a custom CSV reader
	ExecuteImportFromReader(ctx context.Context, reader io.Reader, progressFn ProgressCallback) (*ImportResult, error)
}

type importService struct {
	repo        repo.Querier
	db          *sql.DB // Need raw DB for transactions
	parser      *Parser
	datasetPath string // Path to sample-datasets folder
}

// NewService creates a new import service
func NewService(queries repo.Querier, db *sql.DB, datasetPath string) Service {
	return &importService{
		repo:        queries,
		db:          db,
		parser:      NewParser(),
		datasetPath: datasetPath,
	}
}

// GetBundledDatasets returns available pre-packaged datasets
func (s *importService) GetBundledDatasets(ctx context.Context) ([]BundledDataset, error) {
	datasets := []BundledDataset{
		{
			ID:           "leetcode",
			Name:         "LeetCode Problems",
			Description:  "2,160 free LeetCode problems with patterns (premium excluded)",
			FileName:     "leetcode-cleaned.csv",
			ProblemCount: 2160,
			PatternCount: 72,
			Difficulties: map[string]int{
				"easy":   592,
				"medium": 1105,
				"hard":   463,
			},
		},
	}

	return datasets, nil
}

// ParseCSV parses a CSV and returns analysis
func (s *importService) ParseCSV(ctx context.Context, reader io.Reader) (*ParseResult, error) {
	problems, invalidRows, err := s.parser.ParseCSV(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to parse CSV: %w", err)
	}

	return s.analyzeProblems(ctx, problems, invalidRows)
}

// ParseBundledDataset parses a bundled dataset
func (s *importService) ParseBundledDataset(ctx context.Context, datasetID string) (*ParseResult, error) {
	reader, err := s.getBundledDatasetReader(datasetID)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	return s.ParseCSV(ctx, reader)
}

// analyzeProblems checks existing patterns/problems and returns analysis
func (s *importService) analyzeProblems(ctx context.Context, problems []ParsedProblem, invalidRows []InvalidRow) (*ParseResult, error) {
	// Ensure invalidRows is never nil (JSON serializes nil slices as null)
	if invalidRows == nil {
		invalidRows = make([]InvalidRow, 0)
	}

	// Get unique patterns from problems
	allPatterns := s.parser.GetUniquePatterns(problems)

	// Check which patterns already exist
	existingPatterns := make([]string, 0)
	patternsToCreate := make([]string, 0)

	for _, pattern := range allPatterns {
		_, err := s.repo.GetPatternByTitle(ctx, strings.ToLower(pattern))
		if err == sql.ErrNoRows {
			patternsToCreate = append(patternsToCreate, pattern)
		} else if err == nil {
			existingPatterns = append(existingPatterns, pattern)
		}
	}

	// Sort for consistent output
	sort.Strings(existingPatterns)
	sort.Strings(patternsToCreate)

	// Count duplicates
	duplicateCount := 0
	for _, prob := range problems {
		source := prob.Source
		if source == "" {
			source = "LeetCode"
		}
		_, err := s.repo.GetProblemByTitleAndSource(ctx, repo.GetProblemByTitleAndSourceParams{
			Title:  prob.Title,
			Source: sql.NullString{String: source, Valid: true},
		})
		if err == nil {
			duplicateCount++
		}
	}

	return &ParseResult{
		TotalRows:        len(problems) + len(invalidRows),
		ValidRows:        len(problems),
		InvalidRows:      invalidRows,
		PatternsToCreate: patternsToCreate,
		ExistingPatterns: existingPatterns,
		DuplicateCount:   duplicateCount,
		Difficulties:     s.parser.CountDifficulties(problems),
	}, nil
}

// ExecuteImport runs the import from a bundled dataset
func (s *importService) ExecuteImport(ctx context.Context, opts ImportOptions, progressFn ProgressCallback) (*ImportResult, error) {
	if !opts.UseBundled {
		return nil, fmt.Errorf("use ExecuteImportFromReader for custom CSV files")
	}

	reader, err := s.getBundledDatasetReader(opts.DatasetID)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	return s.ExecuteImportFromReader(ctx, reader, progressFn)
}

// ExecuteImportFromReader imports from a custom CSV reader
func (s *importService) ExecuteImportFromReader(ctx context.Context, reader io.Reader, progressFn ProgressCallback) (*ImportResult, error) {
	startTime := time.Now()

	// Parse CSV
	problems, invalidRows, err := s.parser.ParseCSV(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to parse CSV: %w", err)
	}

	// Report invalid rows as errors
	importErrors := make([]ImportError, 0, len(invalidRows))
	for _, row := range invalidRows {
		importErrors = append(importErrors, ImportError{
			RowNumber: row.RowNumber,
			Title:     row.Title,
			Error:     row.Error,
		})
	}

	result := &ImportResult{
		Success: true,
		Errors:  importErrors,
	}

	// Phase 1: Create patterns
	patternNames := s.parser.GetUniquePatterns(problems)
	patternIDMap := make(map[string]int64) // pattern name -> ID

	progressFn(ImportProgress{
		Phase:       "patterns",
		TotalItems:  len(patternNames),
		CurrentItem: "Preparing patterns...",
	})

	for i, patternName := range patternNames {
		// Check if pattern exists (case-insensitive)
		existingPattern, err := s.repo.GetPatternByTitle(ctx, strings.ToLower(patternName))
		if err == nil {
			patternIDMap[strings.ToLower(patternName)] = existingPattern.ID
		} else if err == sql.ErrNoRows {
			// Create new pattern
			newPattern, err := s.repo.CreatePattern(ctx, repo.CreatePatternParams{
				Title:       patternName,
				Description: sql.NullString{},
			})
			if err != nil {
				// Log error but continue
				continue
			}
			patternIDMap[strings.ToLower(patternName)] = newPattern.ID
			result.PatternsCreated++
		}

		progressFn(ImportProgress{
			Phase:           "patterns",
			CurrentItem:     patternName,
			CurrentIndex:    i + 1,
			TotalItems:      len(patternNames),
			PatternsCreated: result.PatternsCreated,
			Percentage:      float64(i+1) / float64(len(patternNames)) * 100,
		})
	}

	// Phase 2: Import problems in batches
	totalProblems := len(problems)
	recentItems := make([]RecentItem, 0, RecentItemsCount)

	for i, prob := range problems {
		// Check for duplicate
		source := prob.Source
		if source == "" {
			source = "LeetCode" // Default source
		}

		_, err := s.repo.GetProblemByTitleAndSource(ctx, repo.GetProblemByTitleAndSourceParams{
			Title:  prob.Title,
			Source: sql.NullString{String: source, Valid: true},
		})

		status := "created"
		if err == nil {
			// Duplicate found, skip
			result.DuplicatesSkipped++
			status = "skipped"
		} else if err == sql.ErrNoRows {
			// Create problem
			newProblem, err := s.repo.CreateProblem(ctx, repo.CreateProblemParams{
				Title:      prob.Title,
				Source:     sql.NullString{String: source, Valid: true},
				Url:        sql.NullString{String: prob.URL, Valid: prob.URL != ""},
				Difficulty: sql.NullString{String: prob.Difficulty, Valid: true},
			})
			if err != nil {
				result.Errors = append(result.Errors, ImportError{
					RowNumber: prob.RowNumber,
					Title:     prob.Title,
					Error:     fmt.Sprintf("failed to create: %v", err),
				})
				status = "error"
			} else {
				result.ProblemsCreated++

				// Link patterns
				for _, patternName := range prob.Patterns {
					patternID, ok := patternIDMap[strings.ToLower(patternName)]
					if ok {
						_ = s.repo.LinkProblemToPatternIfNotExists(ctx, repo.LinkProblemToPatternIfNotExistsParams{
							ProblemID: newProblem.ID,
							PatternID: patternID,
						})
					}
				}
			}
		}

		// Update recent items (keep last N)
		recentItems = append(recentItems, RecentItem{
			Title:      prob.Title,
			Difficulty: prob.Difficulty,
			Status:     status,
		})
		if len(recentItems) > RecentItemsCount {
			recentItems = recentItems[1:]
		}

		// Report progress
		progressFn(ImportProgress{
			Phase:             "problems",
			CurrentItem:       prob.Title,
			CurrentIndex:      i + 1,
			TotalItems:        totalProblems,
			ProblemsCreated:   result.ProblemsCreated,
			PatternsCreated:   result.PatternsCreated,
			DuplicatesSkipped: result.DuplicatesSkipped,
			Percentage:        float64(i+1) / float64(totalProblems) * 100,
			RecentItems:       recentItems,
		})

		// Small delay to prevent overwhelming the client with SSE events
		// and to make the UI feel smoother
		if i%10 == 0 {
			time.Sleep(5 * time.Millisecond)
		}
	}

	// Final progress
	result.Duration = formatDuration(time.Since(startTime))

	progressFn(ImportProgress{
		Phase:             "complete",
		CurrentItem:       "Import complete",
		CurrentIndex:      totalProblems,
		TotalItems:        totalProblems,
		ProblemsCreated:   result.ProblemsCreated,
		PatternsCreated:   result.PatternsCreated,
		DuplicatesSkipped: result.DuplicatesSkipped,
		Percentage:        100,
		RecentItems:       recentItems,
	})

	return result, nil
}

// getBundledDatasetReader returns a reader for a bundled dataset
func (s *importService) getBundledDatasetReader(datasetID string) (io.ReadCloser, error) {
	datasets, _ := s.GetBundledDatasets(context.Background())

	var dataset *BundledDataset
	for _, d := range datasets {
		if d.ID == datasetID {
			dataset = &d
			break
		}
	}

	if dataset == nil {
		return nil, fmt.Errorf("unknown dataset: %s", datasetID)
	}

	// Try configured path first
	if s.datasetPath != "" {
		path := filepath.Join(s.datasetPath, dataset.FileName)
		file, err := os.Open(path)
		if err == nil {
			return file, nil
		}
	}

	// Fallback to filesystem search (for development)
	cwd, _ := os.Getwd()
	possiblePaths := []string{
		filepath.Join(cwd, "data", "sample-datasets", dataset.FileName),
		filepath.Join(cwd, "api", "data", "sample-datasets", dataset.FileName),
		filepath.Join(cwd, "..", "data", "sample-datasets", dataset.FileName),
	}

	for _, path := range possiblePaths {
		file, err := os.Open(path)
		if err == nil {
			return file, nil
		}
	}

	return nil, fmt.Errorf("could not find bundled dataset file: %s", dataset.FileName)
}

// formatDuration formats a duration as a human-readable string
func formatDuration(d time.Duration) string {
	if d < time.Second {
		return fmt.Sprintf("%dms", d.Milliseconds())
	}
	if d < time.Minute {
		return fmt.Sprintf("%.1fs", d.Seconds())
	}
	return fmt.Sprintf("%.1fm", d.Minutes())
}
