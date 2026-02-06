# ============================================================================
# Reforge Frontend Dockerfile
# Multi-stage build for React app with production-optimized static files
# ============================================================================

# Stage 1: Build React app with Vite
FROM node:20-alpine AS builder

WORKDIR /build

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app for production
RUN pnpm build

# Stage 2: Serve static files with lightweight HTTP server
FROM node:20-alpine

WORKDIR /app

# Install serve globally for serving static files
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /build/dist /app/dist

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

# Serve the app with SPA fallback
# -s: Single-page app mode (all routes serve index.html)
# -l: Listen port
CMD ["serve", "-s", "dist", "-l", "5173"]
