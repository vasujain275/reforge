package attempts

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	repo "github.com/vasujain275/reforge/internal/adapters/postgres/sqlc"
	"github.com/vasujain275/reforge/internal/scoring"
)

type Service interface {
	CreateAttempt(ctx context.Context, userID uuid.UUID, body CreateAttemptBody) (*AttemptResponse, error)
	ListAttemptsForUser(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]AttemptResponse, error)
	ListAttemptsForProblem(ctx context.Context, userID uuid.UUID, problemID uuid.UUID) ([]AttemptResponse, error)

	// Timer-based attempt methods
	StartAttempt(ctx context.Context, userID uuid.UUID, body StartAttemptBody) (*InProgressAttemptResponse, error)
	GetInProgressAttempt(ctx context.Context, userID uuid.UUID, problemID uuid.UUID) (*InProgressAttemptResponse, error)
	GetAttemptByID(ctx context.Context, userID uuid.UUID, attemptID uuid.UUID) (*InProgressAttemptResponse, error)
	UpdateAttemptTimer(ctx context.Context, userID uuid.UUID, attemptID uuid.UUID, body UpdateAttemptTimerBody) error
	CompleteAttempt(ctx context.Context, userID uuid.UUID, attemptID uuid.UUID, body CompleteAttemptBody) (*AttemptResponse, error)
	AbandonAttempt(ctx context.Context, userID uuid.UUID, attemptID uuid.UUID) error
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

func (s *attemptService) CreateAttempt(ctx context.Context, userID uuid.UUID, body CreateAttemptBody) (*AttemptResponse, error) {
	// Parse problem ID from string
	problemID, err := uuid.Parse(body.ProblemID)
	if err != nil {
		return nil, fmt.Errorf("invalid problem_id: %w", err)
	}

	// Parse optional session ID
	var sessionID pgtype.UUID
	if body.SessionID != nil {
		sid, err := uuid.Parse(*body.SessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session_id: %w", err)
		}
		sessionID = pgtype.UUID{Bytes: sid, Valid: true}
	}

	// Create the attempt - Column8 is the performed_at timestamp
	var performedAtVal interface{}
	if body.PerformedAt != nil {
		performedAtVal = *body.PerformedAt
	}

	attempt, err := s.repo.CreateAttempt(ctx, repo.CreateAttemptParams{
		UserID:          userID,
		ProblemID:       problemID,
		SessionID:       sessionID,
		ConfidenceScore: toPgInt4(&body.ConfidenceScore),
		DurationSeconds: toPgInt4FromPtr(body.DurationSeconds),
		Outcome:         toPgText(&body.Outcome),
		Notes:           toPgTextFromPtr(body.Notes),
		Column8:         performedAtVal,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create attempt: %w", err)
	}

	// Update user problem stats
	if err := s.updateUserProblemStats(ctx, userID, problemID); err != nil {
		// Log error but don't fail the request
		fmt.Printf("Warning: failed to update user problem stats: %v\n", err)
	}

	// Update user pattern stats
	if err := s.updateUserPatternStats(ctx, userID, problemID); err != nil {
		// Log error but don't fail the request
		fmt.Printf("Warning: failed to update user pattern stats: %v\n", err)
	}

	return &AttemptResponse{
		ID:              attempt.ID.String(),
		UserID:          attempt.UserID.String(),
		ProblemID:       attempt.ProblemID.String(),
		SessionID:       pgUUIDToPtr(attempt.SessionID),
		ConfidenceScore: pgInt4ToInt64(attempt.ConfidenceScore, 0),
		DurationSeconds: pgInt4ToPtr(attempt.DurationSeconds),
		Outcome:         pgTextToStr(attempt.Outcome, ""),
		Notes:           pgTextToPtr(attempt.Notes),
		PerformedAt:     pgTimestamptzToStr(attempt.PerformedAt, ""),
	}, nil
}

func (s *attemptService) ListAttemptsForUser(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]AttemptResponse, error) {
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
			ID:                row.ID.String(),
			UserID:            row.UserID.String(),
			ProblemID:         row.ProblemID.String(),
			SessionID:         pgUUIDToPtr(row.SessionID),
			ConfidenceScore:   pgInt4ToInt64(row.ConfidenceScore, 0),
			DurationSeconds:   pgInt4ToPtr(row.DurationSeconds),
			Outcome:           pgTextToStr(row.Outcome, ""),
			Notes:             pgTextToPtr(row.Notes),
			PerformedAt:       pgTimestamptzToStr(row.PerformedAt, ""),
			ProblemTitle:      &row.ProblemTitle,
			ProblemDifficulty: pgTextToPtr(row.ProblemDifficulty),
		})
	}

	return attempts, nil
}

