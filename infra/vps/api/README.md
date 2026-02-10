# Reforge API Deployment

Blue-green deployment for Reforge API with zero-downtime updates using Traefik.

## Prerequisites

- Traefik global instance running (see `../traefik/README.md`)
- DNS configured: `reforge-api.vasujain.me` → VPS IP
- Docker and Docker Compose installed

## Quick Start

### 1. Configure Environment

```bash
cd /home/vasu/personal/reforge/infra/vps/api

# Copy environment template
cp .env.sample .env

# Edit configuration
vim .env
```

**Required Configuration:**

```bash
# JWT Secret (must match frontend)
JWT_SECRET=your-jwt-secret-here

# Database password
POSTGRES_PASSWORD=your-strong-password

# API domain
API_DOMAIN=reforge-api.vasujain.me

# Deployment versions
BLUE_VERSION=latest
GREEN_VERSION=latest
ACTIVE_COLOR=blue
```

### 2. Initial Deployment

```bash
# Pull images
docker compose pull

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 3. Verify Deployment

```bash
# Test health endpoints
curl http://localhost:9173/api/v1/health  # Blue
curl http://localhost:9174/api/v1/health  # Green

# Test public endpoint (via Traefik)
curl https://reforge-api.vasujain.me/api/v1/health
```

## Deployment Workflow

### Deploy New Version

```bash
# Deploy latest
./deploy.sh deploy latest

# Deploy specific version
./deploy.sh deploy 1.2.3
```

**What happens:**
1. New version pulls to inactive slot (e.g., green)
2. Green container starts and runs health checks
3. Traefik automatically routes to healthy containers
4. Old container (blue) drains connections and stops
5. Slots swap: green becomes active, blue becomes standby

### Check Status

```bash
./deploy.sh status
```

### Rollback

```bash
./deploy.sh rollback
```

## Database Management

### Backup Database

```bash
# Create backup
./backup.sh backup

# List backups
./backup.sh list

# Backups stored in: ./backups/reforge_backup_YYYYMMDD_HHMMSS.sql.gz
```

### Restore Database

```bash
./backup.sh restore backups/reforge_backup_20240207_120000.sql.gz
```

### Manual Database Operations

```bash
# Access PostgreSQL shell
docker exec -it reforge-postgres psql -U reforge -d reforge

# Run SQL query
docker exec reforge-postgres psql -U reforge -d reforge -c "SELECT COUNT(*) FROM users;"

# Check database size
docker exec reforge-postgres psql -U reforge -d reforge -c "SELECT pg_size_pretty(pg_database_size('reforge'));"
```

## Monitoring

### Container Status

```bash
# Check all containers
docker compose ps

# View logs
docker compose logs -f

# Specific service logs
docker compose logs -f reforge-api-blue
docker compose logs -f reforge-api-green
docker compose logs -f postgres
```

### Health Checks

```bash
# Blue container
curl http://localhost:9173/api/v1/health

# Green container
curl http://localhost:9174/api/v1/health

# Public (via Traefik)
curl https://reforge-api.vasujain.me/api/v1/health
```

### Traefik Dashboard

View routing and health status:
```
https://dashboard.vasujain.me
```

## Troubleshooting

### Containers Won't Start

```bash
# Check logs
docker compose logs

# Common issues:
# 1. Invalid DATABASE_URL - Check POSTGRES_PASSWORD in .env
# 2. Missing JWT_SECRET - Verify .env file
# 3. Traefik not running - Check ../traefik/

# Restart services
docker compose restart
```

### Health Checks Failing

```bash
# Check if API is responding
curl -v http://localhost:9173/api/v1/health

# Check database connection
docker compose logs reforge-api-blue | grep -i database

# Restart container
docker compose restart reforge-api-blue
```

### Traefik Not Routing Traffic

```bash
# Check Traefik logs
cd ../traefik
docker compose logs traefik | grep reforge

# Verify containers are on traefik-public network
docker network inspect traefik-public

# Verify container labels
docker inspect reforge-api-blue | grep traefik
```

### Deployment Stuck

```bash
# Check deploy script output
./deploy.sh status

# Manually check health
curl http://localhost:9174/api/v1/health

# Rollback if needed
./deploy.sh rollback
```

## Common Commands

```bash
# Deploy new version
./deploy.sh deploy latest

# Check status
./deploy.sh status

# Rollback
./deploy.sh rollback

# Backup database
./backup.sh backup

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop all services
docker compose down

# Start all services
docker compose up -d
```

## File Structure

```
api/
├── docker-compose.yml     # PostgreSQL + Blue + Green API
├── deploy.sh              # Deployment automation
├── backup.sh              # Database backup/restore
├── .env.sample            # Environment template
├── .env                   # Your configuration (not in git)
├── .gitignore
├── backups/               # Database backups
│   └── .gitkeep
└── README.md              # This file
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Traefik (Global)                │
│     reforge-api.vasujain.me             │
│  (Health-based load balancing)          │
└──────────┬──────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐   ┌─────────┐
│  BLUE   │   │  GREEN  │
│  :9173  │   │  :9174  │
│(active) │   │(standby)│
└────┬────┘   └────┬────┘
     │             │
     └──────┬──────┘
            ▼
    ┌──────────────┐
    │ PostgreSQL 18│
    │   (Alpine)   │
    └──────────────┘
```

## Features

- **Zero-Downtime** - Blue-green deployment with automatic traffic switching
- **Health-Based Routing** - Traefik only routes to healthy containers
- **Automatic HTTPS** - Let's Encrypt certificates via Traefik
- **CORS Support** - Configured via Traefik middleware
- **Database Backups** - Automated backup script with compression
- **Easy Rollback** - One command to rollback to previous version

## Security Notes

- PostgreSQL bound to localhost only (`127.0.0.1:5432`)
- JWT_SECRET must match frontend configuration
- Use strong passwords (generate with `openssl rand -base64 32`)
- Regular database backups recommended
- Traefik handles TLS termination

## CI/CD Integration

For GitHub Actions:

```yaml
- name: Deploy to VPS
  run: |
    ssh user@vps "cd /path/to/api && ./deploy.sh deploy ${{ github.ref_name }}"
```

## Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
