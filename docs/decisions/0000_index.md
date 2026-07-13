# ADR Index

| ADR                                          | Title                               | Description                                                                                                                      |
| -------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [0001](./0001-data-distribution-strategy.md) | Data Distribution Strategy          | Defines how KJVOnly distributes content through Nostr using manifests, resource identifiers, and pluggable storage strategies.   |
| [0002](./0002-domain-resource-model.md)      | Domain, Resource, and Storage Model | Defines the separation between domains, resources, and storage strategies. Establishes the canonical resource naming convention. |
| [0003](./0003-manifest-events.md)            | Manifest Events                     | Defines manifest events as dataset bootstrap entrypoints and specifies how resources are discovered, loaded, and verified.       |
| [0004](./0004-resource-resolution.md)        | Resource Resolution                 | Defines how clients resolve resources, cache content locally, manage synchronization, and maintain offline-first behavior.       |
| [0005](./0005-resource-discovery.md)         | Resource Discovery                  | Defines trust-based resource discovery using manifests, trusted publishers, and offline-capable manifest caching.                |
| [0006](./0006-resource-versioning.md)        | Resource Versioning                 | Defines stable resource identities, content-based version detection, update behavior, and the resource forking model.            |
| [0007](./0007-indexeddb-schema.md)           | IndexedDB Schema                    | Defines the client-side persistence model using domain stores, resource metadata, manifests, trusted publishers, and the outbox. |
| [0008](./0008-sync-outbox-strategy.md)       | Sync / Outbox Strategy              | Defines the asynchronous synchronization model, outbox lifecycle, retries, conflict handling, and offline-first publishing. |
| [0009](./0009-trusted-publishers.md)         | Trusted Publishers                  | Defines the trust model for publisher discovery and separates trust, discovery, and resource installation. |
| [0010](./0010-import-export-format.md)       | Import / Export Format              | Defines archive resources as manifests with associated resources, enabling portable backups, migration, and installation reuse. |
| [0011](./0011-search-index-strategy.md)      | Search Index Strategy               | Defines search indexes as reusable resources, supporting incremental updates, distribution, and offline-first search.            |
| [0012](./0012-resource-installation.md)      | Resource Installation               | Defines the source-independent installation pipeline, resource dependencies, atomic updates, deduplication, and offline-first installation lifecycle. |
---

### 0001 — Data Distribution Strategy

**Problem:** How do we distribute Bible data through Nostr without coupling ourselves to Blossom?

**Decision:**

* Kinds represent **domains**, not storage backends.
* Resources have canonical identifiers.
* Manifests bootstrap datasets.
* Storage is resolved through a strategy (`blossom`, `event`, etc.).

**Big takeaway:**

```text
Kind = what it is
Strategy = where it lives
```

---

### 0002 — Domain, Resource, and Storage Model

**Problem:** How do we identify content consistently?

**Decision:**

```text
namespace/domain/resource-type/...resource-id
```

Examples:

```text
kjvonly/bible/chapters/kjv
kjvonly/bible/chapters/kjv/1_1

kjvonly/overlays/pericopes/default
kjvonly/overlays/pericopes/default/1_1
```

**Key concepts:**

```text
Domain
├── bible
├── plans
└── annotations

Resource
├── chapters
├── pericopes
└── paragraphs

Strategy
├── blossom
├── event
└── ipfs
```

**Big takeaway:**

Resources can be either:

```text
Bundle
└── kjvonly/bible/chapters/kjv

Item
└── kjvonly/bible/chapters/kjv/1_1
```

without changing the naming model.

---

### 0003 — Manifest Events

**Problem:** How does a client discover and download resources?

**Decision:**

```text
MANIFEST_KIND = 37778
```

A manifest is a bootstrap entrypoint describing a dataset.

Example:

```text
kjvonly/bible/kjv
```

contains:

```text
kjvonly/bible/chapters/kjv
kjvonly/bible/index/default
kjvonly/overlays/paragraphs/default
kjvonly/overlays/pericopes/default
```

Each resource declares:

```json
{
  "resource": "...",
  "strategy": "blossom",
  "sha256": "..."
}
```

**Big takeaway:**

The client can choose:

```text
Offline First
manifest -> bundle resources

or

On Demand
manifest -> individual chapter resources
```

using the exact same resource identifiers.

---

### 0004 — Resource Resolution

**Problem:** How do clients load resources regardless of where they are stored?

**Decision:**

Clients resolve resources through a common pipeline:

```text
resource id
↓
resources cache
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

The client maintains three persistence layers:

```text
Domain Stores
↓
Resources & Manifests
↓
Outbox
```

**Big takeaway:**

```text
Render from domain stores.
Resolve downloads through resources.
Sync mutations through outbox.
```

---

### 0005 — Resource Discovery

**Problem:** How do clients discover datasets, overlays, reading plans, and user-created content?

**Decision:**

KJVOnly uses a trust-based discovery model.

Discovery begins with trusted publishers.

```text
trusted publisher
↓
manifest discovery
↓
resource discovery
↓
resource installation
```

Resources are discovered through manifests, not through storage backends.

**Big takeaway:**

```text
Discovery starts from trust, not search.

