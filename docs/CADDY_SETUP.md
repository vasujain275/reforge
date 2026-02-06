# Caddy Reverse Proxy Setup for Reforge

This guide covers setting up Caddy as a reverse proxy for Reforge in production environments. Caddy provides automatic HTTPS with Let's Encrypt and simplified configuration.

## Why Use a Reverse Proxy?

A reverse proxy like Caddy offers several benefits:

- **Automatic HTTPS** - Free SSL certificates from Let's Encrypt with auto-renewal
- **Unified endpoint** - Single domain serves both frontend and API
- **Enhanced security** - Hide internal service ports, add security headers
- **Performance** - Gzip compression, caching, rate limiting
- **Domain routing** - Route multiple domains/subdomains to different services

## Architecture

```
Internet → Caddy (Port 80/443) → Reforge Services
                                  ├─ Frontend (reforge-web:5173)
                                  └─ Backend API (reforge-api:9173)
```

## Prerequisites

- Docker and Docker Compose installed
- Domain name pointed to your server (e.g., `reforge.example.com`)
- Ports 80 and 443 open on your firewall

## Installation Methods

### Option 1: Caddy in Docker Compose (Recommended)

Add Caddy to your existing `docker-compose.yaml`:

```yaml
services:
  # ... existing postgres, reforge-api, reforge-web services ...

  caddy:
    image: caddy:2-alpine
    container_name: reforge-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - reforge-network
    depends_on:
      - reforge-api
      - reforge-web

volumes:
  caddy_data:
  caddy_config:
  # ... existing postgres_data volume ...
```

Then create a `Caddyfile` in the `infra/` directory:

```caddyfile
# Reforge Caddyfile - Production Setup
reforge.example.com {
    # Frontend - serve React app
    handle /* {
        reverse_proxy reforge-web:5173
    }

    # Backend API - proxy to Go backend
    handle /api/* {
        reverse_proxy reforge-api:9173
    }

    # Security headers
    header {
        # Prevent clickjacking
        X-Frame-Options "SAMEORIGIN"
        
        # Prevent MIME sniffing
        X-Content-Type-Options "nosniff"
        
        # Enable XSS protection
        X-XSS-Protection "1; mode=block"
        
        # Control referrer information
        Referrer-Policy "no-referrer-when-downgrade"
        
        # Enable HSTS (uncomment after testing)
        # Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    }

    # Gzip compression
    encode gzip

    # Access logs (optional)
    log {
        output file /var/log/caddy/reforge.log
        format json
    }
}
```

**Start the stack:**

```bash
docker compose -f infra/docker-compose.yaml up -d
```

Caddy will automatically:
- Obtain SSL certificate from Let's Encrypt
- Renew certificates before expiration
- Redirect HTTP to HTTPS

---

### Option 2: Standalone Caddy (System Install)

Install Caddy on your host system:

```bash
# Debian/Ubuntu
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Fedora/CentOS/RHEL
sudo dnf install 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy
sudo dnf install caddy

# macOS
brew install caddy
```

Create `/etc/caddy/Caddyfile`:

```caddyfile
reforge.example.com {
    # Frontend
    handle /* {
        reverse_proxy localhost:5173
    }

    # Backend API
    handle /api/* {
        reverse_proxy localhost:9173
    }

    # Security headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "no-referrer-when-downgrade"
    }

    encode gzip
}
```

