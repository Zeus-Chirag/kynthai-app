# Backup & Restore Runbook — Kynthai US

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

## 7. Disaster Recovery Drills

All DR drills use staging environment. Drills are **mandatory** on the schedule below.

### Quarterly Drill Schedule

| Quarter | Drill | Scenario | Success Criteria | Owner |
|---------|-------|----------|-----------------|-------|
| Q1 | Supabase PITR | Restore database to 1 hour ago | RTO < 30 min, data diff < 1% | Platform |
| Q2 | Vercel rollback | Deploy broken version, roll back | RTO < 2 min, zero user-facing errors | Platform |
| Q3 | Full data recovery | Simulate data corruption, restore from backup | All user accounts + 30 days of data recoverable | Platform |
| Q4 | Stripe webhook replay | Drop webhook table, replay from Stripe | All payments reconciled within 1 hour | Backend |

### Monthly Drill Checklist

- [ ] [Month 1] Supabase PITR — restore staging to last known good
  - Record RTO: _____ min
  - Record data loss: _____ rows
  - Sign-off: _____
- [ ] [Month 2] Vercel rollback — promote previous deployment
  - Record RTO: _____ sec
  - Verify smoke tests pass on rolled-back version
  - Sign-off: _____
- [ ] [Month 3] Confirm Stripe webhook replay works
  - Send test event via Stripe CLI
  - Verify local `payments` table updated
  - Sign-off: _____
- [ ] [Month 4] Review audit logs for anomalies
  - Export last 30 days of audit logs
  - Verify no unauthorized access patterns
  - Sign-off: _____
- [ ] Update this runbook if architecture changes

### Drill Failure Protocol

If any drill fails:
1. **File a P1 incident** — DR drill failure is production risk
2. **Root cause analysis** — Why did the drill fail? Was it a process gap or tooling gap?
3. **Remediation** — Fix the gap within 7 days
4. **Re-drill** — Repeat the drill within 14 days
5. **Document** — Update this runbook with findings

---

## 8. RTO/RPO Compliance Tracking

| System | Target RTO | Target RPO | Last Verified | Next Drill |
|--------|-----------|-----------|---------------|------------|
| Supabase (PITR) | < 30 min | < 5 min | Not yet | Q1 2027 |
| Supabase (full dump) | < 2 hours | < 24 hours | Not yet | Q3 2027 |
| Vercel (rollback) | < 2 min | 0 | Not yet | Q2 2027 |
| Stripe (replay) | < 1 hour | 0 | Not yet | Q4 2027 |
| Upstash Redis | < 10 min | < 24 hours | Not yet | Ad-hoc |

---

## 9. Emergency Contacts

| Service | Support Channel | SLA |
|---------|-----------------|-----|
| Supabase | Dashboard → Support | 1hr (Pro) |
| Vercel | Dashboard → Support | 1hr (Pro) |
| Stripe | Dashboard → Support | 15min (Critical) |
| Upstash | Email/Console | 1hr |

---

*This runbook is a living document. Update after every incident or architecture change.*