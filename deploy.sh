#!/bin/bash
set -euo pipefail

# ─── Kynthai US Production Deployment Script ───────────────────────────────────
# This script automates the zero-downtime production deployment of the Kynthai
# application using Docker Compose.
#
# Prerequisites:
#   - Docker Engine 24+ and Docker Compose v2+
#   - Real secrets populated in .env.production
#   - Domain DNS pointing to this server (for Caddy TLS)
#
# Usage:
#   ./deploy.sh [--skip-build] [--skip-migrate] [--rollback]
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SKIP_BUILD=false
SKIP_MIGRATE=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-migrate) SKIP_MIGRATE=true; shift ;;
    --rollback) ROLLBACK=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

log() { echo "[deploy] $(date '+%Y-%m-%d %H:%M:%S') $*"; }
fail() { log "ERROR: $*"; exit 1; }

if [ "$ROLLBACK" = true ]; then
  log "Rolling back to previous release..."
  docker compose pull || true
  docker compose up -d --force-recreate --no-deps app db caddy || fail "Rollback failed"
  log "Rollback complete"
  exit 0
fi

log "Starting production deployment..."

# 1. Validate environment
if [ ! -f .env.production ]; then
  fail ".env.production not found. Copy from .env.production.example and fill in secrets."
fi

log "Validating production environment variables..."
# Source .env.production and check for placeholders
set -a
source .env.production
set +a

MISSING=()
for VAR in DATABASE_URL DIRECT_URL SESSION_SECRET ENCRYPTION_KEY NEXTAUTH_SECRET CRON_SECRET UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SENTRY_DSN SENDGRID_API_KEY; do
  VAL=${!VAR:-}
  if [[ "$VAL" == *"REPLACE"* ]] || [[ -z "$VAL" ]]; then
    MISSING+=("$VAR")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  fail "Missing or placeholder production variables: ${MISSING[*]}"
fi

log "Environment validation passed."

# 2. Build and push images
if [ "$SKIP_BUILD" = false ]; then
  log "Building Docker image..."
  docker compose build --no-cache app || fail "Docker build failed"
else
  log "Skipping build."
fi

# 3. Run database migrations
if [ "$SKIP_MIGRATE" = false ]; then
  log "Running database migrations..."
  docker compose run --rm app npx prisma migrate deploy || fail "Migrations failed"
else
  log "Skipping migrations."
fi

# 4. Rolling update (zero-downtime)
log "Performing rolling update..."
docker compose up -d --force-recreate app caddy || fail "Failed to start services"

# 5. Wait for health checks
log "Waiting for application health..."
for i in {1..30}; do
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    log "Application is healthy."
    break
  fi
  if [ $i -eq 30 ]; then
    fail "Application did not become healthy within 30 seconds. Check logs: docker compose logs app"
  fi
  sleep 1
done

# 6. Cleanup old images
log "Cleaning up old Docker images..."
docker image prune -f --filter "until=72h" || true

log "Deployment complete! Application is running at https://kynthai.app"
log "Verify with: docker compose ps && curl -I https://kynthai.app"
