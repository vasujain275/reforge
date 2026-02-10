# VPS Infrastructure

Traefik-based infrastructure for deploying Reforge and other services on a VPS.

## Structure

```
vps/
├── traefik/          # Global Traefik reverse proxy
│   ├── docker-compose.yml
│   ├── traefik.yml
│   ├── dynamic/
│   ├── .env.sample
│   └── README.md
│
└── api/              # Reforge API deployment
    ├── docker-compose.yml
    ├── deploy.sh
    ├── backup.sh
    ├── .env.sample
    ├── backups/
    └── README.md
```

## Quick Start

### 1. Deploy Traefik (Global Instance)

```bash
cd traefik/
cp .env.sample .env
vim .env  # Configure domain, email, passwords

docker compose up -d
```

See `traefik/README.md` for detailed instructions.

### 2. Deploy Reforge API

```bash
cd api/
cp .env.sample .env
vim .env  # Configure API domain, JWT secret, database password

docker compose up -d
```

See `api/README.md` for detailed instructions.

## Features

- **Traefik Reverse Proxy** - Automatic HTTPS, service discovery, health checks
- **Blue-Green Deployment** - Zero-downtime updates for Reforge API
- **PostgreSQL Database** - Local PostgreSQL with automated backups
- **Modular Design** - Easy to add more services

## Adding More Services

To add a new service to this infrastructure:

1. Create a new directory in `vps/` for your service
2. Add Traefik labels to your `docker-compose.yml`
3. Connect to the `traefik-public` external network
4. Traefik will automatically discover and route traffic

Example:

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
      - "traefik.http.routers.your-service.tls.certresolver=letsencrypt"

networks:
  traefik-public:
    external: true
```

## Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
