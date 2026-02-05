# PostgreSQL Migration Guide

## Overview

Reforge has been migrated from **SQLite** to **PostgreSQL 18** with the following major changes:

- **Database**: SQLite → PostgreSQL 18
- **Driver**: `modernc.org/sqlite` → `github.com/jackc/pgx/v5` (native pgx)
- **Primary Keys**: `INTEGER` → `UUID` (all tables)
- **Timestamps**: SQLite datetime → PostgreSQL `TIMESTAMPTZ`
- **Connection**: `database/sql` wrapper → `pgxpool.Pool` (native pgx)
- **Type System**: `sql.Null*` → `pgtype.*` (pgx native types)

---

## Why PostgreSQL?

### Benefits:
1. **Production-Ready**: PostgreSQL is industry-standard for production applications
2. **Better Performance**: Native pgx driver is faster than database/sql
3. **Advanced Features**: Full-text search, JSON operations, array types
4. **Scalability**: Handles concurrent connections better than SQLite
5. **UUID Support**: Native UUID type with better indexing
6. **Data Integrity**: Better constraint enforcement and transactions
7. **Time Zones**: Proper timezone support with TIMESTAMPTZ
8. **Connection Pooling**: Built-in with pgxpool

### Trade-offs:
- **Deployment Complexity**: Requires PostgreSQL server (vs single file)
- **Migration Required**: Existing SQLite data must be migrated
- **Development Setup**: Need Docker or local PostgreSQL installation

---

## Architecture Changes

### Backend (Go API)

#### 1. **SQLC Configuration** (`api/sqlc.yaml`)

**Before (SQLite + database/sql):**
```yaml
sql_package: "database/sql"
overrides:
  - db_type: "text"
    nullable: true
    go_type: "sql.NullString"
```

**After (PostgreSQL + pgx/v5):**
```yaml
sql_package: "pgx/v5"  # Native pgx, not database/sql wrapper
overrides:
  - db_type: "uuid"
    go_type: "github.com/google/uuid.UUID"
  - db_type: "timestamptz"
    go_type: "time.Time"
# Nullable fields automatically use pgtype.Text, pgtype.Int4, etc.
```

#### 2. **Database Connection** (`api/cmd/main.go`)

**Before:**
```go
import "database/sql"

db, err := sql.Open("sqlite", "./reforge.db")
db.SetMaxOpenConns(1) // SQLite limitation
```

**After:**
```go
import "github.com/jackc/pgx/v5/pgxpool"

pool, err := pgxpool.New(ctx, "postgresql://user:password@localhost:5432/reforge")
// pgxpool handles connection pooling automatically
```

#### 3. **Application Struct**

**Before:**
```go
type application struct {
    db *sql.DB
}
```

**After:**
```go
type application struct {
    pool *pgxpool.Pool  // Native pgx connection pool
}
```

#### 4. **Type System Changes**

**Before (database/sql):**
```go
import "database/sql"

type User struct {
    Email     sql.NullString
    CreatedAt sql.NullTime
}

// Helper functions
func toNullString(s *string) sql.NullString {
    if s == nil {
        return sql.NullString{}
    }
    return sql.NullString{String: *s, Valid: true}
}
```

**After (pgx/v5):**
```go
import "github.com/jackc/pgx/v5/pgtype"

type User struct {
    Email     pgtype.Text
    CreatedAt pgtype.Timestamptz
}

// Helper functions
func toPgText(s *string) pgtype.Text {
    if s == nil {
        return pgtype.Text{}
    }
    return pgtype.Text{String: *s, Valid: true}
}
```

**Type Mapping Table:**

| Old (database/sql)     | New (pgtype)           | PostgreSQL Type |
|------------------------|------------------------|-----------------|
| `sql.NullString`       | `pgtype.Text`          | `TEXT`          |
| `sql.NullInt32`        | `pgtype.Int4`          | `INT4`          |
| `sql.NullInt64`        | `pgtype.Int8`          | `INT8`          |
| `sql.NullFloat64`      | `pgtype.Float4/Float8` | `FLOAT4/FLOAT8` |
| `sql.NullBool`         | `pgtype.Bool`          | `BOOLEAN`       |
| `sql.NullTime`         | `pgtype.Timestamptz`   | `TIMESTAMPTZ`   |
| `int64` (PK)           | `uuid.UUID`            | `UUID`          |
| `sql.ErrNoRows`        | `pgx.ErrNoRows`        | N/A             |

#### 5. **SQL Query Changes**

**Before (SQLite):**
```sql
-- Placeholders: ?
INSERT INTO users (id, email, created_at)
VALUES (?, ?, datetime('now'));

-- Auto-increment IDs
id INTEGER PRIMARY KEY AUTOINCREMENT

-- Case-insensitive search
WHERE LOWER(title) = LOWER(?)
```

