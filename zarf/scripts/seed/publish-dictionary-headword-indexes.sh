#!/usr/bin/env bash
set -euo pipefail

# Build both headword indexes and publish only their Blossom descriptors.
# Usage: zarf/scripts/seed/publish-dictionary-headword-indexes.sh [local|home]
PROFILE="${1:-local}"
case "$PROFILE" in
  local) MANIFEST='dictionary-search-indexes.yaml' ;;
  home) MANIFEST='dictionary-search-indexes-home.yaml' ;;
  *) echo 'Usage: publish-dictionary-headword-indexes.sh [local|home]' >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BUILDER="$ROOT/zarf/scripts/seed/build-dictionary-headword-index.mjs"
SOURCE_DIR="$ROOT/data/dictionary/entries/bundles"
OUTPUT_DIR="$ROOT/data/dictionary/indexes/bundles"

for edition in webster-1828 webster-1844; do
  node "$BUILDER" \
    "$SOURCE_DIR/$edition.json.gz" \
    "$OUTPUT_DIR/$edition.json.gz" \
    "kjvonly/dictionary/entries/$edition"
done

# The CLI's normal sync path uploads object bytes to Blossom and publishes
# the Resource descriptor to the configured relay. It does not install data.
cd "$ROOT/client/cli"
npm run build
node dist/main.js sync "$ROOT/zarf/manifest/$MANIFEST"
