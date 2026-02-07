# 🚀 Zero-Downtime VPS Deployment - Implementation Complete!

## ✅ What Has Been Implemented

Congratulations! Your Reforge API now has a complete zero-downtime deployment infrastructure with blue-green strategy.

### 1. **Backend Graceful Shutdown** ✅
**Files Modified:**
- `api/cmd/main.go` - Added signal handling (SIGTERM, SIGINT, os.Interrupt)
- `api/cmd/api.go` - Implemented graceful server shutdown with 30s timeout

**Key Features:**
- Waits for in-flight requests to complete
- Cleanly closes database connections
- Prevents dropped requests during deployment
- Essential for zero-downtime deployments

### 2. **Database Configuration Update** ✅
**Files Modified:**
- `infra/docker-compose.yaml` - Now uses full DATABASE_URL
- `infra/.env.sample` - Updated with DATABASE_URL configuration

**Benefits:**
- Consistent with PostgreSQL 18 Alpine (local on VPS) usage
- Supports SSL connections properly (`sslmode=require`)
- Single source of truth for database configuration
- Easy to switch between local and production databases

### 3. **VPS Blue-Green Infrastructure** ✅
**New Files Created:**
- `infra/vps/docker-compose.yaml` - Blue and green API containers + Caddy
- `infra/vps/Caddyfile` - Reverse proxy with health-based routing
- `infra/vps/.env.sample` - VPS-specific configuration template
- `infra/vps/.gitignore` - Protects secrets from git

**Architecture:**
```
Caddy (HTTPS) → Health-Check Router
                    ├─→ Blue API (:9173)
                    └─→ Green API (:9174)
                           ↓
                    PostgreSQL 18 Alpine (local on VPS)
```

### 4. **Deployment Automation** ✅
**New Files Created:**
- `infra/vps/deploy.sh` - Blue-green deployment script (executable)
- `infra/vps/README.md` - Comprehensive setup and operations guide

**Features:**
- Automatic slot detection (blue/green)
- Health-check based traffic switching
- Automatic rollback on failure
- Connection draining (30s grace period)
- Deployment status reporting

### 5. **GitHub Actions CI/CD** ✅
**New Workflow:**
- `.github/workflows/deploy-vps.yaml` - Auto-deployment on image push

**Triggers:**
- Runs after Docker images are built
- Only deploys if API files changed
- Manual trigger option available

**Process:**
1. Detects new API image on Docker Hub
2. SSH to VPS
3. Runs `deploy.sh` with new version
4. Verifies health checks
5. Reports success/failure

---

## 📋 Required GitHub Secrets

Before the auto-deployment workflow can run, add these secrets to your GitHub repository:

### Navigate to: `Settings → Secrets and variables → Actions → New repository secret`

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | Your VPS IP or hostname | `123.45.67.89` or `vps.example.com` |
| `VPS_USER` | SSH username | `root` or `ubuntu` |
| `VPS_SSH_KEY` | Private SSH key | Contents of `~/.ssh/id_ed25519` |
| `VPS_SSH_PORT` | SSH port (optional) | `22` (default) |

### How to Get SSH Key:

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-reforge"

# Copy the PRIVATE key (for GitHub Secret)
cat ~/.ssh/id_ed25519
# Copy entire output including -----BEGIN and -----END lines

# Copy the PUBLIC key to VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-vps-ip
```

---

## 🎯 Next Steps: VPS Setup

### Step 1: Prepare Your VPS

**Requirements:**
- Ubuntu 24.04 LTS (or 22.04)
- 2GB RAM, 2 CPU cores
- Ports 80, 443, and SSH open

**Install Docker:**
```bash
ssh user@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Log out and log back in for group changes
exit
```

### Step 2: Setup Deployment Directory

```bash
# SSH back in
ssh user@your-vps-ip

# Create deployment directory
sudo mkdir -p /opt/reforge
sudo chown $USER:$USER /opt/reforge

