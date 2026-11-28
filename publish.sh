#!/usr/bin/env bash
set -euo pipefail

# w1913 publish script: puts the lookup package (packages/lookup) on npm as `w1913`, from your
# machine.
#
# Usage:
#   ./publish.sh             publish packages/lookup/package.json's version of w1913 to npm
#   ./publish.sh --dry-run   run every check and a dry-run publish; change nothing, ask for nothing
#   ./publish.sh --help      print this
#
# The package has its own version (packages/lookup/package.json), separate from the site's. To
# release it: bump that version, note it in CHANGELOG.md (a line naming the package and the
# version), commit and push main. Then ./publish.sh --dry-run, then ./publish.sh. There is no
# version argument and no bump here. It never commits, tags, or pushes.
#
# Before anything is published, it checks that:
#   - you're in the W1913 repository's root, on main, up to date with origin/main, with a clean
#     tree, and logged in to npm;
#   - w1913@<version> isn't on npm yet, and CHANGELOG.md mentions it;
#   - main's own commit (in a temporary worktree, so nothing uncommitted leaks in) installs,
#     builds, and passes the package's tests;
#   - the package holds package.json, README.md, LICENSE and dist/ and nothing else, with no
#     dependencies;
#   - the packed tarball installs in a scratch project and looks words up (against w1913.com's
#     static shards: "walked" finds walk, "bill of fare" finds its phrase).
# It then asks for the version to be typed, and then npm asks for your approval: a link to open in
# a browser (or a one-time code on some accounts). What it publishes is the tarball it tested.

PACKAGE_NAME="w1913"
BRANCH="main"
DIR="packages/lookup"
MANIFEST="$DIR/package.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
info() { echo -e "${GREEN}[w1913]${NC} $1"; }
warn() { echo -e "${YELLOW}[w1913]${NC} $1"; }
die() {
  echo -e "${RED}[w1913]${NC} $1" >&2
  exit 1
}
usage() {
  awk '/^# Usage:/ { on = 1 } on && /^#$/ { exit } on { sub(/^# ?/, ""); print }' "$0"
}

# ─── Arguments ──────────────────────────────────────────────────────

DRY_RUN=false
[[ $# -le 1 ]] || { usage; die "publish.sh takes one argument at most (--dry-run or --help)."; }
case "${1:-}" in
  "") ;;
  --dry-run) DRY_RUN=true ;;
  --help | -h) usage; exit 0 ;;
  *) usage; die "Unknown argument '$1'. There is no version argument: the version is $MANIFEST's." ;;
esac

# A problem that stops a publish, and that a dry run only warns about (so it can show the rest).
problem() {
  if [[ "$DRY_RUN" == true ]]; then warn "$1 A publish would stop here."; else die "$1"; fi
}
pkg_field() {
  node --input-type=commonjs -e "console.log(require(require('path').resolve(process.argv[1])).$1)" "$MANIFEST"
}

WORK=""
WORKTREE=""
cleanup() {
  if [[ -n "$WORKTREE" ]]; then
    git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
    git worktree prune >/dev/null 2>&1 || true
  fi
  [[ -z "$WORK" ]] || rm -rf "$WORK"
}
trap cleanup EXIT

# ─── Preflight ──────────────────────────────────────────────────────

[[ -f pnpm-workspace.yaml && -f "$MANIFEST" ]] || die "Run this from the W1913 repository's root."
for tool in git node pnpm npm; do command -v "$tool" >/dev/null || die "$tool is required."; done
[[ "$(pkg_field name)" == "$PACKAGE_NAME" ]] || die "$MANIFEST isn't $PACKAGE_NAME."

VERSION=$(pkg_field version)
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]] || die "$MANIFEST has no usable version ('$VERSION')."
info "Version: $VERSION"

if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  problem "Uncommitted changes. Commit or stash them first."
fi
info "Fetching origin/$BRANCH..."
git fetch --quiet origin "$BRANCH"
[[ "$(git rev-parse --abbrev-ref HEAD)" == "$BRANCH" ]] || problem "Publish from $BRANCH."
[[ "$(git rev-parse HEAD)" == "$(git rev-parse "origin/$BRANCH")" ]] ||
  problem "$BRANCH and origin/$BRANCH differ. Push or pull first."

if npm whoami >/dev/null 2>&1; then
  info "npm user: $(npm whoami)"
elif [[ "$DRY_RUN" == true ]]; then
  warn "Not logged in to npm. The dry run continues; a real publish will ask you to log in."
else
  warn "Not logged in to npm. Logging in now..."
  npm login
fi

if npm view "$PACKAGE_NAME@$VERSION" version >/dev/null 2>&1; then
  die "$PACKAGE_NAME@$VERSION is already on npm. Bump $MANIFEST first."
fi
FIRST_TIME=false
if ! npm view "$PACKAGE_NAME" version >/dev/null 2>&1; then
  FIRST_TIME=true
  warn "$PACKAGE_NAME isn't on npm yet: this is its first publish."
