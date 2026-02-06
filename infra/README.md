# Reforge Deployment Guide

This directory contains everything you need to deploy Reforge using Docker.

## Architecture

Reforge runs as a **multi-service architecture** with separate containers:

```
┌──────────────────────────────────────────────────┐
│         reforge-web (Frontend - React)           │
│       vasujain275/reforge-web:latest             │
│              Port: 5173                          │
└────────────────────┬─────────────────────────────┘
                     │ API Requests to backend
                     ▼
┌────────────────────────────────────────────────── ┐
│         reforge-api (Backend - Go)               │
│       vasujain275/reforge-api:latest             │
│              Port: 9173                          │
└────────────────────┬─────────────────────────────┘
                     │ PostgreSQL Connection
                     ▼
┌──────────────────────────────────────────────────┐
│           postgres (Database)                    │
│        postgres:18-alpine                        │
│              Port: 5432                          │
└──────────────────────────────────────────────────┘
```

## Quick Start

### Using Docker Compose (Recommended)

1. **Copy the environment template:**
   ```bash
   cp .env.sample .env
   ```

2. **Edit `.env` and set required secrets:**
   ```bash
   # Generate a random JWT secret
   openssl rand -base64 32
   
   # Generate a database password
   openssl rand -base64 32
   
   # Edit the .env file
   nano .env
   ```

3. **Start the stack:**
   ```bash
   docker compose up -d
   ```

4. **Access Reforge:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:9173/api/v1

5. **Complete setup:**
   Follow the onboarding wizard to create your admin account.

### Pulling Individual Images

```bash
# Backend API
docker pull vasujain275/reforge-api:latest

# Frontend Web
docker pull vasujain275/reforge-web:latest
```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `openssl rand -base64 32` |
| `DB_PASSWORD` | PostgreSQL database password | `openssl rand -base64 32` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VERSION` | `latest` | Docker image version tag |
| `POSTGRES_PORT` | `5432` | PostgreSQL port on host |
| `ENV` | `prod` | Environment (`dev` or `prod`) |

### Scoring Weights

The scoring algorithm uses 7 weighted features. Defaults are optimized for most users:

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_W_CONF` | `0.30` | Confidence weight |
| `DEFAULT_W_DAYS` | `0.20` | Days since last attempt |
| `DEFAULT_W_ATTEMPTS` | `0.10` | Total attempts |
| `DEFAULT_W_TIME` | `0.05` | Average time |
| `DEFAULT_W_DIFFICULTY` | `0.15` | Problem difficulty |
| `DEFAULT_W_FAILED` | `0.10` | Last failure |
| `DEFAULT_W_PATTERN` | `0.10` | Pattern weakness |

**Note:** Weights should sum to 1.0 for optimal scoring.

## Services

### Backend API (`reforge-api`)

- **Image:** `vasujain275/reforge-api:latest`
- **Port:** 9173
- **Health Check:** `GET /api/v1/health`
- **Purpose:** REST API backend, handles all business logic

### Frontend Web (`reforge-web`)

- **Image:** `vasujain275/reforge-web:latest`
- **Port:** 5173
- **Purpose:** React SPA, serves the user interface

### PostgreSQL Database (`postgres`)

- **Image:** `postgres:18-alpine`
- **Port:** 5432 (configurable)
- **Data Volume:** `postgres_data`
- **Purpose:** Persistent data storage

## Data Persistence

PostgreSQL data is stored in a Docker volume named `postgres_data`.

### Backup

```bash
# Dump database to SQL file
docker exec reforge-postgres pg_dump -U reforge reforge > backup_$(date +%Y%m%d).sql

# Or backup the entire volume
docker run --rm \
  -v reforge_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### Restore

```bash
# Stop the containers
docker compose down

# Restore from SQL dump
cat backup_20240101.sql | docker exec -i reforge-postgres psql -U reforge -d reforge

# Or restore from volume backup
docker run --rm \
  -v reforge_postgres_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/postgres_backup_20240101.tar.gz"

# Start the containers
docker compose up -d
```

## Updating

```bash
# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d

