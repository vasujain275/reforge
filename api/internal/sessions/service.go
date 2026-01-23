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
	SearchSessionsForUser(ctx context.Context, userID int64, params SearchSessionsParams) (*PaginatedSessions, error)
	GenerateSession(ctx context.Context, userID int64, body GenerateSessionBody) (*GenerateSessionResponse, error)
	CompleteSession(ctx context.Context, userID int64, sessionID int64) error
	DeleteSession(ctx context.Context, userID int64, sessionID int64) error
	UpdateSessionTimer(ctx context.Context, userID int64, sessionID int64, body UpdateSessionTimerBody) error
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
		ElapsedTimeSeconds: nullInt64ToInt64(session.ElapsedTimeSeconds, 0),
		TimerState:         nullStringToStr(session.TimerState, "idle"),
		TimerLastUpdatedAt: nullStringToPtr(session.TimerLastUpdatedAt),
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

	// Fetch problems for the session with attempt data
	problems := make([]SessionProblem, 0)
	for _, problemID := range problemIDs {
		problem, err := s.repo.GetProblem(ctx, problemID)
		if err != nil {
			continue // Skip if problem not found
		}

		// Get user problem stats for scoring data
		stats, err := s.repo.GetUserProblemStats(ctx, repo.GetUserProblemStatsParams{
			UserID:    userID,
			ProblemID: problemID,
		})
		if err != nil {
			continue // Skip if stats not found
		}

		// Calculate score for this problem
		score, err := s.scoringService.ComputeScore(ctx, userID, problemID)
		if err != nil {
			// If scoring fails, use default values
			score = &scoring.ProblemScore{
				ProblemID: problemID,
				Score:     0.0,
				Reason:    "No scoring data available",
			}
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

		// Get estimated time based on difficulty
		difficulty := nullStringToStr(problem.Difficulty, "medium")
		estimatedMin := getEstimatedTime(difficulty)

		// Check if there's an attempt for this problem in this session
		var completed bool
		var outcome *string
		attempt, err := s.repo.GetLatestAttemptForProblemInSession(ctx, repo.GetLatestAttemptForProblemInSessionParams{
			UserID:    userID,
			ProblemID: problemID,
			SessionID: sql.NullInt64{Int64: sessionID, Valid: true},
		})
		if err == nil {
			// Found an attempt
			completed = true
			outcomeStr := attempt.Outcome.String
			outcome = &outcomeStr
		}

		problems = append(problems, SessionProblem{
			ID:            problem.ID,
			Title:         problem.Title,
			Difficulty:    difficulty,
			Source:        nullStringToPtr(problem.Source),
			URL:           nullStringToPtr(problem.Url),
			PlannedMin:    estimatedMin,
			Score:         score.Score,
			DaysSinceLast: daysSinceLast,
			Confidence:    stats.Confidence.Int64,
			Reason:        score.Reason,
			CreatedAt:     problem.CreatedAt.String,
			Completed:     completed,
			Outcome:       outcome,
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
		ElapsedTimeSeconds: nullInt64ToInt64(session.ElapsedTimeSeconds, 0),
		TimerState:         nullStringToStr(session.TimerState, "idle"),
		TimerLastUpdatedAt: nullStringToPtr(session.TimerLastUpdatedAt),
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
			ElapsedTimeSeconds: nullInt64ToInt64(session.ElapsedTimeSeconds, 0),
			TimerState:         nullStringToStr(session.TimerState, "idle"),
			TimerLastUpdatedAt: nullStringToPtr(session.TimerLastUpdatedAt),
		})
	}

	return results, nil
}

