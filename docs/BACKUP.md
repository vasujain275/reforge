# Backup Guide

This guide covers backup strategies for Reforge's SQLite database and configuration.

## Overview

Reforge uses SQLite as its database. Your data is stored in:

- **Docker**: `./data/reforge.db` (bind mount)
- **Binary**: `./data/reforge.db` (relative to binary)

SQLite makes backups simple - it's just a single file. However, proper backup procedures ensure data integrity.

## Quick Backup

### When Reforge is Stopped

```bash
# Simple file copy
cp data/reforge.db backups/reforge-$(date +%Y%m%d).db
```

### While Reforge is Running (Recommended)

Use SQLite's backup command to ensure data integrity:

```bash
# Safe backup using SQLite CLI
sqlite3 data/reforge.db ".backup backups/reforge-$(date +%Y%m%d).db"
```

This creates a consistent backup even while the database is in use.

## Backup Methods

### Method 1: SQLite .backup Command (Recommended)

The safest method for backing up a live database:

```bash
# Create backup directory
mkdir -p backups

# Backup with timestamp
sqlite3 data/reforge.db ".backup 'backups/reforge-$(date +%Y%m%d-%H%M%S).db'"

# Verify backup integrity
sqlite3 backups/reforge-*.db "PRAGMA integrity_check;"
```

### Method 2: File Copy (Stopped Instance)

If Reforge is stopped, a simple file copy works:

```bash
# Stop Reforge first
docker compose down  # or kill the binary process

# Copy the database
cp data/reforge.db backups/reforge-$(date +%Y%m%d).db

# Start Reforge again
docker compose up -d
```

### Method 3: SQLite Online Backup API (Via CLI)

For scripted backups:

```bash
#!/bin/bash
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_PATH="./data/reforge.db"

mkdir -p "$BACKUP_DIR"

# Create backup
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/reforge-$TIMESTAMP.db'"

# Verify
if sqlite3 "$BACKUP_DIR/reforge-$TIMESTAMP.db" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "Backup successful: $BACKUP_DIR/reforge-$TIMESTAMP.db"
else
    echo "Backup verification failed!"
    exit 1
fi
```

## Automated Backups

### Using Cron (Linux/macOS)

Create a backup script:

```bash
# /home/user/reforge/backup.sh
#!/bin/bash
BACKUP_DIR="/home/user/reforge/backups"
DB_PATH="/home/user/reforge/data/reforge.db"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/reforge-$TIMESTAMP.db'"

# Compress backup
gzip "$BACKUP_DIR/reforge-$TIMESTAMP.db"

# Remove backups older than retention period
find "$BACKUP_DIR" -name "reforge-*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "$(date): Backup completed - reforge-$TIMESTAMP.db.gz" >> "$BACKUP_DIR/backup.log"
```

Add to crontab:

```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /home/user/reforge/backup.sh

# Or hourly for critical data
0 * * * * /home/user/reforge/backup.sh
```

### Using systemd Timer (Linux)

Create `/etc/systemd/system/reforge-backup.service`:

```ini
[Unit]
Description=Reforge Database Backup

[Service]
Type=oneshot
ExecStart=/home/user/reforge/backup.sh
User=user
```

Create `/etc/systemd/system/reforge-backup.timer`:

```ini
[Unit]
Description=Daily Reforge Backup

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
sudo systemctl enable --now reforge-backup.timer
```

## Docker-Specific Backups

### Backup from Docker Container

```bash
# Using docker exec
docker exec reforge sqlite3 /app/data/reforge.db ".backup '/app/data/backup.db'"
docker cp reforge:/app/data/backup.db ./backups/reforge-$(date +%Y%m%d).db

# Or directly from host (if volume is mounted)
sqlite3 ./data/reforge.db ".backup './backups/reforge-$(date +%Y%m%d).db'"
```

### Docker Compose Backup Script

