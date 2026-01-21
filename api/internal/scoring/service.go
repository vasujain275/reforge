package scoring

import (
	"context"
	"fmt"
	"math"
	"time"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
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
	ProblemID int64
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
	ComputeScore(ctx context.Context, userID int64, problemID int64) (*ProblemScore, error)
	ComputeScoresForUser(ctx context.Context, userID int64) ([]ProblemScore, error)
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

func (s *scoringService) ComputeScore(ctx context.Context, userID int64, problemID int64) (*ProblemScore, error) {
	// Get weights
	weights, err := s.GetWeights(ctx)
	if err != nil {
		return nil, err
	}

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

	// Compute features
	features := s.computeFeatures(stats, problem, patterns, userID, ctx)

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

func (s *scoringService) ComputeScoresForUser(ctx context.Context, userID int64) ([]ProblemScore, error) {
	// Get all user problem stats
	statsList, err := s.repo.ListUserProblemStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list user problem stats: %w", err)
	}

	scores := make([]ProblemScore, 0, len(statsList))
	for _, stats := range statsList {
		// Skip abandoned problems
		if stats.Status.Valid && stats.Status.String == "abandoned" {
			continue
		}

		score, err := s.ComputeScore(ctx, userID, stats.ProblemID)
		if err != nil {
			// Log error but continue
			fmt.Printf("Warning: failed to compute score for problem %d: %v\n", stats.ProblemID, err)
			continue
		}

		scores = append(scores, *score)
	}

	return scores, nil
}

func (s *scoringService) computeFeatures(
	stats repo.UserProblemStat,
	problem repo.Problem,
	patterns []repo.Pattern,
	userID int64,
	ctx context.Context,
) FeatureBreakdown {
	features := FeatureBreakdown{}

	// 1. f_conf - confidence urgency
	confidence := float64(50) // default
	if stats.Confidence.Valid {
		confidence = float64(stats.Confidence.Int64)
	}
	features.FConf = (100.0 - confidence) / 100.0

	// 2. f_days - age urgency with dynamic mastery multiplier
	daysSinceLast := 365.0 // default for never attempted
	if stats.LastAttemptAt.Valid {
		lastAttempt, err := time.Parse(time.RFC3339, stats.LastAttemptAt.String)
		if err == nil {
			daysSinceLast = time.Since(lastAttempt).Hours() / 24.0
		}
	}

	// Calculate mastery multiplier
	avgConfidence := float64(50)
	if stats.AvgConfidence.Valid {
		avgConfidence = float64(stats.AvgConfidence.Int64)
	}
	totalAttempts := int64(0)
	if stats.TotalAttempts.Valid {
		totalAttempts = stats.TotalAttempts.Int64
	}

	masteryMultiplier := 1.0
	if totalAttempts > 3 && avgConfidence > 90 {
		masteryMultiplier = 4.0
	} else if totalAttempts > 1 && avgConfidence > 80 {
		masteryMultiplier = 2.0
	}

	dynamicDaysCap := 90.0 * masteryMultiplier
	features.FDays = math.Min(daysSinceLast, dynamicDaysCap) / dynamicDaysCap

	// 3. f_attempts - attempt-based signal
	const attemptCap = 10.0
	features.FAttempts = math.Min(float64(totalAttempts), attemptCap) / attemptCap

	// 4. f_time - time-based complexity
	if stats.AvgTimeSeconds.Valid && stats.AvgTimeSeconds.Int64 > 0 {
		const timeCap = 3600.0 // 1 hour
		features.FTime = math.Min(float64(stats.AvgTimeSeconds.Int64), timeCap) / timeCap
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

	// 6. f_failed - last outcome failure flag
	if stats.LastOutcome.Valid && stats.LastOutcome.String == "failed" {
		features.FFailed = 1.0
	} else {
		features.FFailed = 0.0
	}

	// 7. f_pattern - pattern weakness (aggregated)
	if len(patterns) > 0 {
		totalWeakness := 0.0
		for _, pattern := range patterns {
			patternStats, err := s.repo.GetUserPatternStats(ctx, repo.GetUserPatternStatsParams{
				UserID:    userID,
				PatternID: pattern.ID,
			})
			if err == nil && patternStats.AvgConfidence.Valid {
				patternWeakness := 1.0 - (float64(patternStats.AvgConfidence.Int64) / 100.0)
				totalWeakness += patternWeakness
			} else {
				totalWeakness += 0.5 // fallback
			}
		}
		features.FPattern = totalWeakness / float64(len(patterns))
	} else {
		features.FPattern = 0.5 // fallback
	}

	return features
}

func (s *scoringService) buildReason(features FeatureBreakdown, weights *ScoringWeights, stats repo.UserProblemStat) string {
	// Find top 3 contributing features
	type contribution struct {
		name  string
		value float64
	}

	contributions := []contribution{
		{"Low confidence", weights.WConf * features.FConf},
		{"Time since last attempt", weights.WDays * features.FDays},
		{"Multiple attempts", weights.WAttempts * features.FAttempts},
		{"Long solve time", weights.WTime * features.FTime},
		{"High difficulty", weights.WDifficulty * features.FDifficulty},
		{"Failed last attempt", weights.WFailed * features.FFailed},
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
					reason += fmt.Sprintf("Low confidence (%d%%)", stats.Confidence.Int64)
				}
			case "Failed last attempt":
				if features.FFailed > 0 {
					reason += "failed last"
				}
			case "Time since last attempt":
				if stats.LastAttemptAt.Valid {
					lastAttempt, err := time.Parse(time.RFC3339, stats.LastAttemptAt.String)
					if err == nil {
						days := int(time.Since(lastAttempt).Hours() / 24)
						reason += fmt.Sprintf("%d days since last", days)
					}
				} else {
					reason += "never attempted"
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
