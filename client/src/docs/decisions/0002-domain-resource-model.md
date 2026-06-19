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

Resource identifiers follow this convention:

```text
namespace/domain/resource-type/resource-id
```

Examples:

```text
kjvonly/bible/chapters/kjv
kjvonly/bible/chapters/kjvs

kjvonly/bible/index/default
kjvonly/bible/booknames/default

kjvonly/overlays/paragraphs/default
kjvonly/overlays/pericopes/default

kjvonly/plans/readings/chronological
kjvonly/plans/readings/yearly
```

The segments have the following meaning:

```text
kjvonly/bible/chapters/kjv

namespace     = kjvonly
domain        = bible
resource-type = chapters
resource-id   = kjv
```

```text
kjvonly/overlays/pericopes/90-day-reading

namespace     = kjvonly
domain        = overlays
resource-type = pericopes
resource-id   = 90-day-reading
```

The final segment is the resource identity.

It may represent:

```text
A Bible version
A reading plan
A paragraph scheme
A pericope scheme
A study guide
A user-created resource
```

It is not limited to version identifiers.

The combination of:

```text
pubkey + d
```

acts as the canonical resource identifier.

## Applicability

Resources may be reusable across multiple Bible versions.

For example:

```text
kjvonly/overlays/paragraphs/default
```

may apply to both:

```text
kjv
kjvs
```

Applicability should be stored as metadata rather than encoded into the resource identifier.

Example:

```json
{
  "appliesTo": ["kjv", "kjvs"]
}
```

This allows overlays and other resources to be shared across datasets.

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
d=kjvonly/bible/kjv
```

Manifest content:

```json
{
  "resources": [
    {
      "type": "chapters",
      "resource": "kjvonly/bible/chapters/kjv",
      "strategy": "blossom",
      "url": "...",
      "sha256": "..."
    },
    {
      "type": "paragraphs",
      "resource": "kjvonly/overlays/paragraphs/default",
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
* Resource identifiers follow the format:
  `namespace/domain/resource-type/resource-id`
* Resource applicability is metadata.
* Storage is not encoded in kinds.
* Storage is resolved through strategies.
* Manifests are bootstrap entrypoints.
* Resource ownership is determined by event pubkey.
* Resource integrity is verified using hashes.
* Resource identifiers should describe logical content, not filesystem layout.
