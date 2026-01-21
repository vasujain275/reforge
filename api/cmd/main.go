package main

import (
	"context"
	"database/sql"
	"log/slog"
	"os"

	_ "modernc.org/sqlite"

	"github.com/go-playground/validator/v10"
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
		addr: env.GetString("ADDR", ":8080"),
		env:  env.GetString("ENV", "dev"),
		db: dbConfig{
			dsn: env.GetString(
				"GOOSE_DBSTRING",
				"file:./data/reforge.db?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)",
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
	}

	// Logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	db, err := sql.Open("sqlite", cfg.db.dsn)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	// IMPORTANT for SQLite
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if err := db.PingContext(ctx); err != nil {
		panic(err)
	}

	// Note: No automatic admin seeding - use /onboarding endpoint for first-time setup

	api := application{
		config:   cfg,
		db:       db,
		validate: validator.New(),
	}

	if err := api.run(api.mount()); err != nil {
		slog.Error("Server has Failed to Start", "ERROR", err)
		os.Exit(1)
	}
}
