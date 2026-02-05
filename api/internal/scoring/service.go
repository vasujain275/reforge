package scoring

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"

	repo "github.com/vasujain275/reforge/internal/adapters/postgres/sqlc"
)

// ScoringWeights holds the configurable weights for the scoring formula
type ScoringWeights struct {
	WConf       float64
	WDays       float64
	WAttempts   float64
	WTime       float64
	WDifficulty float64
	WFailed     float64
	WPattern    float64
}

// ProblemScore contains the computed score and feature breakdown
type ProblemScore struct {
	ProblemID uuid.UUID
	Score     float64
	Features  FeatureBreakdown
	Reason    string
}

// FeatureBreakdown shows individual feature contributions
type FeatureBreakdown struct {
	FConf       float64
	FDays       float64
	FAttempts   float64
	FTime       float64
	FDifficulty float64
	FFailed     float64
	FPattern    float64
}

type Service interface {
	GetWeights(ctx context.Context) (*ScoringWeights, error)
	ComputeScore(ctx context.Context, userID uuid.UUID, problemID uuid.UUID) (*ProblemScore, error)
	ComputeScoreWithEmphasis(ctx context.Context, userID uuid.UUID, problemID uuid.UUID, emphasis string) (*ProblemScore, error)
	ComputeScoresForUser(ctx context.Context, userID uuid.UUID) ([]ProblemScore, error)
	ComputeScoresForUserWithEmphasis(ctx context.Context, userID uuid.UUID, emphasis string) ([]ProblemScore, error)
	CalculateNextReview(outcome string, confidence int, currentInterval int, easeFactor float64, reviewCount int) (int, float64, time.Time)
}

type scoringService struct {
	repo repo.Querier
}

func NewService(repo repo.Querier) Service {
	return &scoringService{
		repo: repo,
	}
}

func (s *scoringService) GetWeights(ctx context.Context) (*ScoringWeights, error) {
	rows, err := s.repo.GetScoringWeights(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get scoring weights: %w", err)
	}

	weights := &ScoringWeights{
		WConf:       0.30, // defaults
		WDays:       0.20,
		WAttempts:   0.10,
		WTime:       0.05,
		WDifficulty: 0.15,
		WFailed:     0.10,
		WPattern:    0.10,
	}

	for _, row := range rows {
		val := parseFloat(row.Value)
		switch row.Key {
		case "w_conf":
			weights.WConf = val
		case "w_days":
			weights.WDays = val
		case "w_attempts":
			weights.WAttempts = val
		case "w_time":
			weights.WTime = val
		case "w_difficulty":
			weights.WDifficulty = val
		case "w_failed":
			weights.WFailed = val
		case "w_pattern":
			weights.WPattern = val
		}
	}

	return weights, nil
}

// ApplyEmphasis modifies weights based on scoring emphasis and renormalizes
func (s *scoringService) applyEmphasis(weights *ScoringWeights, emphasis string) *ScoringWeights {
	// Copy weights to avoid modifying original
	w := &ScoringWeights{
		WConf:       weights.WConf,
		WDays:       weights.WDays,
		WAttempts:   weights.WAttempts,
		WTime:       weights.WTime,
		WDifficulty: weights.WDifficulty,
		WFailed:     weights.WFailed,
		WPattern:    weights.WPattern,
	}

	// Apply emphasis multipliers
	switch emphasis {
	case "confidence":
		w.WConf *= 2.0
	case "failure":
		w.WFailed *= 2.0
	case "time":
		w.WTime *= 3.0
	case "standard":
		// No modification
		return w
	default:
		return w
	}

	// Renormalize weights to sum to 1.0
	total := w.WConf + w.WDays + w.WAttempts + w.WTime + w.WDifficulty + w.WFailed + w.WPattern
	if total > 0 {
		w.WConf /= total
		w.WDays /= total
		w.WAttempts /= total
		w.WTime /= total
		w.WDifficulty /= total
		w.WFailed /= total
		w.WPattern /= total
	}

	return w
}

