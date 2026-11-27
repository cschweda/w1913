#!/usr/bin/env bash
# =====================================================================
# scripts/dev.sh: clean every build cache, rebuild the edition, and start
# the Nuxt dev server.
#
#   pnpm dev                 # clean, rebuild, start on port 3913
#   pnpm dev --clean-only    # clean and rebuild, do not start a server
#   W1913_DEV_PORT=4000 pnpm dev
#
# Removed every run (all regenerable):
#   apps/site/.nuxt  apps/site/.output  apps/site/.data
#   node_modules/.cache  node_modules/.vite  (root and apps/site)
#   cache/editions  cache/db  cache/phase0
#
# NEVER removed:
#   cache/sources/   the canonical 29765.txt, placed by hand
#   cache/tagged/    the tagged files (slow to re-fetch; gutenberg.org is flaky)
#   cache/eval/      evaluation outputs and notes
#
# If something is already listening on the port, the script stops it only
# when it is a node process started from this repository; otherwise it
# refuses and says what is there.
# =====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${W1913_DEV_PORT:-}"
CLEAN_ONLY=0
for a in "$@"; do
  case "$a" in
    --clean-only) CLEAN_ONLY=1 ;;
    -h|--help) sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $a (try --help)"; exit 2 ;;
  esac
done

# Node from .nvmrc when nvm is available.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  set +u; . "$NVM_DIR/nvm.sh" > /dev/null 2>&1; nvm use > /dev/null 2>&1 || true; set -u
fi

# Settings from w1913.config.ts (W1913_DEV_PORT still overrides).
PORT="${PORT:-$(node scripts/config-get.ts server.devPort)}"
DB_REL="$(node scripts/config-get.ts paths.devDatabase)"

echo "Cleaning build caches..."
for p in apps/site/.nuxt apps/site/.output apps/site/.data \
         node_modules/.cache node_modules/.vite \
         apps/site/node_modules/.cache apps/site/node_modules/.vite \
         cache/editions cache/db cache/phase0; do
  if [ -e "$p" ]; then rm -rf "$p"; echo "  removed $p"; fi
done

echo "Rebuilding the edition..."
node packages/data/src/cli/edition.ts --force

if [ ! -f apps/site/package.json ]; then
  echo ""
  echo "No site yet: apps/site arrives in Phase 1 (Nuxt 4 + Nuxt UI 4)."
  echo "Caches are clean and the edition is rebuilt; nothing to serve."
  exit 0
fi

export W1913_DB_PATH="$ROOT/$DB_REL"
mkdir -p "$(dirname "$W1913_DB_PATH")"
echo "Importing the database to $W1913_DB_PATH..."
pnpm --filter @w1913/site run db:import

[ "$CLEAN_ONLY" -eq 1 ] && { echo "Clean and rebuilt. Not starting a server (--clean-only)."; exit 0; }

# Free the port, but only from our own dev server.
PIDS="$(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2> /dev/null || true)"
for pid in $PIDS; do
  cmd="$(ps -o command= -p "$pid" 2> /dev/null || true)"
  cwd="$(lsof -a -p "$pid" -d cwd -Fn 2> /dev/null | sed -n 's/^n//p' | head -1)"
  if [[ "$cmd" == *node* && "$cwd" == "$ROOT"* ]]; then
    echo "Stopping the previous dev server on :$PORT (pid $pid)..."
    kill "$pid" 2> /dev/null || true
  else
    echo "ERROR: port $PORT is in use by something else (pid $pid: ${cmd:-unknown})."
    echo "  Stop it, or run with another port: W1913_DEV_PORT=4000 pnpm dev"
    exit 1
  fi
done
for _ in 1 2 3 4 5 6 7 8 9 10; do
  lsof -ti "tcp:$PORT" -sTCP:LISTEN > /dev/null 2>&1 || break
  sleep 0.5
done

echo "Starting Nuxt on http://localhost:$PORT ..."
exec pnpm --filter @w1913/site exec nuxt dev --port "$PORT"
