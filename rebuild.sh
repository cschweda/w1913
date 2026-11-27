#!/usr/bin/env bash
# =====================================================================
# rebuild.sh — deploy the current `main` of W1913 on the droplet.
#
# Run it by hand from the checkout after each push to main:
#
#   cd ~/w1913.com && ./rebuild.sh            # deploy
#   ./rebuild.sh --check                      # preflight only; changes nothing
#   ./rebuild.sh --force                      # rebuild even if HEAD is already live
#   ./rebuild.sh --rollback                   # switch back to the previous release
#
# What a deploy does, in order:
#
#   1. Preflight: node (the .nvmrc major), pnpm, pm2, git, curl, disk space,
#      and the hand-placed canonical source under cache/sources/.
#   2. Fast-forward the checkout to origin/main (never discards local edits:
#      it stops and tells you instead), then re-runs itself if the pull
#      changed this file.
#   3. Builds a COMPLETE new release in its own directory, away from the one
#      serving traffic: `git archive` of HEAD, pnpm install, edition build,
#      SQLite import, Nuxt build.
#   4. Starts the new release on a spare port (the canary) and checks
#      /healthz and the smoke paths. A release that fails here never goes live.
#   5. Switches the `current` symlink atomically and reloads PM2 (one
#      process in fork mode: a restart of a second or two; nginx covers it).
#   6. Health gate on the live port. If it fails, the symlink goes back to
#      the previous release automatically and PM2 reloads again.
#   7. Optionally empties the nginx cache, then prunes old releases.
#
# Every run is logged to $W1913_LOG_DIR (default ~/deploy-logs/w1913).
#
# Package scripts this relies on (KICKOFF.md, "Deploy contract"):
#   pnpm --filter @w1913/data run edition      verify source, build the pinned edition
#   pnpm --filter @w1913/site run db:import    write the DB to $W1913_DB_PATH
#   pnpm --filter @w1913/site run build        Nuxt build (node-server preset)
#   GET /healthz                               200 once the DB is open
#
# Until apps/site exists (Phase 0), the script stops after the preflight and
# the pull and says there is nothing to serve yet.
#
# Settings come from w1913.config.ts (server, deploy). Environment
# variables override them for a one-off run:
#   W1913_DEPLOY_ROOT   releases + current symlink   (deploy.root)
#   W1913_PORT          live port nginx proxies to   (server.port)
#   W1913_CANARY_PORT   port for the pre-switch test (server.canaryPort)
#   W1913_SMOKE_PATHS   paths that must answer 200   (deploy.smokePaths)
#   W1913_KEEP          releases to keep             (deploy.keepReleases)
#   W1913_LOG_DIR       deploy logs                  (deploy.logDir)
#   W1913_NGINX_CACHE   nginx proxy_cache directory to empty after a deploy
#   W1913_PUBLIC_URL    e.g. https://w1913.com: one public check at the end
# =====================================================================

_self_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_self="$_self_dir/$(basename "${BASH_SOURCE[0]}")"
cd "$_self_dir"
REPO_DIR="$_self_dir"

# ---------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------
MODE="deploy"
FORCE=0
for _arg in "$@"; do
  case "$_arg" in
    --check)    MODE="check" ;;
    --rollback) MODE="rollback" ;;
    --force)    FORCE=1 ;;
    -h|--help)  sed -n '2,52p' "$_self" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $_arg (try --help)"; exit 2 ;;
  esac
done

# ---------------------------------------------------------------------
# Node from .nvmrc. A non-interactive SSH shell does not load nvm, so do it
# here, before `set -u` (nvm's own scripts reference unset variables).
# ---------------------------------------------------------------------
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh" > /dev/null 2>&1
  nvm use > /dev/null 2>&1 || nvm install > /dev/null 2>&1 || true
fi

set -Eeuo pipefail

# One value from w1913.config.ts, or the fallback if Node or the file is
# unavailable (the preflight then reports what is missing).
cfg() { node "$REPO_DIR/scripts/config-get.ts" "$1" 2> /dev/null || echo "$2"; }

