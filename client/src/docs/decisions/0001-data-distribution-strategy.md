# KJVOnly Data Distribution Strategy

## Goals

* Keep Nostr kinds focused on resource domains, not storage mechanisms.
* Support bootstrapping the app from a single manifest.
* Allow resources to be stored in multiple backends (Blossom, event content, future providers).
* Verify integrity using hashes.
* Remain compatible with existing Nostr conventions.

## Kinds

```text
37770 bible resources
37775 reading plans
37776 notes
37777 annotations
37779 manifests
```

## Resource Identity

Use parameterized replaceable events with semantic `d` tags:

```text
kjvonly/bible/kjv/chapters
kjvonly/bible/kjvs/chapters
kjvonly/bible/kjvs/pericopes
kjvonly/bible/kjvs/paragraphs
kjvonly/bible/strongs/all

kjvonly/plans/readings/chronological
kjvonly/plans/readings/yearly
```

Ownership is determined by the event pubkey.

## Manifest Events

A manifest acts as the bootstrap entrypoint for a dataset.

```text
kind=37779
d=kjvonly/bible/kjvs
```

Example:

```json
{
  "resources": [
    {
      "type": "chapters",
      "strategy": "blossom",
      "url": "https://...",
      "sha256": "..."
    },
    {
      "type": "paragraphs",
      "strategy": "blossom",
      "url": "https://...",
      "sha256": "..."
    },
    {
      "type": "pericopes",
      "strategy": "blossom",
      "url": "https://...",
      "sha256": "..."
    }
  ]
}
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
  "strategy": "event",
  "event": "<event-id>"
}
```

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

## Design Notes

* Kinds represent domains, not storage locations.
* Storage is an implementation detail handled by strategies.
* Manifests provide a single bootstrap entrypoint.
* Resource descriptors should remain NIP-94-inspired where possible.
* Author pubkeys determine ownership and sharing.
* `(pubkey, d)` acts as the canonical resource identifier.
