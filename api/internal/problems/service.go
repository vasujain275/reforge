package problems

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	repo "github.com/vasujain275/reforge/internal/adapters/postgres/sqlc"
	"github.com/vasujain275/reforge/internal/scoring"
)

type Service interface {
	CreateProblem(ctx context.Context, userID uuid.UUID, body CreateProblemBody) (*ProblemWithStats, error)
	GetProblem(ctx context.Context, problemID uuid.UUID) (*ProblemWithStats, error)
	UpdateProblem(ctx context.Context, problemID uuid.UUID, body UpdateProblemBody) (*ProblemWithStats, error)
	DeleteProblem(ctx context.Context, problemID uuid.UUID) error
	ListProblemsForUser(ctx context.Context, userID uuid.UUID) ([]ProblemWithStats, error)
	SearchProblemsForUser(ctx context.Context, userID uuid.UUID, params SearchProblemsParams) (*PaginatedProblems, error)
	GetUrgentProblems(ctx context.Context, userID uuid.UUID, limit int32) ([]UrgentProblem, error)
	LinkProblemToPatterns(ctx context.Context, problemID uuid.UUID, patternIDs []uuid.UUID) error
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

func (s *problemService) CreateProblem(ctx context.Context, userID uuid.UUID, body CreateProblemBody) (*ProblemWithStats, error) {
	// Create the problem
	problem, err := s.repo.CreateProblem(ctx, repo.CreateProblemParams{
		Title:      body.Title,
		Source:     pgtypeText(body.Source),
		Url:        pgtypeText(body.URL),
		Difficulty: pgtypeText(&body.Difficulty),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create problem: %w", err)
	}

	// Link patterns if provided
	if len(body.PatternIDs) > 0 {
		patternUUIDs, err := parseUUIDs(body.PatternIDs)
		if err != nil {
			return nil, fmt.Errorf("invalid pattern ID: %w", err)
		}
		if err := s.LinkProblemToPatterns(ctx, problem.ID, patternUUIDs); err != nil {
			return nil, fmt.Errorf("failed to link patterns: %w", err)
		}
	}

	// Initialize user stats for this problem
	_, err = s.repo.UpsertUserProblemStats(ctx, repo.UpsertUserProblemStatsParams{
		UserID:            userID,
		ProblemID:         problem.ID,
		Status:            pgtypeText(strPtr("unsolved")),
		Confidence:        pgtype.Int4{Int32: 50, Valid: true},
		AvgConfidence:     pgtype.Int4{Int32: 50, Valid: true},
		LastAttemptAt:     pgtype.Timestamptz{},
		TotalAttempts:     pgtype.Int4{Int32: 0, Valid: true},
		AvgTimeSeconds:    pgtype.Int4{},
		LastOutcome:       pgtype.Text{},
		RecentHistoryJson: pgtype.Text{String: "[]", Valid: true},
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
		ID:         problem.ID.String(),
		Title:      problem.Title,
		Source:     pgtypeTextToPtr(problem.Source),
		URL:        pgtypeTextToPtr(problem.Url),
		Difficulty: pgtypeTextToStr(problem.Difficulty, "medium"),
		CreatedAt:  problem.CreatedAt.Time.Format(time.RFC3339),
		Stats: &Stats{
			UserID:        userID.String(),
			ProblemID:     problem.ID.String(),
			Status:        "unsolved",
			Confidence:    50,
			AvgConfidence: 50,
			TotalAttempts: 0,
		},
		Patterns: convertPatternsFromRepo(patterns),
	}, nil
}

func (s *problemService) GetProblem(ctx context.Context, problemID uuid.UUID) (*ProblemWithStats, error) {
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
		ID:         problem.ID.String(),
		Title:      problem.Title,
		Source:     pgtypeTextToPtr(problem.Source),
		URL:        pgtypeTextToPtr(problem.Url),
		Difficulty: pgtypeTextToStr(problem.Difficulty, "medium"),
		CreatedAt:  problem.CreatedAt.Time.Format(time.RFC3339),
		Patterns:   convertPatternsFromRepo(patterns),
	}, nil
}

func (s *problemService) UpdateProblem(ctx context.Context, problemID uuid.UUID, body UpdateProblemBody) (*ProblemWithStats, error) {
	problem, err := s.repo.UpdateProblem(ctx, repo.UpdateProblemParams{
		ID:         problemID,
		Title:      body.Title,
		Source:     pgtypeText(body.Source),
		Url:        pgtypeText(body.URL),
		Difficulty: pgtypeText(&body.Difficulty),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update problem: %w", err)
	}

	// Update pattern links
	if err := s.repo.DeleteProblemPatterns(ctx, problemID); err != nil {
		return nil, fmt.Errorf("failed to delete old patterns: %w", err)
	}

	if len(body.PatternIDs) > 0 {
		patternUUIDs, err := parseUUIDs(body.PatternIDs)
		if err != nil {
			return nil, fmt.Errorf("invalid pattern ID: %w", err)
		}
		if err := s.LinkProblemToPatterns(ctx, problemID, patternUUIDs); err != nil {
			return nil, fmt.Errorf("failed to link patterns: %w", err)
		}
	}

	// Fetch patterns for the updated problem
	patterns, err := s.repo.GetPatternsForProblem(ctx, problemID)
	if err != nil {
		patterns = []repo.Pattern{} // empty if error
	}

	return &ProblemWithStats{
		ID:         problem.ID.String(),
		Title:      problem.Title,
		Source:     pgtypeTextToPtr(problem.Source),
		URL:        pgtypeTextToPtr(problem.Url),
		Difficulty: pgtypeTextToStr(problem.Difficulty, "medium"),
		CreatedAt:  problem.CreatedAt.Time.Format(time.RFC3339),
		Patterns:   convertPatternsFromRepo(patterns),
	}, nil
}

func (s *problemService) DeleteProblem(ctx context.Context, problemID uuid.UUID) error {
	return s.repo.DeleteProblem(ctx, problemID)
}

func (s *problemService) ListProblemsForUser(ctx context.Context, userID uuid.UUID) ([]ProblemWithStats, error) {
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
			ID:         row.ID.String(),
			Title:      row.Title,
			Source:     pgtypeTextToPtr(row.Source),
			URL:        pgtypeTextToPtr(row.Url),
			Difficulty: pgtypeTextToStr(row.Difficulty, "medium"),
			CreatedAt:  row.CreatedAt.Time.Format(time.RFC3339),
			Patterns:   convertPatternsFromRepo(patterns),
		}

		// Add stats if they exist
		if row.Status.Valid {
			problem.Stats = &Stats{
				UserID:        userID.String(),
				ProblemID:     row.ID.String(),
				Status:        row.Status.String,
				Confidence:    row.Confidence.Int32,
				AvgConfidence: row.AvgConfidence.Int32,
				LastAttemptAt: pgtypeTimestamptzToPtr(row.LastAttemptAt),
				TotalAttempts: row.TotalAttempts.Int32,
				LastOutcome:   pgtypeTextToPtr(row.LastOutcome),
				UpdatedAt:     row.UpdatedAt.Time.Format(time.RFC3339),
			}
		}

		problems = append(problems, problem)
	}

	return problems, nil
}

func (s *problemService) SearchProblemsForUser(ctx context.Context, userID uuid.UUID, params SearchProblemsParams) (*PaginatedProblems, error) {
	// Get total count
	countRow, err := s.repo.CountProblemsForUser(ctx, repo.CountProblemsForUserParams{
		UserID:      userID,
		SearchQuery: params.Query,
		Difficulty:  params.Difficulty,
		Status:      params.Status,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to count problems: %w", err)
	}

	// Get paginated results
	rows, err := s.repo.SearchProblemsForUser(ctx, repo.SearchProblemsForUserParams{
		UserID:      userID,
		SearchQuery: params.Query,
		Difficulty:  params.Difficulty,
		Status:      params.Status,
		LimitVal:    params.Limit,
		OffsetVal:   params.Offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to search problems: %w", err)
	}

	problems := make([]ProblemWithStats, 0, len(rows))
	for _, row := range rows {
		// Fetch patterns for each problem
		patterns, err := s.repo.GetPatternsForProblem(ctx, row.ID)
		if err != nil {
			patterns = []repo.Pattern{}
		}

		problem := ProblemWithStats{
			ID:         row.ID.String(),
			Title:      row.Title,
			Source:     pgtypeTextToPtr(row.Source),
			URL:        pgtypeTextToPtr(row.Url),
			Difficulty: pgtypeTextToStr(row.Difficulty, "medium"),
			CreatedAt:  row.CreatedAt.Time.Format(time.RFC3339),
			Patterns:   convertPatternsFromRepo(patterns),
		}

		// Add stats if they exist
		if row.Status.Valid {
			problem.Stats = &Stats{
				UserID:        userID.String(),
				ProblemID:     row.ID.String(),
				Status:        row.Status.String,
				Confidence:    row.Confidence.Int32,
				AvgConfidence: row.AvgConfidence.Int32,
				LastAttemptAt: pgtypeTimestamptzToPtr(row.LastAttemptAt),
				TotalAttempts: row.TotalAttempts.Int32,
				LastOutcome:   pgtypeTextToPtr(row.LastOutcome),
				UpdatedAt:     row.UpdatedAt.Time.Format(time.RFC3339),
			}
		}

		problems = append(problems, problem)
	}

	// Calculate pagination info
	page := params.Offset/params.Limit + 1
	if params.Offset == 0 {
		page = 1
	}
	totalPages := (int32(countRow) + params.Limit - 1) / params.Limit

	return &PaginatedProblems{
		Data:       problems,
		Total:      countRow,
		Page:       page,
		PageSize:   params.Limit,
		TotalPages: totalPages,
	}, nil
}

func (s *problemService) GetUrgentProblems(ctx context.Context, userID uuid.UUID, limit int32) ([]UrgentProblem, error) {
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
			days := int(time.Since(stats.LastAttemptAt.Time).Hours() / 24)
			daysSinceLast = &days
		}

		problems = append(problems, UrgentProblem{
			ID:            problem.ID.String(),
			Title:         problem.Title,
			Difficulty:    pgtypeTextToStr(problem.Difficulty, "medium"),
			Source:        pgtypeTextToPtr(problem.Source),
			Score:         score.Score,
			DaysSinceLast: daysSinceLast,
			Confidence:    stats.Confidence.Int32,
			Reason:        score.Reason,
			CreatedAt:     problem.CreatedAt.Time.Format(time.RFC3339),
		})
	}

	return problems, nil
}

func (s *problemService) LinkProblemToPatterns(ctx context.Context, problemID uuid.UUID, patternIDs []uuid.UUID) error {
	for _, patternID := range patternIDs {
		if err := s.repo.LinkProblemToPattern(ctx, repo.LinkProblemToPatternParams{
			ProblemID: problemID,
			PatternID: patternID,
		}); err != nil {
			return fmt.Errorf("failed to link pattern %s: %w", patternID.String(), err)
		}
	}
	return nil
}

// Helper functions
func pgtypeText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func pgtypeTextToPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func pgtypeTextToStr(t pgtype.Text, defaultVal string) string {
	if !t.Valid {
		return defaultVal
	}
	return t.String
}

func pgtypeTimestamptzToPtr(t pgtype.Timestamptz) *string {
	if !t.Valid {
		return nil
	}
	s := t.Time.Format(time.RFC3339)
	return &s
}

func strPtr(s string) *string {
	return &s
}

func parseUUIDs(strs []string) ([]uuid.UUID, error) {
	uuids := make([]uuid.UUID, 0, len(strs))
	for _, s := range strs {
		u, err := uuid.Parse(s)
		if err != nil {
			return nil, fmt.Errorf("invalid UUID %q: %w", s, err)
		}
		uuids = append(uuids, u)
	}
	return uuids, nil
}

func convertPatternsFromRepo(rows []repo.Pattern) []Pattern {
	patterns := make([]Pattern, 0, len(rows))
	for _, row := range rows {
		patterns = append(patterns, Pattern{
			ID:          row.ID.String(),
			Title:       row.Title,
			Description: pgtypeTextToPtr(row.Description),
		})
	}
	return patterns
}
