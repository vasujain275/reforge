package patterns

type CreatePatternBody struct {
	Title       string  `json:"title"       validate:"required"`
	Description *string `json:"description" validate:"omitempty"`
}

type UpdatePatternBody struct {
	Title       string  `json:"title"       validate:"required"`
	Description *string `json:"description" validate:"omitempty"`
}

type PatternWithStats struct {
	ID           int64             `json:"id"`
	Title        string            `json:"title"`
	Description  *string           `json:"description"`
	ProblemCount int64             `json:"problemCount"`
	Stats        *PatternUserStats `json:"stats"`
}

type PatternUserStats struct {
	ID            int64   `json:"id"`
	UserID        int64   `json:"user_id"`
	PatternID     int64   `json:"pattern_id"`
	TimesRevised  int64   `json:"times_revised"`
	AvgConfidence int64   `json:"avg_confidence"`
	LastRevisedAt *string `json:"last_revised_at"`
}
