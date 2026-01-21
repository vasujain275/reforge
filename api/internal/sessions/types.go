package sessions

type CreateSessionBody struct {
	TemplateKey        string  `json:"template_key"        validate:"required"`
	PlannedDurationMin int64   `json:"planned_duration_min" validate:"required,gte=1"`
	ProblemIDs         []int64 `json:"problem_ids"          validate:"required,min=1,dive,gte=1"`
}

type GenerateSessionBody struct {
	TemplateKey string `json:"template_key" validate:"required"`
	DurationMin *int64 `json:"duration_min" validate:"omitempty,gte=1"`
}

type SessionResponse struct {
	ID                 int64            `json:"id"`
	UserID             int64            `json:"user_id"`
	TemplateKey        string           `json:"template_key"`
	CreatedAt          string           `json:"created_at"`
	PlannedDurationMin int64            `json:"planned_duration_min"`
	Completed          bool             `json:"completed"`
	Problems           []SessionProblem `json:"problems,omitempty"`
}

type SessionProblem struct {
	ID            int64   `json:"id"`
	Title         string  `json:"title"`
	Difficulty    string  `json:"difficulty"`
	Source        *string `json:"source"`
	PlannedMin    int     `json:"planned_min"`
	Score         float64 `json:"score"`
	DaysSinceLast *int    `json:"days_since_last"`
	Confidence    int64   `json:"confidence"`
	Reason        string  `json:"reason"`
	CreatedAt     string  `json:"created_at"`
}

type GenerateSessionResponse struct {
	TemplateKey        string           `json:"template_key"`
	PlannedDurationMin int64            `json:"planned_duration_min"`
	Problems           []SessionProblem `json:"problems"`
}
