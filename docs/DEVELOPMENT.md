# Development Guide

This guide covers setting up your development environment for Reforge.

## Prerequisites

- **Go** 1.23+ ([install](https://go.dev/doc/install))
- **Node.js** 20+ ([install](https://nodejs.org/))
- **pnpm** ([install](https://pnpm.io/installation))
- **go-task** ([install](https://taskfile.dev/installation))

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

Reforge runs as **separate backend and frontend services**. You need two terminals:

### Terminal 1: Backend (Go + Air)

```bash
cd api
cp .env.example .env  # First time only
# Edit .env if needed (defaults are fine for development)
task dev
```

Backend runs on `http://localhost:9173` with hot reload via Air.

### Terminal 2: Frontend (React + Vite)

```bash
cd web
# (Optional) Set backend URL if different from default
export VITE_BACKEND_URL=http://localhost:9173
pnpm dev
```

Frontend runs on `http://localhost:5173` with hot reload. Vite proxies `/api/*` requests to backend URL specified by `VITE_BACKEND_URL` (defaults to `http://localhost:9173`).

### Access the App

Open `http://localhost:5173` in your browser.

- Frontend: Served by Vite dev server (port 5173)
- API calls: Proxied to backend URL from `VITE_BACKEND_URL` env var (defaults to `http://localhost:9173`)

## Project Structure

```
reforge/
├── api/                    # Go backend
│   ├── cmd/                # Application entrypoint
│   ├── internal/           # Business logic (hexagonal architecture)
│   │   ├── adapters/       # Database adapters (SQLite/PostgreSQL)
│   │   ├── auth/           # Authentication service
│   │   ├── problems/       # Problems domain
│   │   ├── patterns/       # Patterns domain
│   │   ├── sessions/       # Sessions domain
│   │   ├── attempts/       # Attempts domain
│   │   ├── scoring/        # Scoring algorithm
│   │   └── ...
│   ├── sample-datasets/    # Bundled problem datasets
│   └── Taskfile.yaml       # Task commands
├── web/                    # React frontend
│   ├── src/
│   │   ├── components/     # UI components (Shadcn)
│   │   ├── pages/          # Route pages
│   │   ├── store/          # Zustand stores
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities (API client, copy, etc.)
│   │   └── types/          # TypeScript types
│   └── package.json
├── docs/                   # Documentation
└── Reforge.md              # Technical specification
```

## Backend Commands

All commands run from the `api/` directory:

```bash
# Development server with hot reload
task dev

# Run server (no hot reload)
task run

# Run tests
task test

# Run linter
task lint

# Database migrations
task goose:up         # Apply migrations
task goose:down       # Rollback
task goose:status     # Show status
task goose:create NAME  # Create new migration

# Generate SQLC code (after modifying queries)
task sqlc:generate

# Build binary
task build
```

## Frontend Commands

All commands run from the `web/` directory:

```bash
# Development server (with API proxy)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm type-check

# Lint code
pnpm lint

# Add Shadcn component
pnpm shadcn add <component-name>
```

## Environment Variables

### Backend (`api/.env`)

```env
# Server Configuration
ADDR='0.0.0.0:9173'
ENV='dev'  # 'dev' or 'prod'

# CORS - Development: relaxed, Production: specify origins
CORS_ALLOWED_ORIGINS='http://localhost:5173,http://localhost:4173'

# Database (SQLite for development)
GOOSE_DBSTRING='file:./data/reforge.db?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)'
GOOSE_DRIVER='sqlite'
GOOSE_MIGRATION_DIR='./internal/adapters/sqlite/migrations'

# Authentication
JWT_SECRET='super-secret-default-key'  # CHANGE IN PRODUCTION!

# Default Scoring Weights (must sum to 1.0)
DEFAULT_W_CONF='0.30'
DEFAULT_W_DAYS='0.20'
DEFAULT_W_ATTEMPTS='0.10'
DEFAULT_W_TIME='0.05'
DEFAULT_W_DIFFICULTY='0.15'
DEFAULT_W_FAILED='0.10'
DEFAULT_W_PATTERN='0.10'

# Admin Seeding (only used if no admin exists)
SEED_ADMIN_EMAIL='admin@reforge.local'
SEED_ADMIN_NAME='System Administrator'
SEED_ADMIN_PASSWORD='ChangeMeImmediately123!'

# Signup Settings
DEFAULT_SIGNUP_ENABLED='true'
DEFAULT_INVITE_CODES_ENABLED='true'
```

### Frontend (`web/.env`) - Optional

```env
# Backend URL for Vite dev server proxy
# Defaults to http://localhost:9173 if not set
VITE_BACKEND_URL=http://localhost:9173
```

## CORS Configuration

The backend includes CORS middleware with environment-based behavior:

- **Development (`ENV=dev`)**: Allows all origins for easier testing
- **Production (`ENV=prod`)**: Only allows origins specified in `CORS_ALLOWED_ORIGINS`

### Development CORS

No configuration needed - all origins are allowed when `ENV=dev`.

### Production CORS

Set `CORS_ALLOWED_ORIGINS` to your frontend domain(s):

```env
CORS_ALLOWED_ORIGINS='https://reforge.yourcompany.com,https://app.reforge.com'
```

## Code Conventions

### Go (Backend)

- Hexagonal architecture: domain → ports → adapters
- Use SQLC for database queries
- Error wrapping: `fmt.Errorf("context: %w", err)`
- Files: `snake_case.go`
- Exported: `PascalCase`
- UUIDs for all entity IDs

### TypeScript (Frontend)

- Functional components only
- Zustand for state management
- Tailwind CSS for styling (no CSS modules)
- Use `COPY` constants from `lib/copy.ts` for all text
- Components: `PascalCase.tsx`
- Variables: `camelCase`
- All entity IDs are `string` (UUIDs)

### Database

- PostgreSQL 16+ for production, SQLite for development
- Use Goose for migrations
- Tables/columns: `snake_case`
- UUID primary keys
- `TIMESTAMPTZ` for timestamps
- Run `task sqlc:generate` after changing queries

## Testing

```bash
# Backend tests
cd api && task test

# Backend test with coverage
cd api && task test:coverage

# Single test
cd api && go test -v ./internal/auth -run TestLogin

# Frontend type check
cd web && pnpm type-check

# Frontend lint
cd web && pnpm lint
```

## API Development

The backend exposes a REST API on port 9173:

- Base URL: `http://localhost:9173/api/v1`
- Health check: `GET /api/v1/health`
- Auth: JWT tokens in HTTP-only cookies
- All requests/responses use JSON

### Testing API Endpoints

```bash
# Health check
curl http://localhost:9173/api/v1/health

# Register user
curl -X POST http://localhost:9173/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:9173/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Get problems (authenticated)
curl http://localhost:9173/api/v1/problems -b cookies.txt
```

## Database Migrations

### Development Workflow

```bash
cd api

# Create a new migration
task goose:create add_new_table

# Edit the migration file in internal/adapters/sqlite/migrations/

# Apply migration
task goose:up

# Check status
task goose:status

# Rollback if needed
task goose:down
```

### Production

Migrations run **automatically on backend startup** via embedded migrations. No manual steps required.

## Common Tasks

### Adding a New Shadcn Component

```bash
cd web
pnpm shadcn add button
pnpm shadcn add dialog
```

### Modifying Database Queries

```bash
# 1. Edit SQL files in api/internal/adapters/sqlite/queries/

# 2. Regenerate Go code
cd api && task sqlc:generate

# 3. Use the generated functions in your services
```

### Adding a New API Endpoint

```bash
# 1. Add route in api/cmd/api.go
# 2. Create handler in api/internal/<domain>/handler.go
# 3. Implement service logic in api/internal/<domain>/service.go
# 4. Add SQLC queries if needed
# 5. Update frontend API client in web/src/lib/api.ts
```

## Troubleshooting

### Backend won't start

```bash
# Check if port 9173 is in use
lsof -i :9173

# Check .env file exists
ls -la api/.env

# Check database file
ls -la api/data/reforge.db
```

### Frontend API calls failing

```bash
# Ensure backend is running on :9173
curl http://localhost:9173/api/v1/health

# Check Vite proxy configuration in web/vite.config.ts

# Check browser console for CORS errors
```

### CORS errors

```bash
# Ensure ENV=dev in api/.env for development
# Check CORS_ALLOWED_ORIGINS includes http://localhost:5173
```

### Database migrations failed

```bash
cd api

# Check migration status
task goose:status

# Manual rollback
task goose:down

# Re-apply
task goose:up
```

## Related Documentation

- [AGENTS.md](../AGENTS.md) - AI agent guidelines  
- [STYLE-GUIDE.md](../STYLE-GUIDE.md) - Frontend design system
- [Reforge.md](../Reforge.md) - Complete technical specification
- [INSTALLATION.md](./INSTALLATION.md) - Installation guide

## Pro Tips

1. **Use Air for hot reload**: Backend automatically recompiles on file changes
2. **Use Vite HMR**: Frontend updates instantly without full page reload
3. **Check logs**: Backend logs appear in the terminal running `task dev`
4. **Use browser DevTools**: React DevTools and Network tab are your friends
5. **Test SQLC changes**: Run `task sqlc:generate` and check for errors
6. **Commit migrations**: Always commit both `.sql` files and generated code
