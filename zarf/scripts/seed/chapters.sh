#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"

DATA_DIR="${DATA_DIR:-../../../data/json.gz}"
RELAY_URL="${RELAY_URL:-ws://localhost:3334}"
BLOSSOM_URL="${BLOSSOM_URL:-http://localhost:3335}"
PARALLEL="${PARALLEL:-10}"

# Custom Nostr kinds used by KJVOnly:
#
# 37770:
#   Chapter payload event.
#   Stores small chapter files directly in the relay.
#   Content is hex-encoded json.gz.
#
# 37778:
#   Blossom file reference event.
#   Stores metadata pointing to a file uploaded to Blossom.
#   The event includes the sha256 hash and URL of the uploaded file.

seed_relay() {
  # Numeric files are individual chapter files.
  # These are small enough to store directly as Nostr event content.
  find "$DATA_DIR" -maxdepth 1 -type f -name '[0-9]*' -print0 |
    xargs -0 -I {} -P "$PARALLEL" sh -c '
      file="$1"
      relay_url="$2"

      name="$(basename "$file")"
      id="${name%%.*}"

      nak event \
        -c "$(cat "$file" | xxd -p -c 0)" \
        -k 37770 \
        -d "kjvonly/bible/kjvs/$id" \
        --tag "m=json.gz.hex" \
        "$relay_url"
    ' sh {} "$RELAY_URL"
}

seed_blossom() {
  # Alpha-named .gz files are aggregated files.
  # These can exceed practical event content limits, so:
  #
  # 1. Upload the file to Blossom.
  # 2. Calculate the sha256 hash.
  # 3. Publish a Nostr event to the relay with:
  #    - x=<sha256>
  #    - url=<blossom-url>/<sha256>.gz
  #
  # The relay stores the index/metadata.
  # Blossom stores the actual file bytes.
  find "$DATA_DIR" -maxdepth 1 -type f -name '[A-Za-z]*gz' -print0 |
    xargs -0 -I {} -P "$PARALLEL" sh -c '
      file="$1"
      blossom_url="$2"
      relay_url="$3"

      name="$(basename "$file")"
      id="${name%%.*}"
      hash="$(sha256sum "$file" | awk "{print \$1}")"

      nak blossom upload --server "$blossom_url" "$file"

      nak event \
        --tag "x=$hash" \
        -c "$name" \
        -k 37778 \
        -d "kjvonly/bible/kjvs/$id" \
        --tag "type=chapters" \
        --tag "m=json.gz" \
        --tag "url=$blossom_url/$hash.gz" \
        "$relay_url"
    ' sh {} "$BLOSSOM_URL" "$RELAY_URL"
}

seed_blossom_file() {
  # Upload one specific file to Blossom and publish one relay event for it.
  #
  # Useful for top-level bundle files like:
  #   kjv.json.gz
  #   kjvs.json.gz
  #
  # This keeps seed_blossom from re-uploading those files every time.
  file="$1"
  title="$2"

  hash="$(sha256sum "$file" | awk '{print $1}')"
  name="$(basename "$file")"
  id="${name%%.*}"

  nak blossom upload --server "$BLOSSOM_URL" "$file"

  nak event \
    --tag "x=$hash" \
    -c "$title" \
    -k 37778 \
    -d "kjvonly/$id" \
    --tag "type=chapters" \
    --tag "m=json.gz" \
    --tag "url=$BLOSSOM_URL/$hash.gz" \
    "$RELAY_URL"
}

case "$TARGET" in
  relay)
    seed_relay
    ;;
  blossom)
    seed_blossom
    ;;
  file)
    seed_blossom_file "$2" "$3"
    ;;
  all)
    seed_relay
    seed_blossom
    ;;
  *)
    echo "usage:"
    echo "  $0 relay"
    echo "  $0 blossom"
    echo "  $0 all"
    echo "  $0 file <path> <title>"
    exit 1
    ;;
esac