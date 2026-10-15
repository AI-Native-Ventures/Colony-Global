#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 postgres://.../colony_global_rehearsal_<name>" >&2
  exit 64
fi

database_url="$1"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_dir/.." && pwd)"

python3 - "$database_url" <<'PY'
import sys
from urllib.parse import urlparse

url = urlparse(sys.argv[1])
if (
    url.scheme not in ("postgres", "postgresql")
    or url.hostname not in ("localhost", "127.0.0.1", "::1")
    or not url.path.lstrip("/").startswith("colony_global_rehearsal_")
):
    raise SystemExit("Rehearsal requires a loopback Postgres database named colony_global_rehearsal_<name>")
PY

existing_tables="$(psql "$database_url" -X -A -t -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")"
if [[ "$existing_tables" != "0" ]]; then
  echo "Rehearsal database must be empty; found $existing_tables public tables" >&2
  exit 65
fi

cd "$repository_root"
for migration in migrations/*.sql; do
  version="${migration##*/}"
  version="${version%%_*}"
  if (( 10#$version > 53 )); then
    continue
  fi
  psql "$database_url" -X -q -o /dev/null -v ON_ERROR_STOP=1 -1 -f "$migration"
done

psql "$database_url" -X -q -o /dev/null -v ON_ERROR_STOP=1 -1 \
  -f scripts/production-upgrade-legacy-rows.sql

for migration in migrations/*.sql; do
  version="${migration##*/}"
  version="${version%%_*}"
  if (( 10#$version < 54 || 10#$version > 59 )); then
    continue
  fi
  psql "$database_url" -X -q -o /dev/null -v ON_ERROR_STOP=1 -1 -f "$migration"
done

psql "$database_url" -X -q -o /dev/null -v ON_ERROR_STOP=1 -1 \
  -f scripts/production-upgrade-assertions.sql
echo "Production 0053-to-0059 migration rehearsal passed"
