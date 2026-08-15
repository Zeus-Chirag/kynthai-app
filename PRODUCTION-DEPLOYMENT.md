# Kynthai US — Production Deployment Guide

This document describes the zero-dontime production deployment process for the Kynthai application.

## Architecture

- **App**: Next.js 16 standalone server on Node 20 Alpine
- **Database**: PostgreSQL 16 Alpine
- **Reverse Proxy**: Caddy 2 (automatic HTTPS via Let's Encrypt)
- **Health Checks**: `/api/health` (DB ping + uptime)

## Prerequisites

1. **Server**: Linux with Docker Engine 24+ and Docker Compose v2+
2. **Domain**: DNS `A` record pointing to server IP (e.g., `kynthai.app`, `www.kynthai.app`)
3. **Secrets**: All placeholders replaced in `.env.production`
4. **PostgreSQL**: If using managed DB (RDS, Cloud SQL), set `DATABASE_URL` and `DIRECT_URL` accordingly

## Pre-Deployment Checklist

### 1. Environment Configuration

Fill in `.env.production` with real production values:

- [ ] `DATABASE_URL` and `DIRECT_URL` include `sslmode=require` (HIPAA mandate)
- [ ] `SESSION_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `VIDEO_TOKEN_SECRET`, `NEXTAUTH_SECRET` are 64-char hex secrets
- [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from Upstash console
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are LIVE keys
- [ ] `SENTRY_DSN` points to the production Sentry project
- [ ] `NVIDIA_API_KEY` for AI features (NVIDIA NIM — OpenAI-compatible)
- [ ] `SENDGRID_API_KEY` or `RESEND_API_KEY` for transactional email

Generate secrets with:
```bash
export SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "SESSION_SECRET=$SECRET"
```

### 2. Security

- [ ] Firewall allows only 80/443 to the world; 3000 and 5432 are internal-only
- [ ] PostgreSQL password is strong (not `changeme`)
- [ ] `CORS_ORIGIN` is set to exact production domains (no wildcard `*`)
- [ ] `NEXT_PUBLIC_ENABLE_DEMO=false`
- [ ] Server OS is up-to-date and fail2ban/ufw is configured

### 3. Database

```bash
# If provisioning a new DB
docker compose up -d db
# Verify it's healthy
docker compose ps db
```

## Deployment Steps

### Option A: Automated (recommended)

```bash
./deploy.sh
```

Flags:
- `--skip-build`: Reuse existing Docker images
- `--skip-migrate`: Skip Prisma migrations (not recommended)
- `--rollback`: Revert to previous container version

### Option B: Manual

```bash
# 1. Build
 docker compose build --no-cache app

# 2. Migrate
 docker compose run --rm app npx prisma migrate deploy

# 3. Start / restart
 docker compose up -d --force-recreate app db caddy

# 4. Health check
 curl -sf http://localhost:3000/api/health
 curl -I https://kynthai.app
```

## Post-Deployment Verification

| Check | Command / Action |
|-------|------------------|
| App health | `curl -sf https://kynthai.app/api/health` |
| DB connectivity | `docker compose logs db` |
| TLS certificate | `curl -I https://kynthai.app` (expect 200) |
| Error tracking | Check Sentry for envelope ingestion |
| Email delivery | Trigger a password-reset flow |
| Static assets | Load homepage, check browser console for 404s |

## Rollback

```bash
./deploy.sh --rollback
```

## Scaling

Horizontal scaling of the `app` service is supported:
```bash
docker compose up -d --scale app=3
```
Ensure your database and Redis can handle the connection pool increase.

## Zero-Downtime Strategy

- Caddy buffers connections during `app` restarts
- `restart: unless-stopped` ensures containers come back automatically
- Health checks prevent routing traffic to unhealthy instances
- Database migrations run before the new app version starts receiving traffic

## Monitoring

- **Health**: `/api/health` (application + DB ping)
- **Logs**: `docker compose logs -f app`, `docker compose logs -f caddy`
- **Metrics**: Prometheus/Grafana integration can be added via Caddy's `prometheus` plugin
- **Alerts**: Configure uptime monitor for `https://kynthai.app/api/health`
- **Sentry**: Real-time error tracking and performance monitoring

## Security Notes

1. Never expose port 3000 or 5432 to the public internet
2. The Caddyfile enforces HSTS, COOP/COEP, and CSP
3. Uploaded documents and prescription images are encrypted at rest (AES-256-GCM); field-level DB encryption is prepared (schema + middleware) but not yet enabled — see `docs/INFRASTRUCTURE_SECURITY.md`
4. All secrets are injected via environment variables — no secrets baked into the image
5. Containers run as non-root user `nextjs` (UID 1001)
