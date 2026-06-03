#!/usr/bin/env bash
# Restore PostgreSQL backup on AWS EC2 (run ON the server or via SSH).
# Usage:
#   ./scripts/aws-restore-database.sh /path/to/aemje_architect_db.backup
#
set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 /path/to/backup.backup}"
DB_NAME="${DB_NAME:-aemje_architect_db}"
DB_USER="${DB_USER:-postgres}"
APP_DIR="${APP_DIR:-/home/ubuntu/app2}"

echo "==> Stopping app (optional)"
sudo systemctl stop myapp || true

echo "==> Safety backup of current DB"
mkdir -p /home/ubuntu/backups
STAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U "$DB_USER" -Fc -f "/home/ubuntu/backups/local_before_${STAMP}.backup" "$DB_NAME"

echo "==> Restoring $BACKUP_FILE into $DB_NAME"
pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges "$BACKUP_FILE" || true

echo "==> Schema upgrade for current app"
cd "$APP_DIR"
source venv/bin/activate
python backend/post_restore_migrate.py

echo "==> Reset admin password (admin / admin123)"
python backend/reset_admin.py

echo "==> Restart services"
sudo systemctl start myapp
sudo systemctl restart nginx

echo "Restore complete. Log in with admin / admin123 (change after login)."