# Clone repository
cd /opt/reforge
git clone https://github.com/vasujain275/reforge.git .

# Navigate to VPS directory
cd /opt/reforge/infra/vps
```

### Step 3: Configure Environment

```bash
# Copy sample env file
cp .env.sample .env

# Edit with your values
nano .env
```

**Required Configuration:**

```bash
# JWT_SECRET - Generate with: openssl rand -base64 32
# MUST match the secret used by frontend!
JWT_SECRET=your-actual-jwt-secret-here

# DATABASE_URL - From Neon dashboard
DATABASE_URL=postgresql://user:pass@ep-xxx-xxx.region.aws.neon.tech/reforge?sslmode=require

# Leave these as defaults for initial setup
BLUE_VERSION=latest
GREEN_VERSION=latest
ACTIVE_COLOR=blue
```

### Step 4: Verify DNS

**CRITICAL:** Before starting, ensure DNS is configured:

```bash
# Should return your VPS IP
dig reforge-api.vasujain.me +short
```

If not configured:
1. Go to your DNS provider (Cloudflare, etc.)
2. Add A record: `reforge-api` → `YOUR_VPS_IP`
3. Wait 5-60 minutes for propagation

### Step 5: Initial Deployment

```bash
cd /opt/reforge/infra/vps

# Pull images
docker compose pull

# Start all services
docker compose up -d

# Watch logs (Ctrl+C to exit)
docker compose logs -f
```

**Expected:**
- ✅ Caddy obtains SSL certificate
- ✅ Blue container starts and becomes healthy
- ✅ Green container starts and becomes healthy

### Step 6: Verify Everything Works

```bash
# Check container status
docker compose ps
# All should show "healthy"

# Test health endpoints
curl http://localhost:9173/api/v1/health  # Blue
curl http://localhost:9174/api/v1/health  # Green
curl https://reforge-api.vasujain.me/api/v1/health  # Public

# All should return: {"status":"ok"}
```

### Step 7: Test Deployment Script

```bash
# Test deployment manually
./deploy.sh status

# Try deploying latest version
./deploy.sh deploy latest

# Watch it switch between blue and green!
```

---

## 🔄 How Deployments Work

### Automatic Flow (After Setup):

1. **Developer** pushes code to `main` branch
2. **GitHub Actions** builds Docker image → pushes to Docker Hub
3. **Deploy Workflow** triggers automatically
4. **SSH to VPS** → runs `deploy.sh`
5. **Blue-Green Switch:**
   - Pulls new image to inactive slot (e.g., green)
   - Starts green container
   - Waits for green health checks (60s max)
   - Caddy automatically routes traffic to healthy backend
   - Waits 30s for connection draining
   - Stops old container (blue)
   - Green becomes active for next deployment

### Manual Deployment:

```bash
# SSH to VPS
ssh user@your-vps-ip

# Navigate to deployment directory
cd /opt/reforge/infra/vps

# Deploy specific version
./deploy.sh deploy 1.2.3

# Check status
./deploy.sh status

# Rollback if needed
./deploy.sh rollback
```

---

## 📊 Monitoring & Operations

### Check Deployment Status

```bash
cd /opt/reforge/infra/vps

# Show current active slot and container status
./deploy.sh status

# Watch logs
docker compose logs -f

# Check specific service
docker compose logs -f reforge-api-blue
docker compose logs -f caddy
```

### Health Checks

```bash
# Blue container (internal)
curl http://localhost:9173/api/v1/health

# Green container (internal)
curl http://localhost:9174/api/v1/health

# Public endpoint (through Caddy)
curl https://reforge-api.vasujain.me/api/v1/health

# All should return: {"status":"ok"}
```

### View Logs

```bash
# Real-time logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Caddy access logs (inside container)
docker exec reforge-caddy tail -f /var/log/caddy/reforge-api-access.log
```

---

## 🔧 Troubleshooting

### Deployment Fails

```bash
# Check logs for errors
docker compose logs

