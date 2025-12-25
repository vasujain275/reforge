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