func (s *scoringService) ComputeScore(ctx context.Context, userID uuid.UUID, problemID uuid.UUID) (*ProblemScore, error) {
	return s.ComputeScoreWithEmphasis(ctx, userID, problemID, "standard")
}

func (s *scoringService) ComputeScoreWithEmphasis(ctx context.Context, userID uuid.UUID, problemID uuid.UUID, emphasis string) (*ProblemScore, error) {
	// Get weights
	weights, err := s.GetWeights(ctx)
	if err != nil {
		return nil, err
	}

	// Apply emphasis
	weights = s.applyEmphasis(weights, emphasis)

	// Get user problem stats
	stats, err := s.repo.GetUserProblemStats(ctx, repo.GetUserProblemStatsParams{
		UserID:    userID,
		ProblemID: problemID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get user problem stats: %w", err)
	}

	// Get problem details
	problem, err := s.repo.GetProblem(ctx, problemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get problem: %w", err)
	}

	// Get patterns for this problem
	patterns, err := s.repo.GetPatternsForProblem(ctx, problemID)
	if err != nil {
		patterns = []repo.Pattern{}
	}

	// Get pattern stats in bulk to avoid N+1 queries
	patternStatsMap := s.getPatternStatsMap(ctx, userID)

	// Compute features
	features := s.computeFeatures(stats, problem, patterns, patternStatsMap)

	// Compute final score
	score := weights.WConf*features.FConf +
		weights.WDays*features.FDays +
		weights.WAttempts*features.FAttempts +
		weights.WTime*features.FTime +
		weights.WDifficulty*features.FDifficulty +
		weights.WFailed*features.FFailed +
		weights.WPattern*features.FPattern

	// Build reason string
	reason := s.buildReason(features, weights, stats)

	return &ProblemScore{
		ProblemID: problemID,
		Score:     score,
		Features:  features,
		Reason:    reason,
	}, nil
}

func (s *scoringService) ComputeScoresForUser(ctx context.Context, userID uuid.UUID) ([]ProblemScore, error) {
	return s.ComputeScoresForUserWithEmphasis(ctx, userID, "standard")
}

func (s *scoringService) ComputeScoresForUserWithEmphasis(ctx context.Context, userID uuid.UUID, emphasis string) ([]ProblemScore, error) {
	// Get all user problem stats
	statsList, err := s.repo.ListUserProblemStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list user problem stats: %w", err)
	}

	// Get weights once for all problems
	weights, err := s.GetWeights(ctx)
	if err != nil {
		return nil, err
	}
	weights = s.applyEmphasis(weights, emphasis)

	// Get all pattern stats for user upfront (fix N+1 query)
	patternStatsMap := s.getPatternStatsMap(ctx, userID)

	scores := make([]ProblemScore, 0, len(statsList))
	for _, stats := range statsList {
		// Skip abandoned problems
		if stats.Status.Valid && stats.Status.String == "abandoned" {
			continue
		}

		// Get problem details
		problem, err := s.repo.GetProblem(ctx, stats.ProblemID)
		if err != nil {
			fmt.Printf("Warning: failed to get problem %s: %v\n", stats.ProblemID, err)
			continue
		}

		// Get patterns for this problem
		patterns, err := s.repo.GetPatternsForProblem(ctx, stats.ProblemID)
		if err != nil {
			patterns = []repo.Pattern{}
		}

		// Compute features using cached pattern stats
		features := s.computeFeatures(stats, problem, patterns, patternStatsMap)

		// Compute final score
		score := weights.WConf*features.FConf +
			weights.WDays*features.FDays +
			weights.WAttempts*features.FAttempts +
			weights.WTime*features.FTime +
			weights.WDifficulty*features.FDifficulty +
			weights.WFailed*features.FFailed +
			weights.WPattern*features.FPattern

		// Build reason string
		reason := s.buildReason(features, weights, stats)

		scores = append(scores, ProblemScore{
			ProblemID: stats.ProblemID,
			Score:     score,
			Features:  features,
			Reason:    reason,
		})
	}

	return scores, nil
}

