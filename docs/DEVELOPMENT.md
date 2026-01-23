# Development Guide

This guide covers setting up your development environment for Reforge.

## Prerequisites

- **Go** 1.23+ ([install](https://go.dev/doc/install))
- **Node.js** 20+ ([install](https://nodejs.org/))
- **pnpm** ([install](https://pnpm.io/installation))
- **go-task** ([install](https://taskfile.dev/installation/))

## Quick Start

```bash
# Clone the repository
git clone https://github.com/vasujain275/reforge.git
cd reforge

# Install frontend dependencies
cd web && pnpm install && cd ..

# Install backend tools
cd api && task install:tools && cd ..
```

## Development Workflow

You need two terminals - one for frontend, one for backend:

### Terminal 1: Frontend (React + Vite)

```bash
cd web
pnpm dev
```

This starts the Vite dev server on `http://localhost:5173` with hot reload.
API requests are proxied to the backend at `http://localhost:9173`.

### Terminal 2: Backend (Go + Air)

```bash
cd api
cp .env.example .env  # First time only
task dev
```

This starts the Go server on `http://localhost:9173` with hot reload via Air.

### Access the App

Open `http://localhost:5173` in your browser. The frontend dev server proxies `/api/*` requests to the backend.

## Project Structure

```
reforge/
├── api/                    # Go backend
│   ├── cmd/                # Application entrypoint
│   ├── internal/           # Business logic (hexagonal architecture)
│   │   ├── adapters/       # Database adapters (SQLite)
│   │   ├── auth/           # Authentication service
│   │   ├── problems/       # Problems domain
│   │   ├── patterns/       # Patterns domain
│   │   ├── sessions/       # Sessions domain
│   │   ├── attempts/       # Attempts domain
│   │   ├── scoring/        # Scoring algorithm
│   │   └── ...
│   ├── web/                # Embedded frontend (production only)
│   ├── sample-datasets/    # Bundled problem datasets
│   └── Taskfile.yaml       # Task commands
├── web/                    # React frontend
│   ├── src/
│   │   ├── components/     # UI components (Shadcn)
│   │   ├── pages/          # Route pages
│   │   ├── store/          # Zustand stores
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   └── types/          # TypeScript types
│   └── package.json
├── infra/                  # Docker deployment
├── docs/                   # Documentation
└── Reforge.md              # Technical specification
```

## Backend Commands

All commands run from the `api/` directory:

```bash
# Run server (production mode)
task run

# Development with hot reload
task dev

# Run tests
task test

# Run linter
task lint

# Database migrations
task goose:up         # Apply migrations
task goose:down       # Rollback
task goose:status     # Show status

# Generate SQLC code
task sqlc:generate

# Build binary
task build
```

## Frontend Commands

All commands run from the `web/` directory:

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint

# Add Shadcn component
pnpm shadcn add <component-name>
```

## Environment Variables

### Backend (`api/.env`)

```env
ADDR=':9173'
ENV='dev'
GOOSE_DBSTRING='file:./data/reforge.db?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)'
GOOSE_DRIVER='sqlite'
JWT_SECRET='your-secret-key'

# Scoring weights (optional)
DEFAULT_W_CONF='0.30'
DEFAULT_W_DAYS='0.20'
DEFAULT_W_ATTEMPTS='0.10'
DEFAULT_W_TIME='0.05'
DEFAULT_W_DIFFICULTY='0.15'
DEFAULT_W_FAILED='0.10'
DEFAULT_W_PATTERN='0.10'
```

## Code Conventions

### Go (Backend)

- Hexagonal architecture: domain → ports → adapters
- Use SQLC for database queries
- Error wrapping: `fmt.Errorf("context: %w", err)`
- Files: `snake_case.go`
- Exported: `PascalCase`

### TypeScript (Frontend)

- Functional components only
- Zustand for state management
- Tailwind CSS for styling
- Components: `PascalCase.tsx`
- Variables: `camelCase`

### Database

- Use goose for migrations
- Tables/columns: `snake_case`
- Run `task sqlc:generate` after changing queries

## Testing

```bash
# Backend tests
cd api && task test

# Single test
cd api && go test -v ./internal/auth -run TestLogin

# Frontend lint
cd web && pnpm lint
```

## Building for Production

```bash
# 1. Build frontend
cd web && pnpm build

# 2. Copy dist to api for embedding
cp -r dist ../api/web/

# 3. Build Go binary
cd ../api && task build

# 4. Run
JWT_SECRET="secret" ./bin/kiro-api
# Server runs on http://localhost:9173
```

## Related Documentation

- [AGENTS.md](../AGENTS.md) - AI agent guidelines
- [STYLE-GUIDE.md](../STYLE-GUIDE.md) - Frontend design patterns
- [Reforge.md](../Reforge.md) - Complete technical specification
- [infra/README.md](../infra/README.md) - Deployment guide