```bash
#!/bin/bash
# docker-backup.sh
COMPOSE_DIR="/home/user/reforge"
BACKUP_DIR="$COMPOSE_DIR/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

cd "$COMPOSE_DIR"
mkdir -p "$BACKUP_DIR"

# Backup database
sqlite3 ./data/reforge.db ".backup '$BACKUP_DIR/reforge-$TIMESTAMP.db'"

# Also backup configuration
cp .env "$BACKUP_DIR/env-$TIMESTAMP.backup"

# Compress
tar -czf "$BACKUP_DIR/reforge-full-$TIMESTAMP.tar.gz" \
    -C "$BACKUP_DIR" "reforge-$TIMESTAMP.db" "env-$TIMESTAMP.backup"

# Cleanup individual files
rm "$BACKUP_DIR/reforge-$TIMESTAMP.db" "$BACKUP_DIR/env-$TIMESTAMP.backup"

echo "Full backup created: $BACKUP_DIR/reforge-full-$TIMESTAMP.tar.gz"
```

## Configuration Backup

Don't forget to backup your configuration files:

### Docker Setup

```bash
# Backup .env and docker-compose.yaml
cp .env backups/env-$(date +%Y%m%d).backup
cp docker-compose.yaml backups/docker-compose-$(date +%Y%m%d).backup
```

### Binary Setup

```bash
# Backup your .env file
cp .env backups/env-$(date +%Y%m%d).backup
```

## Restoring from Backup

### Basic Restore

```bash
# Stop Reforge
docker compose down  # or stop the binary

# Restore database
cp backups/reforge-YYYYMMDD.db data/reforge.db

# If backup is compressed
gunzip -c backups/reforge-YYYYMMDD.db.gz > data/reforge.db

# Start Reforge
docker compose up -d
```

### Verify Before Restore

```bash
# Check backup integrity
sqlite3 backups/reforge-YYYYMMDD.db "PRAGMA integrity_check;"

# Check table structure
sqlite3 backups/reforge-YYYYMMDD.db ".tables"

# Check record counts
sqlite3 backups/reforge-YYYYMMDD.db "SELECT COUNT(*) FROM users;"
sqlite3 backups/reforge-YYYYMMDD.db "SELECT COUNT(*) FROM problems;"
```

## Remote Backup Strategies

### Sync to Remote Storage

```bash
# Using rsync to remote server
rsync -avz backups/ user@backup-server:/backups/reforge/

# Using rclone for cloud storage (S3, GCS, etc.)
rclone sync backups/ remote:reforge-backups/
```

### Offsite Backup Script

```bash
#!/bin/bash
# offsite-backup.sh
LOCAL_BACKUP_DIR="/home/user/reforge/backups"
REMOTE_PATH="user@backup-server:/backups/reforge/"

# Create local backup first
/home/user/reforge/backup.sh

# Sync to remote
rsync -avz --delete "$LOCAL_BACKUP_DIR/" "$REMOTE_PATH"
```

## Best Practices

1. **Test Restores Regularly** - A backup is only good if you can restore from it
2. **Keep Multiple Copies** - Local + offsite storage
3. **Verify Integrity** - Run `PRAGMA integrity_check;` after backup
4. **Automate** - Manual backups get forgotten
5. **Retention Policy** - Keep daily backups for a week, weekly for a month
6. **Backup Configuration** - Include `.env` files in your backup routine
7. **Document Recovery** - Write down your restore procedure

## Backup Checklist

- [ ] Database file (`data/reforge.db`)
- [ ] Environment configuration (`.env`)
- [ ] Docker compose file (`docker-compose.yaml`) if applicable
- [ ] Custom scripts or modifications
- [ ] Backup verification completed
- [ ] Offsite copy created

## Troubleshooting

### "Database is locked"

Wait for any active operations to complete, or use the SQLite backup command which handles this gracefully.

### Corrupted Backup

Always verify backups with:

```bash
sqlite3 backup.db "PRAGMA integrity_check;"
```

### Large Database Size

SQLite databases can accumulate unused space. Before backup:

```bash
# Reclaim unused space
sqlite3 data/reforge.db "VACUUM;"
```

## Related Documentation

- [INSTALLATION.md](./INSTALLATION.md) - Installation and setup
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
