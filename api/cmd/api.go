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
	"github.com/vasujain275/reforge/internal/auth"
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
	userService := users.NewService(repoInstance)
	authService := auth.NewService(repoInstance, app.config.auth.secret)

	// Handlers
	userHandler := users.NewHandler(userService)
	authHandler := auth.NewHandler(authService, isProd)

	r.Route("/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			utils.Write(w, http.StatusOK, healthResponse{Status: "ok"})
		})

		// Auth Endpoints
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", authHandler.Login)
			r.Post("/logout", authHandler.Logout)
			r.Post("/refresh", authHandler.Refresh)
		})
		
		// User Creation
		r.Post("/users",userHandler.CreateUser)

		r.Group(func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			
			// User Endpoints
			r.Route("/users", func(r chi.Router) {
				r.Get("/me", userHandler.GetCurrentUser)
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
	addr string
	env  string
	db   dbConfig
	auth authConfig
}

type dbConfig struct {
	dsn string
}

type authConfig struct {
	secret string
}

type healthResponse struct {
	Status string `json:"status"`
}
