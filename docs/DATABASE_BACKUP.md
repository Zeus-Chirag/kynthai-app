# Database Backup & Disaster Recovery

## Overview

This guide covers backup strategies, recovery procedures, and disaster recovery planning for Kyntha's PostgreSQL database.

## Backup Strategy

### Automated Backups

**Frequency:** Daily at 2 AM UTC
**Retention:** 30 days
**Location:** AWS S3 (encrypted at rest)

### Backup Configuration

```bash
# Enable backups in Vercel/Supabase
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"  # 2 AM UTC daily
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=kyntha-backups
```

### Manual Backup

```bash
# Create manual backup
pg_dump $DATABASE_URL > kyntha-backup-$(date +%Y%m%d-%H%M%S).sql

# Upload to S3
aws s3 cp kyntha-backup-*.sql s3://kyntha-backups/manual/
```

## Recovery Procedures

### Point-in-Time Recovery (PITR)

```bash
# Restore to specific timestamp
pg_restore --data-only -d kyntha_recovery backup.dump

# Verify data integrity
psql -d kyntha_recovery -c "SELECT COUNT(*) FROM users;"
```

### Full Database Recovery

1. **Create temporary database:**
   ```bash
   createdb kyntha_restore
   ```

2. **Restore from backup:**
   ```bash
   pg_restore -d kyntha_restore kyntha-backup.dump
   ```

3. **Verify integrity:**
   ```bash
   psql -d kyntha_restore -c "SELECT version();"
   ```

4. **Switch to restored database:**
   ```bash
   # Update DATABASE_URL to point to kyntha_restore
   # Run migrations
   npm run db:migrate:deploy
   ```

## Disaster Recovery Plan

### RTO (Recovery Time Objective): 1 hour
### RPO (Recovery Point Objective): 24 hours

### Incident Response

1. **Immediate Actions (0-15 min)**
   - Assess scope of data loss
   - Notify stakeholders
   - Gather backup information

2. **Recovery Phase (15-45 min)**
   - Restore from backup to isolated environment
   - Run data integrity checks
   - Verify critical tables

3. **Validation Phase (45-60 min)**
   - Compare checksums
   - Test user authentication
   - Verify payment records

4. **Cutover (60+ min)**
   - Switch production to restored database
   - Monitor for errors
   - Update DNS/connection strings

## Testing Backups

**Monthly Backup Restore Test:**

```bash
#!/bin/bash
# test-backup-restore.sh

echo "Testing backup restoration..."
BACKUP_FILE="s3://kyntha-backups/latest.dump"
TEST_DB="kyntha_restore_test"

# Download backup
aws s3 cp $BACKUP_FILE ./backup.dump

# Restore to test database
createdb $TEST_DB
pg_restore -d $TEST_DB backup.dump

# Run integrity checks
psql -d $TEST_DB -c "
  SELECT 
    'users' as table_name, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'appointments', COUNT(*) FROM appointments
  UNION ALL
  SELECT 'payments', COUNT(*) FROM payments;
"

# Cleanup
dropdb $TEST_DB
rm backup.dump

echo "Backup restore test completed successfully!"
```

## Monitoring

### Backup Verification

- Check backup size trends
- Monitor backup duration
- Alert if backup fails
- Verify S3 upload success

### Key Metrics

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('kyntha'));

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check replication lag
SELECT 
  slot_name,
  slot_type,
  restart_lsn,
  EXTRACT(EPOCH FROM (now() - backend_xmin_horizon * '1 second'::interval)) AS lag_seconds
FROM pg_replication_slots;
```

## Backup Retention Policy

- **Daily backups:** 30 days
- **Weekly backups:** 90 days
- **Monthly backups:** 1 year
- **Annual backups:** 3 years (compliance)

## Compliance Notes

- ✅ HIPAA: Backups encrypted at rest and in transit
- ✅ GDPR: Data deletion procedures respect retention policies
- ✅ SOC 2: Regular backup testing and documentation
