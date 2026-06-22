# KJVOnly Data Distribution Strategy

## Goals

* Keep Nostr kinds focused on resource domains, not storage mechanisms.
* Support bootstrapping the app from a single manifest.
* Support both bundle-level and item-level resource distribution.
* Allow resources to be stored in multiple backends (Blossom, event content, future providers).
* Verify integrity using hashes.
* Remain compatible with existing Nostr conventions.

## Kinds

```text
37770 bible resources
37772 annotations
37773 notes
37775 reading plans
37776 subscriptions
37777 completed readings
37778 manifests
```

## Resource Identity

Use parameterized replaceable events with semantic `d` tags.

Resource identifiers follow this convention:

```text
namespace/domain/resource-type/...resource-id
```

Examples:

### Bundle Resources

```text
kjvonly/bible/chapters/kjv
kjvonly/bible/chapters/kjvs

kjvonly/bible/index/default
kjvonly/bible/booknames/default

kjvonly/bible/strongs/default

kjvonly/overlays/paragraphs/default
kjvonly/overlays/pericopes/default

kjvonly/plans/readings/chronological
kjvonly/plans/readings/yearly
```

### Item Resources

```text
kjvonly/bible/chapters/kjv/1_1
kjvonly/bible/chapters/kjv/43_3

kjvonly/overlays/paragraphs/default/1_1
kjvonly/overlays/pericopes/default/1_1
```

This allows resources to exist at different levels of granularity.

For example:

```text
Full Bible:
kjvonly/bible/chapters/kjv

Single Chapter:
kjvonly/bible/chapters/kjv/1_1
```

Ownership is determined by the event pubkey.

The combination of:

```text
pubkey + d
```

acts as the canonical resource identifier.

## Manifest Events

A manifest acts as the bootstrap entrypoint for a dataset.

```text
kind=37778
d=kjvonly/bible/kjv
```

Example:

```json
{
  "name": "KJV Bible",
  "resources": [
    {
      "resource": "kjvonly/bible/chapters/kjv",
      "type": "bible-chapters",
      "strategy": "blossom",
      "url": "https://...",
      "sha256": "..."
    },
    {
      "resource": "kjvonly/overlays/paragraphs/default",
      "type": "paragraphs",
      "strategy": "blossom",
      "url": "https://...",
      "sha256": "..."
    },
    {
      "resource": "kjvonly/overlays/pericopes/default",
      "type": "pericopes",
      "strategy": "blossom",
      "url": "https://...",
      "sha256": "..."
    }
  ]
}
```

A manifest may describe:

```text
An entire Bible dataset
A reading plan
A study guide
A collection of overlays
A collection of individual chapter resources
```

## Strategy Pattern

Resources define how they are loaded.

### Blossom

```json
{
  "strategy": "blossom",
  "url": "https://...",
  "sha256": "..."
}
```

### Event

```json
{
  "strategy": "event"
}
```

A chapter-sized resource may be stored directly in a Nostr event:

```text
kjvonly/bible/chapters/kjv/1_1
```

while a complete Bible may be stored in Blossom:

```text
kjvonly/bible/chapters/kjv
```

Both resources share the same identity model.

Future strategies may include:

```text
blossom
event
http
ipfs
local
```

## Bootstrap Flow

```text
load manifest
↓
iterate resources
↓
resolve strategy
↓
download/load resource
↓
verify hash
↓
store in IndexedDB
```

## Distribution Models

### Offline First

Download an entire dataset.

```text
manifest
↓
bible bundle
↓
paragraph bundle
↓
pericope bundle
↓
store locally
```

### On Demand

Load only what is needed.

```text
manifest
↓
request chapter resource
↓
request paragraph resource
↓
render
```

Both models use the same resource identifier convention.

## Design Notes

* Kinds represent domains, not storage locations.
* Storage is an implementation detail handled by strategies.
* Manifests provide a bootstrap entrypoint for datasets.
* Resources may represent bundles or individual items.
* Resource descriptors should remain NIP-94-inspired where possible.
* Author pubkeys determine ownership and sharing.
* `(pubkey, d)` acts as the canonical resource identifier.
* Resource identity remains stable regardless of storage backend.
* Clients are free to choose between bulk download and lazy loading strategies.
