# Installation Guide

This guide covers installing and running Reforge on your system.

## Quick Install

### Option 1: Docker (Recommended)

```bash
# Create directory
mkdir reforge && cd reforge

# Download docker-compose
curl -O https://raw.githubusercontent.com/vasujain275/reforge/main/docker-compose.yaml
curl -O https://raw.githubusercontent.com/vasujain275/reforge/main/.env.example

# Configure
cp .env.example .env
# Edit .env and set JWT_SECRET (required)

# Create data directory
mkdir data

# Run
docker compose up -d

# Access
# Backend API: http://localhost:8080
# Frontend: http://localhost:5173 (in development) or serve /web/dist for production
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
# Backend runs on http://localhost:8080
```

#### Frontend Setup

```bash
# In a new terminal
cd web
pnpm install

# Development mode
pnpm dev
# Frontend runs on http://localhost:5173 with API proxy to :8080

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
| `ADDR` | Server address | `0.0.0.0:8080` |
| `ENV` | Environment | `dev` or `prod` |

### Optional Environment Variables

**Backend**

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ALLOWED_ORIGINS` | (empty) | Comma-separated origins for CORS |
| `GOOSE_DBSTRING` | `file:./data/reforge.db?...` | Database connection |

**Frontend (`web/.env`)** - Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | Backend API URL (uses proxy in dev) |

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

1. **Start Backend** - API runs on `:8080`
2. **Start Frontend** - Dev server on `:5173` (or serve built files)
3. **Database migrations run automatically** on backend startup
4. **Open** `http://localhost:5173` in your browser
5. **Complete Onboarding** - Create your admin account
6. **Import Problems** - Go to Settings → Data Management to import datasets

## Architecture

Reforge now runs as **separate backend and frontend services**:

- **Backend (Go):** REST API on port 8080
- **Frontend (React):** Vite dev server on port 5173 (development) or static files (production)

In development, Vite proxies `/api/*` requests to the backend at `:8080`.

## Database Migrations

Migrations run automatically on backend startup:

```
INFO Running database migrations...
INFO Database migrations completed successfully
```

## Data Storage

Your data is stored in PostgreSQL (or SQLite in development):

- **Docker:** `./data/reforge.db` (bind mount)
- **Local:** `./api/data/reforge.db`

### Backup

```bash
# SQLite backup
sqlite3 api/data/reforge.db ".backup backups/reforge-$(date +%Y%m%d).db"

# PostgreSQL backup
pg_dump -h localhost -U reforge reforge > backup.sql
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

See [Docker Deployment](../docker-compose.yaml) for production setup with:

- Nginx reverse proxy
- PostgreSQL database
- Docker Compose orchestration

## Troubleshooting

### Port already in use

Change the backend port in `api/.env`:
```bash
ADDR='0.0.0.0:3000'
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
- **Memory**: 256MB+ RAM (backend), 512MB+ (development with hot reload)
- **Disk**: 200MB+ for app + database
- **Ports**: 8080 (backend), 5173 (frontend dev)

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [BACKUP.md](./BACKUP.md) - Database backup strategies

## Support

- [GitHub Issues](https://github.com/vasujain275/reforge/issues)
- [Documentation](https://github.com/vasujain275/reforge)
