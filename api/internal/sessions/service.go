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

// getTemplateConfig retrieves a template configuration by key
// Now uses the new comprehensive template system from templates.go
func getTemplateConfig(templateKey string) (TemplateConfig, error) {
	template, exists := GetTemplate(templateKey)
	if !exists {
		return TemplateConfig{}, fmt.Errorf("template not found: %s", templateKey)
	}
	return template, nil
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
		TemplateKey:        nullStringToPtr(session.TemplateKey),
		SessionName:        nil, // TODO: Add session_name after regenerating sqlc
		IsCustom:           false,
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
		TemplateKey:        nullStringToPtr(session.TemplateKey),
		SessionName:        nil,
		IsCustom:           false,
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
			TemplateKey:        nullStringToPtr(session.TemplateKey),
			SessionName:        nil,
			IsCustom:           false,
			CreatedAt:          session.CreatedAt.String,
			PlannedDurationMin: nullInt64ToInt64(session.PlannedDurationMin, 0),
			Completed:          session.CompletedAt.Valid,
		})
	}

	return results, nil
}

func (s *sessionService) GenerateSession(ctx context.Context, userID int64, body GenerateSessionBody) (*GenerateSessionResponse, error) {
	// Get template configuration
	template, err := getTemplateConfig(body.TemplateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get template: %w", err)
	}

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
		TemplateKey:        &body.TemplateKey,
		TemplateName:       template.DisplayName,
		TemplateDesc:       template.Description,
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
	// Step 1: Filter candidates based on template constraints
	candidates := make([]candidateProblem, 0)

	for _, score := range scores {
		// Get problem details
		problem, err := s.repo.GetProblem(ctx, score.ProblemID)
		if err != nil {
			continue
		}

		difficulty := nullStringToStr(problem.Difficulty, "medium")
		estimatedMin := getEstimatedTime(difficulty)

		// Get user problem stats
		stats, err := s.repo.GetUserProblemStats(ctx, repo.GetUserProblemStatsParams{
			UserID:    userID,
			ProblemID: score.ProblemID,
		})
		if err != nil {
			continue
		}

		confidence := int(stats.Confidence.Int64)

		// Apply template filters

		// 1. Difficulty filter (MaxDifficulty)
		if !template.AllowDifficulty(difficulty) {
			continue
		}

		// 2. Confidence range filter
		if template.MinConfidence != nil && confidence < *template.MinConfidence {
			continue
		}
		if template.MaxConfidence != nil && confidence > *template.MaxConfidence {
			continue
		}

		// 3. Days since last attempt filter
		var daysSinceLast *int
		if stats.LastAttemptAt.Valid {
			lastAttempt, err := time.Parse(time.RFC3339, stats.LastAttemptAt.String)
			if err == nil {
				days := int(time.Since(lastAttempt).Hours() / 24)
				daysSinceLast = &days

				// Filter by min days
				if template.MinDaysSinceLast != nil && days < *template.MinDaysSinceLast {
					continue
				}
			}
		}

		// Get patterns for this problem
		patterns, err := s.repo.GetPatternsForProblem(ctx, score.ProblemID)
		if err != nil {
			patterns = []repo.Pattern{}
		}

		candidates = append(candidates, candidateProblem{
			problem:       problem,
			score:         score,
			stats:         stats,
			patterns:      patterns,
			difficulty:    difficulty,
			estimatedMin:  estimatedMin,
			daysSinceLast: daysSinceLast,
		})
	}

	// Step 2: Apply pattern mode filtering
	candidates, err := s.applyPatternModeFilter(ctx, userID, candidates, template)
	if err != nil {
		return nil, err
	}

	// Step 3: Apply difficulty distribution or progression mode
	if template.DifficultyDist != nil {
		candidates = s.applyDifficultyDistribution(candidates, *template.DifficultyDist)
	} else if template.ProgressionMode {
		candidates = s.applyProgressionMode(candidates)
	}

	// Step 4: Greedy selection with constraints
	problems := make([]SessionProblem, 0)
	totalMinutes := int64(0)
	patternCounts := make(map[int64]int)
	quickWinCount := 0

	for _, candidate := range candidates {
		// Check time budget
		if totalMinutes+int64(candidate.estimatedMin) > durationMin {
			break
		}

		// Check pattern constraints
		skipDueToPattern := false
		for _, pattern := range candidate.patterns {
			if patternCounts[pattern.ID] >= template.MaxSamePattern {
				skipDueToPattern = true
				break
			}
		}
		if skipDueToPattern {
			continue
		}

		// Add problem
		problems = append(problems, SessionProblem{
			ID:            candidate.problem.ID,
			Title:         candidate.problem.Title,
			Difficulty:    candidate.difficulty,
			Source:        nullStringToPtr(candidate.problem.Source),
			PlannedMin:    candidate.estimatedMin,
			Score:         candidate.score.Score,
			DaysSinceLast: candidate.daysSinceLast,
			Confidence:    candidate.stats.Confidence.Int64,
			Reason:        candidate.score.Reason,
			CreatedAt:     candidate.problem.CreatedAt.String,
		})

		totalMinutes += int64(candidate.estimatedMin)

		// Track quick wins
		if candidate.estimatedMin <= 15 {
			quickWinCount++
		}

		// Update pattern counts
		for _, pattern := range candidate.patterns {
			patternCounts[pattern.ID]++
		}
	}

	// Step 5: Validate constraints
	if template.MinQuickWins > 0 && quickWinCount < template.MinQuickWins {
		return nil, &SessionGenerationError{
			Message:        fmt.Sprintf("Not enough quick wins available. Need at least %d problems ≤15 minutes, but only found %d. Try adding easier problems or choose a different template.", template.MinQuickWins, quickWinCount),
			RequiredCount:  template.MinQuickWins,
			AvailableCount: quickWinCount,
			Constraint:     "min_quick_wins",
		}
	}

	if len(problems) == 0 {
		return nil, &SessionGenerationError{
			Message:        "No problems available for this template. Try adjusting filters or adding more problems to your library.",
			RequiredCount:  1,
			AvailableCount: 0,
			Constraint:     "minimum_problems",
		}
	}

	return problems, nil
}

