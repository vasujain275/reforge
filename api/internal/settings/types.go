package settings

type ScoringWeightsResponse struct {
	WConf       float64 `json:"w_conf"`
	WDays       float64 `json:"w_days"`
	WAttempts   float64 `json:"w_attempts"`
	WTime       float64 `json:"w_time"`
	WDifficulty float64 `json:"w_difficulty"`
	WFailed     float64 `json:"w_failed"`
	WPattern    float64 `json:"w_pattern"`
}

type UpdateScoringWeightsBody struct {
	WConf       float64 `json:"w_conf"       validate:"required,gte=0,lte=1"`
	WDays       float64 `json:"w_days"       validate:"required,gte=0,lte=1"`
	WAttempts   float64 `json:"w_attempts"   validate:"required,gte=0,lte=1"`
	WTime       float64 `json:"w_time"       validate:"required,gte=0,lte=1"`
	WDifficulty float64 `json:"w_difficulty" validate:"required,gte=0,lte=1"`
	WFailed     float64 `json:"w_failed"     validate:"required,gte=0,lte=1"`
	WPattern    float64 `json:"w_pattern"    validate:"required,gte=0,lte=1"`
}
