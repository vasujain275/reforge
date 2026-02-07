#!/usr/bin/env bash
# ============================================================================
# Reforge PostgreSQL Backup Script
# Creates timestamped database backups
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
ENV_FILE="${SCRIPT_DIR}/.env"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="reforge-postgres"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
load_env() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error ".env file not found at $ENV_FILE"
        exit 1
    fi
    
    set -a
    source "$ENV_FILE"
    set +a
    
    POSTGRES_DB="${POSTGRES_DB:-reforge}"
    POSTGRES_USER="${POSTGRES_USER:-reforge}"
}

# Check if PostgreSQL container is running
check_postgres() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        log_error "PostgreSQL container '$CONTAINER_NAME' is not running"
        exit 1
    fi
}

# Create backup directory if it doesn't exist
ensure_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Create database backup
create_backup() {
    local backup_file="${BACKUP_DIR}/reforge_backup_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    log_info "Creating database backup..."
    log_info "Database: $POSTGRES_DB"
    log_info "User: $POSTGRES_USER"
    
    # Create SQL dump
    if docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_file"; then
        log_success "Backup created: $backup_file"
        
        # Compress backup
        log_info "Compressing backup..."
        if gzip "$backup_file"; then
            log_success "Backup compressed: $compressed_file"
            
            # Get file size
            local size=$(du -h "$compressed_file" | cut -f1)
            log_info "Backup size: $size"
            
            echo "$compressed_file"
        else
            log_error "Failed to compress backup"
            echo "$backup_file"
        fi
    else
        log_error "Failed to create backup"
        exit 1
    fi
}

# List recent backups
list_backups() {
    log_info "Recent backups in $BACKUP_DIR:"
    echo ""
    
    if [[ -d "$BACKUP_DIR" ]] && [[ -n "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        ls -lh "$BACKUP_DIR" | grep -E '\.sql(\.gz)?$' || log_warn "No backup files found"
    else
        log_warn "No backups found"
    fi
}

# Clean old backups (keep last N backups)
cleanup_old_backups() {
    local keep_count="${1:-7}"  # Keep last 7 backups by default
    
    log_info "Cleaning up old backups (keeping last $keep_count)..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        local backup_files=$(find "$BACKUP_DIR" -name "reforge_backup_*.sql.gz" -type f | sort -r)
        local file_count=$(echo "$backup_files" | wc -l)
        
        if [[ $file_count -gt $keep_count ]]; then
            echo "$backup_files" | tail -n +$((keep_count + 1)) | while read -r file; do
                log_info "Removing old backup: $(basename "$file")"
                rm -f "$file"
            done
            log_success "Cleanup complete"
        else
            log_info "No cleanup needed (only $file_count backups)"
        fi
    fi
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warn "WARNING: This will REPLACE all data in the database!"
    log_warn "Database: $POSTGRES_DB"
    log_warn "Backup file: $backup_file"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    log_info "Restoring database from backup..."
    
    # Handle compressed backups
    if [[ "$backup_file" == *.gz ]]; then
        log_info "Decompressing backup..."
        if gunzip -c "$backup_file" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
            log_success "Database restored successfully!"
        else
            log_error "Failed to restore database"
            exit 1
        fi
    else
        if cat "$backup_file" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
            log_success "Database restored successfully!"
        else
            log_error "Failed to restore database"
            exit 1
        fi
    fi
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    local command="${1:-backup}"
    
    case "$command" in
        backup)
            load_env
            check_postgres
            ensure_backup_dir
            backup_file=$(create_backup)
            cleanup_old_backups 7
            log_success "Backup complete: $backup_file"
            ;;
        list)
            list_backups
            ;;
        restore)
            if [[ -z "${2:-}" ]]; then
                log_error "Please specify backup file to restore"
                log_info "Usage: $0 restore <backup_file>"
                list_backups
                exit 1
            fi
            load_env
            check_postgres
            restore_backup "$2"
            ;;
        cleanup)
            local keep="${2:-7}"
            cleanup_old_backups "$keep"
            ;;
        *)
            echo "Usage: $0 {backup|list|restore|cleanup} [options]"
            echo ""
            echo "Commands:"
            echo "  backup             - Create a new database backup"
            echo "  list               - List all available backups"
            echo "  restore <file>     - Restore database from backup file"
            echo "  cleanup [N]        - Keep only last N backups (default: 7)"
            echo ""
            echo "Examples:"
            echo "  $0 backup"
            echo "  $0 list"
            echo "  $0 restore backups/reforge_backup_20240207_120000.sql.gz"
            echo "  $0 cleanup 14"
            exit 1
            ;;
    esac
}

main "$@"
