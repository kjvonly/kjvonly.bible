# 0007 IndexedDB Schema

## Status

Proposed

## Problem

KJVOnly needs a local data model that supports:

* Fast Bible rendering
* Offline-first usage
* Resource-based downloads
* Manifest-based bootstrapping
* User notes, annotations, plans, and reading progress
* Future trusted publishers
* Sync through Nostr relays

The schema should remain structured, simple, and flexible enough to refactor later.

## Decision

Use a domain-first IndexedDB schema with generic metadata stores.

```text
Domain Stores
↓
Resources / Manifests
↓
Outbox
```

Domain stores are optimized for app queries and rendering.

Generic stores track resource metadata, manifest discovery, trust, and synchronization.

## Object Stores

### Domain Stores

Keep separate domain stores:

```text
chapters
bible_versions
booknames
strongs
paragraphs
pericopes
search

annotations
notes
plans
subscriptions
completed_readings
```

These stores contain parsed app-ready data.

### Metadata Stores

Add generic metadata stores:

```text
resources
manifests
trusted_publishers
```

These stores track what content exists locally and where it came from.

### Sync Store

Use one generic outbox:

```text
outbox
```

Replace the old per-domain unsynced stores:

```text
unsynced_annotations
unsynced_notes
unsynced_plans
unsynced_subscriptions
unsynced_completed_readings
```

with one reusable sync pipeline.

## Storage Boundaries

Domain stores should not store raw downloaded blobs.

Resource loading follows:

```text
download
↓
verify
↓
parse
↓
write domain stores
↓
write resource metadata
```

The app stores parsed records, not duplicate raw bundles.

## Resource Store

The `resources` store tracks local resource metadata.

Primary key:

```text
pubkey:d
```

Example:

```ts
{
  id: "<pubkey>:kjvonly/bible/chapters/kjv",
  pubkey: "<publisher-pubkey>",
  d: "kjvonly/bible/chapters/kjv",
  kind: 37770,
  type: "bible-chapters",
  eventId: "<nostr-event-id>",
  createdAt: 123456789,
  sha256: "<sha256>",
  strategy: "blossom",
  status: "ready"
}
```

## Manifest Store

The `manifests` store caches manifest events and parsed manifest content.

Primary key:

```text
pubkey:d
```

Recommended fields:

```ts
{
  id: "<pubkey>:kjvonly/bible/kjv",
  pubkey: "<publisher-pubkey>",
  d: "kjvonly/bible/kjv",
  eventId: "<nostr-event-id>",
  createdAt: 123456789,
  content: {},
  rawEvent: {}
}
```

Manifests may store the raw signed event because signatures and event metadata are part of discovery trust.

## Domain Record Keys

Domain records should use keys that preserve:

```text
publisher
resource
location
```

General pattern:

```text
pubkey:d:location
```

Location format:

```text
book_chapter_verse_wordIndex
```

Use `0` when a value is not applicable.

Example:

```text
43_3_16_0
```

## Bible Content Keys

Bible text is version-specific because `kjv` and `kjvs` are different resources.

Examples:

```text
<pubkey>:kjvonly/bible/chapters/kjv:43_3_16_0
<pubkey>:kjvonly/bible/chapters/kjvs:43_3_16_0
```

## Overlay Keys

Overlays are resource-specific.

Examples:

```text
<pubkey>:kjvonly/overlays/paragraphs/default:43_3_0_0
<pubkey>:kjvonly/overlays/pericopes/default:43_3_16_0
<pubkey>:kjvonly/overlays/pericopes/study-plan:43_3_16_0
```

Applicability is metadata:

```json
{
  "appliesTo": ["kjv", "kjvs"]
}
```

This allows one overlay resource to apply to multiple Bible versions.

## User Content Keys

User content is location-first and version-neutral by default.

Examples:

```text
<user-pubkey>:notes:43_3_16_0
<user-pubkey>:annotations:43_3_16_0
<user-pubkey>:highlights:43_3_16_0
```

If user content should only apply to a specific Bible version, use metadata:

```json
{
  "appliesTo": ["kjv"]
}
```

## Provenance

Domain records should store enough provenance to trace their source.

Recommended fields:

```ts
{
  id: "...",
  pubkey: "...",
  d: "...",
  resourceId: "<pubkey>:<d>",
  eventId: "...",
  createdAt: 123456789
}
```

This allows the client to:

* Refresh resources
* Delete and re-import resources
* Support multiple publishers
* Trace where local data came from

## Indexes

Recommended indexes:

```text
chapters:
  pubkey
  d
  location
  resourceId

paragraphs:
  pubkey
  d
  location
  resourceId
  appliesTo

pericopes:
  pubkey
  d
  location
  resourceId
  appliesTo

notes:
  pubkey
  location
  createdAt
  appliesTo

annotations:
  pubkey
  location
  createdAt
  appliesTo

resources:
  pubkey
  d
  kind
  type
  eventId
  status

manifests:
  pubkey
  d
  eventId
  createdAt

outbox:
  status
  kind
  pubkey
  d
  recordId
  createdAt
```

## Search

Bible chapters may continue using FlexSearch.

Search indexes should be treated as derived data.

They may be rebuilt from domain stores.

## Resource Refresh

When a resource changes:

```text
find records by resourceId
delete existing records
parse new resource
insert new records
update resources row
rebuild derived indexes if needed
```

Delete before re-import keeps refresh behavior simple and avoids stale records.

## Outbox Store

The `outbox` store tracks pending or failed sync operations.

Payloads should be full payloads, not patches.

Example:

```ts
{
  id: "<uuid>",
  kind: 37773,
  domain: "notes",
  op: "put",
  recordId: "<record-id>",
  payload: {},
  status: "pending",
  relayAttempts: {},
  retryCount: 0,
  createdAt: 123456789,
  updatedAt: 123456789,
  error: null
}
```

A successful write to one relay is considered success.

Other relay failures may continue retrying separately.

## Deletes

Deletes should be soft until sync succeeds.

Flow:

```text
mark record deleted
create outbox delete operation
sync to relay
hard delete locally
```

If sync fails, keep the failed delete operation in the outbox.

## IndexedDB Migrations

Use IndexedDB version numbers.

For now:

```text
increment DB_VERSION
create missing stores
create missing indexes
perform simple migrations only
```

Avoid complex migrations until the schema stabilizes.

## Design Rules

* IndexedDB is domain-first.
* Domain stores are optimized for querying and rendering.
* Generic stores track resource metadata, manifests, trust, and sync.
* Raw downloaded bundles are not retained after import.
* `resources` tracks metadata only.
* `manifests` may store raw signed event data.
* `outbox` replaces per-domain unsynced stores.
* Bible content is version-specific.
* Overlays are resource-specific and reusable through `appliesTo`.
* User content is location-first and version-neutral by default.
* Search indexes are derived data.

## Consequences

* App queries remain simple and fast.
* Offline-first behavior is preserved.
* Resource refreshes are predictable.
* Sync logic is centralized.
* Storage duplication is reduced.
* Multiple publishers can coexist.
* Notes and annotations can display across Bible versions.
* Bible resources can still remain version-specific.

## Big Takeaway

```text
IndexedDB is domain-first.

Domain stores render the app.
Resources track downloaded content.
Manifests track discovery.
Outbox tracks synchronization.
```
