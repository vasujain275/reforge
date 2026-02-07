# Reforge VPS Production Deployment Guide

Complete guide for deploying Reforge API to your VPS with zero-downtime blue-green deployment strategy.

## 🏗️ Architecture Overview

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
     │   PostgreSQL 18      │
     │ (Alpine)   │
     └────────────────┘
```

### Key Features

- ✅ **Zero-Downtime Deployments** - Blue-green strategy with automatic traffic switching
- ✅ **Automatic HTTPS** - Caddy handles Let's Encrypt certificates
- ✅ **Health-Based Routing** - Traffic only goes to healthy containers
- ✅ **Graceful Shutdown** - In-flight requests complete before container stops
- ✅ **Auto-Rollback** - Failed deployments don't affect traffic
- ✅ **CI/CD Integration** - GitHub Actions auto-deploy on image push

---

## 📋 Prerequisites

### VPS Requirements

- **OS**: Ubuntu 24.04 LTS (or 22.04 LTS)
- **CPU**: 2 cores minimum (for running both blue/green during deployment)
- **RAM**: 2GB minimum
- **Disk**: 10GB+ available
- **Network**: Public IP with ports 80/443 open

### DNS Configuration

**CRITICAL**: Before starting, ensure DNS is configured:

```bash
# Verify DNS points to your VPS
dig reforge-api.vasujain.me +short
# Should return your VPS IP address
```

If not configured:
1. Go to your DNS provider (Cloudflare, etc.)
2. Add an A record: `reforge-api` → `YOUR_VPS_IP`
3. Wait for DNS propagation (5-60 minutes)

### External Services

- **Neon PostgreSQL**: Database connection string ready
- **Cloudflare Pages**: Frontend deployed at reforge.vasujain.me
- **Docker Hub**: Access to vasujain275/reforge-api images

---

## 🚀 Initial Setup (One-Time)

### Step 1: Install Dependencies

SSH into your VPS and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify installations
docker --version
docker compose version
```

**Important**: Log out and log back in for docker group changes to take effect.

### Step 2: Create Deployment Directory

```bash
# Create deployment directory
sudo mkdir -p /opt/reforge
sudo chown $USER:$USER /opt/reforge
cd /opt/reforge

# Clone repository (or copy files manually)
git clone https://github.com/vasujain275/reforge.git .
# OR: scp files from your local machine

# Navigate to VPS infrastructure
cd /opt/reforge/infra/vps
```

### Step 3: Configure Environment

```bash
# Copy sample environment file
cp .env.sample .env

# Edit with your actual values
nano .env  # or vim .env
```

**Required Configuration**:

```bash
# CRITICAL: Set these values!

# JWT Secret (must match frontend - generate with: openssl rand -base64 32)
JWT_SECRET=your-actual-jwt-secret-here

# Neon PostgreSQL connection string
# Get from: https://console.neon.tech
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/reforge?sslmode=require

# Deployment configuration (leave as defaults for initial setup)
BLUE_VERSION=latest
GREEN_VERSION=latest
ACTIVE_COLOR=blue

# Optional: Adjust signup settings
DEFAULT_SIGNUP_ENABLED=false
DEFAULT_INVITE_CODES_ENABLED=true
```