**After (PostgreSQL):**
```sql
-- Placeholders: $1, $2, $3
INSERT INTO users (id, email, created_at)
VALUES ($1, $2, NOW());

-- UUID primary keys
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Native ILIKE
WHERE title ILIKE $1
```

### Frontend (React/TypeScript)

#### ID Type Changes

**Before:**
```typescript
interface User {
  id: number;  // Integer ID from SQLite
  sessionId?: number | null;
}

// Parse from URL
const userId = parseInt(params.id, 10);
```

**After:**
```typescript
interface User {
  id: string;  // UUID as string
  sessionId?: string | null;
}

// Use directly (no parsing needed)
const userId = params.id;
```

**No parseInt() needed** - UUIDs are always strings!

---

## Infrastructure Setup

### Docker Compose (`infra/docker-compose.yaml`)

```yaml
services:
  postgres:
    image: postgres:18-alpine
    container_name: reforge-postgres
    environment:
      POSTGRES_DB: reforge
      POSTGRES_USER: reforge
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U reforge"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

### Environment Variables

**Required:**
```bash
# PostgreSQL Connection
DATABASE_URL="postgresql://reforge:password@localhost:5432/reforge?sslmode=disable"
DB_PASSWORD="your_secure_password"

# JWT (unchanged)
JWT_SECRET="your_jwt_secret"
```

**Development (`.env`):**
```bash
DATABASE_URL=postgresql://reforge:password@localhost:5432/reforge?sslmode=disable
DB_PASSWORD=password
ADDR=0.0.0.0:9173
ENV=dev
```

**Production:**
```bash
DATABASE_URL=postgresql://reforge:${DB_PASSWORD}@postgres:5432/reforge?sslmode=require
DB_PASSWORD=${SECURE_PASSWORD}
ADDR=0.0.0.0:9173
ENV=prod
```

---

## Migration Process

### Step 1: Backup SQLite Database

```bash
# Create backup of SQLite database
cp ./reforge.db ./reforge.db.backup

# Export as SQL dump (optional)
sqlite3 ./reforge.db .dump > sqlite_backup.sql
```

### Step 2: Start PostgreSQL

```bash
cd infra
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
docker-compose logs -f postgres
# Look for: "database system is ready to accept connections"
```

### Step 3: Run Migrations (Automatic)

The Go application automatically runs migrations on startup:

```bash
cd api
DATABASE_URL="postgresql://reforge:password@localhost:5432/reforge?sslmode=disable" \
go run ./cmd
```

Or with Docker:
```bash
cd infra
docker-compose up api
```

### Step 4: Migrate Data from SQLite

```bash
# Install Python dependencies
pip install psycopg2-binary

# Run migration script
python3 scripts/migrate_sqlite_to_postgres.py \
  --sqlite-db ./reforge.db \
  --postgres-url "postgresql://reforge:password@localhost:5432/reforge"
```

**The script will:**
- ✅ Generate new UUIDs for all records
- ✅ Preserve all relationships (foreign keys)
- ✅ Convert SQLite datetime → PostgreSQL TIMESTAMPTZ
- ✅ Migrate all tables in correct dependency order
- ✅ Display migration statistics and errors

**Migration Output:**
```
🚀 STARTING SQLite → PostgreSQL MIGRATION
✅ Connected to SQLite: ./reforge.db
✅ Connected to PostgreSQL
🗑️  Clearing existing PostgreSQL data...

📦 Migrating users...
✅ Migrated 5 users

📦 Migrating patterns...
✅ Migrated 72 patterns

📦 Migrating problems...
✅ Migrated 2160 problems

... (more tables)

============================================================
MIGRATION SUMMARY
============================================================
Users:                5
Patterns:             72
Problems:             2160
Attempts:             847
... (more stats)

✅ Migration completed successfully with no errors!
============================================================
```

---

## Development Workflow

### Local Development with Docker

```bash
# Start PostgreSQL
cd infra
docker-compose up -d postgres

# Run API (with hot reload)
cd ../api
task dev

# Run frontend
cd ../web
pnpm dev
```

### Local Development without Docker

**Install PostgreSQL 18:**
```bash
# macOS
brew install postgresql@18
brew services start postgresql@18

# Ubuntu/Debian
sudo apt install postgresql-18
sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE reforge;
CREATE USER reforge WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE reforge TO reforge;
```

**Run application:**
```bash
export DATABASE_URL="postgresql://reforge:password@localhost:5432/reforge"
cd api && task dev
```

---

## Schema Changes

### Primary Key Migration

**Before (SQLite):**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL
);

CREATE TABLE attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id)
);
```

**After (PostgreSQL):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL
);

CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id)
);
```

### Timestamp Migration

**Before:**
- `created_at DATETIME DEFAULT (datetime('now'))`
- Stored as string: `"2024-02-05 10:30:00"`
- No timezone support

**After:**
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- Stored as timestamp with timezone
- Proper timezone handling

### Index Changes

**Added Performance Indexes:**
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Problem searches
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_source ON problems(source);

-- Session queries
CREATE INDEX idx_sessions_user_status ON sessions(user_id, status);

-- Attempt queries
CREATE INDEX idx_attempts_user_problem ON attempts(user_id, problem_id);
CREATE INDEX idx_attempts_performed_at ON attempts(performed_at DESC);

-- Spaced repetition
CREATE INDEX idx_user_problem_stats_next_review ON user_problem_stats(user_id, next_review_at)
  WHERE next_review_at IS NOT NULL;
```

---

## Testing

### Verify PostgreSQL Connection

```bash
# From host
psql "postgresql://reforge:password@localhost:5432/reforge" -c "SELECT version();"

# From Docker
docker-compose exec postgres psql -U reforge -d reforge -c "SELECT version();"
```

### Verify Migrations

```bash
# Check applied migrations
psql "postgresql://reforge:password@localhost:5432/reforge" \
  -c "SELECT * FROM goose_db_version ORDER BY id;"
```

### Verify Data

```bash
# Count records
psql "postgresql://reforge:password@localhost:5432/reforge" -c "
SELECT 
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM problems) AS problems,
  (SELECT COUNT(*) FROM patterns) AS patterns,
  (SELECT COUNT(*) FROM attempts) AS attempts;
"
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:9173/api/v1/health

# Login (get JWT)
curl -X POST http://localhost:9173/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get current user
curl http://localhost:9173/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Troubleshooting

### Connection Errors

**Error:** `connection refused`
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

**Error:** `authentication failed`
```bash
# Check password in .env file
cat infra/.env

# Reset PostgreSQL password
docker-compose exec postgres psql -U postgres -c "ALTER USER reforge PASSWORD 'newpassword';"
```

### Migration Errors

**Error:** `relation "users" does not exist`
```bash
# Migrations didn't run - check logs
docker-compose logs api

# Manually run migrations
cd api
goose -dir internal/adapters/postgres/migrations postgres \
  "postgresql://reforge:password@localhost:5432/reforge" up
```

**Error:** `duplicate key value violates unique constraint`
```bash
# Data already exists - clear and re-migrate
psql "postgresql://reforge:password@localhost:5432/reforge" -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
"

# Then re-run migration script
python3 scripts/migrate_sqlite_to_postgres.py --sqlite-db ./reforge.db --postgres-url ...
```

### Performance Issues

**Slow queries:**
```sql
-- Enable query logging
ALTER DATABASE reforge SET log_statement = 'all';
ALTER DATABASE reforge SET log_duration = on;

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

**Add missing indexes:**
```sql
-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM problems WHERE difficulty = 'hard';

-- Create index if needed
CREATE INDEX idx_custom ON table_name(column_name);
```

---

## Rollback Plan

If migration fails, you can rollback to SQLite:

### 1. Restore SQLite Database
```bash
cp ./reforge.db.backup ./reforge.db
```

### 2. Update Environment
```bash
# Remove PostgreSQL URL
unset DATABASE_URL

# API will fall back to SQLite (if code reverted)
```

### 3. Revert Code Changes
```bash
git checkout HEAD~1  # Or specific commit before migration
```

---

## Production Deployment

### Environment Setup

```bash
# Use strong passwords
DB_PASSWORD=$(openssl rand -base64 32)

# Enable SSL
DATABASE_URL="postgresql://reforge:${DB_PASSWORD}@postgres:5432/reforge?sslmode=require"

# Secure connection
# Use connection pooling limits based on server resources
```

### PostgreSQL Configuration

**Recommended `postgresql.conf` settings:**
```ini
# Connection
max_connections = 100

# Memory
shared_buffers = 256MB
effective_cache_size = 1GB

# WAL
wal_level = replica
max_wal_size = 1GB

# Query Performance
random_page_cost = 1.1  # SSD
effective_io_concurrency = 200
```

### Backup Strategy

```bash
# Daily backups
pg_dump -U reforge reforge > backup_$(date +%Y%m%d).sql

# Point-in-time recovery (enable WAL archiving)
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'
```

---

## Summary

✅ **SQLite** → **PostgreSQL 18**  
✅ **INTEGER PKs** → **UUID PKs**  
✅ **database/sql** → **pgx/v5 native**  
✅ **sql.Null*** → **pgtype.***  
✅ **Frontend IDs**: `number` → `string`  
✅ **Migration script** provided  
✅ **Docker setup** ready  
✅ **Production-ready** architecture  

The migration is complete and Reforge is now running on a production-grade PostgreSQL database with native pgx driver for optimal performance!
