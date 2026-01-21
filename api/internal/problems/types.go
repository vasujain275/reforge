package problems

type CreateProblemBody struct {
	Title      string  `json:"title"      validate:"required"`
	Source     *string `json:"source"     validate:"omitempty"`
	URL        *string `json:"url"        validate:"omitempty,url"`
	Difficulty string  `json:"difficulty" validate:"required,oneof=easy medium hard"`
	PatternIDs []int64 `json:"pattern_ids" validate:"omitempty,dive,gte=1"`
}

type UpdateProblemBody struct {
	Title      string  `json:"title"      validate:"required"`
	Source     *string `json:"source"     validate:"omitempty"`
	URL        *string `json:"url"        validate:"omitempty,url"`
	Difficulty string  `json:"difficulty" validate:"required,oneof=easy medium hard"`
	PatternIDs []int64 `json:"pattern_ids" validate:"omitempty,dive,gte=1"`
}

type ProblemWithStats struct {
	ID         int64     `json:"id"`
	Title      string    `json:"title"`
	Source     *string   `json:"source"`
	URL        *string   `json:"url"`
	Difficulty string    `json:"difficulty"`
	CreatedAt  string    `json:"created_at"`
	Stats      *Stats    `json:"stats"`
	Patterns   []Pattern `json:"patterns"`
	Score      *float64  `json:"score,omitempty"`
	Reason     *string   `json:"reason,omitempty"`
}

type Stats struct {
	ID            int64   `json:"id"`
	UserID        int64   `json:"user_id"`
	ProblemID     int64   `json:"problem_id"`
	Status        string  `json:"status"`
	Confidence    int64   `json:"confidence"`
	AvgConfidence int64   `json:"avg_confidence"`
	LastAttemptAt *string `json:"last_attempt_at"`
	TotalAttempts int64   `json:"total_attempts"`
	LastOutcome   *string `json:"last_outcome"`
	UpdatedAt     string  `json:"updated_at"`
}

type Pattern struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
}

type UrgentProblem struct {
	ID            int64   `json:"id"`
	Title         string  `json:"title"`
	Difficulty    string  `json:"difficulty"`
	Source        *string `json:"source"`
	Score         float64 `json:"score"`
	DaysSinceLast *int    `json:"days_since_last"`
	Confidence    int64   `json:"confidence"`
	Reason        string  `json:"reason"`
	CreatedAt     string  `json:"created_at"`
}
