# ADR Index

| ADR                                          | Title                               | Description                                                                                                                      |
| -------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [0001](./0001-data-distribution-strategy.md) | Data Distribution Strategy          | Defines how KJVOnly distributes content through Nostr using manifests, resource identifiers, and pluggable storage strategies.   |
| [0002](./0002-domain-resource-model.md)      | Domain, Resource, and Storage Model | Defines the separation between domains, resources, and storage strategies. Establishes the canonical resource naming convention. |
| [0003](./0003-manifest-events.md)            | Manifest Events                     | Defines manifest events as dataset bootstrap entrypoints and specifies how resources are discovered, loaded, and verified.       |
| [0004](./0004-resource-resolution.md)        | Resource Resolution                 | Defines how clients resolve resources, cache content locally, manage synchronization, and maintain offline-first behavior.       |
| [0005](./0005-resource-discovery.md)         | Resource Discovery                  | Defines trust-based resource discovery using manifests, trusted publishers, and offline-capable manifest caching.                |
| [0006](./0006-resource-versioning.md)        | Resource Versioning                 | Defines stable resource identities, content-based version detection, update behavior, and the resource forking model.            |

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

## Architectural Layers

```text
Nostr Kind (Domain)
        ↓
Resource Identifier
        ↓
Manifest Discovery
        ↓
Resource Resolution
        ↓
Storage Strategy
        ↓
Domain Stores
        ↓
Outbox Synchronization
```

## Current Architecture Summary

```text
Kinds
↓
Define domains

Resources
↓
Identify content

Manifests
↓
Bootstrap datasets

Discovery
↓
Find trusted content

Resolution
↓
Load content

Versioning
↓
Track content changes

Strategies
↓
Determine storage backend

Domain Stores
↓
Render application state

Outbox
↓
Synchronize user changes
```
