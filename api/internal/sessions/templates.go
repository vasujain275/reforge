package sessions

// ptr is a helper function to get pointer to a value
func ptr[T any](v T) *T { return &v }

// AllTemplates defines the 10 smart preset templates for interview preparation
// These replace the original 7 basic templates with more intelligent logic
var AllTemplates = map[string]TemplateConfig{
	// ========================================================================
	// CATEGORY A: DAILY REVISION TEMPLATES (3)
	// ========================================================================

	"morning_momentum": {
		Key:                  "morning_momentum",
		DisplayName:          "Morning Momentum Builder",
		Description:          "Start your day with confidence wins. 3-4 problems you've solved before with high confidence.",
		Category:             "daily",
		Icon:                 "⚡",
		DurationMin:          35,
		MaxDifficulty:        "medium",
		MinQuickWins:         2,
		MaxSamePattern:       2,
		MinProblems:          3,
		MinDifferentPatterns: 2,
		PatternMode:          "all",
		ScoringEmphasis:      "standard",
		MinConfidence:        ptr(70), // Focus on problems with conf >= 70
		MinDaysSinceLast:     ptr(7),  // Spaced repetition: 7-14 day window
	},

	"weakness_crusher": {
		Key:                  "weakness_crusher",
		DisplayName:          "Weakness Crusher",
		Description:          "Target your documented weak spots. 2-3 problems from low-confidence patterns.",
		Category:             "daily",
		Icon:                 "🎯",
		DurationMin:          45,
		MaxDifficulty:        "medium",
		MinQuickWins:         1,
		MaxSamePattern:       3, // Allow clustering of weak pattern
		MinProblems:          2,
		MinDifferentPatterns: 1,
		PatternMode:          "weakest",
		PatternCount:         2,            // Pick from 2 weakest patterns
		ScoringEmphasis:      "confidence", // 2x weight on low confidence
		MaxConfidence:        ptr(65),      // Only problems with conf < 65
	},

	"daily_mixed_grind": {
		Key:                  "daily_mixed_grind",
		DisplayName:          "Daily Mixed Grind",
		Description:          "Standard daily practice with variety. Easy-Medium-Hard mix with adaptive difficulty.",
		Category:             "daily",
		Icon:                 "📚",
		DurationMin:          55,
		DifficultyDist:       &DifficultyDistribution{10, 60, 30}, // 10% easy, 60% med, 30% hard
		MinQuickWins:         1,
		MaxSamePattern:       2,
		MinProblems:          3,
		MinDifferentPatterns: 2,
		PatternMode:          "all",
		ScoringEmphasis:      "standard",
		AdaptiveDifficulty:   true, // Adjusts based on recent session outcomes
	},

	// ========================================================================
	// CATEGORY B: PATTERN MASTERY TEMPLATES (4)
	// ========================================================================

	"pattern_deep_dive": {
		Key:                  "pattern_deep_dive",
		DisplayName:          "Pattern Deep Dive",
		Description:          "Master a single pattern intensively. 4-6 problems with progressive difficulty.",
		Category:             "pattern",
		Icon:                 "🔬",
		DurationMin:          90,
		MaxDifficulty:        "hard",
		MaxSamePattern:       6, // All problems can be from same pattern
		MinProblems:          4,
		MinDifferentPatterns: 1,          // Single pattern focus
		PatternMode:          "specific", // User selects pattern
		ScoringEmphasis:      "confidence",
		ProgressionMode:      true, // Easy → Medium → Hard ordering
	},

	"pattern_rotation": {
		Key:                  "pattern_rotation",
		DisplayName:          "Pattern Rotation Week",
		Description:          "Systematic pattern exposure. 3 problems from your 3 weakest patterns.",
		Category:             "pattern",
		Icon:                 "🔄",
		DurationMin:          60,
		MaxDifficulty:        "medium",
		MinQuickWins:         0,
		MaxSamePattern:       1, // Force variety - max 1 per pattern
		MinProblems:          3,
		MinDifferentPatterns: 3, // Exactly 3 different patterns
		PatternMode:          "weakest",
		PatternCount:         3,      // Rotate through 3 weakest
		MinDaysSinceLast:     ptr(5), // Avoid patterns practiced in last 5 days
	},

	"pattern_combo_chains": {
		Key:                  "pattern_combo_chains",
		DisplayName:          "Pattern Combo Chains",
		Description:          "Practice hybrid problems requiring multiple patterns (e.g., DFS + Backtracking).",
		Category:             "pattern",
		Icon:                 "🔗",
		DurationMin:          75,
		MaxDifficulty:        "hard",
		MaxSamePattern:       2,
		MinProblems:          3,
		MinDifferentPatterns: 2,
		PatternMode:          "multi_pattern", // Special: requires 2+ patterns per problem
		ScoringEmphasis:      "standard",
	},

	"pattern_graduation": {
		Key:                  "pattern_graduation",
		DisplayName:          "Pattern Mastery Graduation",
		Description:          "Test mastery with 3 hard problems from selected pattern. Pass 2/3 to graduate.",
		Category:             "pattern",
		Icon:                 "🎓",
		DurationMin:          50,
		DifficultyDist:       &DifficultyDistribution{0, 33, 67}, // 1 medium, 2 hard
		MaxSamePattern:       3,
		MinProblems:          3,
		MinDifferentPatterns: 1,          // Single pattern focus
		PatternMode:          "specific", // User selects pattern to graduate from
		MinDaysSinceLast:     ptr(14),    // Only "rested" problems
	},

	// ========================================================================
	// CATEGORY C: WEEKEND / LONG SESSION TEMPLATES (3)
	// ========================================================================

	"weekend_comprehensive": {
		Key:                  "weekend_comprehensive",
		DisplayName:          "Weekend Comprehensive",
		Description:          "Deep weekend practice. 6-8 problems across all difficulty levels and 5+ patterns.",
		Category:             "weekend",
		Icon:                 "🏖️",
		DurationMin:          150,
		DifficultyDist:       &DifficultyDistribution{15, 55, 30}, // 15% easy, 55% med, 30% hard
		MinQuickWins:         2,
		MaxSamePattern:       3,
		MinProblems:          6,
		MinDifferentPatterns: 5, // Ensure broad pattern coverage
		PatternMode:          "all",
		ScoringEmphasis:      "standard",
	},

	"weak_pattern_marathon": {
		Key:                  "weak_pattern_marathon",
		DisplayName:          "Weak Pattern Marathon",
		Description:          "Intensive focus on 2 weakest patterns. 5-6 problems with confidence-building progression.",
		Category:             "weekend",
		Icon:                 "🚨",
		DurationMin:          120,
		DifficultyDist:       &DifficultyDistribution{40, 50, 10}, // Easier for confidence building
		MinQuickWins:         2,
		MaxSamePattern:       3,
		MinProblems:          5,
		MinDifferentPatterns: 2, // At least 2 weak patterns
		PatternMode:          "weakest",
		PatternCount:         2,
		ScoringEmphasis:      "confidence",
	},

	"challenge_gauntlet": {
		Key:                  "challenge_gauntlet",
		DisplayName:          "Challenge Gauntlet",
		Description:          "Simulate interview pressure. 3-4 medium/hard problems with strict time allocations.",
		Category:             "weekend",
		Icon:                 "🔥",
		DurationMin:          100,
		DifficultyDist:       &DifficultyDistribution{0, 50, 50}, // No easy problems
		MaxSamePattern:       2,
		MinProblems:          3,
		MinDifferentPatterns: 2,
		PatternMode:          "all",
		ScoringEmphasis:      "standard",
		MinConfidence:        ptr(60), // Only attempt if somewhat competent
	},
}

