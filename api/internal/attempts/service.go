package attempts

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
)

type Service interface {
	CreateAttempt(ctx context.Context, userID int64, body CreateAttemptBody) (*AttemptResponse, error)
	ListAttemptsForUser(ctx context.Context, userID int64, limit, offset int64) ([]AttemptResponse, error)
	ListAttemptsForProblem(ctx context.Context, userID int64, problemID int64) ([]AttemptResponse, error)
}

type attemptService struct {
	repo repo.Querier
}

func NewService(repo repo.Querier) Service {
	return &attemptService{
		repo: repo,
	}
}

func (s *attemptService) CreateAttempt(ctx context.Context, userID int64, body CreateAttemptBody) (*AttemptResponse, error) {
	// Create the attempt - Column8 is the performed_at timestamp
	var performedAtVal interface{}
	if body.PerformedAt != nil {
		performedAtVal = *body.PerformedAt
	}

	attempt, err := s.repo.CreateAttempt(ctx, repo.CreateAttemptParams{
		UserID:          userID,
		ProblemID:       body.ProblemID,
		SessionID:       sqlNullInt64(body.SessionID),
		ConfidenceScore: sqlNullInt64(&body.ConfidenceScore),
		DurationSeconds: sqlNullInt64(body.DurationSeconds),
		Outcome:         sqlNullString(&body.Outcome),
		Notes:           sqlNullString(body.Notes),
		Column8:         performedAtVal,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create attempt: %w", err)
	}

	// Update user problem stats
	if err := s.updateUserProblemStats(ctx, userID, body.ProblemID); err != nil {
		// Log error but don't fail the request
		fmt.Printf("Warning: failed to update user problem stats: %v\n", err)
	}

	// Update user pattern stats
	if err := s.updateUserPatternStats(ctx, userID, body.ProblemID); err != nil {
		// Log error but don't fail the request
		fmt.Printf("Warning: failed to update user pattern stats: %v\n", err)
	}

	return &AttemptResponse{
		ID:              attempt.ID,
		UserID:          attempt.UserID,
		ProblemID:       attempt.ProblemID,
		SessionID:       nullInt64ToPtr(attempt.SessionID),
		ConfidenceScore: nullInt64ToInt64(attempt.ConfidenceScore, 0),
		DurationSeconds: nullInt64ToPtr(attempt.DurationSeconds),
		Outcome:         nullStringToStr(attempt.Outcome, ""),
		Notes:           nullStringToPtr(attempt.Notes),
		PerformedAt:     attempt.PerformedAt.String,
	}, nil
}

func (s *attemptService) ListAttemptsForUser(ctx context.Context, userID int64, limit, offset int64) ([]AttemptResponse, error) {
	rows, err := s.repo.ListAttemptsForUser(ctx, repo.ListAttemptsForUserParams{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list attempts: %w", err)
	}

	attempts := make([]AttemptResponse, 0, len(rows))
	for _, row := range rows {
		attempts = append(attempts, AttemptResponse{
			ID:                row.ID,
			UserID:            row.UserID,
			ProblemID:         row.ProblemID,
			SessionID:         nullInt64ToPtr(row.SessionID),
			ConfidenceScore:   nullInt64ToInt64(row.ConfidenceScore, 0),
			DurationSeconds:   nullInt64ToPtr(row.DurationSeconds),
			Outcome:           nullStringToStr(row.Outcome, ""),
			Notes:             nullStringToPtr(row.Notes),
			PerformedAt:       row.PerformedAt.String,
			ProblemTitle:      &row.ProblemTitle,
			ProblemDifficulty: nullStringToPtr(row.ProblemDifficulty),
		})
	}

	return attempts, nil
}

func (s *attemptService) ListAttemptsForProblem(ctx context.Context, userID int64, problemID int64) ([]AttemptResponse, error) {
	rows, err := s.repo.ListAttemptsForProblem(ctx, repo.ListAttemptsForProblemParams{
		UserID:    userID,
		ProblemID: problemID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list attempts for problem: %w", err)
	}

	attempts := make([]AttemptResponse, 0, len(rows))
	for _, row := range rows {
		attempts = append(attempts, AttemptResponse{
			ID:              row.ID,
			UserID:          row.UserID,
			ProblemID:       row.ProblemID,
			SessionID:       nullInt64ToPtr(row.SessionID),
			ConfidenceScore: nullInt64ToInt64(row.ConfidenceScore, 0),
			DurationSeconds: nullInt64ToPtr(row.DurationSeconds),
			Outcome:         nullStringToStr(row.Outcome, ""),
			Notes:           nullStringToPtr(row.Notes),
			PerformedAt:     row.PerformedAt.String,
		})
	}

	return attempts, nil
}

// updateUserProblemStats aggregates data from all attempts and updates stats
func (s *attemptService) updateUserProblemStats(ctx context.Context, userID int64, problemID int64) error {
	// Get all attempts for this problem
	attempts, err := s.repo.ListAttemptsForProblem(ctx, repo.ListAttemptsForProblemParams{
		UserID:    userID,
		ProblemID: problemID,
	})
	if err != nil {
		return err
	}

	if len(attempts) == 0 {
		return nil
	}

	// Calculate aggregates
	var totalConfidence, totalDuration, passedCount int64
	var lastOutcome string
	lastAttemptAt := attempts[0].PerformedAt.String

	for _, attempt := range attempts {
		if attempt.ConfidenceScore.Valid {
			totalConfidence += attempt.ConfidenceScore.Int64
		}
		if attempt.DurationSeconds.Valid {
			totalDuration += attempt.DurationSeconds.Int64
		}
		if attempt.Outcome.Valid && attempt.Outcome.String == "passed" {
			passedCount++
		}
	}

	avgConfidence := totalConfidence / int64(len(attempts))
	latestConfidence := attempts[0].ConfidenceScore.Int64
	if attempts[0].Outcome.Valid {
		lastOutcome = attempts[0].Outcome.String
	}

	var avgTimeSeconds *int64
	if totalDuration > 0 {
		avg := totalDuration / int64(len(attempts))
		avgTimeSeconds = &avg
	}

	// Determine status
	status := "unsolved"
	if passedCount > 0 {
		status = "solved"
	}

	// Build recent history (last 5 attempts)
	recentHistory := make([]map[string]interface{}, 0)
	for i := 0; i < min(5, len(attempts)); i++ {
		recentHistory = append(recentHistory, map[string]interface{}{
			"performed_at": attempts[i].PerformedAt.String,
			"outcome":      nullStringToStr(attempts[i].Outcome, ""),
			"confidence":   nullInt64ToInt64(attempts[i].ConfidenceScore, 0),
		})
	}
	recentHistoryJSON, _ := json.Marshal(recentHistory)

	// Upsert stats
	_, err = s.repo.UpsertUserProblemStats(ctx, repo.UpsertUserProblemStatsParams{
		UserID:            userID,
		ProblemID:         problemID,
		Status:            sqlNullString(&status),
		Confidence:        sqlNullInt64(&latestConfidence),
		AvgConfidence:     sqlNullInt64(&avgConfidence),
		LastAttemptAt:     sqlNullString(&lastAttemptAt),
		TotalAttempts:     sqlNullInt64(int64Ptr(int64(len(attempts)))),
		AvgTimeSeconds:    sqlNullInt64(avgTimeSeconds),
		LastOutcome:       sqlNullString(&lastOutcome),
		RecentHistoryJson: sqlNullString(strPtr(string(recentHistoryJSON))),
	})

	return err
}

// updateUserPatternStats updates pattern-level statistics for all patterns linked to the problem
func (s *attemptService) updateUserPatternStats(ctx context.Context, userID int64, problemID int64) error {
	// Get all patterns linked to this problem
	patterns, err := s.repo.GetPatternsForProblem(ctx, problemID)
	if err != nil {
		return fmt.Errorf("failed to get patterns: %w", err)
	}

	// For each pattern, get all problems with that pattern and calculate stats
	for _, pattern := range patterns {
		// Get all problems with this pattern
		problems, err := s.repo.GetProblemsForPattern(ctx, pattern.ID)
		if err != nil {
			continue
		}

		// Calculate aggregated stats across all problems in this pattern
		var totalConfidence int64
		var totalRevisions int64
		problemCount := int64(0)

		for _, problem := range problems {
			// Get user problem stats for this problem
			stats, err := s.repo.GetUserProblemStats(ctx, repo.GetUserProblemStatsParams{
				UserID:    userID,
				ProblemID: problem.ID,
			})
			if err != nil {
				continue
			}

			if stats.AvgConfidence.Valid {
				totalConfidence += stats.AvgConfidence.Int64
				problemCount++
			}

			if stats.TotalAttempts.Valid {
				totalRevisions += stats.TotalAttempts.Int64
			}
		}

		// Calculate averages
		var avgConfidence int64
		if problemCount > 0 {
			avgConfidence = totalConfidence / problemCount
		}

		// Upsert pattern stats
		_, err = s.repo.UpsertUserPatternStats(ctx, repo.UpsertUserPatternStatsParams{
			UserID:        userID,
			PatternID:     pattern.ID,
			AvgConfidence: sqlNullInt64(&avgConfidence),
			TimesRevised:  sqlNullInt64(&totalRevisions),
		})
		if err != nil {
			fmt.Printf("Warning: failed to update pattern stats for pattern %d: %v\n", pattern.ID, err)
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

func sqlNullInt64(i *int64) sql.NullInt64 {
	if i == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: *i, Valid: true}
}

func nullStringToStr(ns sql.NullString, defaultVal string) string {
	if !ns.Valid {
		return defaultVal
	}
	return ns.String
}

func nullStringToPtr(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	return &ns.String
}

func nullInt64ToPtr(ni sql.NullInt64) *int64 {
	if !ni.Valid {
		return nil
	}
	return &ni.Int64
}

func nullInt64ToInt64(ni sql.NullInt64, defaultVal int64) int64 {
	if !ni.Valid {
		return defaultVal
	}
	return ni.Int64
}

func strPtr(s string) *string {
	return &s
}

func int64Ptr(i int64) *int64 {
	return &i
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
