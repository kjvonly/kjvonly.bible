#!/usr/bin/env bash
set -euo pipefail

RELAY_URL="${RELAY_URL:-ws://localhost:3334}"
BLOSSOM_URL="${BLOSSOM_URL:-http://localhost:3335}"

CHAPTER_FILE="${CHAPTER_FILE:-../../../data/json.gz/1_1.json.gz}"
STRONGS_FILE="${STRONGS_FILE:-../../../data/strongs.json.gz/h7225.json.gz}"

BOOTSTRAP_RESOURCE_ID="kjvonly/resources/collections/default"

CHAPTER_RESOURCE_ID="kjvonly/bible/chapters/kjvs/1_1"
CHAPTER_RESOURCE_TYPE="kjvonly/bible/chapters"

STRONGS_RESOURCE_ID="kjvonly/strongs/definitions/kjvs/H7225"
STRONGS_RESOURCE_TYPE="kjvonly/strongs/definitions"

###############################################################################

if [[ -z "${NOSTR_SECRET_KEY:-}" ]]; then
	echo "NOSTR_SECRET_KEY is required."
	exit 1
fi

if [[ ! -f "$CHAPTER_FILE" ]]; then
	echo "Chapter file not found: $CHAPTER_FILE"
	exit 1
fi

if [[ ! -f "$STRONGS_FILE" ]]; then
	echo "Strong's file not found: $STRONGS_FILE"
	exit 1
fi

PUBLISHER="$(
	nak key public \
		"$NOSTR_SECRET_KEY"
)"

if [[ ! "$PUBLISHER" =~ ^[0-9a-f]{64}$ ]]; then
	echo "Invalid publisher public key: $PUBLISHER"
	exit 1
fi

###############################################################################
# Helpers

file_modified_at() {
	local file="$1"

	if stat -f '%m' "$file" >/dev/null 2>&1; then
		stat -f '%m' "$file"
	else
		stat -c '%Y' "$file"
	fi
}

upload_blossom_file() {
	local file="$1"

	UPLOAD_HASH="$(
		sha256sum "$file" |
			awk '{print $1}'
	)"

	UPLOAD_SIZE="$(
		wc -c < "$file" |
			tr -d ' '
	)"

	UPLOAD_URL="$BLOSSOM_URL/$UPLOAD_HASH.gz"

	nak blossom upload \
		--server "$BLOSSOM_URL" \
		"$file"
}

###############################################################################
# Chapter

echo "Uploading Chapter Resource:"
echo "  $CHAPTER_RESOURCE_ID"

upload_blossom_file \
	"$CHAPTER_FILE"

CHAPTER_HASH="$UPLOAD_HASH"
CHAPTER_SIZE="$UPLOAD_SIZE"
CHAPTER_URL="$UPLOAD_URL"

CHAPTER_MODIFIED_AT="$(
	file_modified_at \
		"$CHAPTER_FILE"
)"

###############################################################################
# Strong's

echo "Uploading Strong's Resource:"
echo "  $STRONGS_RESOURCE_ID"

upload_blossom_file \
	"$STRONGS_FILE"

STRONGS_HASH="$UPLOAD_HASH"
STRONGS_SIZE="$UPLOAD_SIZE"
STRONGS_URL="$UPLOAD_URL"

STRONGS_MODIFIED_AT="$(
	file_modified_at \
		"$STRONGS_FILE"
)"

###############################################################################
# Descriptor collection

DESCRIPTORS="$(
	jq -cn \
		--arg publisher "$PUBLISHER" \
		--arg chapterResourceId "$CHAPTER_RESOURCE_ID" \
		--arg chapterResourceType "$CHAPTER_RESOURCE_TYPE" \
		--argjson chapterModifiedAt "$CHAPTER_MODIFIED_AT" \
		--arg chapterUrl "$CHAPTER_URL" \
		--arg chapterSha256 "$CHAPTER_HASH" \
		--argjson chapterSize "$CHAPTER_SIZE" \
		--arg strongsResourceId "$STRONGS_RESOURCE_ID" \
		--arg strongsResourceType "$STRONGS_RESOURCE_TYPE" \
		--argjson strongsModifiedAt "$STRONGS_MODIFIED_AT" \
		--arg strongsUrl "$STRONGS_URL" \
		--arg strongsSha256 "$STRONGS_HASH" \
		--argjson strongsSize "$STRONGS_SIZE" \
		'
		[
			{
				metadata: {
					publisher: $publisher,
					resourceId: $chapterResourceId,
					category: $chapterResourceType,
					modifiedAt: $chapterModifiedAt,
					mediaType: "application/json+gzip"
				},
				strategy: {
					type: "blossom",
					data: {
						url: $chapterUrl,
						sha256: $chapterSha256,
						size: $chapterSize
					}
				}
			},
			{
				metadata: {
					publisher: $publisher,
					resourceId: $strongsResourceId,
					category: $strongsResourceType,
					modifiedAt: $strongsModifiedAt,
					mediaType: "application/json+gzip"
				},
				strategy: {
					type: "blossom",
					data: {
						url: $strongsUrl,
						sha256: $strongsSha256,
						size: $strongsSize
					}
				}
			}
		]
		'
)"

###############################################################################
# Publish bootstrap Resource

echo "Publishing bootstrap descriptor Resource:"
echo "  $BOOTSTRAP_RESOURCE_ID"

nak event \
	-c "$DESCRIPTORS" \
	-k 37770 \
	-d "$BOOTSTRAP_RESOURCE_ID" \
	--tag "m=application/json" \
	--tag "t=kjvonly/resources/collections" \
	--tag "representation=descriptors" \
	"$RELAY_URL"

###############################################################################

echo
echo "Bootstrap Resource published."
echo
echo "Publisher:"
echo "  $PUBLISHER"
echo
echo "Chapter:"
echo "  $CHAPTER_RESOURCE_ID"
echo "  $CHAPTER_URL"
echo "  sha256=$CHAPTER_HASH"
echo "  size=$CHAPTER_SIZE"
echo "  modifiedAt=$CHAPTER_MODIFIED_AT"
echo
echo "Strong's:"
echo "  $STRONGS_RESOURCE_ID"
echo "  $STRONGS_URL"
echo "  sha256=$STRONGS_HASH"
echo "  size=$STRONGS_SIZE"
echo "  modifiedAt=$STRONGS_MODIFIED_AT"