# Common issues:
# 1. Invalid DATABASE_URL
# 2. DNS not pointing to VPS
# 3. Ports 80/443 blocked by firewall

# Rollback to previous version
./deploy.sh rollback
```

### SSL Certificate Issues

```bash
# Check Caddy logs
docker compose logs caddy

# Verify DNS
dig reforge-api.vasujain.me +short

# Restart Caddy
docker compose restart caddy
```

### Health Checks Failing

```bash
# Check if API responds
curl -v http://localhost:9173/api/v1/health

# Check database connection
docker compose logs reforge-api-blue | grep -i database

# Restart container
docker compose restart reforge-api-blue
```

---

## 🔐 Security Checklist

- [ ] SSH key-based authentication configured
- [ ] Firewall (UFW) enabled with only necessary ports open
- [ ] JWT_SECRET is strong and matches frontend
- [ ] DATABASE_URL uses SSL (`sslmode=require`)
- [ ] `.env` file never committed to git
- [ ] GitHub Secrets configured for CI/CD
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`

---

## 📚 Documentation Links

- **VPS Setup Guide**: `/infra/vps/README.md`
- **Environment Config**: `/infra/vps/.env.sample`
- **Deployment Script**: `/infra/vps/deploy.sh`
- **Docker Compose**: `/infra/vps/docker-compose.yaml`
- **Caddy Config**: `/infra/vps/Caddyfile`
- **GitHub Workflow**: `/.github/workflows/deploy-vps.yaml`

---

## 🎉 Success Criteria

After completing setup, you should have:

- ✅ API accessible at `https://reforge-api.vasujain.me`
- ✅ Automatic HTTPS with Let's Encrypt
- ✅ Zero-downtime deployments working
- ✅ Health checks passing on both slots
- ✅ GitHub Actions auto-deploying on push
- ✅ Frontend connecting successfully
- ✅ Rollback capability tested

---

## 🚨 Important Notes

### Before First Deployment:

1. **Test graceful shutdown** - The backend now handles SIGTERM properly
2. **Verify DNS** - `reforge-api.vasujain.me` must resolve to VPS IP
3. **Configure GitHub Secrets** - SSH key, host, username required
4. **Test manually first** - Use `deploy.sh` before enabling CI/CD

### Frontend CORS:

The Caddyfile is configured for:
- **Frontend URL**: `https://reforge.vasujain.me`

If your frontend URL is different, update line 41 in `/infra/vps/Caddyfile`:
```caddyfile
Access-Control-Allow-Origin "https://your-actual-frontend-url.com"
```

### Database Connection:

Ensure your PostgreSQL 18 Alpine (local on VPS):
- Allows connections from your VPS IP
- Has `sslmode=require` in connection string
- Database named `reforge` exists

---

## 📞 Need Help?

If you encounter issues:

1. **Check VPS logs**: `docker compose logs -f`
2. **Review deployment script output**: `./deploy.sh status`
3. **Test health endpoints**: `curl http://localhost:9173/api/v1/health`
4. **Verify environment**: Ensure `.env` has all required values
5. **Check GitHub Actions**: View workflow logs for CI/CD issues

---

## ✨ What's Next?

Optional enhancements:

1. **Monitoring**: Add Prometheus + Grafana for metrics
2. **Alerting**: Setup PagerDuty or email alerts for downtime
3. **Log Aggregation**: Use Loki or ELK for centralized logs
4. **Backup Automation**: Schedule database backups
5. **Resource Limits**: Add Docker memory/CPU limits
6. **Rate Limiting**: Add Caddy rate limiting for API protection

---

**🎊 Congratulations! Your zero-downtime deployment infrastructure is ready!**

The next time you push to main with a version bump, your API will automatically deploy with zero downtime. 🚀
