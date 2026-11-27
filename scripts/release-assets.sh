#!/usr/bin/env bash
# Prepare the downloads for a W1913 release (DESIGN.md §4b "What is published"):
# the pinned edition (JSONL, manifest, labels, authors) and the lookup build,
# compressed, with SHA-256 sums. It PREPARES files in cache/release/<version>/
# and prints the command that publishes them as GitHub release assets; it never
# publishes anything itself.
#
#   pnpm dev            # or db:import, so the database and lookup build exist
#   scripts/release-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(node -p 'require("./package.json").version')
edition=$(node scripts/config-get.ts edition.version)
db_dir=$(dirname "$(node scripts/config-get.ts paths.devDatabase)")
ed_dir="$(node scripts/config-get.ts paths.editions)/w1913-$edition"
lookup="$db_dir/w1913-lookup-$edition.json"
out="cache/release/v$version"

for f in "$ed_dir/manifest.json" "$ed_dir/w1913-$edition.jsonl" "$lookup"; do
  [[ -f "$f" ]] || { echo "Missing $f: build the edition and run db:import first." >&2; exit 1; }
done
rm -rf "$out" && mkdir -p "$out"
tar -czf "$out/w1913-edition-$edition.tar.gz" -C "$(dirname "$ed_dir")" "w1913-$edition"
gzip -9 -c "$lookup" > "$out/w1913-lookup-$edition.json.gz"
cp "$ed_dir/manifest.json" "$out/w1913-edition-$edition.manifest.json"
(cd "$out" && shasum -a 256 ./* | sed 's| \./| |' > SHA256SUMS)

echo "Prepared in $out:"
ls -lh "$out" | awk 'NR>1 {print "  " $5 "  " $9}'
echo
echo "To publish them as assets of the GitHub release v$version (public; run it yourself):"
echo "  gh release create v$version $out/* --title \"W1913 v$version (edition $edition)\" --notes-file <(sed -n '/^## \[$version\]/,/^## \[/p' CHANGELOG.md | sed '\$d')"
