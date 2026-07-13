# Kyntha US — Production Runbook

## Quick Start (Production)

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Stripe US account
- OpenAI / Anthropic API keys
- Domain + SSL (kyntha.app)

### Environment
1. Copy `.env.production` → `.env`
2. Fill in all `...` placeholders
3. Ensure `DATABASE_URL` points to US-hosted Postgres

### Database
```bash
pnpm prisma migrate deploy
pnpm prisma db seed
```

### Build & Run
```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

### Docker
```bash
docker-compose up -d
```

## US Compliance Checklist

- [x] HIPAA BAA — required for all PHI handlers
- [x] CCPA/CPRA — user rights (delete, access, opt-out)
- [x] State privacy laws — Virginia, Colorado, Utah, Connecticut, etc.
- [x] FDA compliance — medical disclaimers, no diagnostic claims
- [x] PCI DSS — Stripe handles card data; Kyntha never stores raw card numbers
- [x] Data residency — US-hosted databases only
- [x] Breach notification — 72-hour HIPAA / 30-day CCPA

## US Launch Agents

See `team-agents-us.md` for agent roster and accountability.

## Support
- privacy@kyntha.app
- support@kyntha.app
