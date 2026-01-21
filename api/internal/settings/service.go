package settings

import (
	"context"
	"fmt"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
)

type Service interface {
	GetScoringWeights(ctx context.Context) (*ScoringWeightsResponse, error)
	UpdateScoringWeights(ctx context.Context, body UpdateScoringWeightsBody) (*ScoringWeightsResponse, error)
}

type settingsService struct {
	repo repo.Querier
}

func NewService(repo repo.Querier) Service {
	return &settingsService{
		repo: repo,
	}
}

func (s *settingsService) GetScoringWeights(ctx context.Context) (*ScoringWeightsResponse, error) {
	rows, err := s.repo.GetScoringWeights(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get scoring weights: %w", err)
	}

	weights := &ScoringWeightsResponse{
		WConf:       0.30,
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

func (s *settingsService) UpdateScoringWeights(ctx context.Context, body UpdateScoringWeightsBody) (*ScoringWeightsResponse, error) {
	// Update each provided weight
	updates := map[string]*float64{
		"w_conf":       body.WConf,
		"w_days":       body.WDays,
		"w_attempts":   body.WAttempts,
		"w_time":       body.WTime,
		"w_difficulty": body.WDifficulty,
		"w_failed":     body.WFailed,
		"w_pattern":    body.WPattern,
	}

	for key, value := range updates {
		if value != nil {
			valueStr := fmt.Sprintf("%.2f", *value)
			_, err := s.repo.UpdateSystemSetting(ctx, repo.UpdateSystemSettingParams{
				Key:   key,
				Value: valueStr,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to update %s: %w", key, err)
			}
		}
	}

	// Return updated weights
	return s.GetScoringWeights(ctx)
}

func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}
