# Backup & Restore Runbook — Kyntha US

**Owner:** Platform Engineering | **Last Updated:** 2026-07-23 | **Review Cadence:** Monthly

---

## 1. Supabase (Primary Database)

### Backup
- **Automatic:** Supabase provides daily Point-in-Time Recovery (PITR) on Pro plan (7-day retention)
- **Manual:** `supabase db dump --schema public -f backup_$(date +%F).sql`
- **Encrypted:** All backups encrypted at rest (AES-256)

### Restore
1. **PITR (recommended):**
   ```bash
   supabase restore --project-ref <ref> --recovery-time "2026-07-23T10:00:00Z"
   ```
2. **Full dump restore:**
   ```bash
   psql "$DATABASE_URL" < backup_2026-07-23.sql
   ```

### RTO/RPO
- **RPO:** < 5 minutes (WAL streaming)
- **RTO:** < 30 minutes (PITR) / < 2 hours (full dump)

---

## 2. Vercel (Static Assets + Edge Config)

### Backup
- **Immutable deployments:** Every push creates a new deployment URL
- **Rollback:** `vercel rollback <deployment-url>` or promote previous deployment in dashboard
- **Environment variables:** Export via `vercel env pull .env.backup`

### Restore
```bash
# Promote previous working deployment
vercel promote <deployment-id>

# Or rollback via CLI
vercel rollback
```

### RTO/RPO
- **RPO:** 0 (immutable deployments)
- **RTO:** < 2 minutes (promote/rollback)

---

## 3. Upstash Redis (Rate Limiting / Cache)

### Backup
- **Automatic:** Upstash provides daily snapshots on paid plans
- **Manual:** `redis-cli --rdb backup.rdb` via Upstash REST API

### Restore
```bash
# Via Upstash console or REST API
# Note: Redis is ephemeral cache - data loss acceptable for rate limits
```

### RTO/RPO
- **RPO:** 24 hours (daily snapshot)
- **RTO:** < 10 minutes (recreate from snapshot)

---

## 4. Stripe (Payments)

### Backup
- **Source of truth:** Stripe Dashboard (complete audit trail)
- **Export:** Stripe Sigma / Data Pipeline to BigQuery/Snowflake
- **Webhook events:** Retained 30 days in Stripe

### Restore
- **Never restore Stripe data directly** - it's the source of truth
- **Reconcile:** Use `/api/stripe/webhook` events to rebuild local Payment records

### RTO/RPO
- **RPO:** 0 (Stripe is authoritative)
- **RTO:** N/A (reconcile on demand)

---

## 5. Secrets & Configuration

### Backup
- **Vercel Env Vars:** `vercel env pull .env.production.backup`
- **Local .env:** Committed to 1Password / Bitwarden (not git)

### Restore
```bash
vercel env pull .env.production
# Then re-add any missing via `vercel env add`
```

---

## 6. Disaster Scenarios & Response

| Scenario | Detection | Response | Owner |
|----------|-----------|----------|-------|
| Supabase region outage | Health check `/api/health` fails | Promote read replica / failover region | Platform |
| Vercel deployment broken | Smoke tests fail | `vercel rollback` to last known good | Platform |
| Stripe webhook delivery failure | Stripe Dashboard alerts | Manual replay via Stripe CLI | Backend |
| Upstash Redis down | Rate limit errors spike | Circuit breaker opens, fail-open for auth | Platform |
| Data corruption (SQL injection) | Audit log anomaly | PITR to pre-corruption timestamp | Backend |

---

## 7. Monthly Drill Checklist

- [ ] Verify Supabase PITR works (test restore to staging)
- [ ] Test Vercel rollback to previous deployment
- [ ] Confirm Stripe webhook replay works
- [ ] Review audit logs for anomalies
- [ ] Update this runbook if architecture changes

---

## 8. Emergency Contacts

| Service | Support Channel | SLA |
|---------|-----------------|-----|
| Supabase | Dashboard → Support | 1hr (Pro) |
| Vercel | Dashboard → Support | 1hr (Pro) |
| Stripe | Dashboard → Support | 15min (Critical) |
| Upstash | Email/Console | 1hr |

---

*This runbook is a living document. Update after every incident or architecture change.*