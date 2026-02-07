package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/go-playground/validator/v10"
	migrations "github.com/vasujain275/reforge/internal/adapters/postgres/migrations"
	"github.com/vasujain275/reforge/internal/env"
)

func main() {
	ctx := context.Background()

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		slog.Error("JWT_SECRET environment variable is not set")
		os.Exit(1)
	}

	cfg := config{
		addr: env.GetString("ADDR", "0.0.0.0:9173"),
		env:  env.GetString("ENV", "dev"),
		db: dbConfig{
			dsn: env.GetString(
				"DATABASE_URL",
				"postgres://reforge:password@localhost:5432/reforge?sslmode=disable",
			),
		},
		auth: authConfig{
			secret: secret,
		},
		defaultWeights: scoringWeightsConfig{
			wConf:       env.GetFloat("DEFAULT_W_CONF", 0.30),
			wDays:       env.GetFloat("DEFAULT_W_DAYS", 0.20),
			wAttempts:   env.GetFloat("DEFAULT_W_ATTEMPTS", 0.10),
			wTime:       env.GetFloat("DEFAULT_W_TIME", 0.05),
			wDifficulty: env.GetFloat("DEFAULT_W_DIFFICULTY", 0.15),
			wFailed:     env.GetFloat("DEFAULT_W_FAILED", 0.10),
			wPattern:    env.GetFloat("DEFAULT_W_PATTERN", 0.10),
		},
		datasetPath: env.GetString("DATASET_PATH", "./sample-datasets"),
	}

	// Logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Create pgxpool for native pgx usage (better performance)
	pool, err := pgxpool.New(ctx, cfg.db.dsn)
	if err != nil {
		slog.Error("Failed to create connection pool", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Ping the database
	if err := pool.Ping(ctx); err != nil {
		slog.Error("Failed to ping database", "error", err)
		os.Exit(1)
	}

	// Run database migrations using stdlib adapter (goose requires database/sql)
	slog.Info("Running database migrations...")
	dbForMigrations, err := sql.Open("pgx", cfg.db.dsn)
	if err != nil {
		slog.Error("Failed to open database for migrations", "error", err)
		os.Exit(1)
	}
	defer dbForMigrations.Close()

	goose.SetBaseFS(migrations.EmbeddedMigrations)
	if err := goose.SetDialect("postgres"); err != nil {
		slog.Error("Failed to set goose dialect", "error", err)
		os.Exit(1)
	}
	if err := goose.Up(dbForMigrations, "."); err != nil {
		slog.Error("Failed to run migrations", "error", err)
		os.Exit(1)
	}
	slog.Info("Database migrations completed successfully")

	// Note: No automatic admin seeding - use /onboarding endpoint for first-time setup

	api := application{
		config:   cfg,
		pool:     pool,
		validate: validator.New(),
	}

	// Setup signal handling for graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	// Run server with graceful shutdown support
	if err := api.run(ctx, api.mount()); err != nil && err != http.ErrServerClosed {
		slog.Error("Server has Failed to Start", "ERROR", err)
		os.Exit(1)
	}

	slog.Info("Server shutdown completed successfully")
}
