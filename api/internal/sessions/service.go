package sessions

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/scoring"
)

// Custom errors
var (
	ErrInsufficientProblems = errors.New("insufficient problems to generate session")
	ErrConstraintNotMet     = errors.New("session constraints not met")
)

// SessionGenerationError provides detailed information about why session generation failed
type SessionGenerationError struct {
	Message        string
	RequiredCount  int
	AvailableCount int
	Constraint     string
}

func (e *SessionGenerationError) Error() string {
	return e.Message
}

// TemplateConfig defines the constraints for a session template
type TemplateConfig struct {
	DurationMin    int64
	MaxDifficulty  string // "easy", "medium", "hard", or "" for no filter
	MinQuickWins   int    // Minimum number of problems ≤15 min
	MaxSamePattern int    // Maximum problems from same pattern
}

func (tc *TemplateConfig) AllowDifficulty(difficulty string) bool {
	if tc.MaxDifficulty == "" {
		return true
	}

	difficultyOrder := map[string]int{
		"easy":   1,
		"medium": 2,
		"hard":   3,
	}

	return difficultyOrder[difficulty] <= difficultyOrder[tc.MaxDifficulty]
}

func getTemplateConfig(templateKey string) TemplateConfig {
	templates := map[string]TemplateConfig{
		"daily_revision": {
			DurationMin:    35,
			MaxDifficulty:  "medium",
			MinQuickWins:   2,
			MaxSamePattern: 2,
		},
		"daily_mixed": {
			DurationMin:    55,
			MaxDifficulty:  "hard",
			MinQuickWins:   1,
			MaxSamePattern: 2,
		},
		"weekend_comprehensive": {
			DurationMin:    150,
			MaxDifficulty:  "", // No filter
			MinQuickWins:   0,
			MaxSamePattern: 3,
		},
		"weekend_weak_patterns": {
			DurationMin:    120,
			MaxDifficulty:  "",
			MinQuickWins:   0,
			MaxSamePattern: 5, // Allow multiple from same pattern
		},
		"pattern_deep_dive": {
			DurationMin:    90,
			MaxDifficulty:  "medium",
			MinQuickWins:   0,
			MaxSamePattern: 5,
		},
		"confidence_booster": {
			DurationMin:    45,
			MaxDifficulty:  "medium",
			MinQuickWins:   3,
			MaxSamePattern: 2,
		},
		"challenge_mode": {
			DurationMin:    100,
			MaxDifficulty:  "", // Prefer hard
			MinQuickWins:   0,
			MaxSamePattern: 2,
		},
	}

	// Return default if not found
	if config, ok := templates[templateKey]; ok {
		return config
	}

	// Default template
	return TemplateConfig{
		DurationMin:    35,
		MaxDifficulty:  "medium",
		MinQuickWins:   1,
		MaxSamePattern: 2,
	}
}

type Service interface {
	CreateSession(ctx context.Context, userID int64, body CreateSessionBody) (*SessionResponse, error)
	GetSession(ctx context.Context, userID int64, sessionID int64) (*SessionResponse, error)
	ListSessionsForUser(ctx context.Context, userID int64, limit, offset int64) ([]SessionResponse, error)
	GenerateSession(ctx context.Context, userID int64, body GenerateSessionBody) (*GenerateSessionResponse, error)
}

type sessionService struct {
	repo           repo.Querier
	scoringService scoring.Service
}

func NewService(repo repo.Querier, scoringService scoring.Service) Service {
	return &sessionService{
		repo:           repo,
		scoringService: scoringService,
	}
}

