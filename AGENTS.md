# AGENTS.md - Guide for AI Coding Agents

This guide helps AI coding agents understand the Reforge project structure, conventions, and workflows.

## Project Overview

**Reforge** is a local-first, self-hostable DSA (Data Structures & Algorithms) revision tool for coding interview preparation.

**Tech Stack:**
- **Backend:** Go 1.23+, Chi router, SQLite, goose migrations, SQLC for type-safe queries
- **Frontend:** React 19, TypeScript 5.7+, Vite, Shadcn UI, Tailwind CSS, Zustand state management
- **Package Manager:** **pnpm** (CRITICAL: Always use pnpm, never npm/yarn)
- **Build Tool (Backend):** go-task (Taskfile.yaml)

## Critical Requirements

1. **ALWAYS use `pnpm`** for frontend operations - never use npm or yarn
2. **ALWAYS use `task` command** (go-task) for backend operations - never run `go` commands directly
3. **ALWAYS use Shadcn CLI** to add UI components: `pnpm shadcn add <component>`
4. Follow the "Nerdy Linux" / "Self-Hosted Engineering Tool" design aesthetic (see STYLE-GUIDE.md)

## Frontend Development

### Directory Structure
- `/web` - Frontend application root
- `/web/src/components` - React components (use Shadcn UI)
- `/web/src/lib` - Utilities and shared code
- `/web/src/stores` - Zustand state stores

### Common Commands
```bash
cd web

# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Lint
pnpm lint

# Add Shadcn UI component
pnpm shadcn add <component-name>
```

### TypeScript Guidelines
- **Strict mode enabled** - all types must be explicit
- Prefer interfaces over types for object shapes
- Use type inference where obvious, explicit types for function signatures
- Avoid `any` - use `unknown` if type is truly unknown

### React Patterns
- Functional components only (no class components)
- Use hooks for state and side effects
- Zustand for global state management
- Follow Shadcn UI component patterns and composition

### Styling
- **Tailwind CSS** for all styling - no CSS modules or styled-components
- Use OKLCH color palette (see STYLE-GUIDE.md)
- Reference design tokens from Tailwind config
- Use Lucide React for icons: `import { IconName } from 'lucide-react'`
- Dark mode is primary, ensure designs work in dark theme first

### Import Order (Frontend)
```typescript
// 1. React and core libraries
import React from 'react'
import { useState } from 'react'

// 2. External packages
import { useQuery } from '@tanstack/react-query'

// 3. Internal components and utilities
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 4. Types
import type { User } from '@/types'

// 5. Relative imports
import './styles.css'
```

## Backend Development

### Directory Structure
- `/api` - Backend application root
- `/api/cmd/server` - Main application entry point
- `/api/internal` - Internal packages (hexagonal architecture)
- `/api/migrations` - Goose database migrations
- `/api/queries` - SQLC query definitions

### Common Commands
```bash
cd api

# Run server (production mode)
task run

# Development mode with hot reload
task dev

# Run all tests
task test

# Run single test
go test -v ./internal/domain/user -run TestCreateUser

# Lint code
task lint

# Database migrations
task migrate        # Run pending migrations
task migrate:down   # Rollback last migration
task db:reset       # Reset database (dev only)

# Generate SQLC code
task sqlc:generate

# Build binary
task build
```

### Go Guidelines
- Follow standard Go conventions and idioms
- Use hexagonal/ports-and-adapters architecture
- Keep business logic in `/internal/domain`
- Use interfaces for dependencies (ports)
- Error handling: wrap errors with context using `fmt.Errorf("context: %w", err)`

### Database Patterns
- **SQLite** is the source of truth
- Use SQLC for all database queries - write SQL in `/api/queries/*.sql`
- Run `task sqlc:generate` after modifying queries
- Use goose for migrations: create in `/api/migrations`
- Naming: snake_case for tables and columns

### Import Order (Backend)
```go
// 1. Standard library
import (
    "context"
    "fmt"
)

// 2. External packages
import (
    "github.com/go-chi/chi/v5"
)

// 3. Internal packages
import (
    "reforge/internal/domain"
    "reforge/internal/ports"
)
```

### Testing
- Test files: `*_test.go` alongside source files
- Use table-driven tests for multiple cases
- Mock external dependencies using interfaces
- Run specific test: `go test -v ./path/to/package -run TestName`

## Code Style and Conventions

### Naming Conventions
- **Frontend (TypeScript/React):**
  - Components: PascalCase (`UserProfile.tsx`)
  - Functions/variables: camelCase (`getUserData`)
  - Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
  - Types/Interfaces: PascalCase (`type User`, `interface UserProps`)

- **Backend (Go):**
  - Files: snake_case (`user_service.go`)
  - Exported: PascalCase (`type User`, `func NewService`)
  - Unexported: camelCase (`func validateEmail`)
  - Packages: lowercase, single word (`package user`)

- **Database (SQL):**
  - Tables/columns: snake_case (`user_profiles`, `created_at`)

### Error Handling
- **Go:** Always handle errors, wrap with context, return errors up the stack
  ```go
  if err != nil {
      return fmt.Errorf("failed to create user: %w", err)
  }
  ```

- **TypeScript:** Use try-catch for async operations, handle promise rejections
  ```typescript
  try {
      await fetchData()
  } catch (error) {
      console.error('Failed to fetch data:', error)
  }
  ```

## Architecture Notes

- **Hexagonal Architecture** in backend: domain → ports (interfaces) → adapters (implementations)
- **Local-first:** SQLite database, works offline, self-hostable
- **API:** RESTful JSON API with JWT authentication
- **State Management:** Zustand stores for frontend global state
- **Type Safety:** SQLC generates Go types from SQL, TypeScript strict mode

## Before You Start

1. Read STYLE-GUIDE.md for UI/UX guidelines
2. Check existing components before creating new ones
3. Use Shadcn CLI to add components, don't copy manually
4. Run tests before committing changes
5. Follow the existing code patterns in the project

## Common Pitfalls to Avoid

- ❌ Using npm/yarn instead of pnpm
- ❌ Running `go build` directly instead of `task build`
- ❌ Adding Shadcn components manually instead of using CLI
- ❌ Ignoring TypeScript errors with `@ts-ignore`
- ❌ Using CSS modules or inline styles instead of Tailwind
- ❌ Writing raw SQL in Go code instead of using SQLC
- ❌ Forgetting to run `task sqlc:generate` after query changes
