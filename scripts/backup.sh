#!/usr/bin/env bash
# Kyntha US — Database Backup Script
# Creates a compressed PostgreSQL dump with 30-day retention.
# Requires: pg_dump (PostgreSQL client tools), gzip, curl (for optional upload)
#
# Usage:
#   ./scripts/backup.sh                          # local backup only
#   S3_BUCKET=my-backups ./scripts/backup.sh    # upload to S3
#   GPG_KEY=ABCD1234 ./scripts/backup.sh        # encrypt with GPG

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS=30
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILENAME="kyntha_backup_${TIMESTAMP}.sql.gz"

# Load environment
source .env 2>/dev/null || true

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set. Export it or create a .env file."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting database backup at ${TIMESTAMP}..."

# Extract connection details from DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname
DB_URL="${DATABASE_URL%%\?*}" # strip query params

pg_dump "$DB_URL" \
  --format=plain \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --verbose \
  2>&1 | gzip > "${BACKUP_DIR}/${FILENAME}"

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "[backup] Backup complete: ${FILENAME} (${BACKUP_SIZE})"

# Optional: GPG encryption
if [[ -n "${GPG_KEY:-}" ]]; then
  echo "[backup] Encrypting with GPG..."
  gpg --recipient "$GPG_KEY" --encrypt --output "${BACKUP_DIR}/${FILENAME}.gpg" "${BACKUP_DIR}/${FILENAME}"
  rm "${BACKUP_DIR}/${FILENAME}"
  echo "[backup] Encrypted: ${FILENAME}.gpg"
fi

# Optional: S3 upload
if [[ -n "${S3_BUCKET:-}" ]]; then
  echo "[backup] Uploading to s3://${S3_BUCKET}/backups/..."
  aws s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://${S3_BUCKET}/backups/${FILENAME}" --storage-class STANDARD_IA
  echo "[backup] Upload complete."
fi

# Retention: delete backups older than RETENTION_DAYS
echo "[backup] Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "kyntha_backup_*.sql.gz*" -mtime +${RETENTION_DAYS} -delete
REMAINING=$(find "$BACKUP_DIR" -name "kyntha_backup_*.sql.gz*" | wc -l)
echo "[backup] Retention complete. ${REMAINING} backup(s) remaining."

echo "[backup] Done."