# View logs
docker compose logs -f
```

## Production Deployment

### Using Caddy Reverse Proxy (Recommended)

For production with HTTPS and a custom domain:

1. **See the Caddy setup guide:**
   - [docs/CADDY_SETUP.md](../docs/CADDY_SETUP.md)

2. **Benefits:**
   - Automatic HTTPS with Let's Encrypt
   - Single domain for frontend and API
   - Enhanced security headers
   - Gzip compression

### Example Caddy Configuration

```caddyfile
reforge.example.com {
    # API proxy
    handle /api/* {
        reverse_proxy reforge-api:9173
    }

    # Frontend
    handle /* {
        reverse_proxy reforge-web:5173
    }

    encode gzip
}
```

## Health Checks

The containers include health checks:

```bash
# Check all services
docker compose ps

# Check API health
curl http://localhost:9173/api/v1/health
# Returns: {"status":"ok"}

# Check frontend
curl http://localhost:5173/
# Returns: HTML page
```

## Troubleshooting

### Containers won't start

Check logs:
```bash
docker compose logs reforge-api
docker compose logs reforge-web
docker compose logs postgres
```

### Database connection errors

1. Ensure PostgreSQL is healthy:
   ```bash
   docker compose ps postgres
   ```

2. Check database credentials in `.env`

3. Verify network connectivity:
   ```bash
   docker network inspect reforge_reforge-network
   ```

### Frontend can't reach backend

1. Verify backend is running:
   ```bash
   curl http://localhost:9173/api/v1/health
   ```

2. Check if both services are on the same network:
   ```bash
   docker network inspect reforge_reforge-network
   ```

3. Check CORS settings (should be relaxed in `ENV=prod`)

### Permission denied on volumes

Fix ownership:
```bash
sudo chown -R 1000:1000 ./postgres_data/
```

### Port already in use

Change ports in `docker-compose.yaml`:
```yaml
reforge-api:
  ports:
    - "9174:9173"  # Changed from 9173 to 9174

reforge-web:
  ports:
    - "5174:5173"  # Changed from 5173 to 5174
```

## Security Recommendations

1. **Generate strong secrets** - Never use defaults in production
   ```bash
   openssl rand -base64 32
   ```

2. **Use HTTPS in production** - Deploy behind Caddy or Nginx reverse proxy

3. **Restrict network access** - Use firewall rules to limit exposed ports

4. **Regular backups** - Automate PostgreSQL database backups

5. **Keep updated** - Pull new images regularly
   ```bash
   docker compose pull && docker compose up -d
   ```

6. **Review logs** - Monitor for suspicious activity
   ```bash
   docker compose logs -f --tail=100
   ```

## Resource Requirements

### Minimum

- **CPU:** 1 core
- **RAM:** 512MB
- **Disk:** 2GB (app + database)
- **Network:** 100 Mbps

### Recommended

- **CPU:** 2+ cores
- **RAM:** 2GB+
- **Disk:** 10GB+ (with room for growth)
- **Network:** 1 Gbps

## Environment-Specific Configs

### Development

```yaml
services:
  reforge-api:
    environment:
      - ENV=dev
      - ADDR=:9173
```

### Staging

```yaml
services:
  reforge-api:
    environment:
      - ENV=prod
      - ADDR=:9173
      - LOG_LEVEL=debug
```

### Production

```yaml
services:
  reforge-api:
    environment:
      - ENV=prod
      - ADDR=:9173
      - LOG_LEVEL=info
    restart: always
```

## Advanced Configuration

### Custom Database Host

To use an external PostgreSQL instance:

1. Comment out the `postgres` service in `docker-compose.yaml`

2. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://user:pass@external-host:5432/reforge?sslmode=require
   ```

### Custom Ports

Edit `docker-compose.yaml`:

```yaml
services:
  reforge-api:
    ports:
      - "8080:9173"  # Expose on port 8080 instead

  reforge-web:
    ports:
      - "3000:5173"  # Expose on port 3000 instead
```

### Resource Limits

Add resource constraints:

```yaml
services:
  reforge-api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Support

- [GitHub Issues](https://github.com/vasujain275/reforge/issues)
- [Documentation](https://github.com/vasujain275/reforge)
- [Caddy Setup Guide](../docs/CADDY_SETUP.md)
