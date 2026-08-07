#!/usr/bin/env bash
# Kynthai US — Database Restore Script
# Restores a PostgreSQL backup created by backup.sh

set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <backup_file> [--dry-run>"
  echo "Available backups:"
  ls -la ./backups/kynthai_backup_*.sql.gz* 2>/dev/null || echo "No backups found in ./backups/"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Load environment if present (guard with existence checks — bash 3.2 exits on
# a failing `source` under `set -e`, even with `|| true`)
if [ -f ./.env ]; then source ./.env; fi
if [ -z "${DATABASE_URL:-}" ] && [ -f ./.env.production ]; then source ./.env.production; fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set."
  exit 1
fi

# Extract base file (decrypt if needed)
ACTUAL_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gpg ]]; then
  if ! command -v gpg &> /dev/null; then
    echo "ERROR: GPG not installed. Cannot decrypt backup."
    exit 1
  fi
  echo "[restore] Decrypting GPG backup..."
  ACTUAL_FILE="${BACKUP_FILE%.gpg}"
  gpg --decrypt --output "$ACTUAL_FILE" "$BACKUP_FILE"
fi

echo "[restore] Restoring database from $ACTUAL_FILE..."
echo "[restore] WARNING: This will overwrite existing data!"

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "[restore] Aborted."
  exit 0
fi

DB_URL="${DATABASE_URL%%\?*}"
gunzip -c "$ACTUAL_FILE" | psql "$DB_URL"
echo "[restore] Restore complete."