// getPatternStatsMap fetches all pattern stats for a user and returns a map
// This fixes the N+1 query problem when computing scores for many problems
func (s *scoringService) getPatternStatsMap(ctx context.Context, userID uuid.UUID) map[uuid.UUID]repo.UserPatternStat {
	patternStats, err := s.repo.ListUserPatternStats(ctx, userID)
	if err != nil {
		return make(map[uuid.UUID]repo.UserPatternStat)
	}

	statsMap := make(map[uuid.UUID]repo.UserPatternStat, len(patternStats))
	for _, ps := range patternStats {
		statsMap[ps.PatternID] = ps
	}
	return statsMap
}

func (s *scoringService) computeFeatures(
	stats repo.UserProblemStat,
	problem repo.Problem,
	patterns []repo.Pattern,
	patternStatsMap map[uuid.UUID]repo.UserPatternStat,
) FeatureBreakdown {
	features := FeatureBreakdown{}

	// 1. f_conf - confidence urgency
	// Lower confidence = higher urgency for revision
	confidence := float64(50) // default
	if stats.Confidence.Valid {
		confidence = float64(stats.Confidence.Int32)
	}
	features.FConf = (100.0 - confidence) / 100.0

	// 2. f_days - SM-2 based due date urgency
	// Uses next_review_at if available, otherwise falls back to legacy calculation
	features.FDays = s.calculateDaysUrgency(stats)

	// 3. f_attempts - INVERTED: fewer attempts = higher priority for building familiarity
	// This encourages practicing newer/less-practiced problems
	const attemptCap = 10.0
	totalAttempts := int32(0)
	if stats.TotalAttempts.Valid {
		totalAttempts = stats.TotalAttempts.Int32
	}
	// Invert: more attempts = lower score, fewer attempts = higher score
	features.FAttempts = 1.0 - (math.Min(float64(totalAttempts), attemptCap) / attemptCap)

	// 4. f_time - time-based complexity
	if stats.AvgTimeSeconds.Valid && stats.AvgTimeSeconds.Int32 > 0 {
		const timeCap = 3600.0 // 1 hour
		features.FTime = math.Min(float64(stats.AvgTimeSeconds.Int32), timeCap) / timeCap
	} else {
		features.FTime = 0.0
	}

	// 5. f_difficulty - difficulty indicator
	difficulty := "medium"
	if problem.Difficulty.Valid {
		difficulty = problem.Difficulty.String
	}
	switch difficulty {
	case "easy":
		features.FDifficulty = 0.20
	case "medium":
		features.FDifficulty = 0.50
	case "hard":
		features.FDifficulty = 1.00
	default:
		features.FDifficulty = 0.50
	}

	// 6. f_failed - last outcome failure flag WITH TIME DECAY
	// Failed recently = high urgency, failed long ago = lower urgency
	features.FFailed = s.calculateFailedUrgency(stats)

	// 7. f_pattern - pattern weakness (aggregated) using cached stats
	features.FPattern = s.calculatePatternWeakness(patterns, patternStatsMap)

	return features
}

// calculateDaysUrgency computes f_days using SM-2 due dates when available
func (s *scoringService) calculateDaysUrgency(stats repo.UserProblemStat) float64 {
	// Use SM-2 next_review_at if available
	if stats.NextReviewAt.Valid {
		dueDate := stats.NextReviewAt.Time
		daysOverdue := time.Since(dueDate).Hours() / 24.0

		if daysOverdue > 0 {
			// Overdue: urgency increases exponentially
			// 7 days overdue = ~0.86, 14 days = ~0.95, 30 days = ~0.99
			return math.Min(1.0, 0.5+0.5*(1-math.Exp(-daysOverdue/7.0)))
		}
		// Not due yet: low urgency that increases as due date approaches
		// -30 days = ~0.0, -7 days = ~0.23, 0 days = 0.5
		return math.Max(0.0, 0.5*(1.0+daysOverdue/30.0))
	}

	// Fallback: legacy calculation based on last_attempt_at
	return s.calculateLegacyDaysUrgency(stats)
}

