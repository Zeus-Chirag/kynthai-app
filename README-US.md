# Kynthai US — Production Runbook

## Quick Start (Production)

### Prerequisites
- Node.js 22+
- npm 10+
- PostgreSQL 16+
- Stripe US account
- NVIDIA / ZenMux API key (AI provider)
- Domain + SSL (kynthai.app)

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

> Kynthai is not a HIPAA-covered entity or business associate and does not claim
> HIPAA compliance. This checklist covers the US consumer-privacy obligations
> that do apply.

- [x] CCPA/CPRA — user rights (delete, access, opt-out)
- [x] State privacy laws — Virginia, Colorado, Utah, Connecticut, etc.
- [x] FTC Health Breach Notification Rule — breach notification for sensitive health data
- [x] FDA — medical disclaimers, no diagnostic claims
- [x] PCI DSS — Stripe handles card data; Kynthai never stores raw card numbers
- [x] Consent — explicit consent-before-processing for health data and AI training
- [ ] HIPAA BAA — N/A: not a covered entity; do not sign BAAs or claim covered-entity status

## US Launch Agents

See `team-agents-us.md` for agent roster and accountability.

## Support
- privacy@kynthai.app
- support@kynthai.app