DEPLOY_ROOT="${W1913_DEPLOY_ROOT:-$(cfg deploy.root "$HOME/w1913-deploy")}"
PORT="${W1913_PORT:-$(cfg server.port 3913)}"
CANARY_PORT="${W1913_CANARY_PORT:-$(cfg server.canaryPort 3914)}"
SMOKE_PATHS="${W1913_SMOKE_PATHS:-$(cfg deploy.smokePaths "/ /sublime")}"
KEEP="${W1913_KEEP:-$(cfg deploy.keepReleases 5)}"
MAX_MEMORY="${W1913_MAX_MEMORY:-$(cfg deploy.maxMemory 450M)}"
NGINX_CACHE="${W1913_NGINX_CACHE:-}"
PUBLIC_URL="${W1913_PUBLIC_URL:-}"
LOG_DIR="${W1913_LOG_DIR:-$(cfg deploy.logDir "$HOME/deploy-logs/w1913")}"
STATE_DIR="$DEPLOY_ROOT/state"
APP_NAME="$(cfg deploy.pm2Name w1913)"
WANT_NODE="$(tr -dc '0-9' < "$REPO_DIR/.nvmrc" 2>/dev/null || true)"
WANT_NODE="${WANT_NODE:-24}"
export W1913_DEPLOY_ROOT="$DEPLOY_ROOT" W1913_PORT="$PORT" W1913_MAX_MEMORY="$MAX_MEMORY" W1913_PM2_NAME="$APP_NAME"

# ---------------------------------------------------------------------
# Deploy log. Started once; the re-exec after a pull inherits the tee.
# ---------------------------------------------------------------------
if [ "$MODE" != "check" ] && [ -z "${REBUILD_LOG_FILE:-}" ]; then
  mkdir -p "$LOG_DIR"
  export REBUILD_LOG_FILE="$LOG_DIR/rebuild-$(date +%Y%m%dT%H%M%S).log"
  ls -1t "$LOG_DIR"/rebuild-*.log 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true
  exec > >(tee -a "$REBUILD_LOG_FILE") 2>&1
  echo "Deploy log: $REBUILD_LOG_FILE"
fi

# ---------------------------------------------------------------------
# One deploy at a time. The lock fd survives the re-exec, so only the
# first process takes it.
# ---------------------------------------------------------------------
if [ "$MODE" != "check" ] && [ -z "${REBUILD_REEXECED:-}" ]; then
  mkdir -p "$STATE_DIR"
  exec 9> "$STATE_DIR/rebuild.lock"
  if command -v flock > /dev/null 2>&1 && ! flock -n 9; then
    echo "ERROR: another rebuild.sh is already running (lock: $STATE_DIR/rebuild.lock)."
    exit 1
  fi
fi

# ---------------------------------------------------------------------
# Failure banner
# ---------------------------------------------------------------------
_stage="preflight"
_canary_pid=""
_new_release=""
_prev_release=""

_stop_canary() {
  if [ -n "$_canary_pid" ]; then
    kill -TERM "$_canary_pid" 2> /dev/null || true
    wait "$_canary_pid" 2> /dev/null || true
    _canary_pid=""
  fi
}

_on_exit() {
  local rc=$?
  _stop_canary
  { [ "$rc" -eq 0 ] || [ "$MODE" = "check" ]; } && return 0
  echo ""
  echo "====================================================================="
  echo "  DEPLOY FAILED during: $_stage (exit $rc)"
  case "$_stage" in
    preflight|pull)
      echo "  Nothing was built or switched. The live site is unchanged." ;;
    build|canary)
      echo "  The live site is unchanged: it still runs $(readlink "$DEPLOY_ROOT/current" 2>/dev/null || echo 'nothing yet')."
      [ -n "$_new_release" ] && echo "  The failed build is left for inspection at: $_new_release" ;;
    switch|live-check)
      echo "  The new release may be live and is not known to be healthy."
      echo "  Check:     pm2 status && pm2 logs $APP_NAME --lines 80"
      echo "  Roll back: ./rebuild.sh --rollback" ;;
    rolled-back)
      echo "  The new release failed its live health check. The previous"
      echo "  release ($(basename "$_prev_release")) is serving again."
      echo "  Inspect:   pm2 logs $APP_NAME --lines 80  and  $_new_release" ;;
    rollback-failed)
      echo "  The new release failed AND the automatic rollback did not come up healthy."
      echo "  The site may be down. Check:  pm2 status && pm2 logs $APP_NAME --lines 80" ;;
  esac
  [ -n "${REBUILD_LOG_FILE:-}" ] && echo "  Full log: $REBUILD_LOG_FILE"
  echo "====================================================================="
}
trap _on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
_http_code() {  # $1 = URL; prints the status code or 000
  curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$1" 2> /dev/null || echo "000"
}

