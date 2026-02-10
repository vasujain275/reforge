#!/usr/bin/env bash
# ============================================================================
# Reforge Blue-Green Deployment Script (Traefik Edition)
# Zero-downtime deployment automation for VPS
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
ENV_FILE="${SCRIPT_DIR}/.env"
DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
HEALTH_CHECK_URL="http://localhost:9173/api/v1/health"
HEALTH_CHECK_TIMEOUT=60
DRAIN_TIMEOUT=30

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

# Check if required commands exist
check_dependencies() {
    local deps=("docker" "curl")
    for cmd in "${deps[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command '$cmd' not found"
            exit 1
        fi
    done
    
    # Check if docker compose v2 is available
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        log_error "Neither 'docker compose' nor 'docker-compose' found"
        exit 1
    fi
}

# Load environment variables
load_env() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error ".env file not found at $ENV_FILE"
        log_info "Copy .env.sample to .env and configure it first"
        exit 1
    fi
    
    # Export variables from .env file
    set -a
    source "$ENV_FILE"
    set +a
    
    # Validate required variables
    if [[ -z "${JWT_SECRET:-}" ]]; then
        log_error "JWT_SECRET not set in .env file"
        exit 1
    fi
    
    if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
        log_error "POSTGRES_PASSWORD not set in .env file"
        exit 1
    fi
    
    if [[ -z "${API_DOMAIN:-}" ]]; then
        log_error "API_DOMAIN not set in .env file"
        exit 1
    fi
}

# Determine active and inactive colors
get_deployment_colors() {
    local active_color="${ACTIVE_COLOR:-blue}"
    local inactive_color
    
    if [[ "$active_color" == "blue" ]]; then
        inactive_color="green"
    else
        inactive_color="blue"
    fi
    
    echo "$active_color $inactive_color"
}

# Check if a container is healthy
is_container_healthy() {
    local container_name="$1"
    local health_status
    
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")
    
    if [[ "$health_status" == "healthy" ]]; then
        return 0
    else
        return 1
    fi
}

# Wait for container to become healthy
wait_for_health() {
    local container_name="$1"
    local port="$2"
    local timeout="$HEALTH_CHECK_TIMEOUT"
    local elapsed=0
    
    log_info "Waiting for $container_name to become healthy (timeout: ${timeout}s)..."
    
    while [[ $elapsed -lt $timeout ]]; do
        if is_container_healthy "$container_name"; then
            log_success "$container_name is healthy!"
            return 0
        fi
        
        # Also check HTTP health endpoint
        if curl -sf "http://localhost:${port}/api/v1/health" > /dev/null 2>&1; then
            log_success "$container_name is responding to health checks!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    echo ""
    log_error "$container_name failed to become healthy within ${timeout}s"
    return 1
}

# Update .env file with new values
update_env_file() {
    local key="$1"
    local value="$2"
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Update existing value
        sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        # Append new value
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

# ============================================================================
# Deployment Functions
# ============================================================================

deploy_new_version() {
    local new_version="${1:-latest}"
    
    log_info "=== Starting Blue-Green Deployment ==="
    log_info "New version: $new_version"
    
    # Load environment and determine colors
    load_env
    read -r active_color inactive_color <<< "$(get_deployment_colors)"
    
    log_info "Active slot: $active_color"
    log_info "Target slot: $inactive_color"
    
    # Determine ports
    local inactive_port
    if [[ "$inactive_color" == "blue" ]]; then
        inactive_port=9173
    else
        inactive_port=9174
    fi
    
    # Update environment with new version for inactive slot
    local version_var="${inactive_color^^}_VERSION"
    update_env_file "$version_var" "$new_version"
    
    log_info "Pulling new Docker image: vasujain275/reforge-api:$new_version"
    docker pull "vasujain275/reforge-api:$new_version"
    
    # Start/restart inactive container with new version
    local inactive_container="reforge-api-${inactive_color}"
    log_info "Starting $inactive_container with version $new_version..."
    
    $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" up -d "$inactive_container"
    
    # Wait for health checks
    if ! wait_for_health "$inactive_container" "$inactive_port"; then
        log_error "Deployment failed: $inactive_container did not become healthy"
        log_warn "Rolling back... Stopping $inactive_container"
        $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" stop "$inactive_container"
        exit 1
    fi
    
    log_success "$inactive_container is ready to receive traffic!"
    
    # Traffic switches automatically via Traefik health checks
    log_info "Traefik will automatically route traffic to healthy backend"
    log_info "Waiting ${DRAIN_TIMEOUT}s for active container to drain connections..."
    sleep "$DRAIN_TIMEOUT"
    
    # Update active color in .env
    update_env_file "ACTIVE_COLOR" "$inactive_color"
    
    # Stop old active container (now inactive)
    local old_active_container="reforge-api-${active_color}"
    log_info "Stopping old container: $old_active_container"
    $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" stop "$old_active_container"
    
    log_success "=== Deployment Complete ==="
    log_success "Active slot is now: $inactive_color (version: $new_version)"
    log_success "API available at: https://${API_DOMAIN}"
    
    # Show status
    show_status
}

# Show current deployment status
show_status() {
    log_info "=== Current Deployment Status ==="
    
    load_env
    read -r active_color inactive_color <<< "$(get_deployment_colors)"
    
    echo ""
    echo -e "${GREEN}Active Slot:${NC} $active_color"
    echo ""
    
    # Show container status
    $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    log_info "Health Check URLs:"
    echo "  Blue:  http://localhost:9173/api/v1/health"
    echo "  Green: http://localhost:9174/api/v1/health"
    echo "  Public: https://${API_DOMAIN}/api/v1/health"
}

# Rollback to previous version
rollback() {
    log_warn "=== Rolling Back Deployment ==="
    
    load_env
    read -r active_color inactive_color <<< "$(get_deployment_colors)"
    
    log_info "Current active: $active_color"
    log_info "Rolling back to: $inactive_color"
    
    # Restart inactive container (previous version)
    local rollback_container="reforge-api-${inactive_color}"
    log_info "Starting previous version: $rollback_container"
    
    $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" up -d "$rollback_container"
    
    # Determine port for health check
    local rollback_port
    if [[ "$inactive_color" == "blue" ]]; then
        rollback_port=9173
    else
        rollback_port=9174
    fi
    
    # Wait for health checks
    if ! wait_for_health "$rollback_container" "$rollback_port"; then
        log_error "Rollback failed: $rollback_container did not become healthy"
        exit 1
    fi
    
    # Switch active color
    update_env_file "ACTIVE_COLOR" "$inactive_color"
    
    # Stop current active (failed deployment)
    local failed_container="reforge-api-${active_color}"
    log_info "Stopping failed deployment: $failed_container"
    $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" stop "$failed_container"
    
    log_success "=== Rollback Complete ==="
    log_success "Active slot is now: $inactive_color"
    
    show_status
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    check_dependencies
    
    local command="${1:-deploy}"
    local version="${2:-latest}"
    
    case "$command" in
        deploy)
            deploy_new_version "$version"
            ;;
        status)
            load_env
            show_status
            ;;
        rollback)
            rollback
            ;;
        *)
            echo "Usage: $0 {deploy|status|rollback} [version]"
            echo ""
            echo "Commands:"
            echo "  deploy [version]  - Deploy new version (default: latest)"
            echo "  status            - Show current deployment status"
            echo "  rollback          - Rollback to previous deployment"
            echo ""
            echo "Examples:"
            echo "  $0 deploy latest"
            echo "  $0 deploy 1.2.3"
            echo "  $0 status"
            echo "  $0 rollback"
            exit 1
            ;;
    esac
}

main "$@"
