package attempts

type CreateAttemptBody struct {
	ProblemID       int64   `json:"problem_id"       validate:"required,gte=1"`
	SessionID       *int64  `json:"session_id"       validate:"omitempty,gte=1"`
	ConfidenceScore int64   `json:"confidence_score" validate:"required,gte=0,lte=100"`
	DurationSeconds *int64  `json:"duration_seconds" validate:"omitempty,gte=0"`
	Outcome         string  `json:"outcome"          validate:"required,oneof=passed failed"`
	Notes           *string `json:"notes"            validate:"omitempty"`
	PerformedAt     *string `json:"performed_at"     validate:"omitempty"`
}

type AttemptResponse struct {
	ID                int64   `json:"id"`
	UserID            int64   `json:"user_id"`
	ProblemID         int64   `json:"problem_id"`
	SessionID         *int64  `json:"session_id"`
	ConfidenceScore   int64   `json:"confidence_score"`
	DurationSeconds   *int64  `json:"duration_seconds"`
	Outcome           string  `json:"outcome"`
	Notes             *string `json:"notes"`
	PerformedAt       string  `json:"performed_at"`
	ProblemTitle      *string `json:"problem_title,omitempty"`
	ProblemDifficulty *string `json:"problem_difficulty,omitempty"`
}