_wait_200() {  # $1 = label, $2 = base URL; waits for /healthz, then smoke paths
  local label="$1" base="$2" waited=0 code p
  printf 'Waiting for %s' "$label"
  while :; do
    code="$(_http_code "$base/healthz")"
    [ "$code" = "200" ] && break
    if [ "$waited" -ge 60 ]; then
      echo " gave up after ${waited}s (last /healthz: $code)."
      return 1
    fi
    printf '.'; sleep 2; waited=$((waited + 2))
  done
  echo " up after ~${waited}s."
  for p in $SMOKE_PATHS; do
    code="$(_http_code "$base$p")"
    echo "  $p -> $code"
    [ "$code" = "200" ] || return 1
  done
}

_switch_to() {  # $1 = release directory; atomic symlink swap
  ln -sfn "$1" "$DEPLOY_ROOT/current.tmp"
  mv -Tf "$DEPLOY_ROOT/current.tmp" "$DEPLOY_ROOT/current"
}

_pm2_apply() {  # (re)start PM2 from the live release's ecosystem file
  local eco="$DEPLOY_ROOT/current/ecosystem.config.cjs" hash_file="$STATE_DIR/ecosystem.sha256" new_hash old_hash
  # The settings PM2 takes at registration come from the file AND from the
  # values passed in from w1913.config.ts; a change to either re-registers.
  new_hash="$( { cat "$eco"; echo "$PORT $MAX_MEMORY $DEPLOY_ROOT $APP_NAME"; } | sha256sum | cut -d' ' -f1)"
  old_hash="$(cat "$hash_file" 2> /dev/null || true)"
  if ! pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    echo "Registering $APP_NAME with PM2 (first start)..."
    pm2 start "$eco"
  elif [ "$new_hash" != "$old_hash" ]; then
    # PM2 applies options and the interpreter only at registration, so a
    # changed ecosystem file means delete + start (a few seconds' gap).
    echo "ecosystem.config.cjs changed since the last deploy; re-registering $APP_NAME..."
    pm2 delete "$APP_NAME"
    pm2 start "$eco"
  else
    echo "Reloading $APP_NAME..."
    pm2 reload "$eco" --update-env
  fi
  echo "$new_hash" > "$hash_file"
  pm2 save > /dev/null
}

# ---------------------------------------------------------------------
# 1. Preflight
# ---------------------------------------------------------------------
_fail=0
_need() { command -v "$1" > /dev/null 2>&1 || { echo "ERROR: $1 is not installed. $2"; _fail=1; }; }

echo "Preflight..."
_need git  "sudo apt-get install git"
_need curl "sudo apt-get install curl"
_need node "Install Node $WANT_NODE with nvm (nvm install $WANT_NODE)."
_need pnpm "Run: corepack enable  (or npm install -g pnpm)"
_need pm2  "Run: npm install -g pm2, then pm2 startup (once) so it survives reboots."
if command -v node > /dev/null 2>&1; then
  _node_major="$(node --version | grep -oE '[0-9]+' | head -1)"
  if [ "${_node_major:-0}" != "$WANT_NODE" ]; then
    echo "ERROR: node $(node --version) is on PATH; .nvmrc asks for $WANT_NODE."
    echo "  Install nvm for this user, then: nvm install $WANT_NODE && nvm alias default system"
    echo "  (the alias keeps other apps' shells on the system Node; this script switches itself)."
    _fail=1
  fi
fi
command -v make > /dev/null 2>&1 && command -v g++ > /dev/null 2>&1 \
  || echo "WARNING: make/g++ missing. Only needed if better-sqlite3 has no prebuilt binary: sudo apt-get install build-essential python3"
if [ ! -f "$REPO_DIR/cache/sources/29765.txt" ]; then
  echo "WARNING: cache/sources/29765.txt is not here. The edition step will try to download it,"
  echo "         and gutenberg.org often refuses scripts. Copy it up with scp if that fails."
fi
_df_dir="$DEPLOY_ROOT"; [ -d "$_df_dir" ] || _df_dir="$HOME"
_free_kb="$(df -Pk "$_df_dir" | awk 'NR==2 {print $4}')"
if [ "${_free_kb:-0}" -lt 2097152 ]; then
  echo "WARNING: less than 2 GB free under $_df_dir ($((_free_kb / 1024)) MB)."
fi

