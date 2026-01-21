package dashboard

import (
	"context"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
)

type Service interface {
	GetDashboardStats(ctx context.Context, userID int64) (*DashboardStats, error)
}

type dashboardService struct {
	repo repo.Querier
}

func NewService(repo repo.Querier) Service {
	return &dashboardService{
		repo: repo,
	}
}

func (s *dashboardService) GetDashboardStats(ctx context.Context, userID int64) (*DashboardStats, error) {
	stats := &DashboardStats{}

	// Get total problems
	totalProblems, err := s.repo.GetTotalProblemsForUser(ctx, userID)
	if err == nil {
		stats.TotalProblems = totalProblems
	}

	// Get mastered problems
	masteredProblems, err := s.repo.GetMasteredProblemsForUser(ctx, userID)
	if err == nil {
		stats.MasteredProblems = masteredProblems
	}

	// Get average confidence
	avgConfidence, err := s.repo.GetAverageConfidenceForUser(ctx, userID)
	if err == nil {
		if val, ok := avgConfidence.(float64); ok {
			stats.AvgConfidence = val
		} else if val, ok := avgConfidence.(int64); ok {
			stats.AvgConfidence = float64(val)
		}
	}

	// Get session count
	sessionCount, err := s.repo.GetSessionCount(ctx, userID)
	if err == nil {
		stats.TotalSessions = sessionCount
	}

	// Get weakest pattern
	weakestPattern, err := s.repo.GetWeakestPattern(ctx, userID)
	if err == nil {
		stats.WeakestPattern = &WeakestPattern{
			Name:       weakestPattern.PatternTitle,
			Confidence: weakestPattern.AvgConfidence.Int64,
		}
	}

	// TODO: Calculate current streak from attempts
	stats.CurrentStreak = 0

	return stats, nil
}
