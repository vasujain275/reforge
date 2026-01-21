package main

import (
	"database/sql"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-playground/validator/v10"
	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/admin"
	"github.com/vasujain275/reforge/internal/attempts"
	"github.com/vasujain275/reforge/internal/auth"
	"github.com/vasujain275/reforge/internal/dashboard"
	"github.com/vasujain275/reforge/internal/onboarding"
	"github.com/vasujain275/reforge/internal/patterns"
	"github.com/vasujain275/reforge/internal/problems"
	"github.com/vasujain275/reforge/internal/scoring"
	"github.com/vasujain275/reforge/internal/sessions"
	"github.com/vasujain275/reforge/internal/settings"
	"github.com/vasujain275/reforge/internal/users"
	"github.com/vasujain275/reforge/internal/utils"
)

func (app *application) mount() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(middleware.Timeout(60 * time.Second))

	repoInstance := repo.New(app.db)

	// Determine production status from config
	isProd := app.config.env == "prod"

	// Services
	scoringService := scoring.NewService(repoInstance)
	userService := users.NewService(repoInstance)
	authService := auth.NewService(repoInstance, app.config.auth.secret)
	problemService := problems.NewService(repoInstance, scoringService)
	patternService := patterns.NewService(repoInstance)
	sessionService := sessions.NewService(repoInstance, scoringService)
	attemptService := attempts.NewService(repoInstance)
	dashboardService := dashboard.NewService(repoInstance)

	// Create default weights from config
	defaultWeights := &settings.ScoringWeightsResponse{
		WConf:       app.config.defaultWeights.wConf,
		WDays:       app.config.defaultWeights.wDays,
		WAttempts:   app.config.defaultWeights.wAttempts,
		WTime:       app.config.defaultWeights.wTime,
		WDifficulty: app.config.defaultWeights.wDifficulty,
		WFailed:     app.config.defaultWeights.wFailed,
		WPattern:    app.config.defaultWeights.wPattern,
	}
	settingsService := settings.NewService(repoInstance, defaultWeights)
	adminService := admin.NewService(repoInstance)
	onboardingService := onboarding.NewService(repoInstance)

	// Handlers
	userHandler := users.NewHandler(userService, adminService)
	authHandler := auth.NewHandler(authService, isProd)
	problemHandler := problems.NewHandler(problemService)
	patternHandler := patterns.NewHandler(patternService)
	sessionHandler := sessions.NewHandler(sessionService)
	attemptHandler := attempts.NewHandler(attemptService)
	dashboardHandler := dashboard.NewHandler(dashboardService)
	settingsHandler := settings.NewHandler(settingsService)
	adminHandler := admin.NewHandler(adminService)
	onboardingHandler := onboarding.NewHandler(onboardingService)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			utils.Write(w, http.StatusOK, healthResponse{Status: "ok"})
		})

		// Onboarding Endpoints (Public - for first-time setup)
		r.Route("/onboarding", func(r chi.Router) {
			r.Get("/status", onboardingHandler.GetInitStatus)
			r.Post("/setup", onboardingHandler.CreateFirstAdmin)
		})

		// Auth Endpoints
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", authHandler.Login)
			r.Post("/logout", authHandler.Logout)
			r.Post("/refresh", authHandler.Refresh)
		})

		// User Routes
		r.Route("/users", func(r chi.Router) {
			r.Post("/", userHandler.CreateUser)                  // Public Registration
			r.Post("/reset-password", userHandler.ResetPassword) // Public Password Reset

			r.Group(func(r chi.Router) {
				r.Use(app.AuthTokenMiddleware)
				r.Get("/me", userHandler.GetCurrentUser)
				r.Put("/me/password", userHandler.ChangePassword)
				r.Delete("/me", userHandler.DeleteOwnAccount)
			})
		})

		// Public Settings Routes
		r.Get("/settings/signup", adminHandler.GetSignupSettings) // Public access to check if signup is enabled

		// Protected Routes (require authentication)
		r.Group(func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)

			// Dashboard
			r.Get("/dashboard/stats", dashboardHandler.GetDashboardStats)

			// Problems
			r.Route("/problems", func(r chi.Router) {
				r.Get("/", problemHandler.ListProblemsForUser)
				r.Post("/", problemHandler.CreateProblem)
				r.Get("/urgent", problemHandler.GetUrgentProblems)
				r.Get("/{id}", problemHandler.GetProblem)
				r.Put("/{id}", problemHandler.UpdateProblem)
				r.Delete("/{id}", problemHandler.DeleteProblem)
				r.Get("/{id}/attempts", attemptHandler.ListAttemptsForProblem)
			})

			// Patterns
			r.Route("/patterns", func(r chi.Router) {
				r.Get("/", patternHandler.ListPatternsWithStats)
				r.Post("/", patternHandler.CreatePattern)
				r.Get("/{id}", patternHandler.GetPattern)
				r.Put("/{id}", patternHandler.UpdatePattern)
				r.Delete("/{id}", patternHandler.DeletePattern)
			})

			// Sessions
			r.Route("/sessions", func(r chi.Router) {
				r.Get("/", sessionHandler.ListSessionsForUser)
				r.Post("/", sessionHandler.CreateSession)
				r.Post("/generate", sessionHandler.GenerateSession)
				r.Post("/generate/custom", sessionHandler.GenerateCustomSession)
				r.Get("/templates", sessionHandler.ListTemplates)
				r.Get("/{id}", sessionHandler.GetSession)
				r.Put("/{id}/complete", sessionHandler.CompleteSession)
				r.Put("/{id}/timer", sessionHandler.UpdateSessionTimer)
				r.Delete("/{id}", sessionHandler.DeleteSession)
			})

			// Attempts
			r.Route("/attempts", func(r chi.Router) {
				r.Get("/", attemptHandler.ListAttemptsForUser)
				r.Post("/", attemptHandler.CreateAttempt)
			})

			// Settings
			r.Route("/settings", func(r chi.Router) {
				r.Get("/weights", settingsHandler.GetScoringWeights)
				r.Get("/weights/defaults", settingsHandler.GetDefaultWeights)
				r.Put("/weights", settingsHandler.UpdateScoringWeights)
			})

			// Admin Routes (require admin role)
			r.Route("/admin", func(r chi.Router) {
				r.Use(app.RequireAdminMiddleware)

				// User Management
				r.Route("/users", func(r chi.Router) {
					r.Get("/", adminHandler.ListUsers)
					r.Post("/{id}/role", adminHandler.UpdateUserRole)
					r.Post("/{id}/deactivate", adminHandler.DeactivateUser)
					r.Post("/{id}/reactivate", adminHandler.ReactivateUser)
					r.Delete("/{id}", adminHandler.DeleteUser)
					r.Post("/{id}/reset-password", adminHandler.InitiatePasswordReset)
				})

				// Invite Codes
				r.Route("/invites", func(r chi.Router) {
					r.Get("/", adminHandler.ListInviteCodes)
					r.Post("/", adminHandler.CreateInviteCode)
					r.Delete("/{id}", adminHandler.DeleteInviteCode)
				})

				// Settings Management
				r.Route("/settings", func(r chi.Router) {
					r.Get("/signup", adminHandler.GetSignupSettings)
					r.Put("/signup/enabled", adminHandler.UpdateSignupEnabled)
					r.Put("/signup/invites", adminHandler.UpdateInviteCodesEnabled)
				})
			})
		})

	})

	return r
}

func (app *application) run(h http.Handler) error {
	srv := http.Server{
		Addr:         app.config.addr,
		Handler:      h,
		WriteTimeout: time.Second * 30,
		ReadTimeout:  time.Second * 10,
		IdleTimeout:  time.Minute,
	}

	slog.Info("Server has started at addr: " + app.config.addr)

	return srv.ListenAndServe()
}

type application struct {
	config   config
	db       *sql.DB
	validate *validator.Validate
}

type config struct {
	addr           string
	env            string
	db             dbConfig
	auth           authConfig
	defaultWeights scoringWeightsConfig
}

type dbConfig struct {
	dsn string
}

type authConfig struct {
	secret string
}

type scoringWeightsConfig struct {
	wConf       float64
	wDays       float64
	wAttempts   float64
	wTime       float64
	wDifficulty float64
	wFailed     float64
	wPattern    float64
}

type healthResponse struct {
	Status string `json:"status"`
}