func (s *sessionService) SearchSessionsForUser(ctx context.Context, userID int64, params SearchSessionsParams) (*PaginatedSessions, error) {
	// Get total count
	countRow, err := s.repo.CountSearchSessionsForUser(ctx, repo.CountSearchSessionsForUserParams{
		UserID:       userID,
		SearchQuery:  params.Query,
		StatusFilter: params.StatusFilter,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to count sessions: %w", err)
	}

	// Get paginated results
	sessions, err := s.repo.SearchSessionsForUser(ctx, repo.SearchSessionsForUserParams{
		UserID:       userID,
		SearchQuery:  params.Query,
		StatusFilter: params.StatusFilter,
		LimitVal:     params.Limit,
		OffsetVal:    params.Offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to search sessions: %w", err)
	}

	results := make([]SessionResponse, 0, len(sessions))
	for _, session := range sessions {
		results = append(results, SessionResponse{
			ID:                 session.ID,
			UserID:             session.UserID,
			TemplateKey:        nullStringToPtr(session.TemplateKey),
			SessionName:        nullStringToPtr(session.SessionName),
			IsCustom:           false,
			CreatedAt:          session.CreatedAt.String,
			PlannedDurationMin: nullInt64ToInt64(session.PlannedDurationMin, 0),
			Completed:          session.CompletedAt.Valid,
			ElapsedTimeSeconds: nullInt64ToInt64(session.ElapsedTimeSeconds, 0),
			TimerState:         nullStringToStr(session.TimerState, "idle"),
			TimerLastUpdatedAt: nullStringToPtr(session.TimerLastUpdatedAt),
		})
	}

	// Calculate pagination info
	page := params.Offset/params.Limit + 1
	if params.Offset == 0 {
		page = 1
	}
	totalPages := (countRow + params.Limit - 1) / params.Limit

	return &PaginatedSessions{
		Data:       results,
		Total:      countRow,
		Page:       page,
		PageSize:   params.Limit,
		TotalPages: totalPages,
	}, nil
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
	// Smart session generation: Use progressive relaxation strategy
	// Try strict filters first, then progressively relax if insufficient problems

	// Step 1: Build all candidates with full metadata (no filtering yet)
	allCandidates := s.buildAllCandidates(ctx, userID, scores)

	if len(allCandidates) == 0 {
		return nil, &SessionGenerationError{
			Message:        "No problems available. Add some problems to your library first.",
			RequiredCount:  1,
			AvailableCount: 0,
			Constraint:     "minimum_problems",
		}
	}

	// Step 2: Try to build session with progressively relaxed constraints
	// Level 0: Full constraints
	// Level 1: Relax confidence filters
	// Level 2: Relax days-since-last filter
	// Level 3: Relax pattern mode filter
	// Level 4: Relax all filters (just difficulty)

	for relaxLevel := 0; relaxLevel <= 4; relaxLevel++ {
		candidates := s.filterCandidates(ctx, userID, allCandidates, template, relaxLevel)

		if len(candidates) == 0 {
			continue // Try next relaxation level
		}

		// Apply pattern mode filtering (with fallback at higher relax levels)
		filteredCandidates, err := s.applyPatternModeFilterWithFallback(ctx, userID, candidates, template, relaxLevel)
		if err != nil {
			continue
		}

		if len(filteredCandidates) == 0 {
			continue
		}

		// Apply difficulty distribution or progression mode
		if template.DifficultyDist != nil {
			filteredCandidates = s.applyDifficultyDistributionSmart(filteredCandidates, *template.DifficultyDist)
		} else if template.ProgressionMode {
			filteredCandidates = s.applyProgressionMode(filteredCandidates)
		}

		// Greedy selection
		problems, quickWinCount := s.greedySelectProblems(filteredCandidates, template, durationMin)

		if len(problems) == 0 {
			continue
		}

		// At relaxation levels 0-1, enforce MinQuickWins strictly
		// At higher levels, accept whatever we can get
		if relaxLevel <= 1 && template.MinQuickWins > 0 && quickWinCount < template.MinQuickWins {
			continue // Try next relaxation level
		}

		// Success! Return the problems
		return problems, nil
	}

	// Final fallback: Just grab whatever problems we can fit in the time budget
	// This ensures we ALWAYS generate a session if there's at least 1 problem
	return s.buildFallbackSession(allCandidates, durationMin)
}

// buildAllCandidates creates candidate structs for all scored problems without filtering
func (s *sessionService) buildAllCandidates(ctx context.Context, userID int64, scores []scoring.ProblemScore) []candidateProblem {
	candidates := make([]candidateProblem, 0, len(scores))

	for _, score := range scores {
		problem, err := s.repo.GetProblem(ctx, score.ProblemID)
		if err != nil {
			continue
		}

		difficulty := nullStringToStr(problem.Difficulty, "medium")
		estimatedMin := getEstimatedTime(difficulty)

		stats, err := s.repo.GetUserProblemStats(ctx, repo.GetUserProblemStatsParams{
			UserID:    userID,
			ProblemID: score.ProblemID,
		})
		if err != nil {
			continue
		}

		var daysSinceLast *int
		if stats.LastAttemptAt.Valid {
			lastAttempt, err := time.Parse(time.RFC3339, stats.LastAttemptAt.String)
			if err == nil {
				days := int(time.Since(lastAttempt).Hours() / 24)
				daysSinceLast = &days
			}
		}

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

	return candidates
}

// filterCandidates applies template filters with progressive relaxation
// relaxLevel: 0=strict, 1=relax confidence, 2=relax days, 3=relax pattern requirements, 4=minimal filters
func (s *sessionService) filterCandidates(
	ctx context.Context,
	userID int64,
	candidates []candidateProblem,
	template TemplateConfig,
	relaxLevel int,
) []candidateProblem {
	filtered := make([]candidateProblem, 0)

	for _, candidate := range candidates {
		// Always apply difficulty filter (never relaxed - it's fundamental)
		if !template.AllowDifficulty(candidate.difficulty) {
			continue
		}

		confidence := int(candidate.stats.Confidence.Int64)

		// Confidence filters (relaxed at level 1+)
		if relaxLevel < 1 {
			if template.MinConfidence != nil && confidence < *template.MinConfidence {
				continue
			}
			if template.MaxConfidence != nil && confidence > *template.MaxConfidence {
				continue
			}
		}

		// Days since last filter (relaxed at level 2+)
		if relaxLevel < 2 {
			if candidate.daysSinceLast != nil && template.MinDaysSinceLast != nil {
				if *candidate.daysSinceLast < *template.MinDaysSinceLast {
					continue
				}
			}
		}

		filtered = append(filtered, candidate)
	}

	return filtered
}

// applyPatternModeFilterWithFallback applies pattern filtering with fallback at higher relax levels
func (s *sessionService) applyPatternModeFilterWithFallback(
	ctx context.Context,
	userID int64,
	candidates []candidateProblem,
	template TemplateConfig,
	relaxLevel int,
) ([]candidateProblem, error) {
	// At relax level 3+, skip pattern mode filtering entirely
	if relaxLevel >= 3 {
		return candidates, nil
	}

	// Try normal pattern mode filtering
	filtered, err := s.applyPatternModeFilter(ctx, userID, candidates, template)
	if err != nil {
		// If pattern mode fails (e.g., specific pattern not set), return all candidates
		return candidates, nil
	}

	// If pattern filtering returned too few results, fall back to all candidates
	if len(filtered) == 0 {
		return candidates, nil
	}

	return filtered, nil
}

// applyDifficultyDistributionSmart is a smarter version that handles low problem counts
func (s *sessionService) applyDifficultyDistributionSmart(
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

	totalAvailable := len(candidates)
	if totalAvailable == 0 {
		return candidates
	}

	// For small problem sets, just return all (ordering preserved from score sort)
	if totalAvailable <= 5 {
		return candidates
	}

	// Calculate target counts based on available problems
	targetSize := min(20, totalAvailable)
	easyTarget := int(float64(targetSize) * dist.EasyPercent / 100.0)
	mediumTarget := int(float64(targetSize) * dist.MediumPercent / 100.0)
	hardTarget := int(float64(targetSize) * dist.HardPercent / 100.0)

	// Ensure we get at least 1 of each if available and percentage > 0
	if dist.EasyPercent > 0 && easyTarget == 0 && len(byDifficulty["easy"]) > 0 {
		easyTarget = 1
	}
	if dist.MediumPercent > 0 && mediumTarget == 0 && len(byDifficulty["medium"]) > 0 {
		mediumTarget = 1
	}
	if dist.HardPercent > 0 && hardTarget == 0 && len(byDifficulty["hard"]) > 0 {
		hardTarget = 1
	}

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

	// If we ended up with nothing, return original candidates
	if len(result) == 0 {
		return candidates
	}

	return result
}

// greedySelectProblems performs greedy selection with soft pattern constraints
func (s *sessionService) greedySelectProblems(
	candidates []candidateProblem,
	template TemplateConfig,
	durationMin int64,
) ([]SessionProblem, int) {
	problems := make([]SessionProblem, 0)
	totalMinutes := int64(0)
	patternCounts := make(map[int64]int)
	quickWinCount := 0

	// First pass: respect pattern constraints
	for _, candidate := range candidates {
		if totalMinutes+int64(candidate.estimatedMin) > durationMin {
			break
		}

		// Check pattern constraints (soft - skip if exceeded)
		skipDueToPattern := false
		if template.MaxSamePattern > 0 {
			for _, pattern := range candidate.patterns {
				if patternCounts[pattern.ID] >= template.MaxSamePattern {
					skipDueToPattern = true
					break
				}
			}
		}
		if skipDueToPattern {
			continue
		}

		problems = append(problems, s.candidateToSessionProblem(candidate))
		totalMinutes += int64(candidate.estimatedMin)

		if candidate.estimatedMin <= 15 {
			quickWinCount++
		}

		for _, pattern := range candidate.patterns {
			patternCounts[pattern.ID]++
		}
	}

	// If we got no problems due to pattern constraints, do a second pass ignoring them
	if len(problems) == 0 {
		totalMinutes = 0
		for _, candidate := range candidates {
			if totalMinutes+int64(candidate.estimatedMin) > durationMin {
				break
			}

			problems = append(problems, s.candidateToSessionProblem(candidate))
			totalMinutes += int64(candidate.estimatedMin)

			if candidate.estimatedMin <= 15 {
				quickWinCount++
			}
		}
	}

	return problems, quickWinCount
}

// candidateToSessionProblem converts a candidate to a SessionProblem
func (s *sessionService) candidateToSessionProblem(candidate candidateProblem) SessionProblem {
	return SessionProblem{
		ID:            candidate.problem.ID,
		Title:         candidate.problem.Title,
		Difficulty:    candidate.difficulty,
		Source:        nullStringToPtr(candidate.problem.Source),
		URL:           nullStringToPtr(candidate.problem.Url),
		PlannedMin:    candidate.estimatedMin,
		Score:         candidate.score.Score,
		DaysSinceLast: candidate.daysSinceLast,
		Confidence:    candidate.stats.Confidence.Int64,
		Reason:        candidate.score.Reason,
		CreatedAt:     candidate.problem.CreatedAt.String,
		Completed:     false,
		Outcome:       nil,
	}
}

// buildFallbackSession creates a session with minimal filtering - last resort
func (s *sessionService) buildFallbackSession(candidates []candidateProblem, durationMin int64) ([]SessionProblem, error) {
	if len(candidates) == 0 {
		return nil, &SessionGenerationError{
			Message:        "No problems available for revision. Add some problems to your library first.",
			RequiredCount:  1,
			AvailableCount: 0,
			Constraint:     "minimum_problems",
		}
	}

	problems := make([]SessionProblem, 0)
	totalMinutes := int64(0)

	for _, candidate := range candidates {
		if totalMinutes+int64(candidate.estimatedMin) > durationMin {
			break
		}

		problems = append(problems, s.candidateToSessionProblem(candidate))
		totalMinutes += int64(candidate.estimatedMin)
	}

	// If even one problem doesn't fit in time budget, still include at least 1
	if len(problems) == 0 && len(candidates) > 0 {
		problems = append(problems, s.candidateToSessionProblem(candidates[0]))
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

func (s *sessionService) CompleteSession(ctx context.Context, userID int64, sessionID int64) error {
	// Verify session belongs to user
	_, err := s.repo.GetSession(ctx, repo.GetSessionParams{
		ID:     sessionID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("failed to get session: %w", err)
	}

	// Mark session as completed with current timestamp
	completedAt := time.Now().Format(time.RFC3339)
	err = s.repo.UpdateSessionCompleted(ctx, repo.UpdateSessionCompletedParams{
		CompletedAt: sql.NullString{String: completedAt, Valid: true},
		ID:          sessionID,
		UserID:      userID,
	})
	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	return nil
}

func (s *sessionService) DeleteSession(ctx context.Context, userID int64, sessionID int64) error {
	err := s.repo.DeleteSession(ctx, repo.DeleteSessionParams{
		ID:     sessionID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	return nil
}

func (s *sessionService) UpdateSessionTimer(ctx context.Context, userID int64, sessionID int64, body UpdateSessionTimerBody) error {
	// Verify session belongs to user
	_, err := s.repo.GetSession(ctx, repo.GetSessionParams{
		ID:     sessionID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("failed to get session: %w", err)
	}

	// Update timer state
	now := time.Now().Format(time.RFC3339)
	err = s.repo.UpdateSessionTimer(ctx, repo.UpdateSessionTimerParams{
		ElapsedTimeSeconds: sql.NullInt64{Int64: body.ElapsedTimeSeconds, Valid: true},
		TimerState:         sql.NullString{String: body.TimerState, Valid: true},
		TimerLastUpdatedAt: sql.NullString{String: now, Valid: true},
		ID:                 sessionID,
		UserID:             userID,
	})
	if err != nil {
		return fmt.Errorf("failed to update timer: %w", err)
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
