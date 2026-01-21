package sessions

// ============================================================================
// Session Creation & Response Types
// ============================================================================

type CreateSessionBody struct {
	TemplateKey        string  `json:"template_key"`
	SessionName        *string `json:"session_name"`
	PlannedDurationMin int64   `json:"planned_duration_min" validate:"required,gte=1"`
	ProblemIDs         []int64 `json:"problem_ids"          validate:"required,min=1,dive,gte=1"`
	IsCustom           bool    `json:"is_custom"`
	CustomConfig       *string `json:"custom_config"` // JSON string of CustomSessionConfig
}

type GenerateSessionBody struct {
	TemplateKey string `json:"template_key" validate:"required"`
	DurationMin *int64 `json:"duration_min" validate:"omitempty,gte=1"`
	PatternID   *int64 `json:"pattern_id" validate:"omitempty,gte=1"` // For pattern-specific templates
}

type GenerateCustomSessionBody struct {
	Config CustomSessionConfig `json:"config" validate:"required"`
}

type SessionResponse struct {
	ID                 int64            `json:"id"`
	UserID             int64            `json:"user_id"`
	TemplateKey        *string          `json:"template_key"`
	SessionName        *string          `json:"session_name"`
	IsCustom           bool             `json:"is_custom"`
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
	TemplateKey        *string          `json:"template_key"`
	TemplateName       string           `json:"template_name"`        // Display name
	TemplateDesc       string           `json:"template_description"` // Human-readable description
	PlannedDurationMin int64            `json:"planned_duration_min"`
	Problems           []SessionProblem `json:"problems"`
}

// ============================================================================
// Custom Session Builder Types
// ============================================================================

type CustomSessionConfig struct {
	SessionName          string                 `json:"session_name,omitempty"`
	DurationMin          int64                  `json:"duration_min" validate:"required,gte=20,lte=300"`
	ProblemCountStrategy string                 `json:"problem_count_strategy" validate:"required,oneof=auto fixed"`
	FixedProblemCount    *int                   `json:"fixed_problem_count,omitempty" validate:"omitempty,gte=1,lte=20"`
	DifficultyDist       DifficultyDistribution `json:"difficulty_distribution"`
	RequireQuickWin      bool                   `json:"require_quick_win"`
	PatternMode          string                 `json:"pattern_mode" validate:"required,oneof=all specific exclude weakest"`
	PatternIDs           []int64                `json:"pattern_ids,omitempty"`
	MaxSamePattern       int                    `json:"max_same_pattern" validate:"required,gte=1,lte=10"`
	ScoringEmphasis      string                 `json:"scoring_emphasis" validate:"required,oneof=standard confidence time failure"`
	ConfidenceRange      *ConfidenceRange       `json:"confidence_range,omitempty"`
	MinDaysSinceLast     *int                   `json:"min_days_since_last,omitempty" validate:"omitempty,gte=0,lte=365"`
	Goals                []string               `json:"goals,omitempty"`
}

type DifficultyDistribution struct {
	EasyPercent   float64 `json:"easy_percent" validate:"gte=0,lte=100"`
	MediumPercent float64 `json:"medium_percent" validate:"gte=0,lte=100"`
	HardPercent   float64 `json:"hard_percent" validate:"gte=0,lte=100"`
}

type ConfidenceRange struct {
	Min int `json:"min" validate:"gte=0,lte=100"`
	Max int `json:"max" validate:"gte=0,lte=100"`
}

// ============================================================================
// Note: TemplateConfig is defined in templates.go to avoid circular dependencies
// ============================================================================

type TemplateConfig struct {
	Key         string `json:"key"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	Category    string `json:"category"` // "daily", "pattern", "weekend"
	Icon        string `json:"icon"`     // Emoji for UI
	DurationMin int64  `json:"duration_min"`

	// Problem selection constraints
	MaxDifficulty  string                  `json:"max_difficulty"` // "easy", "medium", "hard", or "" for all
	DifficultyDist *DifficultyDistribution `json:"difficulty_dist,omitempty"`
	MinQuickWins   int                     `json:"min_quick_wins"`
	MaxSamePattern int                     `json:"max_same_pattern"`

	// Pattern focus
	PatternMode  string `json:"pattern_mode"`         // "all", "weakest", "specific", "multi_pattern"
	PatternCount int    `json:"pattern_count"`        // For "weakest" mode
	PatternID    *int64 `json:"pattern_id,omitempty"` // For "specific" mode (user-provided)

	// Scoring adjustments
	ScoringEmphasis string `json:"scoring_emphasis"` // "standard", "confidence", "time", "failure"

	// Advanced constraints
	MinConfidence    *int `json:"min_confidence,omitempty"`
	MaxConfidence    *int `json:"max_confidence,omitempty"`
	MinDaysSinceLast *int `json:"min_days_since_last,omitempty"`

	// Smart features
	AdaptiveDifficulty bool `json:"adaptive_difficulty"` // Adjust based on recent performance
	ProgressionMode    bool `json:"progression_mode"`    // Easy → Medium → Hard ordering
}

// ============================================================================
// User Saved Templates
// ============================================================================

type UserSessionTemplate struct {
	ID           int64               `json:"id"`
	UserID       int64               `json:"user_id"`
	TemplateName string              `json:"template_name"`
	TemplateKey  *string             `json:"template_key,omitempty"`
	Config       CustomSessionConfig `json:"config"`
	CreatedAt    string              `json:"created_at"`
	UpdatedAt    string              `json:"updated_at"`
	LastUsedAt   *string             `json:"last_used_at,omitempty"`
	UseCount     int                 `json:"use_count"`
	IsFavorite   bool                `json:"is_favorite"`
}

type SaveTemplateBody struct {
	TemplateName string              `json:"template_name" validate:"required,min=1,max=100"`
	Config       CustomSessionConfig `json:"config" validate:"required"`
	IsFavorite   bool                `json:"is_favorite"`
}

type UpdateTemplateBody struct {
	TemplateName *string              `json:"template_name,omitempty" validate:"omitempty,min=1,max=100"`
	Config       *CustomSessionConfig `json:"config,omitempty"`
	IsFavorite   *bool                `json:"is_favorite,omitempty"`
}

// ============================================================================
// Template Listing
// ============================================================================

type TemplateListResponse struct {
	Presets []TemplateInfo        `json:"presets"`
	Custom  []UserSessionTemplate `json:"custom"`
}

type TemplateInfo struct {
	Key         string `json:"key"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Icon        string `json:"icon"`
	DurationMin int64  `json:"duration_min"`
}