// candidateProblem holds all data needed for session building
type candidateProblem struct {
	problem       repo.Problem
	score         scoring.ProblemScore
	stats         repo.UserProblemStat
	patterns      []repo.Pattern
	difficulty    string
	estimatedMin  int
	daysSinceLast *int
}

// applyPatternModeFilter filters candidates based on template pattern mode
func (s *sessionService) applyPatternModeFilter(
	ctx context.Context,
	userID int64,
	candidates []candidateProblem,
	template TemplateConfig,
) ([]candidateProblem, error) {
	switch template.PatternMode {
	case "all":
		// No filtering, return all
		return candidates, nil

	case "specific":
		// Filter to only problems with the specified pattern
		if template.PatternID == nil {
			return nil, fmt.Errorf("pattern_id required for 'specific' pattern mode")
		}
		filtered := make([]candidateProblem, 0)
		for _, candidate := range candidates {
			for _, pattern := range candidate.patterns {
				if pattern.ID == *template.PatternID {
					filtered = append(filtered, candidate)
					break
				}
			}
		}
		return filtered, nil

	case "weakest":
		// Get user's weakest N patterns
		weakestPatternIDs, err := s.getWeakestPatterns(ctx, userID, template.PatternCount)
		if err != nil {
			return nil, err
		}

		// Filter to problems from these patterns
		filtered := make([]candidateProblem, 0)
		for _, candidate := range candidates {
			for _, pattern := range candidate.patterns {
				for _, weakID := range weakestPatternIDs {
					if pattern.ID == weakID {
						filtered = append(filtered, candidate)
						break
					}
				}
			}
		}
		return filtered, nil

	case "multi_pattern":
		// Only include problems with 2+ patterns
		filtered := make([]candidateProblem, 0)
		for _, candidate := range candidates {
			if len(candidate.patterns) >= 2 {
				filtered = append(filtered, candidate)
			}
		}
		return filtered, nil

	default:
		return candidates, nil
	}
}

// getWeakestPatterns returns the N weakest patterns for a user
func (s *sessionService) getWeakestPatterns(ctx context.Context, userID int64, count int) ([]int64, error) {
	// Get all pattern stats for user
	stats, err := s.repo.ListUserPatternStats(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Sort by avg confidence ascending
	for i := 0; i < len(stats)-1; i++ {
		for j := 0; j < len(stats)-i-1; j++ {
			if stats[j].AvgConfidence.Int64 > stats[j+1].AvgConfidence.Int64 {
				stats[j], stats[j+1] = stats[j+1], stats[j]
			}
		}
	}

	// Take first N
	result := make([]int64, 0, count)
	for i := 0; i < len(stats) && i < count; i++ {
		result = append(result, stats[i].PatternID)
	}

	return result, nil
}

// applyDifficultyDistribution samples problems to match target distribution
func (s *sessionService) applyDifficultyDistribution(
	candidates []candidateProblem,
	dist DifficultyDistribution,
) []candidateProblem {
	// Group by difficulty
	byDifficulty := map[string][]candidateProblem{
		"easy":   {},
		"medium": {},
		"hard":   {},
	}

	for _, candidate := range candidates {
		byDifficulty[candidate.difficulty] = append(byDifficulty[candidate.difficulty], candidate)
	}

	// Calculate target counts (rough estimate based on first 20 problems)
	targetSize := 20
	easyTarget := int(float64(targetSize) * dist.EasyPercent / 100.0)
	mediumTarget := int(float64(targetSize) * dist.MediumPercent / 100.0)
	hardTarget := int(float64(targetSize) * dist.HardPercent / 100.0)

	// Sample from each bucket
	result := make([]candidateProblem, 0)

	for i := 0; i < easyTarget && i < len(byDifficulty["easy"]); i++ {
		result = append(result, byDifficulty["easy"][i])
	}
	for i := 0; i < mediumTarget && i < len(byDifficulty["medium"]); i++ {
		result = append(result, byDifficulty["medium"][i])
	}
	for i := 0; i < hardTarget && i < len(byDifficulty["hard"]); i++ {
		result = append(result, byDifficulty["hard"][i])
	}

	return result
}

// applyProgressionMode orders problems Easy -> Medium -> Hard
func (s *sessionService) applyProgressionMode(candidates []candidateProblem) []candidateProblem {
	easy := make([]candidateProblem, 0)
	medium := make([]candidateProblem, 0)
	hard := make([]candidateProblem, 0)

	for _, candidate := range candidates {
		switch candidate.difficulty {
		case "easy":
			easy = append(easy, candidate)
		case "medium":
			medium = append(medium, candidate)
		case "hard":
			hard = append(hard, candidate)
		}
	}

	// Concatenate: easy first, then medium, then hard
	result := make([]candidateProblem, 0, len(candidates))
	result = append(result, easy...)
	result = append(result, medium...)
	result = append(result, hard...)

	return result
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
