#!/usr/bin/env bash
# Restore /var/www/html/media from Supabase export zips + docker storage stub.
# Targets: projects, articles (files), upholstery — paths must match DB URLs.
#
# On VPS:
#   bash /root/robustino/scripts/restore-media-from-dump.sh
#
# Env:
#   MEDIA_ROOT   (default /var/www/html/media)
#   ZIP_DIR      (default /opt/robustino-deploy/supa-zips)
#   STUB_ROOT    (default /opt/supabase/docker/volumes/storage/stub/stub)
set -euo pipefail

MEDIA_ROOT="${MEDIA_ROOT:-/var/www/html/media}"
ZIP_DIR="${ZIP_DIR:-/opt/robustino-deploy/supa-zips}"
STUB_ROOT="${STUB_ROOT:-/opt/supabase/docker/volumes/storage/stub/stub}"

mkdir -p "$MEDIA_ROOT"

export MEDIA_ROOT ZIP_DIR STUB_ROOT

echo "=== 1) Supabase storage stub → flat files under $MEDIA_ROOT ==="
python3 <<'PY'
import os, shutil
from pathlib import Path

stub = Path(os.environ["STUB_ROOT"])
media = Path(os.environ["MEDIA_ROOT"])
restored = skipped = 0

if not stub.is_dir():
    print(f"WARN: stub missing: {stub}")
else:
    for f in stub.rglob("*"):
        if not f.is_file():
            continue
        rel = f.relative_to(stub)
        parts = rel.parts
        # .../bucket/.../filename.ext/<uuid>  OR legacy flat
        if len(parts) >= 2 and parts[-2].count("."):
            dest = media / Path(*parts[:-1])
        else:
            dest = media / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() and dest.stat().st_size == f.stat().st_size:
            skipped += 1
            continue
        shutil.copy2(f, dest)
        restored += 1
    print(f"stub: copied {restored}, skipped (same size) {skipped}")
PY

echo
echo "=== 2) supa-zips → media paths ==="
python3 <<'PY'
import os, zipfile, shutil
from pathlib import Path

media = Path(os.environ["MEDIA_ROOT"])
zip_dir = Path(os.environ["ZIP_DIR"])

# internal zip prefix → path under MEDIA_ROOT (matches upload-storage-on-server.sh buckets)
ZIP_TARGETS = {
    "projects.zip": ("projects", "images/projects"),
    "upholstery.zip": ("upholstery", "images/upholstery"),
    "files.zip": ("files", "articles/files"),
}

for zname, (prefix, dest_prefix) in ZIP_TARGETS.items():
    zpath = zip_dir / zname
    if not zpath.is_file():
        print(f"skip missing {zpath}")
        continue
    n = 0
    with zipfile.ZipFile(zpath) as z:
        for name in z.namelist():
            if name.endswith("/"):
                continue
            name = name.replace("\\\\", "/")
            if not name.startswith(prefix + "/"):
                print(f"  WARN unexpected path in {zname}: {name}")
                continue
            rel = dest_prefix + "/" + name[len(prefix) + 1 :]
            dest = media / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            with z.open(name) as src, open(dest, "wb") as out:
                shutil.copyfileobj(src, out)
            n += 1
    print(f"{zname}: {n} files written")
PY

if id -u www-data >/dev/null 2>&1; then
  chown -R www-data:www-data "$MEDIA_ROOT" 2>/dev/null || true
fi

echo
echo "=== 3) Audit vs Postgres (projects, articles, upholstery) ==="
python3 <<'PY'
import json, os, subprocess, re
from pathlib import Path

media = Path(os.environ.get("MEDIA_ROOT", "/var/www/html/media"))

sql = r"""
WITH urls AS (
  SELECT 'project' AS kind, regexp_replace(u, '^https://robustino.ru/media/', '') AS rel
  FROM projects, unnest(coalesce(images,'{}')) u WHERE u LIKE '%/media/%'
  UNION ALL
  SELECT 'project', regexp_replace(logo_url, '^https://robustino.ru/media/', '')
  FROM projects WHERE coalesce(logo_url,'') LIKE '%/media/%'
  UNION ALL
  SELECT 'article', regexp_replace(cover_image, '^https://robustino.ru/media/', '')
  FROM articles WHERE coalesce(cover_image,'') LIKE '%/media/%'
  UNION ALL
  SELECT 'upholstery', regexp_replace(image_url, '^https://robustino.ru/media/', '')
  FROM upholstery_variants WHERE coalesce(image_url,'') LIKE '%/media/%'
)
SELECT kind, rel FROM urls;
"""

rows = subprocess.check_output(
    [
        "docker",
        "exec",
        "robustino-postgres",
        "psql",
        "-U",
        "robustino",
        "-d",
        "robustino",
        "-At",
        "-F",
        "\t",
        "-c",
        sql,
    ],
    text=True,
).strip()

by_kind = {}
missing_by_kind = {}
for line in rows.splitlines():
    if not line.strip():
        continue
    kind, rel = line.split("\t", 1)
    by_kind.setdefault(kind, set()).add(rel)
    if not (media / rel).is_file():
        missing_by_kind.setdefault(kind, []).append(rel)

print(f"Total files on disk under media: {sum(1 for _ in media.rglob('*') if _.is_file())}")
for kind in sorted(by_kind):
    total = len(by_kind[kind])
    miss = len(missing_by_kind.get(kind, []))
    ok = total - miss
    print(f"{kind}: {ok}/{total} DB paths present on disk")
    for rel in sorted(missing_by_kind.get(kind, []))[:8]:
        print(f"  missing: {rel}")
    if miss > 8:
        print(f"  ... and {miss - 8} more")
PY

echo
echo "Done. Spot-check:"
echo "  curl -sI https://robustino.ru/media/images/projects/ | head -3"
