package main

import (
	"context"
	"database/sql"
	"log/slog"

	repo "github.com/vasujain275/reforge/internal/adapters/sqlite/sqlc"
	"github.com/vasujain275/reforge/internal/env"
	"github.com/vasujain275/reforge/internal/security"
)

// seedAdminIfNeeded checks if any admin exists in the database.
// If no admin exists, it creates one using credentials from environment variables.
// This ensures there's always at least one admin user to manage the system.
func seedAdminIfNeeded(ctx context.Context, db *sql.DB) error {
	queries := repo.New(db)

	// Check if any admin exists
	adminCount, err := queries.CountAdmins(ctx)
	if err != nil {
		return err
	}

	// Admin already exists, no need to seed
	if adminCount > 0 {
		slog.Info("Admin user already exists, skipping seed")
		return nil
	}

	// Get seed credentials from environment
	email := env.GetString("SEED_ADMIN_EMAIL", "")
	name := env.GetString("SEED_ADMIN_NAME", "System Administrator")
	password := env.GetString("SEED_ADMIN_PASSWORD", "")

	if email == "" || password == "" {
		slog.Warn("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD not set, skipping admin seed")
		slog.Warn("You will need to create an admin user manually in the database")
		return nil
	}

	// Hash password
	passwordHash, err := security.HashPassword(password)
	if err != nil {
		return err
	}

	// Create admin user
	_, err = queries.CreateUser(ctx, repo.CreateUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		Name:         name,
		Role:         sql.NullString{String: "admin", Valid: true},
	})

	if err != nil {
		return err
	}

	slog.Info("Admin user seeded successfully", "email", email)
	slog.Warn("IMPORTANT: Change the admin password immediately after first login!")

	return nil
}