// calculateLegacyDaysUrgency is the original f_days calculation for backward compatibility
func (s *scoringService) calculateLegacyDaysUrgency(stats repo.UserProblemStat) float64 {
	daysSinceLast := 365.0 // default for never attempted
	if stats.LastAttemptAt.Valid {
		lastAttempt := stats.LastAttemptAt.Time
		daysSinceLast = time.Since(lastAttempt).Hours() / 24.0
	}

	// Calculate mastery multiplier
	avgConfidence := float64(50)
	if stats.AvgConfidence.Valid {
		avgConfidence = float64(stats.AvgConfidence.Int32)
	}
	totalAttempts := int32(0)
	if stats.TotalAttempts.Valid {
		totalAttempts = stats.TotalAttempts.Int32
	}

	masteryMultiplier := 1.0
	if totalAttempts > 3 && avgConfidence > 90 {
		masteryMultiplier = 4.0
	} else if totalAttempts > 1 && avgConfidence > 80 {
		masteryMultiplier = 2.0
	}

	dynamicDaysCap := 90.0 * masteryMultiplier
	return math.Min(daysSinceLast, dynamicDaysCap) / dynamicDaysCap
}

// calculateFailedUrgency computes f_failed with time decay
// Recent failures have high urgency, old failures decay over 30 days
func (s *scoringService) calculateFailedUrgency(stats repo.UserProblemStat) float64 {
	if !stats.LastOutcome.Valid || stats.LastOutcome.String != "failed" {
		return 0.0
	}

	// If we have a timestamp, apply exponential decay
	if stats.LastAttemptAt.Valid {
		lastAttempt := stats.LastAttemptAt.Time
		daysSinceFailure := time.Since(lastAttempt).Hours() / 24.0
		// Exponential decay: half-life of ~20 days
		// 0 days = 1.0, 20 days = 0.5, 40 days = 0.25
		return math.Exp(-daysSinceFailure / 30.0)
	}

	// No timestamp, assume recent failure
	return 1.0
}

// calculatePatternWeakness computes f_pattern using pre-fetched pattern stats
func (s *scoringService) calculatePatternWeakness(patterns []repo.Pattern, patternStatsMap map[uuid.UUID]repo.UserPatternStat) float64 {
	if len(patterns) == 0 {
		return 0.5 // fallback for problems without patterns
	}

	totalWeakness := 0.0
	for _, pattern := range patterns {
		if ps, exists := patternStatsMap[pattern.ID]; exists && ps.AvgConfidence.Valid {
			patternWeakness := 1.0 - (float64(ps.AvgConfidence.Int32) / 100.0)
			totalWeakness += patternWeakness
		} else {
			totalWeakness += 0.5 // fallback for missing pattern stats
		}
	}
	return totalWeakness / float64(len(patterns))
}

