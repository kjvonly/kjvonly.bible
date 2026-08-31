#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"

DATA_DIR="${DATA_DIR:-../../../data/strongs.json.gz}"
RELAY_URL="${RELAY_URL:-ws://localhost:3334}"
BLOSSOM_URL="${BLOSSOM_URL:-http://localhost:3335}"
PARALLEL="${PARALLEL:-10}"

# Custom Nostr kinds used by KJVOnly:
#
# 37770:
#   Small data files stored directly in relay events.
#   Content is hex-encoded json.gz.
#
# 37778:
#   Blossom file reference event.
#   Stores the sha256 hash and URL for files uploaded to Blossom.

seed_relay() {
#  find "$DATA_DIR" -maxdepth 1 -type f \( -name 'g*' -o -name 'h*' \) -print0 |
   find "$DATA_DIR" -maxdepth 1 -type f -name 'h7225.json.gz' -print0 |
    xargs -0 -I {} -P "$PARALLEL" sh -c '
      file="$1"
      relay_url="$2"

      name="$(basename "$file")"
      id="$(printf "%s" "${name%%.*}" | tr "[:lower:]" "[:upper:]")"

      nak event \
        -c "$(cat "$file" | xxd -p -c 0)" \
        -k 37770 \
        -d "kjvonly/strongs/definitions/kjvs/$id" \
        --tag "m=application/json+gzip+hex" \
        --tag "t=kjvonly/strongs/definitions" \
        --tag "representation=content" \
        "$relay_url"
    ' sh {} "$RELAY_URL"
}

seed_blossom_file() {
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
    -d "kjvonly/strongs/definitions/$id" \
    --tag "m=json.gz" \
    --tag "url=$BLOSSOM_URL/$hash.gz" \
    "$RELAY_URL"
}

seed_blossom() {
  seed_blossom_file "$DATA_DIR/all.json.gz" "Strong's Concordance"
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