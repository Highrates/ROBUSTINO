#!/usr/bin/env bash
# Check that files for public API media URLs exist on disk (run on VPS or locally with MEDIA_ROOT).
set -euo pipefail

MEDIA_ROOT="${MEDIA_ROOT:-/var/www/html/media}"
API_BASE="${API_BASE:-http://127.0.0.1:4000/api}"

export MEDIA_ROOT API_BASE
python3 <<'PY'
import json, os, re, subprocess, urllib.request
from pathlib import Path

media = Path(os.environ["MEDIA_ROOT"])
api = os.environ["API_BASE"].rstrip("/")

def get(path):
    with urllib.request.urlopen(f"{api}{path}", timeout=30) as r:
        return json.load(r)

paths = set()

for p in get("/products"):
    slug = p.get("slug")
    if slug:
        try:
            from urllib.parse import quote
            full = get("/products/slug/" + quote(slug, safe=""))
        except Exception:
            full = p
    else:
        full = p
    for u in (full.get("images") or []) + [
        full.get("model_url"),
        full.get("model_max_url"),
        full.get("document_url"),
    ]:
        if u and "/media/" in u:
            paths.add(re.sub(r"^https?://[^/]+/media/", "", u))
    for am in full.get("additional_models") or []:
        if isinstance(am, dict) and am.get("url") and "/media/" in am["url"]:
            paths.add(re.sub(r"^https?://[^/]+/media/", "", am["url"]))

for row in get("/projects"):
    for u in (row.get("images") or []) + [row.get("logo_url")]:
        if u and "/media/" in u:
            paths.add(re.sub(r"^https?://[^/]+/media/", "", u))

for row in get("/articles"):
    u = row.get("cover_image")
    if u and "/media/" in u:
        paths.add(re.sub(r"^https?://[^/]+/media/", "", u))

for row in get("/upholstery/variants"):
    u = row.get("image_url")
    if u and "/media/" in u:
        paths.add(re.sub(r"^https?://[^/]+/media/", "", u))

ok = miss = 0
missing = []
for rel in sorted(paths):
    if (media / rel).is_file():
        ok += 1
    else:
        miss += 1
        missing.append(rel)

print(f"MEDIA_ROOT={media}")
print(f"Unique API media paths: {len(paths)}")
print(f"On disk: {ok}  missing: {miss}")
for rel in missing[:30]:
    print(f"  missing: {rel}")
if miss > 30:
    print(f"  ... +{miss - 30} more")
PY
