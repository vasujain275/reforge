# 🔄 PostgreSQL Migration Update

## Changes Made

Your VPS deployment infrastructure has been updated to host PostgreSQL 18 Alpine **locally on the VPS** instead of using Neon. This provides:

✅ **Better Performance** - No network latency to external database  
✅ **Lower Costs** - No Neon subscription needed  
✅ **More Control** - Full access to database container  
✅ **Data Persistence** - Docker volumes ensure data survives container restarts

---

## Updated Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              reforge-api.vasujain.me                        │
│         (Caddy - Auto HTTPS + Health Routing)               │
└────────────┬────────────────────────────────────────────────┘
             │ Health-check based traffic routing
      ┌──────┴──────┐
      │             │
      ▼             ▼
┌───────────┐   ┌───────────┐
│   BLUE    │   │   GREEN   │
│ API :9173 │   │ API :9174 │
│  (active) │   │ (standby) │
└─────┬─────┘   └─────┬─────┘
      │               │
      └───────┬───────┘
              ▼
     ┌────────────────┐
     │  PostgreSQL 18 │  ← NOW ON VPS!
     │    (Alpine)    │
     │  Port: 5432    │
     └────────────────┘
```

---

## What Changed

### 1. **docker-compose.yaml**
- ✅ Added `postgres` service with PostgreSQL 18 Alpine
- ✅ Added `postgres_data` volume for persistence
- ✅ Updated API containers to connect to local postgres
- ✅ DATABASE_URL now uses internal Docker network

### 2. **.env.sample**
- ✅ Replaced `DATABASE_URL` with `POSTGRES_PASSWORD`
- ✅ Added `POSTGRES_DB` and `POSTGRES_USER` variables
- ✅ Simplified configuration (no complex connection strings)

### 3. **New Files**
- ✅ `backup.sh` - Database backup/restore script
- ✅ `backups/` directory - Stores database backups
- ✅ Updated `.gitignore` - Protects backups from git

---

## Configuration Changes

### Old (.env - Neon):
```bash
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/reforge?sslmode=require
```

### New (.env - Local PostgreSQL):
```bash
# Only need these three variables:
POSTGRES_PASSWORD=your-strong-password-here
POSTGRES_DB=reforge
POSTGRES_USER=reforge
```

**That's it!** DATABASE_URL is automatically constructed in docker-compose.yaml.

---

## Setup Instructions

### Step 1: Update .env File

```bash
cd /opt/reforge/infra/vps

# If you have existing .env, update it:
nano .env

# Remove: DATABASE_URL line
# Add these three lines:
POSTGRES_PASSWORD=generate-strong-password-here  # openssl rand -base64 32
POSTGRES_DB=reforge
POSTGRES_USER=reforge
```

### Step 2: Create Backups Directory

```bash
mkdir -p backups
```

### Step 3: Start PostgreSQL Container

```bash
# Pull latest code with updated compose file
cd /opt/reforge
git pull origin main

# Navigate to VPS directory
cd /opt/reforge/infra/vps

# Pull PostgreSQL image
docker compose pull postgres

# Start PostgreSQL
docker compose up -d postgres

# Wait for it to become healthy
docker compose ps postgres

# Check logs
docker compose logs postgres
```

### Step 4: Restart API Containers

```bash
# Restart blue and green to connect to new database
docker compose restart reforge-api-blue reforge-api-green

# Check logs
docker compose logs -f
```

### Step 5: Verify Everything Works

```bash
# Check all containers are healthy
docker compose ps

# Test health endpoints
curl http://localhost:9173/api/v1/health  # Blue
curl http://localhost:9174/api/v1/health  # Green
curl https://reforge-api.vasujain.me/api/v1/health  # Public

# All should return: {"status":"ok"}
```

---

## Database Backup & Restore

### Create Backup

```bash
# Automatic backup (with compression and cleanup)
./backup.sh backup

# List all backups
./backup.sh list

# Manual backup
docker exec reforge-postgres pg_dump -U reforge reforge > manual_backup.sql
```

### Restore from Backup

```bash
# Restore from compressed backup
./backup.sh restore backups/reforge_backup_20240207_120000.sql.gz

# Or restore manually
cat backup.sql | docker exec -i reforge-postgres psql -U reforge -d reforge
```

### Automated Backups (Optional)

Add to crontab for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /opt/reforge/infra/vps && ./backup.sh backup >> /var/log/reforge-backup.log 2>&1
```

---

## Data Migration (If Coming from Neon)

### Option 1: Export from Neon, Import to VPS

