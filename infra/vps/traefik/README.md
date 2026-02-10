# Traefik Global Reverse Proxy

Global Traefik instance for managing HTTPS, routing, and load balancing across all services on your VPS.

## Quick Start

### 1. Configure Environment

```bash
cd /home/vasu/personal/reforge/infra/vps/traefik

# Copy environment template
cp .env.sample .env

# Generate dashboard password
echo $(htpasswd -nb admin your-strong-password) | sed -e s/\\$/\\$\\$/g

# Edit configuration
vim .env
```

**Required Configuration:**

```bash
# Let's Encrypt email
ACME_EMAIL=admin@vasujain.me

# Dashboard domain (must point to your VPS IP)
TRAEFIK_DASHBOARD_DOMAIN=dashboard.vasujain.me

# Dashboard auth (use generated password from above)
TRAEFIK_DASHBOARD_AUTH=admin:$$apr1$$...

# CORS origin (your frontend domain)
CORS_ORIGIN=https://reforge.vasujain.me
```

### 2. Start Traefik

```bash
# Start Traefik
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 3. Verify Setup

```bash
# Check Traefik is running
docker compose ps

# Test health endpoint
curl http://localhost:80/ping

# Access dashboard (use credentials from .env)
# https://dashboard.vasujain.me
```

## Features

- **Automatic HTTPS** - Let's Encrypt certificates with automatic renewal
- **HTTP/3 Support** - QUIC protocol for better performance
- **Service Discovery** - Automatically detects Docker containers with labels
- **Health Checks** - Routes traffic only to healthy services
- **Dashboard** - Web UI for monitoring routes and services
- **Middleware** - CORS, security headers, compression, rate limiting
- **Access Logs** - JSON formatted logs for analysis

## Adding Services

To add a service to Traefik, add these labels to your docker-compose.yml:

```yaml
services:
  your-service:
    image: your-image
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.your-service.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.your-service.entrypoints=websecure"
      - "traefik.http.routers.your-service.tls=true"
      - "traefik.http.routers.your-service.tls.certresolver=letsencrypt"
      - "traefik.http.services.your-service.loadbalancer.server.port=8080"

networks:
  traefik-public:
    external: true
```

## Common Commands

```bash
# Start Traefik
docker compose up -d

# Stop Traefik
docker compose down

# Restart Traefik
docker compose restart

# View logs
docker compose logs -f

# View access logs
docker exec traefik tail -f /var/log/traefik/access.log

# Check certificate status
docker exec traefik cat /letsencrypt/acme.json
```

## Middleware Usage

Apply middleware to your services via labels:

```yaml
labels:
  # Apply security headers
  - "traefik.http.routers.your-service.middlewares=security-headers"
  
  # Apply CORS + security headers
  - "traefik.http.routers.your-service.middlewares=cors-reforge,security-headers"
  
  # Apply compression + security
  - "traefik.http.routers.your-service.middlewares=compression,security-headers"
```

Available middleware (defined in `dynamic/middlewares.yml`):
- `security-headers` - HSTS, X-Frame-Options, CSP, etc.
- `cors-reforge` - CORS headers for frontend access
- `compression` - gzip/brotli compression

## Troubleshooting

### Dashboard Not Accessible

```bash
# Check Traefik logs
docker compose logs traefik

# Verify DNS points to VPS
dig dashboard.vasujain.me +short

# Test locally first
curl -k https://localhost/dashboard/
```

### Certificate Issues

```bash
# Check certificate resolver logs
docker compose logs traefik | grep -i acme

# Common causes:
# 1. DNS not pointing to server
# 2. Ports 80/443 blocked by firewall
# 3. Rate limit hit (wait 1 hour)

# Force certificate renewal
docker compose restart traefik
```

### Service Not Routing

```bash
# Check if service is discovered
docker compose logs traefik | grep your-service

# Verify service labels
docker inspect your-service-container | grep traefik

# Check if service is on traefik-public network
docker network inspect traefik-public
```

## File Structure

```
traefik/
├── docker-compose.yml     # Traefik service definition
├── traefik.yml            # Static configuration
├── dynamic/
│   └── middlewares.yml    # CORS, security headers, etc.
├── .env.sample            # Environment template
├── .env                   # Your configuration (not in git)
└── README.md              # This file
```

## Security Notes

- Dashboard is protected by basic auth (configure in .env)
- Docker socket is mounted read-only
- HSTS enabled with 1-year max-age
- Security headers applied to all routes
- TLS 1.2+ only
- Automatic security updates via Traefik image

## Moving to Separate Repository

This Traefik setup is designed to be moved to a separate repository:

1. Copy entire `traefik/` directory to new repo
2. Update `CORS_ORIGIN` in `.env` as needed
3. Keep using `traefik-public` network name
4. Services in other repos connect via external network:

```yaml
networks:
  traefik-public:
    external: true
```

## Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Docker Provider](https://doc.traefik.io/traefik/providers/docker/)
