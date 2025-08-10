#!/bin/bash
alembic upgrade head
exec "$@"


# #!/usr/bin/env bash
# set -Eeuo pipefail

# # Derive path/dir (supports either DATABASE_URL or DATABASE_PATH)
# DB_URL="${DATABASE_URL:-}"
# DB_PATH="${DATABASE_PATH:-}"
# if [[ -z "$DB_PATH" && "$DB_URL" == sqlite:* ]]; then
#   # strip scheme and leading slashes to get the file path
#   DB_PATH="$(python - <<'PY'
# import os,sys,urllib.parse
# u=os.environ.get("DATABASE_URL","")
# if u.startswith("sqlite:///"):
#     p=u.split("sqlite:///",1)[1]
#     if p.startswith("/"): pass
#     else: p="/app/"+p
#     print("/"+p.lstrip("/"))
# PY
# )"
# fi

# DB_DIR="${DB_DIR:-$(dirname "${DB_PATH:-/data/app.db}")}"
# mkdir -p "$DB_DIR"
# # If running as a non-root user and the volume comes in as root-owned, fix it:
# chown -R "$(id -u)":"$(id -g)" "$DB_DIR" || true

# echo "Running migrations against ${DB_PATH:-$DB_URL}"
# alembic upgrade head

# exec "$@"
