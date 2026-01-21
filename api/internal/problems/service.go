package problems

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/scoring"
)

type Service interface {
	CreateProblem(ctx context.Context, userID int64, body CreateProblemBody) (*ProblemWithStats, error)
	GetProblem(ctx context.Context, problemID int64) (*ProblemWithStats, error)
	UpdateProblem(ctx context.Context, problemID int64, body UpdateProblemBody) (*ProblemWithStats, error)
	DeleteProblem(ctx context.Context, problemID int64) error
	ListProblemsForUser(ctx context.Context, userID int64) ([]ProblemWithStats, error)
	GetUrgentProblems(ctx context.Context, userID int64, limit int64) ([]UrgentProblem, error)
	LinkProblemToPatterns(ctx context.Context, problemID int64, patternIDs []int64) error
}

type problemService struct {
	repo           repo.Querier
	scoringService scoring.Service
}

func NewService(repo repo.Querier, scoringService scoring.Service) Service {
	return &problemService{
		repo:           repo,
		scoringService: scoringService,
	}
}

func (s *problemService) CreateProblem(ctx context.Context, userID int64, body CreateProblemBody) (*ProblemWithStats, error) {
	// Create the problem
	problem, err := s.repo.CreateProblem(ctx, repo.CreateProblemParams{
		Title:      body.Title,
		Source:     sqlNullString(body.Source),
		Url:        sqlNullString(body.URL),
		Difficulty: sqlNullString(&body.Difficulty),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create problem: %w", err)
	}

	// Link patterns if provided
	if len(body.PatternIDs) > 0 {
		if err := s.LinkProblemToPatterns(ctx, problem.ID, body.PatternIDs); err != nil {
			return nil, fmt.Errorf("failed to link patterns: %w", err)
		}
	}

	// Initialize user stats for this problem
	_, err = s.repo.UpsertUserProblemStats(ctx, repo.UpsertUserProblemStatsParams{
		UserID:            userID,
		ProblemID:         problem.ID,
		Status:            sqlNullString(strPtr("unsolved")),
		Confidence:        sql.NullInt64{Int64: 50, Valid: true},
		AvgConfidence:     sql.NullInt64{Int64: 50, Valid: true},
		LastAttemptAt:     sql.NullString{},
		TotalAttempts:     sql.NullInt64{Int64: 0, Valid: true},
		AvgTimeSeconds:    sql.NullInt64{},
		LastOutcome:       sql.NullString{},
		RecentHistoryJson: sql.NullString{String: "[]", Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize stats: %w", err)
	}

	// Fetch patterns
	patterns, err := s.repo.GetPatternsForProblem(ctx, problem.ID)
	if err != nil {
		patterns = []repo.Pattern{} // empty if error
	}

	return &ProblemWithStats{
		ID:         problem.ID,
		Title:      problem.Title,
		Source:     nullStringToPtr(problem.Source),
		URL:        nullStringToPtr(problem.Url),
		Difficulty: nullStringToStr(problem.Difficulty, "medium"),
		CreatedAt:  problem.CreatedAt.String,
		Stats: &Stats{
			UserID:        userID,
			ProblemID:     problem.ID,
			Status:        "unsolved",
			Confidence:    50,
			AvgConfidence: 50,
			TotalAttempts: 0,
		},
		Patterns: convertPatternsFromRepo(patterns),
	}, nil
}

func (s *problemService) GetProblem(ctx context.Context, problemID int64) (*ProblemWithStats, error) {
	problem, err := s.repo.GetProblem(ctx, problemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get problem: %w", err)
	}

	// Fetch patterns for the problem
	patterns, err := s.repo.GetPatternsForProblem(ctx, problemID)
	if err != nil {
		patterns = []repo.Pattern{} // empty if error
	}

	return &ProblemWithStats{
		ID:         problem.ID,
		Title:      problem.Title,
		Source:     nullStringToPtr(problem.Source),
		URL:        nullStringToPtr(problem.Url),
		Difficulty: nullStringToStr(problem.Difficulty, "medium"),
		CreatedAt:  problem.CreatedAt.String,
		Patterns:   convertPatternsFromRepo(patterns),
	}, nil
}

func (s *problemService) UpdateProblem(ctx context.Context, problemID int64, body UpdateProblemBody) (*ProblemWithStats, error) {
	problem, err := s.repo.UpdateProblem(ctx, repo.UpdateProblemParams{
		ID:         problemID,
		Title:      body.Title,
		Source:     sqlNullString(body.Source),
		Url:        sqlNullString(body.URL),
		Difficulty: sqlNullString(&body.Difficulty),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update problem: %w", err)
	}

	// Update pattern links
	if err := s.repo.DeleteProblemPatterns(ctx, problemID); err != nil {
		return nil, fmt.Errorf("failed to delete old patterns: %w", err)
	}

	if len(body.PatternIDs) > 0 {
		if err := s.LinkProblemToPatterns(ctx, problemID, body.PatternIDs); err != nil {
			return nil, fmt.Errorf("failed to link patterns: %w", err)
		}
	}

	// Fetch patterns for the updated problem
	patterns, err := s.repo.GetPatternsForProblem(ctx, problemID)
	if err != nil {
		patterns = []repo.Pattern{} // empty if error
	}

	return &ProblemWithStats{
		ID:         problem.ID,
		Title:      problem.Title,
		Source:     nullStringToPtr(problem.Source),
		URL:        nullStringToPtr(problem.Url),
		Difficulty: nullStringToStr(problem.Difficulty, "medium"),
		CreatedAt:  problem.CreatedAt.String,
		Patterns:   convertPatternsFromRepo(patterns),
	}, nil
}

func (s *problemService) DeleteProblem(ctx context.Context, problemID int64) error {
	return s.repo.DeleteProblem(ctx, problemID)
}

func (s *problemService) ListProblemsForUser(ctx context.Context, userID int64) ([]ProblemWithStats, error) {
	rows, err := s.repo.GetProblemsForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list problems: %w", err)
	}

	problems := make([]ProblemWithStats, 0, len(rows))
	for _, row := range rows {
		// Fetch patterns for each problem
		patterns, err := s.repo.GetPatternsForProblem(ctx, row.ID)
		if err != nil {
			patterns = []repo.Pattern{}
		}

		problem := ProblemWithStats{
			ID:         row.ID,
			Title:      row.Title,
			Source:     nullStringToPtr(row.Source),
			URL:        nullStringToPtr(row.Url),
			Difficulty: nullStringToStr(row.Difficulty, "medium"),
			CreatedAt:  row.CreatedAt.String,
			Patterns:   convertPatternsFromRepo(patterns),
		}

		// Add stats if they exist
		if row.Status.Valid {
			problem.Stats = &Stats{
				UserID:        userID,
				ProblemID:     row.ID,
				Status:        row.Status.String,
				Confidence:    row.Confidence.Int64,
				AvgConfidence: row.AvgConfidence.Int64,
				LastAttemptAt: nullStringToPtr(row.LastAttemptAt),
				TotalAttempts: row.TotalAttempts.Int64,
				LastOutcome:   nullStringToPtr(row.LastOutcome),
				UpdatedAt:     row.UpdatedAt.String,
			}
		}

		problems = append(problems, problem)
	}

	return problems, nil
}

func (s *problemService) GetUrgentProblems(ctx context.Context, userID int64, limit int64) ([]UrgentProblem, error) {
	// Get all scored problems using the scoring service
	scores, err := s.scoringService.ComputeScoresForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to compute scores: %w", err)
	}

	// Sort by score descending (higher score = more urgent)
	for i := 0; i < len(scores)-1; i++ {
		for j := 0; j < len(scores)-i-1; j++ {
			if scores[j].Score < scores[j+1].Score {
				scores[j], scores[j+1] = scores[j+1], scores[j]
			}
		}
	}

	// Take top N and build response
	problems := make([]UrgentProblem, 0, limit)
	for i := 0; i < len(scores) && i < int(limit); i++ {
		score := scores[i]

		// Get problem details
		problem, err := s.repo.GetProblem(ctx, score.ProblemID)
		if err != nil {
			continue
		}

		// Get user problem stats
		stats, err := s.repo.GetUserProblemStats(ctx, repo.GetUserProblemStatsParams{
			UserID:    userID,
			ProblemID: score.ProblemID,
		})
		if err != nil {
			continue
		}

		// Calculate days since last attempt
		var daysSinceLast *int
		if stats.LastAttemptAt.Valid {
			lastAttempt, err := time.Parse(time.RFC3339, stats.LastAttemptAt.String)
			if err == nil {
				days := int(time.Since(lastAttempt).Hours() / 24)
				daysSinceLast = &days
			}
		}

		problems = append(problems, UrgentProblem{
			ID:            problem.ID,
			Title:         problem.Title,
			Difficulty:    nullStringToStr(problem.Difficulty, "medium"),
			Source:        nullStringToPtr(problem.Source),
			Score:         score.Score,
			DaysSinceLast: daysSinceLast,
			Confidence:    stats.Confidence.Int64,
			Reason:        score.Reason,
			CreatedAt:     problem.CreatedAt.String,
		})
	}

	return problems, nil
}

func (s *problemService) LinkProblemToPatterns(ctx context.Context, problemID int64, patternIDs []int64) error {
	for _, patternID := range patternIDs {
		if err := s.repo.LinkProblemToPattern(ctx, repo.LinkProblemToPatternParams{
			ProblemID: problemID,
			PatternID: patternID,
		}); err != nil {
			return fmt.Errorf("failed to link pattern %d: %w", patternID, err)
		}
	}
	return nil
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

func nullStringToStr(ns sql.NullString, defaultVal string) string {
	if !ns.Valid {
		return defaultVal
	}
	return ns.String
}

func strPtr(s string) *string {
	return &s
}

func convertPatternsFromRepo(rows []repo.Pattern) []Pattern {
	patterns := make([]Pattern, 0, len(rows))
	for _, row := range rows {
		patterns = append(patterns, Pattern{
			ID:          row.ID,
			Title:       row.Title,
			Description: nullStringToPtr(row.Description),
		})
	}
	return patterns
}
