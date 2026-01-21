package settings

import (
	"context"
	"database/sql"
	"fmt"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
)

type Service interface {
	GetScoringWeights(ctx context.Context) (*ScoringWeightsResponse, error)
	GetDefaultWeights() *ScoringWeightsResponse
	UpdateScoringWeights(ctx context.Context, body UpdateScoringWeightsBody) (*ScoringWeightsResponse, error)
}

type settingsService struct {
	repo           repo.Querier
	defaultWeights *ScoringWeightsResponse
}

func NewService(repo repo.Querier, defaultWeights *ScoringWeightsResponse) Service {
	return &settingsService{
		repo:           repo,
		defaultWeights: defaultWeights,
	}
}

func (s *settingsService) GetDefaultWeights() *ScoringWeightsResponse {
	return s.defaultWeights
}

func (s *settingsService) GetScoringWeights(ctx context.Context) (*ScoringWeightsResponse, error) {
	rows, err := s.repo.GetScoringWeights(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get scoring weights: %w", err)
	}

	// Start with default weights
	weights := &ScoringWeightsResponse{
		WConf:       s.defaultWeights.WConf,
		WDays:       s.defaultWeights.WDays,
		WAttempts:   s.defaultWeights.WAttempts,
		WTime:       s.defaultWeights.WTime,
		WDifficulty: s.defaultWeights.WDifficulty,
		WFailed:     s.defaultWeights.WFailed,
		WPattern:    s.defaultWeights.WPattern,
	}

	// Override with stored values
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
	// Weight descriptions for clarity
	descriptions := map[string]string{
		"w_conf":       "Confidence weight for scoring algorithm",
		"w_days":       "Days since last attempt weight",
		"w_attempts":   "Total attempts weight",
		"w_time":       "Average time weight",
		"w_difficulty": "Problem difficulty weight",
		"w_failed":     "Failed streak weight",
		"w_pattern":    "Pattern weakness weight",
	}

	// Update each weight
	updates := map[string]float64{
		"w_conf":       body.WConf,
		"w_days":       body.WDays,
		"w_attempts":   body.WAttempts,
		"w_time":       body.WTime,
		"w_difficulty": body.WDifficulty,
		"w_failed":     body.WFailed,
		"w_pattern":    body.WPattern,
	}

	for key, value := range updates {
		valueStr := fmt.Sprintf("%.2f", value)
		_, err := s.repo.UpsertSystemSetting(ctx, repo.UpsertSystemSettingParams{
			Key:   key,
			Value: valueStr,
			Description: sql.NullString{
				String: descriptions[key],
				Valid:  true,
			},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to update %s: %w", key, err)
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
