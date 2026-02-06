# ============================================================================
# Reforge Backend API Dockerfile
# Multi-stage build for Go backend with PostgreSQL support
# ============================================================================

# Stage 1: Build Go binary
FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

WORKDIR /build

# Copy go mod files first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
# CGO_ENABLED=0 for fully static binary
# -ldflags="-s -w" strips debug info for smaller binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o reforge-api ./cmd

# Stage 2: Minimal runtime image
FROM alpine:3.20

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    postgresql-client \
    wget

# Create non-root user for security
RUN addgroup -g 1000 reforge && \
    adduser -u 1000 -G reforge -s /bin/sh -D reforge

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /build/reforge-api /usr/local/bin/reforge-api

# Copy sample datasets for CSV imports
COPY --from=builder /build/sample-datasets /app/sample-datasets

# Change ownership
RUN chown -R reforge:reforge /app

# Switch to non-root user
USER reforge

# Expose API port
EXPOSE 9173

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9173/api/v1/health || exit 1

# Run the binary
ENTRYPOINT ["/usr/local/bin/reforge-api"]
