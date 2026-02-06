# Installation Guide

This guide covers installing and running Reforge on your system.

## Quick Install

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/vasujain275/reforge.git
cd reforge

# Copy environment template
cp infra/.env.sample infra/.env

# Edit .env and set JWT_SECRET, DB_PASSWORD, and VITE_BACKEND_URL (required)
# Generate secrets with: openssl rand -base64 32
# For Docker: VITE_BACKEND_URL=http://reforge-api:9173
# For local dev: VITE_BACKEND_URL=http://localhost:9173
nano infra/.env

# Run
docker compose -f infra/docker-compose.yaml up -d

# Access
# Frontend: http://localhost:5173
# Backend API: http://localhost:9173
```

### Option 2: From Source

#### Prerequisites

- Go 1.23+
- Node.js 20+
- pnpm
- go-task

#### Backend Setup

```bash
# Clone repository
git clone https://github.com/vasujain275/reforge.git
cd reforge

# Set up backend
cd api
cp .env.example .env
# Edit .env and set JWT_SECRET (use: openssl rand -base64 32)

# Install tools
task install:tools

# Run backend
task dev
# Backend runs on http://localhost:9173
```

#### Frontend Setup

```bash
# In a new terminal
cd web
pnpm install

# For local development with backend at localhost:9173
# (Optional) Set backend URL if different from default
export VITE_BACKEND_URL=http://localhost:9173

# Development mode
pnpm dev
# Frontend runs on http://localhost:5173 with API proxy

# Production build
pnpm build
# Serve the dist/ folder with any static file server
```

## Configuration

### Required Environment Variables

**Backend (`api/.env`)**

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `openssl rand -base64 32` |
| `ADDR` | Server address | `0.0.0.0:9173` |
| `ENV` | Environment | `dev` or `prod` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/reforge` |

### Optional Environment Variables

**Backend**

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ALLOWED_ORIGINS` | (empty) | Comma-separated origins for CORS |
| `DB_PASSWORD` | (none) | PostgreSQL password (Docker only) |

**Frontend (`web/.env`)** - Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | `http://localhost:9173` | Backend URL for Vite dev server proxy (Docker: `http://reforge-api:9173`, Local: `http://localhost:9173`) |

### CORS Configuration

- **Development:** CORS is relaxed (allows all origins when `ENV=dev`)
- **Production:** Set `CORS_ALLOWED_ORIGINS` to your frontend domain(s)

```bash
# Example for production
CORS_ALLOWED_ORIGINS='https://reforge.yourcompany.com,https://app.reforge.com'
```

### Generate JWT Secret

```bash
# Linux/macOS
openssl rand -base64 32
```

## First-Time Setup

1. **Start Backend** - API runs on `:9173`
2. **Start Frontend** - Dev server on `:5173` (or serve built files)
3. **Database migrations run automatically** on backend startup
4. **Open** `http://localhost:5173` in your browser
5. **Complete Onboarding** - Create your admin account
6. **Import Problems** - Go to Settings → Data Management to import datasets

## Architecture

Reforge runs as **separate backend and frontend services**:

- **Backend (Go):** REST API on port 9173
- **Frontend (React):** Vite dev server on port 5173 (development) or static files (production)
- **Database:** PostgreSQL 18 on port 5432

In development, Vite proxies `/api/*` requests to the backend URL specified by `VITE_BACKEND_URL` environment variable (defaults to `http://localhost:9173`).

## Database Migrations

Migrations run automatically on backend startup:

```
INFO Running database migrations...
INFO Database migrations completed successfully
```

## Data Storage

Your data is stored in PostgreSQL:

- **Docker:** `postgres_data` volume (managed by Docker)
- **Local Development:** PostgreSQL server (configurable in `.env`)

### Backup

```bash
# PostgreSQL backup (Docker)
docker exec reforge-postgres pg_dump -U reforge reforge > backup_$(date +%Y%m%d).sql

# PostgreSQL backup (local)
pg_dump -h localhost -U reforge reforge > backup_$(date +%Y%m%d).sql
```

## Updating

### Backend

```bash
cd api
git pull
task dev
# Migrations run automatically
```

### Frontend

```bash
cd web
git pull
pnpm install
pnpm dev  # or pnpm build for production
```

## Production Deployment

See [infra/README.md](../infra/README.md) for production Docker setup and [docs/CADDY_SETUP.md](./CADDY_SETUP.md) for Caddy reverse proxy configuration with:

- Automatic HTTPS with Let's Encrypt
- PostgreSQL database
- Multi-service Docker Compose orchestration

## Troubleshooting

### Port already in use

Change the backend port in `api/.env`:
```bash
ADDR='0.0.0.0:8080'
```

Change the frontend port:
```bash
cd web
pnpm dev --port 3001
```

### CORS errors

- **Development:** Ensure `ENV=dev` in `api/.env`
- **Production:** Set `CORS_ALLOWED_ORIGINS` with your frontend domain

### Database locked

Ensure only one backend instance is running.

### JWT_SECRET not set

```bash
# In api/.env
JWT_SECRET="your-secret-key"
```

## System Requirements

- **OS**: Linux, macOS, or Windows
- **Memory**: 512MB+ RAM (backend + frontend), 1GB+ (development with hot reload)
- **Disk**: 2GB+ for app + database
- **Ports**: 9173 (backend), 5173 (frontend), 5432 (PostgreSQL)

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [BACKUP.md](./BACKUP.md) - Database backup strategies

## Support

- [GitHub Issues](https://github.com/vasujain275/reforge/issues)
- [Documentation](https://github.com/vasujain275/reforge)
