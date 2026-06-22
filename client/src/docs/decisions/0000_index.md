# ADR Index

| ADR                                          | Title                               | Description                                                                                                                      |
| -------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [0001](./0001-data-distribution-strategy.md) | Data Distribution Strategy          | Defines how KJVOnly distributes content through Nostr using manifests, resource identifiers, and pluggable storage strategies.   |
| [0002](./0002-domain-resource-model.md)      | Domain, Resource, and Storage Model | Defines the separation between domains, resources, and storage strategies. Establishes the canonical resource naming convention. |
| [0003](./0003-manifest-events.md)            | Manifest Events                     | Defines manifest events as dataset bootstrap entrypoints and specifies how resources are discovered, loaded, and verified.       |

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
