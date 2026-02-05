package patterns

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	repo "github.com/vasujain275/reforge/internal/adapters/postgres/sqlc"
)

type Service interface {
	CreatePattern(ctx context.Context, body CreatePatternBody) (*repo.Pattern, error)
	GetPattern(ctx context.Context, patternID uuid.UUID) (*repo.Pattern, error)
	UpdatePattern(ctx context.Context, patternID uuid.UUID, body UpdatePatternBody) (*repo.Pattern, error)
	DeletePattern(ctx context.Context, patternID uuid.UUID) error
	ListPatternsWithStats(ctx context.Context, userID uuid.UUID) ([]PatternWithStats, error)
	SearchPatternsWithStats(ctx context.Context, userID uuid.UUID, params SearchPatternsParams) (*PaginatedPatterns, error)
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
		Description: pgtypeText(body.Description),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create pattern: %w", err)
	}
	return &pattern, nil
}

func (s *patternService) GetPattern(ctx context.Context, patternID uuid.UUID) (*repo.Pattern, error) {
	pattern, err := s.repo.GetPattern(ctx, patternID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pattern: %w", err)
	}
	return &pattern, nil
}

func (s *patternService) UpdatePattern(ctx context.Context, patternID uuid.UUID, body UpdatePatternBody) (*repo.Pattern, error) {
	pattern, err := s.repo.UpdatePattern(ctx, repo.UpdatePatternParams{
		ID:          patternID,
		Title:       body.Title,
		Description: pgtypeText(body.Description),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update pattern: %w", err)
	}
	return &pattern, nil
}

func (s *patternService) DeletePattern(ctx context.Context, patternID uuid.UUID) error {
	return s.repo.DeletePattern(ctx, patternID)
}

func (s *patternService) ListPatternsWithStats(ctx context.Context, userID uuid.UUID) ([]PatternWithStats, error) {
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
			ID:           row.ID.String(),
			Title:        row.Title,
			Description:  textToPtr(row.Description),
			ProblemCount: problemCount,
		}

		// Add stats if they exist
		if row.TimesRevised.Valid {
			pattern.Stats = &PatternUserStats{
				UserID:        userID.String(),
				PatternID:     row.ID.String(),
				TimesRevised:  int64(row.TimesRevised.Int32),
				AvgConfidence: int64(row.AvgConfidence.Int32),
				LastRevisedAt: timestamptzToPtr(row.LastRevisedAt),
			}
		}

		patterns = append(patterns, pattern)
	}

	return patterns, nil
}

func (s *patternService) SearchPatternsWithStats(ctx context.Context, userID uuid.UUID, params SearchPatternsParams) (*PaginatedPatterns, error) {
	// Get total count
	countRow, err := s.repo.CountSearchPatternsWithStats(ctx, params.Query)
	if err != nil {
		return nil, fmt.Errorf("failed to count patterns: %w", err)
	}

	// Get unique problem count (no double-counting across patterns)
	uniqueProblemCount, err := s.repo.GetUniqueProblemCount(ctx)
	if err != nil {
		// Non-fatal - just set to 0 if query fails
		uniqueProblemCount = 0
	}

	// Get paginated results with stats
	rows, err := s.repo.SearchPatternsWithStats(ctx, repo.SearchPatternsWithStatsParams{
		UserID:      userID,
		SearchQuery: params.Query,
		LimitVal:    int32(params.Limit),
		OffsetVal:   int32(params.Offset),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to search patterns: %w", err)
	}

	results := make([]PatternWithStats, 0, len(rows))
	for _, row := range rows {
		pattern := PatternWithStats{
			ID:           row.ID.String(),
			Title:        row.Title,
			Description:  textToPtr(row.Description),
			ProblemCount: row.ProblemCount,
		}

		// Add stats if they exist (times_revised > 0 indicates stats exist)
		if row.TimesRevised > 0 || row.AvgConfidence > 0 {
			pattern.Stats = &PatternUserStats{
				UserID:        userID.String(),
				PatternID:     row.ID.String(),
				TimesRevised:  int64(row.TimesRevised),
				AvgConfidence: int64(row.AvgConfidence),
				LastRevisedAt: timestamptzToPtr(row.LastRevisedAt),
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
		Data:               results,
		Total:              countRow,
		Page:               page,
		PageSize:           params.Limit,
		TotalPages:         totalPages,
		UniqueProblemCount: uniqueProblemCount,
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
func pgtypeText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func textToPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func timestamptzToPtr(ts pgtype.Timestamptz) *string {
	if !ts.Valid {
		return nil
	}
	s := ts.Time.Format(time.RFC3339)
	return &s
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
