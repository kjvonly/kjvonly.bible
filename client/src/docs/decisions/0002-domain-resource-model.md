# Domain, Resource, and Storage Model

## Overview

KJVOnly separates three concepts:

1. Domain
2. Resource
3. Storage Strategy

These concepts should remain independent.

## Domain

A domain represents a category of data.

Domains map directly to Nostr kinds.

```ts
export const BIBLE_KIND = 37770

export const ANNOTATIONS_KIND = 37772
export const NOTES_KIND = 37773

export const PLANS_KIND = 37775
export const SUBSCRIPTIONS_KIND = 37776
export const COMPLETED_READINGS_KIND = 37777

export const MANIFEST_KIND = 37778
```

Examples:

```text
Bible
Plans
Notes
Annotations
Subscriptions
Completed Readings
```

Kinds describe what a thing is.

Kinds do not describe where data is stored.

## Resource

A resource is a specific piece of content within a domain.

Resources are identified using the `d` tag.

Examples:

```text
kjvonly/bible/kjv/chapters
kjvonly/bible/kjvs/chapters

kjvonly/bible/kjvs/paragraphs
kjvonly/bible/kjvs/pericopes
kjvonly/bible/kjvs/search
kjvonly/bible/strongs/all

kjvonly/plans/readings/chronological
kjvonly/plans/readings/yearly
```

The combination of:

```text
pubkey + d
```

acts as the canonical resource identifier.

## Storage Strategy

Storage is an implementation detail.

A resource may be stored:

```text
Inside the event content
In Blossom
In IPFS
In another backend
```

The resource itself should not care.

Instead, the client resolves a storage strategy.

Examples:

```json
{
  "strategy": "blossom",
  "url": "https://...",
  "sha256": "..."
}
```

```json
{
  "strategy": "event"
}
```

Future strategies:

```text
event
blossom
ipfs
local
http
```

## Manifests

Manifests provide a bootstrap mechanism for datasets.

Example:

```text
kind=37778
d=kjvonly/bible/kjvs
```

Manifest content:

```json
{
  "resources": [
    {
      "type": "chapters",
      "strategy": "blossom",
      "url": "...",
      "sha256": "..."
    },
    {
      "type": "paragraphs",
      "strategy": "blossom",
      "url": "...",
      "sha256": "..."
    }
  ]
}
```

The client loads a manifest first, then resolves each resource.

## Client Flow

```text
Load manifest
↓
Enumerate resources
↓
Resolve storage strategy
↓
Download or load resource
↓
Verify integrity
↓
Store in IndexedDB
```

## Design Rules

* Kinds represent domains.
* `d` tags represent resources.
* Storage is not encoded in kinds.
* Storage is resolved through strategies.
* Manifests are bootstrap entrypoints.
* Resource ownership is determined by event pubkey.
* Resource integrity is verified using hashes.
