package attempts

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/scoring"
)

type Service interface {
	CreateAttempt(ctx context.Context, userID int64, body CreateAttemptBody) (*AttemptResponse, error)
	ListAttemptsForUser(ctx context.Context, userID int64, limit, offset int64) ([]AttemptResponse, error)
	ListAttemptsForProblem(ctx context.Context, userID int64, problemID int64) ([]AttemptResponse, error)

	// Timer-based attempt methods
	StartAttempt(ctx context.Context, userID int64, body StartAttemptBody) (*InProgressAttemptResponse, error)
	GetInProgressAttempt(ctx context.Context, userID int64, problemID int64) (*InProgressAttemptResponse, error)
	GetAttemptByID(ctx context.Context, userID int64, attemptID int64) (*InProgressAttemptResponse, error)
	UpdateAttemptTimer(ctx context.Context, userID int64, attemptID int64, body UpdateAttemptTimerBody) error
	CompleteAttempt(ctx context.Context, userID int64, attemptID int64, body CompleteAttemptBody) (*AttemptResponse, error)
	AbandonAttempt(ctx context.Context, userID int64, attemptID int64) error
}

type attemptService struct {
	repo           repo.Querier
	scoringService scoring.Service
}

func NewService(repo repo.Querier, scoringService scoring.Service) Service {
	return &attemptService{
		repo:           repo,
		scoringService: scoringService,
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

	// Get existing stats for spaced repetition data
	existingStats, err := s.repo.GetUserProblemStats(ctx, repo.GetUserProblemStatsParams{
		UserID:    userID,
		ProblemID: problemID,
	})

	// Default spaced repetition values for new problems
	var currentInterval int
	var easeFactor float64
	var reviewCount int

	if err == nil {
		// Use existing values
		currentInterval = int(existingStats.IntervalDays.Int64)
		easeFactor = existingStats.EaseFactor.Float64
		reviewCount = int(existingStats.ReviewCount.Int64)
	} else {
		// New problem defaults
		currentInterval = 0
		easeFactor = 2.5 // SM-2 default
		reviewCount = 0
	}

	// Calculate next review using SM-2 algorithm
	newInterval, newEaseFactor, nextReviewDate := s.scoringService.CalculateNextReview(
		lastOutcome,
		int(latestConfidence),
		currentInterval,
		easeFactor,
		reviewCount,
	)

	nextReviewStr := nextReviewDate.Format(time.RFC3339)

	// Upsert stats with spaced repetition data
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
		NextReviewAt:      sqlNullString(&nextReviewStr),
		IntervalDays:      sqlNullInt64(int64Ptr(int64(newInterval))),
		EaseFactor:        sql.NullFloat64{Float64: newEaseFactor, Valid: true},
		ReviewCount:       sqlNullInt64(int64Ptr(int64(reviewCount + 1))),
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

// ============================================================================
// ATTEMPT TIMER SERVICE METHODS (for stopwatch functionality)
// ============================================================================

// StartAttempt creates a new in-progress attempt with timer
func (s *attemptService) StartAttempt(ctx context.Context, userID int64, body StartAttemptBody) (*InProgressAttemptResponse, error) {
	attempt, err := s.repo.CreateInProgressAttempt(ctx, repo.CreateInProgressAttemptParams{
		UserID:    userID,
		ProblemID: body.ProblemID,
		SessionID: sqlNullInt64(body.SessionID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create in-progress attempt: %w", err)
	}

	// Get problem details for the response
	problem, err := s.repo.GetProblem(ctx, body.ProblemID)
	if err != nil {
		// Return attempt without problem details if problem fetch fails
		return &InProgressAttemptResponse{
			ID:                 attempt.ID,
			UserID:             attempt.UserID,
			ProblemID:          attempt.ProblemID,
			SessionID:          nullInt64ToPtr(attempt.SessionID),
			Status:             nullStringToStr(attempt.Status, "in_progress"),
			ElapsedTimeSeconds: nullInt64ToInt64(attempt.ElapsedTimeSeconds, 0),
			TimerState:         nullStringToStr(attempt.TimerState, "idle"),
			TimerLastUpdatedAt: nullStringToPtr(attempt.TimerLastUpdatedAt),
			StartedAt:          nullStringToStr(attempt.StartedAt, ""),
		}, nil
	}

	return &InProgressAttemptResponse{
		ID:                 attempt.ID,
		UserID:             attempt.UserID,
		ProblemID:          attempt.ProblemID,
		SessionID:          nullInt64ToPtr(attempt.SessionID),
		Status:             nullStringToStr(attempt.Status, "in_progress"),
		ElapsedTimeSeconds: nullInt64ToInt64(attempt.ElapsedTimeSeconds, 0),
		TimerState:         nullStringToStr(attempt.TimerState, "idle"),
		TimerLastUpdatedAt: nullStringToPtr(attempt.TimerLastUpdatedAt),
		StartedAt:          nullStringToStr(attempt.StartedAt, ""),
		ProblemTitle:       &problem.Title,
		ProblemDifficulty:  nullStringToPtr(problem.Difficulty),
	}, nil
}

// GetInProgressAttempt retrieves an existing in-progress attempt for a problem
func (s *attemptService) GetInProgressAttempt(ctx context.Context, userID int64, problemID int64) (*InProgressAttemptResponse, error) {
	row, err := s.repo.GetInProgressAttemptForProblem(ctx, repo.GetInProgressAttemptForProblemParams{
		UserID:    userID,
		ProblemID: problemID,
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No in-progress attempt found
		}
		return nil, fmt.Errorf("failed to get in-progress attempt: %w", err)
	}

	return &InProgressAttemptResponse{
		ID:                 row.ID,
		UserID:             row.UserID,
		ProblemID:          row.ProblemID,
		SessionID:          nullInt64ToPtr(row.SessionID),
		Status:             nullStringToStr(row.Status, "in_progress"),
		ElapsedTimeSeconds: nullInt64ToInt64(row.ElapsedTimeSeconds, 0),
		TimerState:         nullStringToStr(row.TimerState, "idle"),
		TimerLastUpdatedAt: nullStringToPtr(row.TimerLastUpdatedAt),
		StartedAt:          nullStringToStr(row.StartedAt, ""),
		ProblemTitle:       &row.ProblemTitle,
		ProblemDifficulty:  nullStringToPtr(row.ProblemDifficulty),
	}, nil
}

// GetAttemptByID retrieves an attempt by its ID
func (s *attemptService) GetAttemptByID(ctx context.Context, userID int64, attemptID int64) (*InProgressAttemptResponse, error) {
	row, err := s.repo.GetAttemptById(ctx, repo.GetAttemptByIdParams{
		ID:     attemptID,
		UserID: userID,
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("attempt not found")
		}
		return nil, fmt.Errorf("failed to get attempt: %w", err)
	}

	return &InProgressAttemptResponse{
		ID:                 row.ID,
		UserID:             row.UserID,
		ProblemID:          row.ProblemID,
		SessionID:          nullInt64ToPtr(row.SessionID),
		Status:             nullStringToStr(row.Status, "in_progress"),
		ElapsedTimeSeconds: nullInt64ToInt64(row.ElapsedTimeSeconds, 0),
		TimerState:         nullStringToStr(row.TimerState, "idle"),
		TimerLastUpdatedAt: nullStringToPtr(row.TimerLastUpdatedAt),
		StartedAt:          nullStringToStr(row.StartedAt, ""),
		ProblemTitle:       &row.ProblemTitle,
		ProblemDifficulty:  nullStringToPtr(row.ProblemDifficulty),
	}, nil
}

// UpdateAttemptTimer updates the timer state for an in-progress attempt
func (s *attemptService) UpdateAttemptTimer(ctx context.Context, userID int64, attemptID int64, body UpdateAttemptTimerBody) error {
	now := sql.NullString{String: currentTimestamp(), Valid: true}

	err := s.repo.UpdateAttemptTimer(ctx, repo.UpdateAttemptTimerParams{
		ElapsedTimeSeconds: sql.NullInt64{Int64: body.ElapsedTimeSeconds, Valid: true},
		TimerState:         sql.NullString{String: body.TimerState, Valid: true},
		TimerLastUpdatedAt: now,
		ID:                 attemptID,
		UserID:             userID,
	})
	if err != nil {
		return fmt.Errorf("failed to update attempt timer: %w", err)
	}

	return nil
}

// CompleteAttempt completes an in-progress attempt with final data
func (s *attemptService) CompleteAttempt(ctx context.Context, userID int64, attemptID int64, body CompleteAttemptBody) (*AttemptResponse, error) {
	// First get the attempt to get the elapsed time for duration
	existingAttempt, err := s.repo.GetAttempt(ctx, repo.GetAttemptParams{
		ID:     attemptID,
		UserID: userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get attempt: %w", err)
	}

	// Use provided duration_seconds if set, otherwise use elapsed time from timer
	var durationSeconds int64
	if body.DurationSeconds != nil {
		durationSeconds = *body.DurationSeconds
	} else {
		durationSeconds = nullInt64ToInt64(existingAttempt.ElapsedTimeSeconds, 0)
	}

	attempt, err := s.repo.CompleteAttempt(ctx, repo.CompleteAttemptParams{
		ConfidenceScore: sql.NullInt64{Int64: body.ConfidenceScore, Valid: true},
		DurationSeconds: sql.NullInt64{Int64: durationSeconds, Valid: true},
		Outcome:         sql.NullString{String: body.Outcome, Valid: true},
		Notes:           sqlNullString(body.Notes),
		ID:              attemptID,
		UserID:          userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to complete attempt: %w", err)
	}

	// Update user problem stats
	if err := s.updateUserProblemStats(ctx, userID, attempt.ProblemID); err != nil {
		fmt.Printf("Warning: failed to update user problem stats: %v\n", err)
	}

	// Update user pattern stats
	if err := s.updateUserPatternStats(ctx, userID, attempt.ProblemID); err != nil {
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
		PerformedAt:     nullStringToStr(attempt.PerformedAt, ""),
	}, nil
}

// AbandonAttempt marks an in-progress attempt as abandoned
func (s *attemptService) AbandonAttempt(ctx context.Context, userID int64, attemptID int64) error {
	err := s.repo.AbandonAttempt(ctx, repo.AbandonAttemptParams{
		ID:     attemptID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("failed to abandon attempt: %w", err)
	}

	return nil
}

// currentTimestamp returns the current time in RFC3339 format
func currentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}