if [ "$MODE" = "check" ]; then
  echo ""
  echo "  node      $(node --version 2> /dev/null || echo '?')   (.nvmrc: $WANT_NODE)"
  echo "  pnpm      $(pnpm --version 2> /dev/null || echo '?')"
  echo "  pm2       $(pm2 --version 2> /dev/null | tail -n 1 || echo '?')"
  echo "  checkout  $(git rev-parse --short=12 HEAD 2> /dev/null || echo 'no commits') on $(git symbolic-ref --quiet --short HEAD 2> /dev/null || echo 'a detached HEAD')"
  echo "  live      $(readlink "$DEPLOY_ROOT/current" 2> /dev/null || echo 'nothing deployed yet')"
  echo "  app dir   $([ -d apps/site ] && echo 'apps/site present' || echo 'apps/site not built yet (Phase 0)')"
  [ -n "$(git status --porcelain --untracked-files=no 2> /dev/null)" ] && echo "  NOTE      the checkout has uncommitted edits; a deploy will stop on them."
  echo ""
  if [ "$_fail" -eq 0 ]; then echo "Preflight passed."; else echo "Preflight FAILED (see errors above)."; fi
  exit "$_fail"
fi
[ "$_fail" -eq 0 ] || exit 1

# ---------------------------------------------------------------------
# Rollback mode: switch back to the release before the live one.
# ---------------------------------------------------------------------
if [ "$MODE" = "rollback" ]; then
  _stage="switch"
  _live="$(readlink -f "$DEPLOY_ROOT/current" 2> /dev/null || true)"
  _prev_release="$(ls -1dt "$DEPLOY_ROOT"/releases/*/ 2> /dev/null | sed 's:/$::' | grep -vxF "$_live" | head -1 || true)"
  [ -n "$_prev_release" ] || { echo "ERROR: no earlier release to roll back to."; exit 1; }
  echo "Rolling back: $(basename "$_live") -> $(basename "$_prev_release")"
  _switch_to "$_prev_release"
  _pm2_apply
  _stage="live-check"
  _wait_200 "the live site" "http://127.0.0.1:$PORT"
  touch "$_prev_release"   # newest mtime = most recently live
  echo "Rolled back. Live: $(basename "$_prev_release")"
  exit 0
fi

# ---------------------------------------------------------------------
# 2. Pull. Fast-forward only; local edits stop the deploy.
# ---------------------------------------------------------------------
_stage="pull"
if [ -z "${REBUILD_REEXECED:-}" ]; then
  _branch="$(git rev-parse --abbrev-ref HEAD)"
  [ "$_branch" = "main" ] || { echo "ERROR: the checkout is on '$_branch'; deploys run from main."; exit 1; }
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "ERROR: the checkout has uncommitted edits to tracked files:"
    git status --short --untracked-files=no | sed 's/^/    /'
    echo "  Commit them upstream, or save and drop them:"
    echo "    git diff > ~/w1913-local.patch && git checkout -- ."
    exit 1
  fi
  _before="$(git rev-parse HEAD)"
  git fetch --quiet origin main
  git merge --ff-only --quiet origin/main
  _after="$(git rev-parse HEAD)"
  if [ "$_before" != "$_after" ]; then
    echo "Pulled ${_before:0:12} -> ${_after:0:12}."
    # bash reads a script by byte offset as it runs; if the pull rewrote this
    # file, the rest of this run would execute a mix of old and new. Re-run
    # the fresh copy once. The same when w1913.config.ts changed, so the new
    # settings apply to this deploy.
    if ! git diff --quiet "$_before" "$_after" -- rebuild.sh w1913.config.ts; then
      echo "rebuild.sh or w1913.config.ts changed; re-running with the new version..."
      export REBUILD_REEXECED=1
      exec bash "$_self" "$@"
    fi
  else
    echo "Already at origin/main (${_after:0:12})."
  fi
fi
SHA="$(git rev-parse HEAD)"

if [ ! -f apps/site/package.json ]; then
  echo ""
  echo "Nothing to serve yet: apps/site does not exist (Phase 0)."
  echo "The checkout is up to date at ${SHA:0:12}. No release was built."
  exit 0
fi

_live="$(readlink -f "$DEPLOY_ROOT/current" 2> /dev/null || true)"
if [ "$FORCE" -eq 0 ] && [ -n "$_live" ] && [ "$(cat "$_live/.release-sha" 2> /dev/null || true)" = "$SHA" ]; then
  echo "${SHA:0:12} is already live ($(basename "$_live")). Use --force to rebuild it anyway."
  exit 0
fi

