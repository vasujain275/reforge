package attempts

// CreateAttemptBody is used for creating a completed attempt directly (legacy flow)
type CreateAttemptBody struct {
	ProblemID       string  `json:"problem_id"       validate:"required,uuid"`
	SessionID       *string `json:"session_id"       validate:"omitempty,uuid"`
	ConfidenceScore int64   `json:"confidence_score" validate:"required,gte=0,lte=100"`
	DurationSeconds *int64  `json:"duration_seconds" validate:"omitempty,gte=0"`
	Outcome         string  `json:"outcome"          validate:"required,oneof=passed failed"`
	Notes           *string `json:"notes"            validate:"omitempty"`
	PerformedAt     *string `json:"performed_at"     validate:"omitempty"`
}

// AttemptResponse is the standard response for completed attempts
type AttemptResponse struct {
	ID                string  `json:"id"`
	UserID            string  `json:"user_id"`
	ProblemID         string  `json:"problem_id"`
	SessionID         *string `json:"session_id"`
	ConfidenceScore   int64   `json:"confidence_score"`
	DurationSeconds   *int64  `json:"duration_seconds"`
	Outcome           string  `json:"outcome"`
	Notes             *string `json:"notes"`
	PerformedAt       string  `json:"performed_at"`
	ProblemTitle      *string `json:"problem_title,omitempty"`
	ProblemDifficulty *string `json:"problem_difficulty,omitempty"`
}

// ============================================================================
// ATTEMPT TIMER TYPES (for stopwatch functionality)
// ============================================================================

// StartAttemptBody is the request body for starting a new in-progress attempt
type StartAttemptBody struct {
	ProblemID string  `json:"problem_id" validate:"required,uuid"`
	SessionID *string `json:"session_id" validate:"omitempty,uuid"`
}

// UpdateAttemptTimerBody is the request body for updating attempt timer state
type UpdateAttemptTimerBody struct {
	ElapsedTimeSeconds int64  `json:"elapsed_time_seconds" validate:"required,gte=0"`
	TimerState         string `json:"timer_state"          validate:"required,oneof=idle running paused"`
}

// CompleteAttemptBody is the request body for completing an in-progress attempt
type CompleteAttemptBody struct {
	ConfidenceScore int64   `json:"confidence_score" validate:"required,gte=0,lte=100"`
	Outcome         string  `json:"outcome"          validate:"required,oneof=passed failed"`
	Notes           *string `json:"notes"            validate:"omitempty"`
	DurationSeconds *int64  `json:"duration_seconds" validate:"omitempty,gte=0"` // Optional: override elapsed time
}

// InProgressAttemptResponse is the response for in-progress attempts (timer page)
type InProgressAttemptResponse struct {
	ID                 string  `json:"id"`
	UserID             string  `json:"user_id"`
	ProblemID          string  `json:"problem_id"`
	SessionID          *string `json:"session_id,omitempty"`
	Status             string  `json:"status"`
	ElapsedTimeSeconds int64   `json:"elapsed_time_seconds"`
	TimerState         string  `json:"timer_state"`
	TimerLastUpdatedAt *string `json:"timer_last_updated_at,omitempty"`
	StartedAt          string  `json:"started_at"`
	ProblemTitle       *string `json:"problem_title,omitempty"`
	ProblemDifficulty  *string `json:"problem_difficulty,omitempty"`
}