**Save and exit** (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

### Step 4: Initial Deployment

```bash
# Pull Docker images
docker compose pull

# Start all services (Caddy + Blue + Green)
docker compose up -d

# Watch logs to ensure startup is successful
docker compose logs -f
```

**Expected Output**:
- Caddy obtains SSL certificate from Let's Encrypt
- Blue container starts and passes health checks
- Green container starts and passes health checks

Press `Ctrl+C` to exit logs.

### Step 5: Verify Deployment

```bash
# Check container status
docker compose ps
# All containers should be "healthy"

# Test health endpoint locally
curl http://localhost:9173/api/v1/health  # Blue
curl http://localhost:9174/api/v1/health  # Green

# Test public HTTPS endpoint
curl https://reforge-api.vasujain.me/api/v1/health
# Should return: {"status":"ok"}
```

✅ **If all checks pass, your API is now live!**

---

## 🔄 Deployment Workflow

### Automatic Deployment (Recommended)

Deployments happen automatically via GitHub Actions when you push a new version:

1. **Update version** in `web/package.json`
2. **Commit and push** to main branch
3. **GitHub Actions** builds and pushes Docker image
4. **GitHub Actions** SSH to VPS and runs `deploy.sh`
5. **Zero-downtime switch** happens automatically

### Manual Deployment

If you need to deploy manually:

```bash
cd /opt/reforge/infra/vps

# Deploy latest version
./deploy.sh deploy latest

# Deploy specific version
./deploy.sh deploy 1.2.3

# Check deployment status
./deploy.sh status

# Rollback if needed
./deploy.sh rollback
```

### Deployment Process Details

When `deploy.sh` runs:

1. **Determines active slot** (e.g., blue is active, green is standby)
2. **Pulls new image** for standby slot (green)
3. **Starts standby container** with new version
4. **Waits for health checks** (max 60 seconds)
5. **Caddy automatically routes** traffic to healthy backends
6. **Drains connections** from old container (30 seconds)
7. **Stops old container** (blue becomes standby for next deploy)
8. **Updates .env** with new active slot

---

## 🔍 Monitoring & Maintenance

### Check Deployment Status

```bash
# Quick status check
cd /opt/reforge/infra/vps
./deploy.sh status

# Watch logs in real-time
docker compose logs -f

# Check specific service logs
docker compose logs -f reforge-api-blue
docker compose logs -f reforge-api-green
docker compose logs -f caddy

# View last 100 lines
docker compose logs --tail=100
```

### Health Check Endpoints

```bash
# Blue container (internal)
curl http://localhost:9173/api/v1/health

# Green container (internal)
curl http://localhost:9174/api/v1/health

# Public endpoint (via Caddy)
curl https://reforge-api.vasujain.me/api/v1/health

# Caddy admin API
curl http://localhost:2019/health
```

### View Caddy Access Logs

```bash
# Real-time access logs
docker exec reforge-caddy tail -f /var/log/caddy/reforge-api-access.log

# Search for errors
docker exec reforge-caddy grep -i error /var/log/caddy/reforge-api-access.log
```

### Container Resource Usage

```bash
# View CPU/memory usage
docker stats

# View disk usage
docker system df

# Clean up old images (safe)
docker image prune -a
```

---

## 🔧 Troubleshooting

### Issue: Containers Won't Start

```bash
# Check logs for errors
docker compose logs

# Common issues:
# 1. Invalid DATABASE_URL - Check connection string
# 2. Missing JWT_SECRET - Verify .env file
# 3. Port conflicts - Ensure 80/443 are free

# Restart services
docker compose restart
```

### Issue: SSL Certificate Fails

```bash
# Check Caddy logs
docker compose logs caddy

# Common causes:
# 1. DNS not pointing to server - Verify: dig reforge-api.vasujain.me
# 2. Ports 80/443 blocked - Check firewall
# 3. Rate limit hit - Wait 1 hour and retry

# Force certificate renewal
docker compose restart caddy
```

### Issue: Health Checks Failing

```bash
# Check if API is responding
curl -v http://localhost:9173/api/v1/health

# Check database connection
docker compose logs reforge-api-blue | grep -i database

# Common causes:
# 1. Database unreachable - Test Neon connection
# 2. Migrations failed - Check startup logs
# 3. JWT_SECRET missing - Verify .env

# Restart container
docker compose restart reforge-api-blue
```

### Issue: 503 Errors on Public URL

```bash
# Check which containers are healthy
docker compose ps

# Check Caddy routing
docker compose logs caddy | grep -i health

# Manually test backends
curl http://localhost:9173/api/v1/health
curl http://localhost:9174/api/v1/health

# If one is unhealthy, check its logs
docker compose logs reforge-api-blue
```

### Issue: Deployment Stuck

```bash
# Check deploy script output for errors
./deploy.sh status

# Manually check health
curl http://localhost:9174/api/v1/health  # If deploying to green

# Timeout usually means:
# 1. Container crashed - Check logs: docker compose logs
# 2. Database unreachable - Test connection
# 3. Image pull failed - Verify Docker Hub access

# Rollback if needed
./deploy.sh rollback
```

---

## 🔐 Security Best Practices

### Firewall Configuration

```bash
# Install UFW (Ubuntu Firewall)
sudo apt install -y ufw

# Allow SSH (CRITICAL - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### SSH Key-Based Authentication

```bash
# On your local machine, generate SSH key
ssh-keygen -t ed25519 -C "reforge-deploy"

# Copy public key to VPS
ssh-copy-id user@your-vps-ip

# Disable password authentication (after testing key works!)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### Secrets Management

- ✅ **Never commit .env to Git**
- ✅ Store JWT_SECRET in GitHub Secrets for CI/CD
- ✅ Use strong DATABASE_URL password (Neon auto-generates)
- ✅ Rotate JWT_SECRET periodically
- ✅ Limit SSH access to specific IPs if possible

---

## 📊 Monitoring Setup (Optional)

### Basic Uptime Monitoring

Use a free service like:
- **UptimeRobot**: Monitor https://reforge-api.vasujain.me/api/v1/health
- **Pingdom**: 5-minute checks with email alerts
- **Better Uptime**: Beautiful status pages

### Log Aggregation

For production, consider:
- **Grafana Loki**: Free, self-hosted log aggregation
- **Papertrail**: Simple cloud logging
- **Datadog**: Full observability platform

### Metrics (Advanced)

Add Prometheus metrics to your API:
- Container metrics: CPU, memory, network
- Application metrics: Request rate, latency, errors
- Database metrics: Connection pool, query time

---

## 🔄 Rollback Procedures

### Automatic Rollback

If health checks fail during deployment, the old version keeps running automatically.

### Manual Rollback

```bash
# Rollback to previous version
cd /opt/reforge/infra/vps
./deploy.sh rollback

# Verify rollback succeeded
./deploy.sh status
curl https://reforge-api.vasujain.me/api/v1/health
```

### Emergency Rollback (Script Fails)

```bash
# Manually stop failed container
docker compose stop reforge-api-green

# Manually start previous version
docker compose start reforge-api-blue

# Update .env to mark blue as active
nano .env  # Set ACTIVE_COLOR=blue
```

---

## 🗑️ Cleanup & Uninstall

### Clean Up Old Images

```bash
# Remove unused images (saves disk space)
docker image prune -a

# Remove old container logs
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

### Complete Uninstall

```bash
# Stop and remove all containers
cd /opt/reforge/infra/vps
docker compose down

# Remove images
docker rmi vasujain275/reforge-api:latest
docker rmi caddy:2.8-alpine

# Remove volumes (CAUTION: This deletes Caddy certs!)
docker volume rm vps_caddy_data vps_caddy_config vps_caddy_logs

# Remove deployment directory
sudo rm -rf /opt/reforge
```

---

## 📚 Additional Resources

### Documentation
- [Main Reforge README](../../README.md)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [Neon PostgreSQL Docs](https://neon.tech/docs)

### Support
- GitHub Issues: [vasujain275/reforge/issues](https://github.com/vasujain275/reforge/issues)
- Docker Hub: [vasujain275/reforge-api](https://hub.docker.com/r/vasujain275/reforge-api)

---

## 🎯 Quick Reference

### Common Commands

```bash
# Deploy new version
./deploy.sh deploy latest

# Check status
./deploy.sh status

# Rollback
./deploy.sh rollback

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Update images
docker compose pull && docker compose up -d

# Health check
curl https://reforge-api.vasujain.me/api/v1/health
```

### File Locations

- **Deployment**: `/opt/reforge/infra/vps/`
- **Configuration**: `/opt/reforge/infra/vps/.env`
- **Docker Compose**: `/opt/reforge/infra/vps/docker-compose.yaml`
- **Caddy Config**: `/opt/reforge/infra/vps/Caddyfile`
- **Deploy Script**: `/opt/reforge/infra/vps/deploy.sh`
- **Caddy Logs**: `/var/log/caddy/reforge-api-access.log` (inside container)

### Ports

- **80**: HTTP (Caddy redirects to HTTPS)
- **443**: HTTPS (Public API endpoint)
- **9173**: Blue container (internal)
- **9174**: Green container (internal)
- **2019**: Caddy admin API (localhost only)

---

## ✅ Success Checklist

After following this guide, you should have:

- [ ] VPS running Ubuntu 24.04 LTS
- [ ] Docker and Docker Compose installed
- [ ] DNS pointing `reforge-api.vasujain.me` to VPS IP
- [ ] `.env` file configured with secrets
- [ ] All containers running and healthy
- [ ] HTTPS working with Let's Encrypt certificate
- [ ] Health endpoint returning `{"status":"ok"}`
- [ ] Frontend connecting successfully to API
- [ ] GitHub Actions CI/CD set up (optional)
- [ ] Monitoring/alerting configured (optional)

🎉 **Congratulations! Your Reforge API is now deployed with zero-downtime capabilities!**