```bash
# On your local machine:
# 1. Export from Neon
pg_dump "postgresql://user:pass@ep-xxx.neon.tech/reforge?sslmode=require" > neon_export.sql

# 2. Copy to VPS
scp neon_export.sql user@vps-ip:/opt/reforge/infra/vps/backups/

# On VPS:
# 3. Import to local PostgreSQL
cd /opt/reforge/infra/vps
cat backups/neon_export.sql | docker exec -i reforge-postgres psql -U reforge -d reforge
```

### Option 2: Start Fresh

If you don't need existing data:

```bash
# Just start the stack - migrations will create schema
docker compose up -d

# Use the onboarding endpoint to create first admin
curl -X POST https://reforge-api.vasujain.me/api/v1/onboarding/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-secure-password",
    "name": "Admin User"
  }'
```

---

## PostgreSQL Management

### Access Database

```bash
# PostgreSQL shell
docker exec -it reforge-postgres psql -U reforge -d reforge

# Run SQL query
docker exec reforge-postgres psql -U reforge -d reforge -c "SELECT COUNT(*) FROM users;"
```

### View Database Logs

```bash
docker compose logs -f postgres
```

### Database Performance

```bash
# Check connections
docker exec reforge-postgres psql -U reforge -d reforge -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
docker exec reforge-postgres psql -U reforge -d reforge -c "SELECT pg_size_pretty(pg_database_size('reforge'));"
```

---

## Troubleshooting

### PostgreSQL Won't Start

```bash
# Check logs
docker compose logs postgres

# Common issues:
# 1. Port 5432 already in use - Check: sudo netstat -tulpn | grep 5432
# 2. Invalid password - Verify POSTGRES_PASSWORD in .env
# 3. Volume corruption - Remove volume: docker volume rm vps_postgres_data (DANGER: deletes data!)
```

### API Can't Connect to Database

```bash
# Verify DATABASE_URL in API containers
docker exec reforge-api-blue env | grep DATABASE_URL

# Should show: postgresql://reforge:password@postgres:5432/reforge?sslmode=disable

# Test connection
docker exec reforge-api-blue wget -qO- http://localhost:9173/api/v1/health

# Check API logs
docker compose logs reforge-api-blue | grep -i database
```

### Lost Database Password

```bash
# Stop containers
docker compose down

# Edit .env and set new password
nano .env

# Remove old database volume (WARNING: deletes all data!)
docker volume rm vps_postgres_data

# Start fresh
docker compose up -d
```

---

## Monitoring

### Database Health

```bash
# Check container health
docker compose ps postgres

# Check if accepting connections
docker exec reforge-postgres pg_isready -U reforge -d reforge

# View active connections
docker exec reforge-postgres psql -U reforge -d reforge -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### Backup Status

```bash
# List backups with sizes
./backup.sh list

# Check backup disk usage
du -sh backups/
```

---

## Security Recommendations

1. **Strong Password**: Use `openssl rand -base64 32` for POSTGRES_PASSWORD
2. **Firewall**: PostgreSQL port 5432 is bound to localhost only (not exposed)
3. **Regular Backups**: Setup automated daily backups via cron
4. **Off-site Backups**: Copy backups to another server or S3
5. **Monitor Disk**: Ensure enough space for database growth

---

## Performance Tuning (Optional)

For production workloads, consider tuning PostgreSQL:

```yaml
# In docker-compose.yaml, add to postgres service:
command:
  - "postgres"
  - "-c"
  - "max_connections=100"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=1GB"
  - "-c"
  - "work_mem=4MB"
```

---

## Quick Reference

### Common Commands

```bash
# Backup database
./backup.sh backup

# List backups
./backup.sh list

# Restore backup
./backup.sh restore backups/reforge_backup_20240207_120000.sql.gz

# Access PostgreSQL shell
docker exec -it reforge-postgres psql -U reforge -d reforge

# View database logs
docker compose logs -f postgres

# Restart database
docker compose restart postgres

# Check database status
docker compose ps postgres
```

### Files & Directories

- `docker-compose.yaml` - PostgreSQL service configuration
- `.env` - Database credentials
- `backup.sh` - Backup/restore script
- `backups/` - Database backup storage
- `postgres_data/` - Docker volume (persistent data)

---

## Benefits of Local PostgreSQL

✅ **Faster**: No network latency - database on same machine  
✅ **Cheaper**: No monthly Neon subscription  
✅ **Offline**: Works without internet (for local dev)  
✅ **Control**: Full access to PostgreSQL configuration  
✅ **Backups**: Easy local backups with `backup.sh`  
✅ **Debugging**: Direct access to database logs  

---

**🎉 Your database is now running locally on the VPS with zero-downtime deployment capability!**
