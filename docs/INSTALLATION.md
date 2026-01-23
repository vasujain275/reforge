# Installation Guide

This guide covers installing and running Reforge on your system.

## Quick Install

### Option 1: Docker (Recommended)

```bash
# Create directory
mkdir reforge && cd reforge

# Download docker-compose
curl -O https://raw.githubusercontent.com/vasujain275/reforge/main/infra/docker-compose.yaml
curl -O https://raw.githubusercontent.com/vasujain275/reforge/main/infra/.env.sample

# Configure
cp .env.sample .env
# Edit .env and set JWT_SECRET (required)

# Create data directory
mkdir data

# Run
docker compose up -d

# Access
open http://localhost:9173
```

### Option 2: Pre-built Binary

Download the latest release from [GitHub Releases](https://github.com/vasujain275/reforge/releases).

#### Linux

```bash
# Download binary
wget https://github.com/vasujain275/reforge/releases/latest/download/reforge-linux-amd64.tar.gz
tar -xzf reforge-linux-amd64.tar.gz

# Download and configure environment
curl -O https://raw.githubusercontent.com/vasujain275/reforge/main/infra/.env.sample
cp .env.sample .env
# Edit .env and set JWT_SECRET (required) - use: openssl rand -base64 32

# Create data directory
mkdir data

# Run (loads .env automatically, or source it)
source .env && ./reforge-linux-amd64

# Access http://localhost:9173
```

#### macOS

```bash
# Intel Mac
wget https://github.com/vasujain275/reforge/releases/latest/download/reforge-darwin-amd64.tar.gz
tar -xzf reforge-darwin-amd64.tar.gz

# Apple Silicon (M1/M2/M3)
wget https://github.com/vasujain275/reforge/releases/latest/download/reforge-darwin-arm64.tar.gz
tar -xzf reforge-darwin-arm64.tar.gz

# Download and configure environment
curl -O https://raw.githubusercontent.com/vasujain275/reforge/main/infra/.env.sample
cp .env.sample .env
# Edit .env and set JWT_SECRET (required) - use: openssl rand -base64 32

# Create data directory
mkdir data

# Run
source .env && ./reforge-darwin-*

# Access http://localhost:9173
```

#### Windows

```powershell
# Download from releases page
# Extract reforge-windows-amd64.zip

# Download environment template
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/vasujain275/reforge/main/infra/.env.sample" -OutFile ".env.sample"
Copy-Item .env.sample .env
# Edit .env and set JWT_SECRET (required)

# Create data directory
mkdir data

# Load environment and run
Get-Content .env | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}
.\reforge-windows-amd64.exe

# Access http://localhost:9173
```

### Option 3: Build from Source

```bash
# Clone
git clone https://github.com/vasujain275/reforge.git
cd reforge

# Install dependencies
cd web && pnpm install && pnpm build && cd ..

# Copy frontend to api
cp -r web/dist api/web/

# Build
cd api && go build -o reforge ./cmd

# Run
JWT_SECRET="your-secret-key" ./reforge
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
| `GOOSE_DBSTRING` | `file:./data/reforge.db?...` | SQLite connection |

### Generate JWT Secret

```bash
# Linux/macOS
openssl rand -base64 32

# Or use any random string generator
```

## First-Time Setup

1. **Start Reforge** using any method above
2. **Open** `http://localhost:9173` in your browser
3. **Complete Onboarding** - Create your admin account
4. **Import Problems** (optional) - Use bundled datasets or add manually

## Data Storage

Reforge uses SQLite. Your data is stored in:

- **Docker**: `./data/reforge.db` (bind mount)
- **Binary**: `./data/reforge.db` (relative to binary)

### Backup

```bash
# Simple backup
cp data/reforge.db backups/reforge-$(date +%Y%m%d).db

# SQLite backup (while running)
sqlite3 data/reforge.db ".backup backups/reforge-$(date +%Y%m%d).db"
```

## Updating

### Docker

```bash
docker compose pull
docker compose up -d
```

### Binary

Download the latest release and replace the binary. Your data is preserved in `./data/`.

## Troubleshooting

### Port already in use

Change the port:
```bash
export ADDR=":3000"
./reforge-linux-amd64
```

Or in Docker:
```yaml
ports:
  - "3000:9173"
```

### Permission denied

```bash
chmod +x reforge-linux-amd64
```

### Database locked

Ensure only one instance is running.

### JWT_SECRET not set

```bash
export JWT_SECRET="your-secret-key"
# Or in Docker, set in .env file
```

## System Requirements

- **OS**: Linux, macOS, or Windows
- **Memory**: 128MB+ RAM
- **Disk**: 100MB+ for app + database
- **Ports**: 9173 (configurable)

## Uninstall

### Docker

```bash
docker compose down
rm -rf data/  # Remove data (optional)
```

### Binary

```bash
rm reforge-*
rm -rf data/  # Remove data (optional)
```

## Related Documentation

- [BACKUP.md](./BACKUP.md) - Database backup strategies
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup

## Support

- [GitHub Issues](https://github.com/vasujain275/reforge/issues)
- [Documentation](https://github.com/vasujain275/reforge)
