package patterns

import (
	"context"
	"database/sql"
	"fmt"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
)

type Service interface {
	CreatePattern(ctx context.Context, body CreatePatternBody) (*repo.Pattern, error)
	GetPattern(ctx context.Context, patternID int64) (*repo.Pattern, error)
	UpdatePattern(ctx context.Context, patternID int64, body UpdatePatternBody) (*repo.Pattern, error)
	DeletePattern(ctx context.Context, patternID int64) error
	ListPatternsWithStats(ctx context.Context, userID int64) ([]PatternWithStats, error)
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
