#!/usr/bin/env bash
set -euo pipefail

# Regenerate the index for the existing Strong's Dictionary edition, then publish
# the edition and matching headword index. The retired standalone Strong's source
# bundle is no longer required.
# Usage: zarf/scripts/seed/publish-strongs-dictionary-edition.sh [local|home]
PROFILE="${1:-local}"
case "$PROFILE" in
  local) MANIFEST='dictionary-strongs.yaml' ;;
  home) MANIFEST='dictionary-strongs-home.yaml' ;;
  *) echo 'Usage: publish-strongs-dictionary-edition.sh [local|home]' >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
EDITION="$ROOT/data/dictionary/entries/bundles/strongs-kjvs.json.gz"
INDEX="$ROOT/data/dictionary/indexes/bundles/strongs-kjvs.json.gz"
RESOURCE_ID='kjvonly/dictionary/entries/strongs-kjvs'

if [[ ! -f "$EDITION" ]]; then
  echo "Missing Strong's Dictionary edition: $EDITION" >&2
  exit 1
fi

node "$ROOT/zarf/scripts/seed/build-dictionary-headword-index.mjs" \
  "$EDITION" "$INDEX" "$RESOURCE_ID"

# Both objects are published together, with the index tied to the exact
# compressed bytes of the committed Dictionary edition.
cd "$ROOT/client/cli"
npm run build
node dist/main.js sync "$ROOT/zarf/manifest/$MANIFEST"