Clients discover manifests from trusted publishers and discover resources through those manifests.
```

---

### 0006 — Resource Versioning

**Problem:** How do resources evolve without creating new identifiers every time content changes?

**Decision:**

Resources maintain stable identities:

```text
(pubkey, d)
```

Content changes are detected through:

```text
sha256
or
event id
```

Users do not edit shared resources directly.

Instead:

```text
publisher resource
↓
fork
↓
user resource
```

**Big takeaway:**

```text
Resource identity stays stable.

Content versions are determined by hashes or event IDs.

Shared resources are updated.
Customized resources are forked.
```
---

### 0007 — IndexedDB Schema

**Problem:** How should the client persist application state while remaining resource-oriented and offline-first?

**Decision:**

Separate persistence into three responsibilities:

```text
Domain Stores
↓
Resources & Manifests
↓
Outbox
```

Domain stores contain application state.

Resources and manifests contain metadata and installation information.

The outbox manages synchronization.

**Big takeaway:**

```text
IndexedDB stores application state.

Resources describe it.

The Outbox synchronizes it.
```

---

### 0008 — Sync / Outbox Strategy

**Problem:** How are local changes synchronized without depending on network connectivity?

**Decision:**

Every write is committed locally first.

```text
User Action
↓
Domain Store
↓
Outbox
↓
Background Sync
```

Synchronization is asynchronous.

Operations are coalesced for replaceable events.

Retries use exponential backoff with circuit breakers.

Last-write-wins is the default conflict strategy.

**Big takeaway:**

```text
Users save locally.

The Outbox eventually publishes those changes to Nostr.
```

---

### 0009 — Trusted Publishers

**Problem:** How does the application know whose resources it may discover?

**Decision:**

Trust is binary.

```text
Trusted Publisher
↓
Manifest Discovery
↓
Available Resources
```

Trust enables discovery.

Subscriptions determine which discovered resources become installed.

Resources always remain owned by their publisher.

**Big takeaway:**

```text
Trust enables discovery.

Subscriptions enable installation.
```

---

### 0010 — Import / Export Format

**Problem:** How can application data be backed up, migrated, and shared without introducing a separate backup architecture?

**Decision:**

Exports are Archive Resources.

```text
Archive
↓
Manifest
↓
Resources
```

Imports reuse the same manifest verification, resource resolution, and installation pipeline used throughout the application.

Search indexes, metadata, and resources may all participate in an archive.

**Big takeaway:**

```text
An export archive is a manifest with associated resources.

Import is simply another source feeding the same installation pipeline.
```
---

### 0011 — Search Index Strategy

**Problem:** How can search remain fast without rebuilding indexes every time the application starts?

**Decision:**

Search indexes are treated as both derived data and reusable resources.

```text
Resources
↓
Build Index
↓
Store Snapshot
↓
Incremental Updates
↓
Search
```

Publisher-provided indexes may be downloaded.

User-generated indexes are maintained locally through incremental indexing and periodic snapshot updates.

Search indexes participate in the same discovery, installation, import/export, and resource lifecycle as every other application resource.

**Big takeaway:**

```text
Search indexes are derived resources.

Build once.
Reuse many times.
Update incrementally.
```
---

---

### 0012 — Resource Installation

**Problem:** How do discovered resources become usable local application data while remaining reliable, efficient, and offline-first?

**Decision:**

Resource installation uses a single, source-independent pipeline.

```text
Source
↓
Manifest
↓
Resolve Resources
↓
Download
↓
Verify
↓
Install
↓
Domain Stores
```

Both bundled and individual resources are installable.

Dependencies are installed automatically.

Installations are atomic, updates preserve the last valid version until complete, and identical content is deduplicated using content hashes.

**Big takeaway:**

```text
Resource installation is source-independent.

Every resource follows the same installation pipeline regardless of where it originated.
```
## Architectural Pipeline

```text
Trusted Publishers
        ↓
Manifest Discovery
        ↓
Resource Resolution
        ↓
Verification
        ↓
Installation
        ↓
Domain Stores
        ↓
Outbox Synchronization
```

## Current Architecture Overview

```text
Kinds
↓
Define domains

Resources
↓
Provide stable identities

Manifests
↓
Describe collections of resources

Trusted Publishers
↓
Enable discovery

Subscriptions
↓
Select what to install

Resolution
↓
Locate resources

Verification
↓
Validate integrity

Installation
↓
Populate domain stores

Domain Stores
↓
Render application state

Outbox
↓
Synchronize local changes

Archives
↓
Package and transport resources
```