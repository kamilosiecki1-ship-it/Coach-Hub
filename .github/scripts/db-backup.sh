#!/usr/bin/env bash
# Dump the app schema of the Supabase database and encrypt the dump.
# Runs on a GitHub Ubuntu runner from .github/workflows/backup.yml.
#
# The repo is public and anyone signed in to GitHub can download its workflow
# artifacts, so the dump is only ever written to OUT_DIR encrypted.
#
# Env:
#   DATABASE_DIRECT_URL  Supabase session pooler URL (…pooler.supabase.com:5432),
#                        same value as DIRECT_URL in .env
#   BACKUP_PASSPHRASE    gpg passphrase, kept in .env as BACKUP_PASSPHRASE
#   OUT_DIR              where to write backup-YYYY-MM-DD.dump.gpg (default: backup)
#
# Restore:
#   gpg --decrypt backup-YYYY-MM-DD.dump.gpg > backup.dump
#   pg_restore --no-owner --no-acl -d "$DIRECT_URL" backup.dump
#   ("schema public already exists" is expected and harmless)
set -euo pipefail

fail() {
  echo "::error::$*"
  exit 1
}

[ -n "${DATABASE_DIRECT_URL:-}" ] || fail "DATABASE_DIRECT_URL secret is not set."
[ -n "${BACKUP_PASSPHRASE:-}" ] || fail "BACKUP_PASSPHRASE secret is not set. The repo is public, so the dump is never uploaded unencrypted."

# GitHub runners have no IPv6, and the direct Supabase host is IPv6-only.
host=$(python3 -c 'import os, urllib.parse; print(urllib.parse.urlparse(os.environ["DATABASE_DIRECT_URL"]).hostname or "")')
case "$host" in
  db.*.supabase.co)
    fail "DATABASE_DIRECT_URL points at the direct host db.<ref>.supabase.co, which is IPv6-only and unreachable from GitHub runners. Use the session pooler URL (…pooler.supabase.com:5432), same as DIRECT_URL in .env."
    ;;
esac

export PGCONNECT_TIMEOUT=20

if ! command -v psql >/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql-client
fi

err=$(mktemp)
trap 'rm -f "$err" ${dump:+"$dump"}' EXIT
if ! num=$(psql "$DATABASE_DIRECT_URL" -XAtc "show server_version_num" 2>"$err"); then
  # Mask the project ref, logs of a public repo are public.
  sed -E 's/postgres\.[a-z0-9]{20}/postgres.<ref>/g' "$err"
  if grep -qi "tenant.*not found" "$err"; then
    fail "Supabase does not know this project (tenant/user not found). The project is paused (the free plan pauses after 7 idle days) or the URL is wrong. Restore it in the Supabase dashboard."
  fi
  fail "Could not connect to the database, see the error above."
fi
major=$((num / 10000))

# pg_dump refuses to dump a server newer than itself, and the runner ships an
# older client than Supabase runs, so install the matching one from PGDG.
pg_bin="/usr/lib/postgresql/$major/bin"
if [ ! -x "$pg_bin/pg_dump" ]; then
  . /etc/os-release
  sudo install -d /usr/share/postgresql-common/pgdg
  sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" |
    sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq "postgresql-client-$major"
fi

out_dir=${OUT_DIR:-backup}
mkdir -p "$out_dir"
dump="$out_dir/backup-$(date -u +%Y-%m-%d).dump"

# All app data lives in public (Prisma, no Supabase Auth or Storage).
"$pg_bin/pg_dump" "$DATABASE_DIRECT_URL" \
  --schema=public \
  --format=custom \
  --no-acl \
  --no-owner \
  --file="$dump"

tables=$("$pg_bin/pg_restore" --list "$dump" | grep -c " TABLE DATA " || true)
[ "$tables" -gt 0 ] || fail "The dump has no table data."

gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
  --symmetric --cipher-algo AES256 --output "$dump.gpg" "$dump" 3<<<"$BACKUP_PASSPHRASE"

echo "Backup OK: $dump.gpg ($(du -h "$dump.gpg" | cut -f1)), $tables tables, server $num, pg_dump $("$pg_bin/pg_dump" --version | awk '{print $3}')"
