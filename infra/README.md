# Reforge Deployment Guide

This directory contains everything you need to deploy Reforge using Docker.

## Quick Start

### Using Docker Compose (Recommended)

1. **Copy the environment template:**
   ```bash
   cp .env.sample .env
   ```

2. **Edit `.env` and set a secure JWT secret:**
   ```bash
   # Generate a random secret
   openssl rand -base64 32
   
   # Add it to .env
   JWT_SECRET=your-generated-secret
   ```

3. **Create the data directory:**
   ```bash
   mkdir -p data
   ```

4. **Start the container:**
   ```bash
   docker compose up -d
   ```

5. **Access Reforge:**
   Open http://localhost:9173 in your browser.

6. **Complete setup:**
   Follow the onboarding wizard to create your admin account.

### Using Docker Run

```bash
docker run -d \
  --name reforge \
  -p 9173:9173 \
  -v $(pwd)/data:/app/data \
  -e JWT_SECRET="your-secret-key" \
  -e ENV=prod \
  vasujain275/reforge:latest
```

## Using the Binary

Download the appropriate binary for your platform from the [Releases page](https://github.com/vasujain275/reforge/releases).

### Linux / macOS

```bash
# Make executable
chmod +x reforge-linux-amd64

# Create data directory
mkdir -p data

# Set environment and run
export JWT_SECRET="your-secret-key"
export GOOSE_DBSTRING="file:./data/reforge.db?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)"
./reforge-linux-amd64
```

### Windows

```powershell
# Set environment variables
$env:JWT_SECRET="your-secret-key"
$env:GOOSE_DBSTRING="file:./data/reforge.db?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)"

# Run
.\reforge-windows-amd64.exe
```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `openssl rand -base64 32` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADDR` | `:9173` | Server address |
| `ENV` | `dev` | Environment (`dev` or `prod`) |
| `GOOSE_DBSTRING` | `file:./data/reforge.db?...` | SQLite connection string |

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

## Data Persistence

The SQLite database is stored in `/app/data/reforge.db` inside the container.

### Backup

```bash
# Create backup
cp data/reforge.db backups/reforge-$(date +%Y%m%d).db

# Or use SQLite backup command
sqlite3 data/reforge.db ".backup backups/reforge-$(date +%Y%m%d).db"
```

### Restore

```bash
# Stop the container
docker compose down

# Replace the database
cp backups/reforge-20240101.db data/reforge.db

# Start the container
docker compose up -d
```

## Updating

```bash
# Pull latest image
docker compose pull

# Restart with new image
docker compose up -d
```

## Health Check

The container includes a health check endpoint:

```bash
curl http://localhost:9173/api/v1/health
# Returns: {"status":"ok"}
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs reforge
```

### Database locked errors

Ensure only one instance is running:
```bash
docker ps | grep reforge
```

### Permission denied on data directory

Fix ownership:
```bash
sudo chown -R 1000:1000 data/
```

## Security Recommendations

1. **Generate a strong JWT secret** - Never use the default
2. **Use HTTPS in production** - Put behind a reverse proxy (nginx, Caddy, Traefik)
3. **Restrict network access** - Bind to localhost if not exposing publicly
4. **Regular backups** - Automate SQLite database backups
5. **Keep updated** - Pull new images regularly

## Reverse Proxy (Optional)

### Caddy

```
reforge.example.com {
    reverse_proxy localhost:9173
}
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name reforge.example.com;

    location / {
        proxy_pass http://localhost:9173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Support

- [GitHub Issues](https://github.com/vasujain275/reforge/issues)
- [Documentation](https://github.com/vasujain275/reforge)
