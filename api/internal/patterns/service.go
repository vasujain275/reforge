package patterns

import (
	"context"
	"database/sql"
	"fmt"
	"sort"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
)

type Service interface {
	CreatePattern(ctx context.Context, body CreatePatternBody) (*repo.Pattern, error)
	GetPattern(ctx context.Context, patternID int64) (*repo.Pattern, error)
	UpdatePattern(ctx context.Context, patternID int64, body UpdatePatternBody) (*repo.Pattern, error)
	DeletePattern(ctx context.Context, patternID int64) error
	ListPatternsWithStats(ctx context.Context, userID int64) ([]PatternWithStats, error)
	SearchPatternsWithStats(ctx context.Context, userID int64, params SearchPatternsParams) (*PaginatedPatterns, error)
	ListPatterns(ctx context.Context) ([]repo.Pattern, error)
}

type patternService struct {
	repo repo.Querier
}

func NewService(repo repo.Querier) Service {
	return &patternService{
		repo: repo,
	}
}

func (s *patternService) CreatePattern(ctx context.Context, body CreatePatternBody) (*repo.Pattern, error) {
	pattern, err := s.repo.CreatePattern(ctx, repo.CreatePatternParams{
		Title:       body.Title,
		Description: sqlNullString(body.Description),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create pattern: %w", err)
	}
	return &pattern, nil
}

func (s *patternService) GetPattern(ctx context.Context, patternID int64) (*repo.Pattern, error) {
	pattern, err := s.repo.GetPattern(ctx, patternID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pattern: %w", err)
	}
	return &pattern, nil
}

func (s *patternService) UpdatePattern(ctx context.Context, patternID int64, body UpdatePatternBody) (*repo.Pattern, error) {
	pattern, err := s.repo.UpdatePattern(ctx, repo.UpdatePatternParams{
		ID:          patternID,
		Title:       body.Title,
		Description: sqlNullString(body.Description),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update pattern: %w", err)
	}
	return &pattern, nil
}

func (s *patternService) DeletePattern(ctx context.Context, patternID int64) error {
	return s.repo.DeletePattern(ctx, patternID)
}

func (s *patternService) ListPatternsWithStats(ctx context.Context, userID int64) ([]PatternWithStats, error) {
	rows, err := s.repo.GetPatternsWithStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list patterns with stats: %w", err)
	}

	patterns := make([]PatternWithStats, 0, len(rows))
	for _, row := range rows {
		// Get problem count for this pattern
		problemCount, err := s.repo.GetPatternProblemCount(ctx, row.ID)
		if err != nil {
			problemCount = 0
		}

		pattern := PatternWithStats{
			ID:           row.ID,
			Title:        row.Title,
			Description:  nullStringToPtr(row.Description),
			ProblemCount: problemCount,
		}

		// Add stats if they exist
		if row.TimesRevised.Valid {
			pattern.Stats = &PatternUserStats{
				UserID:        userID,
				PatternID:     row.ID,
				TimesRevised:  row.TimesRevised.Int64,
				AvgConfidence: row.AvgConfidence.Int64,
				LastRevisedAt: nullStringToPtr(row.LastRevisedAt),
			}
		}

		patterns = append(patterns, pattern)
	}

	return patterns, nil
}

func (s *patternService) SearchPatternsWithStats(ctx context.Context, userID int64, params SearchPatternsParams) (*PaginatedPatterns, error) {
	// Get total count
	countRow, err := s.repo.CountSearchPatternsWithStats(ctx, params.Query)
	if err != nil {
		return nil, fmt.Errorf("failed to count patterns: %w", err)
	}

	// Get paginated results with stats
	rows, err := s.repo.SearchPatternsWithStats(ctx, repo.SearchPatternsWithStatsParams{
		UserID:      userID,
		SearchQuery: params.Query,
		LimitVal:    params.Limit,
		OffsetVal:   params.Offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to search patterns: %w", err)
	}

	results := make([]PatternWithStats, 0, len(rows))
	for _, row := range rows {
		pattern := PatternWithStats{
			ID:           row.ID,
			Title:        row.Title,
			Description:  nullStringToPtr(row.Description),
			ProblemCount: row.ProblemCount,
		}

		// Add stats if they exist (times_revised > 0 indicates stats exist)
		if row.TimesRevised > 0 || row.AvgConfidence > 0 {
			pattern.Stats = &PatternUserStats{
				UserID:        userID,
				PatternID:     row.ID,
				TimesRevised:  row.TimesRevised,
				AvgConfidence: row.AvgConfidence,
				LastRevisedAt: nullStringToPtr(row.LastRevisedAt),
			}
		}

		results = append(results, pattern)
	}

	// Sort results based on params.SortBy
	sortPatterns(results, params.SortBy)

	// Calculate pagination info
	page := params.Offset/params.Limit + 1
	if params.Offset == 0 {
		page = 1
	}
	totalPages := (countRow + params.Limit - 1) / params.Limit

	return &PaginatedPatterns{
		Data:       results,
		Total:      countRow,
		Page:       page,
		PageSize:   params.Limit,
		TotalPages: totalPages,
	}, nil
}

func (s *patternService) ListPatterns(ctx context.Context) ([]repo.Pattern, error) {
	patterns, err := s.repo.ListPatterns(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list patterns: %w", err)
	}
	return patterns, nil
}

// Helper functions
func sqlNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

func nullStringToPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	return &ns.String
}

// sortPatterns sorts patterns based on the provided sort_by parameter
func sortPatterns(patterns []PatternWithStats, sortBy string) {
	switch sortBy {
	case "confidence_asc":
		sort.Slice(patterns, func(i, j int) bool {
			iConf := int64(0)
			jConf := int64(0)
			if patterns[i].Stats != nil {
				iConf = patterns[i].Stats.AvgConfidence
			}
			if patterns[j].Stats != nil {
				jConf = patterns[j].Stats.AvgConfidence
			}
			return iConf < jConf
		})
	case "confidence_desc":
		sort.Slice(patterns, func(i, j int) bool {
			iConf := int64(0)
			jConf := int64(0)
			if patterns[i].Stats != nil {
				iConf = patterns[i].Stats.AvgConfidence
			}
			if patterns[j].Stats != nil {
				jConf = patterns[j].Stats.AvgConfidence
			}
			return iConf > jConf
		})
	case "times_revised_asc":
		sort.Slice(patterns, func(i, j int) bool {
			iTimes := int64(0)
			jTimes := int64(0)
			if patterns[i].Stats != nil {
				iTimes = patterns[i].Stats.TimesRevised
			}
			if patterns[j].Stats != nil {
				jTimes = patterns[j].Stats.TimesRevised
			}
			return iTimes < jTimes
		})
	case "times_revised_desc":
		sort.Slice(patterns, func(i, j int) bool {
			iTimes := int64(0)
			jTimes := int64(0)
			if patterns[i].Stats != nil {
				iTimes = patterns[i].Stats.TimesRevised
			}
			if patterns[j].Stats != nil {
				jTimes = patterns[j].Stats.TimesRevised
			}
			return iTimes > jTimes
		})
	case "problem_count_asc":
		sort.Slice(patterns, func(i, j int) bool {
			return patterns[i].ProblemCount < patterns[j].ProblemCount
		})
	case "problem_count_desc":
		sort.Slice(patterns, func(i, j int) bool {
			return patterns[i].ProblemCount > patterns[j].ProblemCount
		})
	case "title_asc":
		sort.Slice(patterns, func(i, j int) bool {
			return patterns[i].Title < patterns[j].Title
		})
	case "title_desc":
		sort.Slice(patterns, func(i, j int) bool {
			return patterns[i].Title > patterns[j].Title
		})
	case "last_revised_asc":
		sort.Slice(patterns, func(i, j int) bool {
			iTime := ""
			jTime := ""
			if patterns[i].Stats != nil && patterns[i].Stats.LastRevisedAt != nil {
				iTime = *patterns[i].Stats.LastRevisedAt
			}
			if patterns[j].Stats != nil && patterns[j].Stats.LastRevisedAt != nil {
				jTime = *patterns[j].Stats.LastRevisedAt
			}
			return iTime < jTime
		})
	case "last_revised_desc":
		sort.Slice(patterns, func(i, j int) bool {
			iTime := ""
			jTime := ""
			if patterns[i].Stats != nil && patterns[i].Stats.LastRevisedAt != nil {
				iTime = *patterns[i].Stats.LastRevisedAt
			}
			if patterns[j].Stats != nil && patterns[j].Stats.LastRevisedAt != nil {
				jTime = *patterns[j].Stats.LastRevisedAt
			}
			return iTime > jTime
		})
	default:
		// Default sort by title
		sort.Slice(patterns, func(i, j int) bool {
			return patterns[i].Title < patterns[j].Title
		})
	}
}