// CalculateNextReview implements SM-2 algorithm for spaced repetition scheduling
// Returns: new interval (days), new ease factor, next review date
func (s *scoringService) CalculateNextReview(outcome string, confidence int, currentInterval int, easeFactor float64, reviewCount int) (int, float64, time.Time) {
	// Map confidence (0-100) to SM-2 quality rating (0-5)
	// confidence >= 80 -> quality 5 (perfect)
	// confidence >= 60 -> quality 4 (correct with hesitation)
	// confidence >= 40 -> quality 3 (correct with difficulty)
	// confidence >= 20 -> quality 2 (incorrect, but remembered)
	// confidence < 20  -> quality 1 (wrong, barely remembered)
	// outcome = failed -> quality 0 (complete blackout)
	var quality float64
	if outcome == "failed" {
		quality = 0
	} else {
		switch {
		case confidence >= 80:
			quality = 5
		case confidence >= 60:
			quality = 4
		case confidence >= 40:
			quality = 3
		case confidence >= 20:
			quality = 2
		default:
			quality = 1
		}
	}

	var newInterval int
	var newEaseFactor float64

	if quality >= 3 {
		// Correct response - increase interval
		if reviewCount == 0 {
			newInterval = 1
		} else if reviewCount == 1 {
			newInterval = 6
		} else {
			newInterval = int(math.Round(float64(currentInterval) * easeFactor))
		}

		// Update ease factor using SM-2 formula
		newEaseFactor = easeFactor + (0.1 - (5-quality)*(0.08+(5-quality)*0.02))
		if newEaseFactor < 1.3 {
			newEaseFactor = 1.3
		}
	} else {
		// Incorrect response - reset interval
		newInterval = 1
		newEaseFactor = math.Max(1.3, easeFactor-0.2)
	}

	// Calculate next review date
	nextReview := time.Now().AddDate(0, 0, newInterval)

	return newInterval, newEaseFactor, nextReview
}

func (s *scoringService) buildReason(features FeatureBreakdown, weights *ScoringWeights, stats repo.UserProblemStat) string {
	// Find top 3 contributing features
	type contribution struct {
		name  string
		value float64
	}

	contributions := []contribution{
		{"Low confidence", weights.WConf * features.FConf},
		{"Due for review", weights.WDays * features.FDays},
		{"Needs more practice", weights.WAttempts * features.FAttempts},
		{"Long solve time", weights.WTime * features.FTime},
		{"High difficulty", weights.WDifficulty * features.FDifficulty},
		{"Failed recently", weights.WFailed * features.FFailed},
		{"Weak pattern", weights.WPattern * features.FPattern},
	}

	// Sort by contribution (simple bubble sort for small array)
	for i := 0; i < len(contributions)-1; i++ {
		for j := 0; j < len(contributions)-i-1; j++ {
			if contributions[j].value < contributions[j+1].value {
				contributions[j], contributions[j+1] = contributions[j+1], contributions[j]
			}
		}
	}

	// Build reason from top contributors
	reason := ""
	count := 0
	for _, c := range contributions {
		if c.value > 0.01 && count < 3 { // Only include significant contributors
			if reason != "" {
				reason += ", "
			}

			// Add specific details
			switch c.name {
			case "Low confidence":
				if stats.Confidence.Valid {
					reason += fmt.Sprintf("confidence %d%%", stats.Confidence.Int32)
				} else {
					reason += "low confidence"
				}
			case "Failed recently":
				if features.FFailed > 0.5 {
					reason += "failed recently"
				} else if features.FFailed > 0 {
					reason += "failed before"
				}
			case "Due for review":
				if stats.NextReviewAt.Valid {
					dueDate := stats.NextReviewAt.Time
					daysOverdue := int(time.Since(dueDate).Hours() / 24)
					if daysOverdue > 0 {
						reason += fmt.Sprintf("%d days overdue", daysOverdue)
					} else if daysOverdue == 0 {
						reason += "due today"
					} else {
						reason += fmt.Sprintf("due in %d days", -daysOverdue)
					}
				} else if stats.LastAttemptAt.Valid {
					lastAttempt := stats.LastAttemptAt.Time
					days := int(time.Since(lastAttempt).Hours() / 24)
					reason += fmt.Sprintf("%d days since last", days)
				} else {
					reason += "never attempted"
				}
			case "Needs more practice":
				if stats.TotalAttempts.Valid && stats.TotalAttempts.Int32 < 3 {
					reason += fmt.Sprintf("only %d attempts", stats.TotalAttempts.Int32)
				} else {
					reason += "needs practice"
				}
			default:
				reason += c.name
			}
			count++
		}
	}

	if reason == "" {
		reason = "Needs review"
	}

	return reason
}

func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}
