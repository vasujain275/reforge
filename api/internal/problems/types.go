package problems

type CreateProblemBody struct {
	Title      string   `json:"title"      validate:"required"`
	Source     *string  `json:"source"     validate:"omitempty"`
	URL        *string  `json:"url"        validate:"omitempty,url"`
	Difficulty string   `json:"difficulty" validate:"required,oneof=easy medium hard"`
	PatternIDs []string `json:"pattern_ids" validate:"omitempty,dive,uuid"`
}

type UpdateProblemBody struct {
	Title      string   `json:"title"      validate:"required"`
	Source     *string  `json:"source"     validate:"omitempty"`
	URL        *string  `json:"url"        validate:"omitempty,url"`
	Difficulty string   `json:"difficulty" validate:"required,oneof=easy medium hard"`
	PatternIDs []string `json:"pattern_ids" validate:"omitempty,dive,uuid"`
}

type ProblemWithStats struct {
	ID         string    `json:"id"`
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
	ID            string  `json:"id"`
	UserID        string  `json:"user_id"`
	ProblemID     string  `json:"problem_id"`
	Status        string  `json:"status"`
	Confidence    int32   `json:"confidence"`
	AvgConfidence int32   `json:"avg_confidence"`
	LastAttemptAt *string `json:"last_attempt_at"`
	TotalAttempts int32   `json:"total_attempts"`
	LastOutcome   *string `json:"last_outcome"`
	UpdatedAt     string  `json:"updated_at"`
}

type Pattern struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
}

type UrgentProblem struct {
	ID            string  `json:"id"`
	Title         string  `json:"title"`
	Difficulty    string  `json:"difficulty"`
	Source        *string `json:"source"`
	Score         float64 `json:"score"`
	DaysSinceLast *int    `json:"days_since_last"`
	Confidence    int32   `json:"confidence"`
	Reason        string  `json:"reason"`
	CreatedAt     string  `json:"created_at"`
}

type SearchProblemsParams struct {
	Query      string
	Difficulty string
	Status     string
	Limit      int32
	Offset     int32
}

type PaginatedProblems struct {
	Data       []ProblemWithStats `json:"data"`
	Total      int64              `json:"total"`
	Page       int32              `json:"page"`
	PageSize   int32              `json:"page_size"`
	TotalPages int32              `json:"total_pages"`
}