fi
VERSION_RE=${VERSION//./\\.}
if grep -qE "(lookup|\`w1913\`).*[^0-9.]$VERSION_RE([^0-9]|$)" CHANGELOG.md; then
  info "CHANGELOG.md mentions $PACKAGE_NAME $VERSION."
else
  problem "CHANGELOG.md has no line naming the package (\`w1913\` or lookup) with $VERSION."
fi

# ─── Build and test, at the committed HEAD ──────────────────────────

WORK=$(mktemp -d)
WORKTREE="$WORK/source"
COMMIT=$(git rev-parse HEAD)
info "Checking out $COMMIT in a temporary worktree..."
git worktree add --quiet --detach "$WORKTREE" "$COMMIT"
(
  cd "$WORKTREE"
  pnpm install --frozen-lockfile --ignore-scripts --filter "./$DIR"
  cd "$DIR"
  pnpm run build
  pnpm run typecheck
  pnpm exec vitest run
) || die "The install, build, typecheck or tests failed at $COMMIT."
info "Built and tested at $COMMIT."

# ─── What's in the package ──────────────────────────────────────────

PACKED="$WORK/packed"
mkdir "$PACKED"
FILES=$(npm pack "$WORKTREE/$DIR" --pack-destination "$PACKED" --json --ignore-scripts |
  node --input-type=commonjs -e '
    const [pack] = JSON.parse(require("fs").readFileSync(0, "utf8"));
    console.log(pack.files.map((f) => f.path).filter((p) => !p.startsWith("dist/")).sort().join("\n"));
  ')
EXPECTED=$(printf '%s\n' LICENSE README.md package.json)
[[ "$FILES" == "$EXPECTED" ]] ||
  die "Outside dist/, the package should hold exactly package.json, README.md and LICENSE; it holds:"$'\n'"$FILES"
node --input-type=commonjs -e '
  const pkg = require(require("path").resolve(process.argv[1], "package.json"));
  const extra = ["dependencies", "peerDependencies", "optionalDependencies"].filter((f) => f in pkg);
  if (extra.length) { console.error(extra.join(", ")); process.exit(1); }
' "$WORKTREE/$DIR" || die "package.json has dependencies; the package should have none."
TARBALL=$(ls "$PACKED"/*.tgz)
info "Packed: $(basename "$TARBALL"), no dependencies."

# ─── Install the real tarball and use it ────────────────────────────

info "Installing the packed tarball in a scratch project..."
SCRATCH="$WORK/scratch"
mkdir "$SCRATCH"
(
  cd "$SCRATCH"
  npm init -y >/dev/null
  npm install --ignore-scripts --no-audit --no-fund "$TARBALL" >/dev/null
  cat >check.mjs <<'EOF'
import { createShardedLookup, createLookup, foldForCompare, stems } from "w1913";
for (const f of [createShardedLookup, createLookup, foldForCompare, stems]) if (typeof f !== "function") throw new Error("missing export");
const edition = (await (await fetch("https://w1913.com/healthz")).json()).edition;
const d = createShardedLookup((p) => fetch(`https://w1913.com/data/${edition}/${p}.json`).then((r) => (r.ok ? r.json() : null)));
const walked = await d.lookup("walked");
const bill = await d.lookup("bill of fare");
const none = await d.lookup("smartphone");
if (walked?.slug !== "walk") throw new Error(`walked: ${walked?.slug}`);
if (!bill?.phrase?.anchor) throw new Error("bill of fare: no phrase");
if (none !== null) throw new Error("smartphone: found");
console.log(`edition ${edition}: walked → ${walked.slug}, bill of fare → ${bill.phrase.url}`);
EOF
  node check.mjs
) || die "The packed tarball didn't install and look words up."
info "The packed tarball installs and looks words up."

# ─── Dry run ────────────────────────────────────────────────────────

NPM_TAG=()
[[ "$VERSION" == *-* ]] && NPM_TAG=(--tag next)
info "npm publish --dry-run..."
npm publish "$TARBALL" --dry-run --access public --ignore-scripts ${NPM_TAG[@]+"${NPM_TAG[@]}"}

if [[ "$DRY_RUN" == true ]]; then
  info "Dry run complete. Nothing was published or changed."
  exit 0
fi

# ─── Confirm and publish ────────────────────────────────────────────

echo ""
if [[ "$FIRST_TIME" == true ]]; then
  warn "About to publish $PACKAGE_NAME@$VERSION (FIRST TIME, public)."
else
  warn "About to publish $PACKAGE_NAME@$VERSION."
fi
read -r -p "To publish it, type the version ($VERSION): " REPLY || REPLY=""
[[ "$REPLY" == "$VERSION" ]] || { info "Aborted. Nothing was published."; exit 0; }

[[ -t 0 && -t 1 ]] || die "npm can only ask for your approval in a terminal, so nothing was published."
info "npm will now ask you to approve this: open its link, or type its code."
npm publish "$TARBALL" --access public --ignore-scripts --auth-type=web ${NPM_TAG[@]+"${NPM_TAG[@]}"}

# The registry can take a few minutes to list a new version; a delay is never a failure.
for _ in $(seq 1 45); do
  if [[ "$(npm view "$PACKAGE_NAME@$VERSION" version 2>/dev/null || true)" == "$VERSION" ]]; then
    info "Published $PACKAGE_NAME@$VERSION: https://www.npmjs.com/package/$PACKAGE_NAME"
    exit 0
  fi
  sleep 20
done
warn "npm accepted the publish but doesn't list it yet. Check https://www.npmjs.com/package/$PACKAGE_NAME later; don't publish this version again."
