#!/usr/bin/env bash
set -euo pipefail

# Build one Strong's Dictionary edition and its matching published headword index.
# Usage: zarf/scripts/seed/publish-strongs-dictionary-edition.sh [local|home]
PROFILE="${1:-local}"
case "$PROFILE" in
  local) MANIFEST='dictionary-strongs.yaml' ;;
  home) MANIFEST='dictionary-strongs-home.yaml' ;;
  *) echo 'Usage: publish-strongs-dictionary-edition.sh [local|home]' >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STRONGS_SOURCE="$ROOT/../../data/strongs/definitions/bundles/strongs.json.gz"
BIBLE_SOURCE="$ROOT/../../data/bible/chapters/bundles/kjvs.json.gz"
EDITION="$ROOT/../../data/dictionary/entries/bundles/strongs-kjvs.json.gz"
INDEX="$ROOT/../../data/dictionary/indexes/bundles/strongs-kjvs.json.gz"
RESOURCE_ID='kjvonly/dictionary/entries/strongs-kjvs'

node "$ROOT/zarf/scripts/seed/build-strongs-dictionary-edition.mjs" \
  "$STRONGS_SOURCE" "$BIBLE_SOURCE" "$EDITION"
node "$ROOT/zarf/scripts/seed/build-dictionary-headword-index.mjs" \
  "$EDITION" "$INDEX" "$RESOURCE_ID"

# Both objects are published together, with index metadata tied to the exact
# compressed edition bytes generated above.
cd "$ROOT/client/cli"
npm run build
node dist/main.js sync "$ROOT/zarf/manifest/$MANIFEST"
