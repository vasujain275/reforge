# ============================================================================
# Reforge Dockerfile - Multi-stage build
# Produces a single binary with embedded React SPA
# ============================================================================

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web

# Install pnpm
RUN npm install -g pnpm

# Copy package files first for better layer caching
COPY web/package.json web/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY web/ ./
RUN pnpm build

# Stage 2: Build backend with embedded frontend
FROM golang:1.25-alpine AS backend-builder

# Install build dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy go mod files first for better caching
COPY api/go.mod api/go.sum ./api/
RUN cd api && go mod download

# Copy API source code
COPY api/ ./api/

# Copy built frontend into the web package for embedding
COPY --from=frontend-builder /app/web/dist ./api/web/dist

# Build the binary with embedded static files and migrations
# CGO_ENABLED=0 for fully static binary
# -ldflags="-s -w" strips debug info for smaller binary
WORKDIR /app/api
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /reforge ./cmd

# Stage 3: Runtime - minimal image
FROM alpine:3.20

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user for security
RUN addgroup -g 1000 reforge && \
    adduser -u 1000 -G reforge -s /bin/sh -D reforge

# Create data directory
RUN mkdir -p /app/data && chown -R reforge:reforge /app

# Copy the binary
COPY --from=backend-builder /reforge /usr/local/bin/reforge

# Copy sample datasets if needed
COPY api/sample-datasets /app/sample-datasets

# Set working directory
WORKDIR /app

# Switch to non-root user
USER reforge

# Expose port
EXPOSE 9173

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9173/api/v1/health || exit 1

# Run the binary
ENTRYPOINT ["/usr/local/bin/reforge"]