func (s *sessionService) CreateSession(ctx context.Context, userID int64, body CreateSessionBody) (*SessionResponse, error) {
	// Marshal problem IDs to JSON
	itemsJSON, err := json.Marshal(body.ProblemIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal problem IDs: %w", err)
	}

	session, err := s.repo.CreateSession(ctx, repo.CreateSessionParams{
		UserID:             userID,
		TemplateKey:        sqlNullString(&body.TemplateKey),
		PlannedDurationMin: sqlNullInt64(&body.PlannedDurationMin),
		ItemsOrdered:       sqlNullString(strPtr(string(itemsJSON))),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return &SessionResponse{
		ID:                 session.ID,
		UserID:             session.UserID,
		TemplateKey:        nullStringToStr(session.TemplateKey, ""),
		CreatedAt:          session.CreatedAt.String,
		PlannedDurationMin: nullInt64ToInt64(session.PlannedDurationMin, 0),
		Completed:          session.CompletedAt.Valid,
	}, nil
}

func (s *sessionService) GetSession(ctx context.Context, userID int64, sessionID int64) (*SessionResponse, error) {
	session, err := s.repo.GetSession(ctx, repo.GetSessionParams{
		ID:     sessionID,
		UserID: userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	// Parse problem IDs from JSON
	var problemIDs []int64
	if session.ItemsOrdered.Valid && session.ItemsOrdered.String != "" {
		if err := json.Unmarshal([]byte(session.ItemsOrdered.String), &problemIDs); err != nil {
			return nil, fmt.Errorf("failed to parse problem IDs: %w", err)
		}
	}

	// Fetch problems for the session
	problems := make([]SessionProblem, 0)
	for _, problemID := range problemIDs {
		problem, err := s.repo.GetProblem(ctx, problemID)
		if err != nil {
			continue // Skip if problem not found
		}

		problems = append(problems, SessionProblem{
			ID:         problem.ID,
			Title:      problem.Title,
			Difficulty: nullStringToStr(problem.Difficulty, "medium"),
			Source:     nullStringToPtr(problem.Source),
			CreatedAt:  problem.CreatedAt.String,
		})
	}

	return &SessionResponse{
		ID:                 session.ID,
		UserID:             session.UserID,
		TemplateKey:        nullStringToStr(session.TemplateKey, ""),
		CreatedAt:          session.CreatedAt.String,
		PlannedDurationMin: nullInt64ToInt64(session.PlannedDurationMin, 0),
		Completed:          session.CompletedAt.Valid,
		Problems:           problems,
	}, nil
}

func (s *sessionService) ListSessionsForUser(ctx context.Context, userID int64, limit, offset int64) ([]SessionResponse, error) {
	sessions, err := s.repo.ListSessionsForUser(ctx, repo.ListSessionsForUserParams{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list sessions: %w", err)
	}

	results := make([]SessionResponse, 0, len(sessions))
	for _, session := range sessions {
		// Parse problem IDs to get count
		var problemIDs []int64
		if session.ItemsOrdered.Valid && session.ItemsOrdered.String != "" {
			_ = json.Unmarshal([]byte(session.ItemsOrdered.String), &problemIDs)
		}

		results = append(results, SessionResponse{
			ID:                 session.ID,
			UserID:             session.UserID,
			TemplateKey:        nullStringToStr(session.TemplateKey, ""),
			CreatedAt:          session.CreatedAt.String,
			PlannedDurationMin: nullInt64ToInt64(session.PlannedDurationMin, 0),
			Completed:          session.CompletedAt.Valid,
		})
	}

	return results, nil
}

func (s *sessionService) GenerateSession(ctx context.Context, userID int64, body GenerateSessionBody) (*GenerateSessionResponse, error) {
	// Get template configuration
	template := getTemplateConfig(body.TemplateKey)

	// Use template duration or custom duration
	durationMin := template.DurationMin
	if body.DurationMin != nil {
		durationMin = *body.DurationMin
	}

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

	// Build session with template constraints
	problems, err := s.buildSessionWithConstraints(ctx, userID, scores, template, durationMin)
	if err != nil {
		return nil, fmt.Errorf("failed to build session: %w", err)
	}

	return &GenerateSessionResponse{
		TemplateKey:        body.TemplateKey,
		PlannedDurationMin: durationMin,
		Problems:           problems,
	}, nil
}

func (s *sessionService) buildSessionWithConstraints(
	ctx context.Context,
	userID int64,
	scores []scoring.ProblemScore,
	template TemplateConfig,
	durationMin int64,
) ([]SessionProblem, error) {
	problems := make([]SessionProblem, 0)
	totalMinutes := int64(0)
	patternCounts := make(map[int64]int)
	quickWinCount := 0
	difficultyCount := map[string]int{"easy": 0, "medium": 0, "hard": 0}

	for _, score := range scores {
		// Get problem details
		problem, err := s.repo.GetProblem(ctx, score.ProblemID)
		if err != nil {
			continue
		}

		difficulty := nullStringToStr(problem.Difficulty, "medium")
		estimatedMin := getEstimatedTime(difficulty)

		// Check time budget
		if totalMinutes+int64(estimatedMin) > durationMin {
			break
		}

		// Apply difficulty filter
		if !template.AllowDifficulty(difficulty) {
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

		// Get patterns for this problem
		patterns, err := s.repo.GetPatternsForProblem(ctx, score.ProblemID)
		if err != nil {
			patterns = []repo.Pattern{}
		}

		// Check pattern constraints
		maxSamePattern := template.MaxSamePattern
		skipDueToPattern := false
		for _, pattern := range patterns {
			if patternCounts[pattern.ID] >= maxSamePattern {
				skipDueToPattern = true
				break
			}
		}
		if skipDueToPattern {
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

		// Add problem
		problems = append(problems, SessionProblem{
			ID:            problem.ID,
			Title:         problem.Title,
			Difficulty:    difficulty,
			Source:        nullStringToPtr(problem.Source),
			PlannedMin:    estimatedMin,
			Score:         score.Score,
			DaysSinceLast: daysSinceLast,
			Confidence:    stats.Confidence.Int64,
			Reason:        score.Reason,
			CreatedAt:     problem.CreatedAt.String,
		})

		totalMinutes += int64(estimatedMin)
		difficultyCount[difficulty]++

		// Track quick wins
		if estimatedMin <= 15 {
			quickWinCount++
		}

		// Update pattern counts
		for _, pattern := range patterns {
			patternCounts[pattern.ID]++
		}
	}

	// Validate constraints
	if template.MinQuickWins > 0 && quickWinCount < template.MinQuickWins {
		return nil, &SessionGenerationError{
			Message:        fmt.Sprintf("Not enough easy problems available. Need at least %d problems that can be solved in ≤15 minutes, but only found %d. Please add more easy or medium difficulty problems to your library.", template.MinQuickWins, quickWinCount),
			RequiredCount:  template.MinQuickWins,
			AvailableCount: quickWinCount,
			Constraint:     "min_quick_wins",
		}
	}

	if len(problems) == 0 {
		return nil, &SessionGenerationError{
			Message:        "No problems available for this session template. Please add more problems to your library or try a different template.",
			RequiredCount:  1,
			AvailableCount: 0,
			Constraint:     "minimum_problems",
		}
	}

	return problems, nil
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

func nullInt64ToInt64(ni sql.NullInt64, defaultVal int64) int64 {
	if !ni.Valid {
		return defaultVal
	}
	return ni.Int64
}

func strPtr(s string) *string {
	return &s
}

func getEstimatedTime(difficulty string) int {
	switch difficulty {
	case "easy":
		return 12
	case "medium":
		return 25
	case "hard":
		return 45
	default:
		return 25
	}
}
