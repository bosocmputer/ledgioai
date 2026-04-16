#!/bin/bash
# Database backup script for LEDGIO AI
# Setup cron: 0 2 * * * /home/bosscatdog/scripts/backup-db.sh >> /home/bosscatdog/logs/backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/home/bosscatdog/backups/ledgioai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump database
docker exec ledgioai-db pg_dump -U ledgioai -d ledgioai \
  --format=custom --compress=9 \
  > "$BACKUP_DIR/ledgioai_${TIMESTAMP}.dump"

# Size check
SIZE=$(du -sh "$BACKUP_DIR/ledgioai_${TIMESTAMP}.dump" | cut -f1)
echo "[$(date)] Backup complete: $SIZE → $BACKUP_DIR/ledgioai_${TIMESTAMP}.dump"

# Cleanup old backups
DELETED=$(find "$BACKUP_DIR" -name "*.dump" -mtime +$KEEP_DAYS -print -delete | wc -l)
echo "[$(date)] Cleaned $DELETED backups older than $KEEP_DAYS days"
