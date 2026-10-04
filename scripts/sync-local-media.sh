#!/usr/bin/env bash
# Upload local media tree → VPS /var/www/html/media (paths match DB URLs).
#
# Usage (from repo root):
#   export ROBUSTINO_SSH=root@194.67.124.92   # or use ~/.ssh/config Host
#   bash scripts/sync-local-media.sh
#
# Optional:
#   LOCAL_SRC=backup/storage
#   REMOTE_MEDIA=/var/www/html/media
#   SSHPASS=...  # only if no SSH key; prefer ssh-agent / keys
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_SRC="${LOCAL_SRC:-$REPO_ROOT/backup/storage}"
REMOTE="${ROBUSTINO_SSH:-root@194.67.124.92}"
REMOTE_MEDIA="${REMOTE_MEDIA:-/var/www/html/media}"

if [[ ! -d "$LOCAL_SRC" ]]; then
  echo "Missing local media: $LOCAL_SRC"
  exit 1
fi

LOCAL_COUNT="$(find "$LOCAL_SRC" -type f ! -name '*.json' | wc -l | tr -d ' ')"
echo "Local files (excl. json): $LOCAL_COUNT"
echo "Target: $REMOTE:$REMOTE_MEDIA"

if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS
  RSYNC_E="sshpass -e ssh -o StrictHostKeyChecking=accept-new"
  SSH_CMD=(sshpass -e ssh -o StrictHostKeyChecking=accept-new)
else
  RSYNC_E="ssh -o StrictHostKeyChecking=accept-new"
  SSH_CMD=(ssh -o StrictHostKeyChecking=accept-new)
fi

rsync -av -e "$RSYNC_E" "$LOCAL_SRC/" "$REMOTE:$REMOTE_MEDIA/"

echo "Remote chown (www-data) + file count…"
"${SSH_CMD[@]}" "$REMOTE" \
  "chown -R www-data:www-data '$REMOTE_MEDIA' 2>/dev/null || true; find '$REMOTE_MEDIA' -type f | wc -l"

echo "Done. On VPS: MEDIA_ROOT=$REMOTE_MEDIA bash scripts/verify-media-urls.sh"
