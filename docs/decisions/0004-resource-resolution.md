# 0004 Resource Resolution

## Status

Proposed

## Context

Clients need a consistent way to load resources regardless of where the data is stored.

A resource may already exist locally, be referenced by a manifest, live in Blossom, or be stored directly in a Nostr event.

The application must support both:

```text
Offline-first bulk downloads
On-demand resource loading
```

without changing how resources are identified.

The application must also support user-generated content that can be synchronized to one or more relays while continuing to function offline.

## Decision

Clients resolve resources through a standard resolution flow.

```text
resource id
↓
local resources cache
↓
manifest metadata
↓
storage strategy
↓
download/load
↓
verify
↓
store locally
```

Clients request resources by resource identifier.

Clients never request resources by storage location.

Storage resolution is handled internally through strategies.

## IndexedDB Architecture

The client uses three layers of persistence:

```text
Domain Stores
↓
Resources & Manifests
↓
Outbox
```

### Domain Stores

Domain stores contain application data optimized for querying and rendering.

Examples:

```text
chapters
paragraphs
pericopes

notes
annotations

plans
subscriptions
completed_readings
```

The user interface renders from domain stores.

Domain stores are considered the source of truth for application state.

### Resource Store

The resource store tracks downloaded resources.

Example:

```ts
{
  id: "pubkey:d",
  pubkey: "<publisher>",
  d: "kjvonly/bible/chapters/kjv",

  kind: 37770,
  type: "bible-chapters",

  strategy: "blossom",

  sha256: "<sha256>",

  sourceEventId: "<event-id>",
  sourcePubkey: "<pubkey>",

  status: "ready",

  cachedAt: 123456789,
  updatedAt: 123456789
}
```

The resource store contains metadata only.

Downloaded resources are not stored as raw blobs after processing.

### Manifest Store

The manifest store tracks discovered datasets and bootstrap information.

Examples:

```text
kjvonly/bible/kjv
kjvonly/bible/kjvs

kjvonly/plans/readings/yearly
```

The client may cache manifests to avoid repeated relay queries.

### Outbox

The outbox tracks synchronization operations.

A single outbox is used for all domains.

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

  retryCount: 0,

  createdAt: 123456789,
  updatedAt: 123456789
}
```

The outbox is responsible for:

```text
Synchronization
Retries
Conflict tracking
Error handling
```

The user interface does not render from the outbox.

## Resource Resolution Flow

### 1. Request Resource

Example:

```text
kjvonly/bible/chapters/kjv/1_1
```

### 2. Check Resource Cache

Search the resource store.

If a valid local resource exists:

```text
return local data
```

### 3. Resolve Manifest

If the resource is missing:

```text
query manifest
resolve resource descriptor
```

### 4. Resolve Strategy

Examples:

```text
event
blossom
ipfs
http
```

### 5. Download or Load

Load resource using the configured strategy.

### 6. Verify Integrity

If a hash is provided:

```text
verify sha256
```

Invalid resources must be rejected.

### 7. Parse Resource

Resource content is transformed into domain records.

Examples:

```text
chapter records
paragraph records
pericope records
```

### 8. Store Resource Metadata

Write resource metadata to:

```text
resources
```

### 9. Store Domain Data

Write parsed records to the appropriate domain store.

### 10. Return Data

Return the requested resource to the caller.

## Resource Provenance

Domain records should retain information about their source.

Example:

```ts
{
  id: "kjv_1_1",

  resourceId: "pubkey:kjvonly/bible/chapters/kjv",

  sourcePubkey: "<pubkey>",
  sourceEventId: "<event-id>"
}
```

This allows the client to:

```text
Refresh resources
Delete resources
Trace resource origins
Support multiple publishers
```

## Synchronization Model

Domain stores contain the current local state.

The outbox contains synchronization operations.

```text
Domain Store
↓
Outbox
↓
Relay
```

### Create or Update

```text
write domain record
↓
create outbox operation
↓
sync later
```

The user immediately sees the updated data.

### Delete

Deletes are soft until synchronization succeeds.

```text
mark deleted
↓
create outbox operation
↓
sync
↓
hard delete
```

If synchronization fails:

```text
retain outbox operation
```

The user may resolve failures manually.

## Retry Strategy

Outbox items continue retrying until they succeed or are manually resolved.

Recommended behavior:

```text
Exponential backoff
Circuit breaker
Configurable retry limits
```

For multi-relay publishing:

```text
One successful relay write = success
Remaining relay failures continue retrying
```

## Conflict Resolution

The system uses:

```text
Last write wins
```

for all domains.

Conflict records should be retained in the outbox for inspection.

Future versions may introduce more advanced conflict resolution.

## Trust Model

The application contains a trusted publisher pubkey.

Resources published by that pubkey are trusted by default.

Future versions may support:

```text
Trusted publishers
Friend publishers
Per-domain subscriptions
Selective resource discovery
```

Examples:

```text
Receive reading plans from user A
Receive notes from user B
Ignore annotations from user C
```

## Design Rules

* Clients request resources by resource identifier.
* Clients do not request resources by storage location.
* Domain stores are optimized for querying and rendering.
* Resource stores contain metadata only.
* Raw downloaded resources are not retained after import.
* A single outbox is used for synchronization.
* Synchronization state belongs to the outbox.
* Domain stores represent current local state.
* Deletes remain soft until synchronization succeeds.
* Invalid resources must never be imported.
* Resource provenance should be retained.

## Consequences

* Offline-first and on-demand loading share the same architecture.
* Storage backends remain implementation details.
* Domain stores remain optimized for application queries.
* Synchronization logic is centralized.
* Resource refreshes are straightforward.
* Failed synchronization does not hide local changes.
* Future publishers and trust models can be introduced without changing the resource model.

## Big Takeaway

```text
Render from domain stores.
Resolve downloads through resources.
Sync mutations through outbox.
Keep resource metadata and synchronization state separate.
```