**Start Caddy:**

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
sudo systemctl status caddy
```

---

## Configuration Examples

### Multiple Domains

Serve Reforge on multiple domains:

```caddyfile
reforge.example.com, app.example.com {
    handle /* {
        reverse_proxy reforge-web:5173
    }

    handle /api/* {
        reverse_proxy reforge-api:9173
    }

    encode gzip
}
```

### Subdomain for API

Separate API to its own subdomain:

```caddyfile
# Main app
reforge.example.com {
    reverse_proxy reforge-web:5173
    encode gzip
}

# API subdomain
api.reforge.example.com {
    reverse_proxy reforge-api:9173
    encode gzip
}
```

**Note:** Update frontend `VITE_API_URL` to `https://api.reforge.example.com/api/v1`

### Rate Limiting

Protect against abuse:

```caddyfile
reforge.example.com {
    # Rate limit: 100 requests per minute per IP
    rate_limit {
        zone api {
            key {remote_host}
            events 100
            window 1m
        }
    }

    handle /api/* {
        rate_limit api
        reverse_proxy reforge-api:9173
    }

    handle /* {
        reverse_proxy reforge-web:5173
    }

    encode gzip
}
```

### Basic Authentication (Admin Protection)

Add basic auth to sensitive endpoints:

```caddyfile
reforge.example.com {
    # Protect admin routes
    handle /api/v1/admin/* {
        basicauth {
            admin $2a$14$xyz...  # Use 'caddy hash-password' to generate
        }
        reverse_proxy reforge-api:9173
    }

    # Regular API routes
    handle /api/* {
        reverse_proxy reforge-api:9173
    }

    # Frontend
    handle /* {
        reverse_proxy reforge-web:5173
    }

    encode gzip
}
```

Generate password hash:

```bash
caddy hash-password
```

### Custom Error Pages

Add custom error pages:

```caddyfile
reforge.example.com {
    handle_errors {
        respond "{err.status_code} {err.status_text}"
    }

    handle /api/* {
        reverse_proxy reforge-api:9173
    }

    handle /* {
        reverse_proxy reforge-web:5173
    }
}
```

---

## Testing Your Setup

### 1. Test DNS Resolution

```bash
dig reforge.example.com
# Should return your server's IP
```

### 2. Test HTTP → HTTPS Redirect

```bash
curl -I http://reforge.example.com
# Should see 301/302 redirect to https://
```

### 3. Test SSL Certificate

```bash
curl -I https://reforge.example.com
# Should return 200 OK with valid SSL
```

### 4. Test API Proxy

```bash
curl https://reforge.example.com/api/v1/health
# Should return: {"status":"ok"}
```

### 5. Check Caddy Logs

```bash
# Docker
docker logs reforge-caddy

# System install
sudo journalctl -u caddy -f
```

---

## Troubleshooting

### Certificate Errors

**Problem:** Caddy can't obtain SSL certificate

**Solutions:**
- Ensure ports 80 and 443 are open
- Verify DNS points to your server: `dig reforge.example.com`
- Check Caddy logs: `docker logs reforge-caddy`
- Ensure you're not behind Cloudflare proxy (orange cloud)
- Check rate limits: Let's Encrypt has limits (50 certs/week per domain)

### Connection Refused

**Problem:** `502 Bad Gateway` or connection refused

**Solutions:**
- Verify backend is running: `docker ps | grep reforge`
- Check service health: `docker compose ps`
- Test backend directly: `curl http://localhost:9173/api/v1/health`
- Check Docker networks: `docker network inspect reforge-network`

### CORS Errors

**Problem:** Frontend can't access API

**Solutions:**
- Ensure backend `ENV=prod` in `.env`
- Backend should allow your domain in CORS
- Check if API requests use correct path: `/api/v1/*`

### Docker Network Issues

**Problem:** Caddy can't reach backend services

**Solutions:**
- Ensure all services on same network: `reforge-network`
- Use service names (not `localhost`): `reforge-api:9173`
- Restart stack: `docker compose down && docker compose up -d`

---

## Production Best Practices

### 1. Enable HSTS

After testing, enable HSTS in Caddyfile:

```caddyfile
header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
```

### 2. Monitor Certificate Expiry

Caddy auto-renews, but monitor anyway:

```bash
# Check certificate expiry
echo | openssl s_client -connect reforge.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

### 3. Regular Backups

Backup Caddy data (includes certificates):

```bash
docker run --rm -v reforge_caddy_data:/data -v $(pwd):/backup alpine tar czf /backup/caddy_data_backup.tar.gz -C /data .
```

### 4. Update Regularly

```bash
# Docker
docker compose pull caddy
docker compose up -d caddy

# System
sudo apt update && sudo apt upgrade caddy
```

### 5. Use Fail2ban (Optional)

Protect against brute force:

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

---

## Complete Production Example

Here's a full production-ready setup:

**docker-compose.yaml:**

```yaml
services:
  postgres:
    image: postgres:18-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: reforge
      POSTGRES_USER: reforge
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - reforge-network

  reforge-api:
    image: vasujain275/reforge-api:latest
    restart: unless-stopped
    depends_on:
      - postgres
    environment:
      - ADDR=:9173
      - ENV=prod
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=postgresql://reforge:${DB_PASSWORD}@postgres:5432/reforge?sslmode=disable
    networks:
      - reforge-network

  reforge-web:
    image: vasujain275/reforge-web:latest
    restart: unless-stopped
    depends_on:
      - reforge-api
    networks:
      - reforge-network

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - reforge-network
    depends_on:
      - reforge-web
      - reforge-api

volumes:
  postgres_data:
  caddy_data:
  caddy_config:

networks:
  reforge-network:
    driver: bridge
```

**Caddyfile:**

```caddyfile
reforge.example.com {
    # API proxy
    handle /api/* {
        reverse_proxy reforge-api:9173
    }

    # Frontend
    handle /* {
        reverse_proxy reforge-web:5173
    }

    # Security headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "no-referrer-when-downgrade"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }

    # Compression
    encode gzip

    # Logging
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

---

## Support

For more information:
- [Caddy Documentation](https://caddyserver.com/docs/)
- [Reforge GitHub Issues](https://github.com/vasujain275/reforge/issues)