func (s *attemptService) ListAttemptsForProblem(ctx context.Context, userID uuid.UUID, problemID uuid.UUID) ([]AttemptResponse, error) {
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
			ID:              row.ID.String(),
			UserID:          row.UserID.String(),
			ProblemID:       row.ProblemID.String(),
			SessionID:       pgUUIDToPtr(row.SessionID),
			ConfidenceScore: pgInt4ToInt64(row.ConfidenceScore, 0),
			DurationSeconds: pgInt4ToPtr(row.DurationSeconds),
			Outcome:         pgTextToStr(row.Outcome, ""),
			Notes:           pgTextToPtr(row.Notes),
			PerformedAt:     pgTimestamptzToStr(row.PerformedAt, ""),
		})
	}

	return attempts, nil
}

// updateUserProblemStats aggregates data from all attempts and updates stats
func (s *attemptService) updateUserProblemStats(ctx context.Context, userID uuid.UUID, problemID uuid.UUID) error {
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

	for _, attempt := range attempts {
		if attempt.ConfidenceScore.Valid {
			totalConfidence += int64(attempt.ConfidenceScore.Int32)
		}
		if attempt.DurationSeconds.Valid {
			totalDuration += int64(attempt.DurationSeconds.Int32)
		}
		if attempt.Outcome.Valid && attempt.Outcome.String == "passed" {
			passedCount++
		}
	}

	avgConfidence := totalConfidence / int64(len(attempts))
	latestConfidence := int64(attempts[0].ConfidenceScore.Int32)
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
			"performed_at": pgTimestamptzToStr(attempts[i].PerformedAt, ""),
			"outcome":      pgTextToStr(attempts[i].Outcome, ""),
			"confidence":   pgInt4ToInt64(attempts[i].ConfidenceScore, 0),
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
		currentInterval = int(existingStats.IntervalDays.Int32)
		easeFactor = float64(existingStats.EaseFactor.Float32)
		reviewCount = int(existingStats.ReviewCount.Int32)
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

	nextReviewTimestamp := pgtype.Timestamptz{Time: nextReviewDate, Valid: true}
	lastAttemptTimestamp := pgtype.Timestamptz{Time: time.Now(), Valid: true}
	if len(attempts) > 0 && attempts[0].PerformedAt.Valid {
		lastAttemptTimestamp = attempts[0].PerformedAt
	}

	// Upsert stats with spaced repetition data
	_, err = s.repo.UpsertUserProblemStats(ctx, repo.UpsertUserProblemStatsParams{
		UserID:            userID,
		ProblemID:         problemID,
		Status:            toPgText(&status),
		Confidence:        toPgInt4(&latestConfidence),
		AvgConfidence:     toPgInt4(&avgConfidence),
		LastAttemptAt:     lastAttemptTimestamp,
		TotalAttempts:     pgtype.Int4{Int32: int32(len(attempts)), Valid: true},
		AvgTimeSeconds:    toPgInt4FromPtr(avgTimeSeconds),
		LastOutcome:       toPgText(&lastOutcome),
		RecentHistoryJson: toPgText(strPtr(string(recentHistoryJSON))),
		NextReviewAt:      nextReviewTimestamp,
		IntervalDays:      pgtype.Int4{Int32: int32(newInterval), Valid: true},
		EaseFactor:        pgtype.Float4{Float32: float32(newEaseFactor), Valid: true},
		ReviewCount:       pgtype.Int4{Int32: int32(reviewCount + 1), Valid: true},
	})

	return err
}

// updateUserPatternStats updates pattern-level statistics for all patterns linked to the problem
func (s *attemptService) updateUserPatternStats(ctx context.Context, userID uuid.UUID, problemID uuid.UUID) error {
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
				totalConfidence += int64(stats.AvgConfidence.Int32)
				problemCount++
			}

			if stats.TotalAttempts.Valid {
				totalRevisions += int64(stats.TotalAttempts.Int32)
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
			AvgConfidence: toPgInt4(&avgConfidence),
			TimesRevised:  toPgInt4(&totalRevisions),
		})
		if err != nil {
			fmt.Printf("Warning: failed to update pattern stats for pattern %s: %v\n", pattern.ID.String(), err)
		}
	}

	return nil
}

