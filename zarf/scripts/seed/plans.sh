#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"

DATA_DIR="${DATA_DIR:-../../../data/plans.json.gz}"
RELAY_URL="${RELAY_URL:-ws://localhost:3334}"
PARALLEL="${PARALLEL:-12}"

# Custom Nostr kinds used by KJVOnly:
#
# 37775:
#   Reading plan event.
#   Stores small plan files directly in the relay.
#   Content is hex-encoded json.gz.

seed_relay() {
  find "$DATA_DIR" -maxdepth 1 -type f -name '[A-Za-z]*' -print0 |
    xargs -0 -I {} -P "$PARALLEL" sh -c '
      file="$1"
      relay_url="$2"

      name="$(basename "$file")"
      id="${name%%.*}"

      nak event \
        -c "$(cat "$file" | xxd -p -c 0)" \
        -k 37775 \
        -d "kjvonly/plans/readings/$id" \
        --tag "m=json.gz.hex" \
        "$relay_url"
    ' sh {} "$RELAY_URL"
}

case "$TARGET" in
  relay|all)
    seed_relay
    ;;
  *)
    echo "usage:"
    echo "  $0 relay"
    echo "  $0 all"
    exit 1
    ;;
esac