package dashboard

type DashboardStats struct {
	TotalProblems    int64           `json:"total_problems"`
	MasteredProblems int64           `json:"mastered_problems"`
	AvgConfidence    float64         `json:"avg_confidence"`
	CurrentStreak    int64           `json:"current_streak"`
	TotalSessions    int64           `json:"total_sessions"`
	WeakestPattern   *WeakestPattern `json:"weakest_pattern,omitempty"`
}

type WeakestPattern struct {
	Name       string `json:"name"`
	Confidence int64  `json:"confidence"`
}