// Helper functions for pgtype conversions
func toPgText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func toPgTextFromPtr(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func toPgInt4(i *int64) pgtype.Int4 {
	if i == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*i), Valid: true}
}

func toPgInt4FromPtr(i *int64) pgtype.Int4 {
	if i == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*i), Valid: true}
}

func pgTextToStr(t pgtype.Text, defaultVal string) string {
	if !t.Valid {
		return defaultVal
	}
	return t.String
}

func pgTextToPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func pgInt4ToPtr(i pgtype.Int4) *int64 {
	if !i.Valid {
		return nil
	}
	v := int64(i.Int32)
	return &v
}

func pgInt4ToInt64(i pgtype.Int4, defaultVal int64) int64 {
	if !i.Valid {
		return defaultVal
	}
	return int64(i.Int32)
}

func pgUUIDToPtr(u pgtype.UUID) *string {
	if !u.Valid {
		return nil
	}
	s := uuid.UUID(u.Bytes).String()
	return &s
}

func pgTimestamptzToStr(ts pgtype.Timestamptz, defaultVal string) string {
	if !ts.Valid {
		return defaultVal
	}
	return ts.Time.Format(time.RFC3339)
}

func pgTimestamptzToPtr(ts pgtype.Timestamptz) *string {
	if !ts.Valid {
		return nil
	}
	s := ts.Time.Format(time.RFC3339)
	return &s
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
func (s *attemptService) StartAttempt(ctx context.Context, userID uuid.UUID, body StartAttemptBody) (*InProgressAttemptResponse, error) {
	// Parse problem ID from string
	problemID, err := uuid.Parse(body.ProblemID)
	if err != nil {
		return nil, fmt.Errorf("invalid problem_id: %w", err)
	}

	// Parse optional session ID
	var sessionID pgtype.UUID
	if body.SessionID != nil {
		sid, err := uuid.Parse(*body.SessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session_id: %w", err)
		}
		sessionID = pgtype.UUID{Bytes: sid, Valid: true}
	}

	attempt, err := s.repo.CreateInProgressAttempt(ctx, repo.CreateInProgressAttemptParams{
		UserID:    userID,
		ProblemID: problemID,
		SessionID: sessionID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create in-progress attempt: %w", err)
	}

	// Get problem details for the response
	problem, err := s.repo.GetProblem(ctx, problemID)
	if err != nil {
		// Return attempt without problem details if problem fetch fails
		return &InProgressAttemptResponse{
			ID:                 attempt.ID.String(),
			UserID:             attempt.UserID.String(),
			ProblemID:          attempt.ProblemID.String(),
			SessionID:          pgUUIDToPtr(attempt.SessionID),
			Status:             pgTextToStr(attempt.Status, "in_progress"),
			ElapsedTimeSeconds: pgInt4ToInt64(attempt.ElapsedTimeSeconds, 0),
			TimerState:         pgTextToStr(attempt.TimerState, "idle"),
			TimerLastUpdatedAt: pgTimestamptzToPtr(attempt.TimerLastUpdatedAt),
			StartedAt:          pgTimestamptzToStr(attempt.StartedAt, ""),
		}, nil
	}

	return &InProgressAttemptResponse{
		ID:                 attempt.ID.String(),
		UserID:             attempt.UserID.String(),
		ProblemID:          attempt.ProblemID.String(),
		SessionID:          pgUUIDToPtr(attempt.SessionID),
		Status:             pgTextToStr(attempt.Status, "in_progress"),
		ElapsedTimeSeconds: pgInt4ToInt64(attempt.ElapsedTimeSeconds, 0),
		TimerState:         pgTextToStr(attempt.TimerState, "idle"),
		TimerLastUpdatedAt: pgTimestamptzToPtr(attempt.TimerLastUpdatedAt),
		StartedAt:          pgTimestamptzToStr(attempt.StartedAt, ""),
		ProblemTitle:       &problem.Title,
		ProblemDifficulty:  pgTextToPtr(problem.Difficulty),
	}, nil
}

// GetInProgressAttempt retrieves an existing in-progress attempt for a problem
func (s *attemptService) GetInProgressAttempt(ctx context.Context, userID uuid.UUID, problemID uuid.UUID) (*InProgressAttemptResponse, error) {
	row, err := s.repo.GetInProgressAttemptForProblem(ctx, repo.GetInProgressAttemptForProblemParams{
		UserID:    userID,
		ProblemID: problemID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // No in-progress attempt found
		}
		return nil, fmt.Errorf("failed to get in-progress attempt: %w", err)
	}

	return &InProgressAttemptResponse{
		ID:                 row.ID.String(),
		UserID:             row.UserID.String(),
		ProblemID:          row.ProblemID.String(),
		SessionID:          pgUUIDToPtr(row.SessionID),
		Status:             pgTextToStr(row.Status, "in_progress"),
		ElapsedTimeSeconds: pgInt4ToInt64(row.ElapsedTimeSeconds, 0),
		TimerState:         pgTextToStr(row.TimerState, "idle"),
		TimerLastUpdatedAt: pgTimestamptzToPtr(row.TimerLastUpdatedAt),
		StartedAt:          pgTimestamptzToStr(row.StartedAt, ""),
		ProblemTitle:       &row.ProblemTitle,
		ProblemDifficulty:  pgTextToPtr(row.ProblemDifficulty),
	}, nil
}

// GetAttemptByID retrieves an attempt by its ID
func (s *attemptService) GetAttemptByID(ctx context.Context, userID uuid.UUID, attemptID uuid.UUID) (*InProgressAttemptResponse, error) {
	row, err := s.repo.GetAttemptById(ctx, repo.GetAttemptByIdParams{
		ID:     attemptID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("attempt not found")
		}
		return nil, fmt.Errorf("failed to get attempt: %w", err)
	}

	return &InProgressAttemptResponse{
		ID:                 row.ID.String(),
		UserID:             row.UserID.String(),
		ProblemID:          row.ProblemID.String(),
		SessionID:          pgUUIDToPtr(row.SessionID),
		Status:             pgTextToStr(row.Status, "in_progress"),
		ElapsedTimeSeconds: pgInt4ToInt64(row.ElapsedTimeSeconds, 0),
		TimerState:         pgTextToStr(row.TimerState, "idle"),
		TimerLastUpdatedAt: pgTimestamptzToPtr(row.TimerLastUpdatedAt),
		StartedAt:          pgTimestamptzToStr(row.StartedAt, ""),
		ProblemTitle:       &row.ProblemTitle,
		ProblemDifficulty:  pgTextToPtr(row.ProblemDifficulty),
	}, nil
}

// UpdateAttemptTimer updates the timer state for an in-progress attempt
func (s *attemptService) UpdateAttemptTimer(ctx context.Context, userID uuid.UUID, attemptID uuid.UUID, body UpdateAttemptTimerBody) error {
	now := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}

	err := s.repo.UpdateAttemptTimer(ctx, repo.UpdateAttemptTimerParams{
		ElapsedTimeSeconds: pgtype.Int4{Int32: int32(body.ElapsedTimeSeconds), Valid: true},
		TimerState:         pgtype.Text{String: body.TimerState, Valid: true},
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
func (s *attemptService) CompleteAttempt(ctx context.Context, userID uuid.UUID, attemptID uuid.UUID, body CompleteAttemptBody) (*AttemptResponse, error) {
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
		durationSeconds = pgInt4ToInt64(existingAttempt.ElapsedTimeSeconds, 0)
	}

	attempt, err := s.repo.CompleteAttempt(ctx, repo.CompleteAttemptParams{
		ConfidenceScore: pgtype.Int4{Int32: int32(body.ConfidenceScore), Valid: true},
		DurationSeconds: pgtype.Int4{Int32: int32(durationSeconds), Valid: true},
		Outcome:         pgtype.Text{String: body.Outcome, Valid: true},
		Notes:           toPgTextFromPtr(body.Notes),
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
		ID:              attempt.ID.String(),
		UserID:          attempt.UserID.String(),
		ProblemID:       attempt.ProblemID.String(),
		SessionID:       pgUUIDToPtr(attempt.SessionID),
		ConfidenceScore: pgInt4ToInt64(attempt.ConfidenceScore, 0),
		DurationSeconds: pgInt4ToPtr(attempt.DurationSeconds),
		Outcome:         pgTextToStr(attempt.Outcome, ""),
		Notes:           pgTextToPtr(attempt.Notes),
		PerformedAt:     pgTimestamptzToStr(attempt.PerformedAt, ""),
	}, nil
}

// AbandonAttempt marks an in-progress attempt as abandoned
func (s *attemptService) AbandonAttempt(ctx context.Context, userID uuid.UUID, attemptID uuid.UUID) error {
	err := s.repo.AbandonAttempt(ctx, repo.AbandonAttemptParams{
		ID:     attemptID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("failed to abandon attempt: %w", err)
	}

	return nil
}