// GetTemplate retrieves a template by key
func GetTemplate(key string) (TemplateConfig, bool) {
	template, exists := AllTemplates[key]
	return template, exists
}

// GetTemplatesByCategory returns all templates for a given category
func GetTemplatesByCategory(category string) []TemplateConfig {
	var templates []TemplateConfig
	for _, tmpl := range AllTemplates {
		if tmpl.Category == category {
			templates = append(templates, tmpl)
		}
	}
	return templates
}

// GetAllTemplateInfos returns lightweight template info for listing
func GetAllTemplateInfos() []TemplateInfo {
	infos := make([]TemplateInfo, 0, len(AllTemplates))
	for _, tmpl := range AllTemplates {
		infos = append(infos, TemplateInfo{
			Key:         tmpl.Key,
			DisplayName: tmpl.DisplayName,
			Description: tmpl.Description,
			Category:    tmpl.Category,
			Icon:        tmpl.Icon,
			DurationMin: tmpl.DurationMin,
		})
	}
	return infos
}

// ValidateTemplateKey checks if a template key exists
func ValidateTemplateKey(key string) bool {
	_, exists := AllTemplates[key]
	return exists
}

// AllowDifficulty checks if a difficulty level is allowed by template config
func (tc *TemplateConfig) AllowDifficulty(difficulty string) bool {
	if tc.MaxDifficulty == "" {
		return true // No filter
	}

	difficultyOrder := map[string]int{
		"easy":   1,
		"medium": 2,
		"hard":   3,
	}

	maxLevel, maxExists := difficultyOrder[tc.MaxDifficulty]
	currentLevel, currentExists := difficultyOrder[difficulty]

	if !maxExists || !currentExists {
		return false
	}

	return currentLevel <= maxLevel
}