# ---------------------------------------------------------------------
# 3. Build a complete release in its own directory.
# ---------------------------------------------------------------------
_stage="build"
mkdir -p "$DEPLOY_ROOT/releases"
_new_release="$DEPLOY_ROOT/releases/$(date +%Y%m%dT%H%M%S)-${SHA:0:12}"
mkdir -p "$_new_release"
echo "Building release $(basename "$_new_release")..."
git archive "$SHA" | tar -x -C "$_new_release"
echo "$SHA" > "$_new_release/.release-sha"
# Sources and built editions are shared between releases (gitignored, big).
mkdir -p "$REPO_DIR/cache"
ln -sfn "$REPO_DIR/cache" "$_new_release/cache"
mkdir -p "$_new_release/data"

(
  cd "$_new_release"
  export CI=1
  echo "-- pnpm install"
  pnpm install --frozen-lockfile
  echo "-- edition"
  pnpm --filter @w1913/data run edition
  echo "-- database"
  W1913_DB_PATH="$_new_release/data/w1913.sqlite" pnpm --filter @w1913/site run db:import
  echo "-- site"
  pnpm --filter @w1913/site run build
)
[ -s "$_new_release/data/w1913.sqlite" ] || { echo "ERROR: the import produced no database."; exit 1; }
[ -f "$_new_release/apps/site/.output/server/index.mjs" ] || { echo "ERROR: the Nuxt build produced no server bundle."; exit 1; }
echo "Database: $(du -h "$_new_release/data/w1913.sqlite" | cut -f1)"

# ---------------------------------------------------------------------
# 4. Canary: run the new release on a spare port before it goes live.
# ---------------------------------------------------------------------
_stage="canary"
NODE_ENV=production HOST=127.0.0.1 PORT="$CANARY_PORT" \
  W1913_DB_PATH="$_new_release/data/w1913.sqlite" \
  node "$_new_release/apps/site/.output/server/index.mjs" > "$_new_release/canary.log" 2>&1 &
_canary_pid=$!
if ! _wait_200 "the canary on :$CANARY_PORT" "http://127.0.0.1:$CANARY_PORT"; then
  echo "Canary output (last 40 lines):"
  tail -n 40 "$_new_release/canary.log" | sed 's/^/    /'
  exit 1
fi
_stop_canary

# ---------------------------------------------------------------------
# 5. Go live.
# ---------------------------------------------------------------------
_stage="switch"
_prev_release="$_live"
_switch_to "$_new_release"
_pm2_apply

# ---------------------------------------------------------------------
# 6. Live health gate, with automatic rollback.
# ---------------------------------------------------------------------
_stage="live-check"
if ! _wait_200 "the live site on :$PORT" "http://127.0.0.1:$PORT"; then
  if [ -n "$_prev_release" ] && [ -d "$_prev_release" ]; then
    echo "Live check failed. Rolling back to $(basename "$_prev_release")..."
    _switch_to "$_prev_release"
    _pm2_apply
    if _wait_200 "the previous release" "http://127.0.0.1:$PORT"; then
      _stage="rolled-back"
    else
      _stage="rollback-failed"
    fi
  fi
  exit 1
fi

# ---------------------------------------------------------------------
# 7. Afterwards: nginx cache, public check, pruning.
# ---------------------------------------------------------------------
_stage="cleanup"
if [ -n "$NGINX_CACHE" ]; then
  if [ -d "$NGINX_CACHE" ] && find "$NGINX_CACHE" -mindepth 1 -delete 2> /dev/null; then
    echo "Emptied the nginx cache at $NGINX_CACHE."
  else
    echo "WARNING: could not empty $NGINX_CACHE (missing, or not writable by $(whoami)). Pages may be stale until it expires."
  fi
fi
if [ -n "$PUBLIC_URL" ]; then
  echo "Public check: $PUBLIC_URL/healthz -> $(_http_code "$PUBLIC_URL/healthz")"
fi

# Keep the newest $KEEP releases (by name, which starts with a timestamp),
# and never the live one.
_live="$(readlink -f "$DEPLOY_ROOT/current")"
ls -1d "$DEPLOY_ROOT"/releases/*/ 2> /dev/null | sed 's:/$::' | sort -r | tail -n +"$((KEEP + 1))" \
  | while read -r _old; do
      [ "$_old" = "$_live" ] && continue
      echo "Pruning $(basename "$_old")"
      rm -rf "$_old"
    done

echo ""
echo "Deployed ${SHA:0:12}: $(git log -1 --format=%s "$SHA")"
echo "Live: $(basename "$_live")"
pm2 status "$APP_NAME" || true
