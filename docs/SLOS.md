# Service Level Objectives — Kynthai US

**Owner:** Platform Engineering
**Last Updated:** 2026-07-30
**Review Cadence:** Quarterly

---

## SLI Definitions

| SLI | Definition | Measurement Source |
|-----|-----------|-------------------|
| **Landing page load (LCP)** | 75th percentile Largest Contentful Paint | Vercel Analytics / RUM |
| **API response time (p95)** | 95th percentile response time for `api/**` routes | Sentry Performance |
| **DB query time (p95)** | 95th percentile query execution time | Prisma client metrics |
| **Auth success rate** | % of login/register requests returning 2xx | Upstash + Sentry |
| **Chat completion time (p95)** | 95th percentile AI chat response time | Application logs |
| **Checkout success rate** | % of Stripe checkout sessions completed | Stripe API metrics |
| **Uptime (landing page)** | % of health check probes returning 200 at `/api/health` | Synthetic monitoring |
| **Error rate** | % of all HTTP requests returning 5xx | Vercel / Sentry |

---

## Service Level Objectives

| Tier | SLI | Target (SLO) | Measurement Window | Burn Rate Alert |
|------|-----|-------------|-------------------|----------------|
| **Critical** | Uptime (landing page) | **99.9%** | 30d rolling | >0.1% error in 1h |
| **Critical** | Auth success rate | **99.5%** | 30d rolling | >0.5% in 1h |
| **Critical** | Checkout success rate | **99.0%** | 30d rolling | >1% in 1h |
| **High** | API response time (p95) | **< 500ms** | 7d rolling | p95 > 1s in 30min |
| **High** | DB query time (p95) | **< 100ms** | 7d rolling | p95 > 200ms in 30min |
| **High** | Chat completion time (p95) | **< 5s** | 7d rolling | p95 > 10s in 15min |
| **Medium** | Landing page LCP | **< 2.5s** | 7d rolling | p75 > 4s in 1h |
| **Medium** | Error rate | **< 1%** | 7d rolling | >2% in 30min |

---

## Error Budgets

Each SLO has an error budget = (1 − SLO) × requests within the measurement window.

| SLO | Error Budget (monthly) | When to freeze deploys |
|-----|----------------------|----------------------|
| 99.9% | ~43 min downtime/month | Budget exhausted |
| 99.5% | ~3.6h downtime/month | Budget exhausted |
| 99.0% | ~7.3h downtime/month | Budget < 50% remaining |

### Error Budget Policy

1. **Deploy freeze** — If error budget < 20% remaining for any Critical SLO, deploys are frozen until budget recovers
2. **Postmortem required** — If error budget fully exhausted for a Critical SLO, a postmortem is required within 48h
3. **Sprint override** — The team may override a freeze with senior eng approval + justification in an incident ticket

---

## Burn Rate Alerts

| Burn Rate | Interpretation | Response |
|-----------|---------------|----------|
| 1x | Consuming budget at expected rate | Monitor |
| 2x | Will exhaust budget in 2 weeks | Investigation ticket |
| 5x | Will exhaust budget in ~6 days | Pager duty alert |
| 10x | Will exhaust budget in ~3 days | Critical incident |

### Multi-Window, Multi-Burn-Rate Alerts

| Alert Name | Windows | Severity | Action |
|-----------|---------|----------|--------|
| Critical SLO burn (fast) | 1h + 5m | P0 | Page on-call immediately |
| Critical SLO burn (slow) | 6h + 30m | P1 | Create incident within 1h |
| High SLO burn (fast) | 1h + 5m | P1 | Page on-call within 1h |
| High SLO burn (slow) | 6h + 30m | P2 | Create ticket within 24h |

---

## SLO Exhaustion Runbook

1. **Detect** — Alert triggers via Sentry / Vercel / synthetic monitor
2. **Triage** — On-call acknowledges within 5min (P0) or 15min (P1)
3. **Mitigate** — Roll back to last known good deployment, enable kill switch if applicable
4. **Resolve** — Confirm the SLI returns to within SLO for 2 consecutive windows
5. **Postmortem** — Document root cause, mitigations, and preventions

---

## Periodic Review

- **Monthly** — Review SLI trends, adjust SLO targets if warranted
- **Quarterly** — Review burn rate alert thresholds, update error budget policy
- **Annually** — Full SLO review with product + engineering alignment

---

## Related Documents

- [Production Readiness Report](./PRODUCTION-READINESS-REPORT.md)
- [Backup & Restore Runbook](./BACKUP_RESTORE_RUNBOOK.md)
- Incident Response Runbook (TBD)
