# 0003 Manifest Events

## Status

Proposed

## Context

KJVOnly needs a way to bootstrap larger datasets from Nostr.

Some resources are too large to store directly in event content, so they are stored in Blossom. Nostr should still provide discovery, authorship, and integrity metadata.

As the platform evolves, resources may be stored in multiple backends. Storage location should not be encoded into Nostr kinds.

Resources should be independently identifiable, reusable, composable across datasets, and distributable at different levels of granularity.

For example:

```text
Full Bible:
kjvonly/bible/chapters/kjv

Single Chapter:
kjvonly/bible/chapters/kjv/1_1
```

Both should be valid resources that follow the same naming convention.

## Decision

Use manifest events as bootstrap entrypoints.

A manifest event describes a dataset and lists the resources required to load it.

```ts
export const MANIFEST_KIND = 37778
```

The manifest kind does not mean "Blossom". It means "dataset manifest".

Storage is handled per resource using a strategy.

Resources are identified using the canonical resource naming convention:

```text
namespace/domain/resource-type/...resource-id
```

Examples:

```text
kjvonly/bible/chapters/kjv
kjvonly/bible/chapters/kjvs

kjvonly/bible/chapters/kjv/1_1
kjvonly/bible/chapters/kjv/43_3

kjvonly/bible/index/default
kjvonly/bible/booknames/default

kjvonly/bible/strongs/default

kjvonly/overlays/paragraphs/default
kjvonly/overlays/pericopes/default

kjvonly/overlays/paragraphs/default/1_1
kjvonly/overlays/pericopes/default/1_1

kjvonly/plans/readings/chronological
```

Everything after `resource-type` is considered part of the resource identity.

The combination of:

```text
pubkey + resource
```

acts as the canonical identifier for a resource.

## Event Shape

Example manifest for the KJV Bible dataset:

```json
{
  "kind": 37778,
  "pubkey": "<publisher-pubkey>",
  "tags": [
    ["d", "kjvonly/bible/kjv"],
    ["app", "kjvonly"],
    ["domain", "bible"],
    ["version", "kjv"]
  ],
  "content": "{...manifest-json...}"
}
```

## Manifest Content

### KJV Bible

```json
{
  "name": "KJV Bible",
  "version": "kjv",
  "resources": [
    {
      "resource": "kjvonly/bible/index/default",
      "type": "bible-index",
      "strategy": "blossom",
      "file": "bibleindex.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    },
    {
      "resource": "kjvonly/bible/booknames/default",
      "type": "booknames",
      "strategy": "blossom",
      "file": "booknames.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    },
    {
      "resource": "kjvonly/bible/chapters/kjv",
      "type": "bible-chapters",
      "strategy": "blossom",
      "file": "kjv.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    },
    {
      "resource": "kjvonly/overlays/paragraphs/default",
      "type": "paragraphs",
      "strategy": "blossom",
      "file": "paragraphs.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>",
      "appliesTo": ["kjv", "kjvs"]
    },
    {
      "resource": "kjvonly/overlays/pericopes/default",
      "type": "pericopes",
      "strategy": "blossom",
      "file": "pericopes.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>",
      "appliesTo": ["kjv", "kjvs"]
    }
  ]
}
```

### KJV Bible with Strong's Concordance

```json
{
  "name": "KJV Bible with Strong's Concordance",
  "version": "kjvs",
  "resources": [
    {
      "resource": "kjvonly/bible/chapters/kjvs",
      "type": "bible-chapters",
      "strategy": "blossom",
      "file": "kjvs.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    },
    {
      "resource": "kjvonly/bible/strongs/default",
      "type": "strongs",
      "strategy": "blossom",
      "file": "strongs.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>",
      "appliesTo": ["kjvs"]
    },
    {
      "resource": "kjvonly/overlays/paragraphs/default",
      "type": "paragraphs",
      "strategy": "blossom",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>",
      "appliesTo": ["kjv", "kjvs"]
    },
    {
      "resource": "kjvonly/overlays/pericopes/default",
      "type": "pericopes",
      "strategy": "blossom",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>",
      "appliesTo": ["kjv", "kjvs"]
    }
  ]
}
```

### Chapter-Level Distribution

A manifest may also reference individual chapter resources.

Example:

```json
{
  "resource": "kjvonly/bible/chapters/kjv/1_1",
  "type": "bible-chapters",
  "strategy": "event"
}
```

This allows clients to load only the resources they need.

## Resource Fields

| Field       | Description                         |
| ----------- | ----------------------------------- |
| `resource`  | Canonical resource identifier       |
| `type`      | Logical resource type               |
| `strategy`  | Loader strategy                     |
| `file`      | Original filename                   |
| `m`         | MIME type                           |
| `url`       | Resource location                   |
| `sha256`    | Expected content hash               |
| `appliesTo` | Optional list of supported versions |

## Resource Naming Convention

Resources follow:

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
```

### Item Resources

```text
kjvonly/bible/chapters/kjv/1_1
kjvonly/bible/chapters/kjv/43_3

kjvonly/overlays/paragraphs/default/1_1
kjvonly/overlays/pericopes/default/1_1
```

The final path segments collectively form the resource identity.

Examples:

```text
resource-type = chapters
resource-id   = kjv
```

```text
resource-type = chapters
resource-id   = kjv/1_1
```

This allows a resource to represent either:

```text
A complete dataset
A single chapter
A paragraph overlay
A pericope overlay
A reading plan
A study guide
A user-created resource
```

## Applicability

Resources may be reusable across multiple Bible versions.

Example:

```json
{
  "appliesTo": ["kjv", "kjvs"]
}
```

Applicability is metadata and should not be encoded into the resource identifier.

## Client Flow

```text
query manifest event
parse manifest content

for each resource:
  choose strategy
  download resource
  verify sha256
  decompress if needed
  store in IndexedDB
```

## Distribution Models

### Offline First

```text
manifest
↓
download bundle resources
↓
store locally
```

Example:

```text
kjvonly/bible/chapters/kjv
kjvonly/overlays/paragraphs/default
kjvonly/overlays/pericopes/default
```

### On Demand

```text
manifest
↓
request individual resources
↓
render
```

Example:

```text
kjvonly/bible/chapters/kjv/1_1
kjvonly/overlays/paragraphs/default/1_1
kjvonly/overlays/pericopes/default/1_1
```

## Design Rules

* Manifest events describe datasets.
* Manifest kind does not imply Blossom.
* Resource identifiers are canonical and globally meaningful.
* Resource identifiers follow the format:
  `namespace/domain/resource-type/...resource-id`
* Everything after `resource-type` is part of the resource identity.
* Resources may represent bundles or individual items.
* Storage strategy is declared per resource.
* Applicability is metadata, not part of the resource identifier.
* Every remote resource must include a hash.
* Clients must verify downloaded resources before storing them.
* Resource types should be stable and independent of filenames.
* Storage backends can change without changing resource identifiers.

## Consequences

* The app can bootstrap from one Nostr event.
* Storage backends can change without changing domain kinds.
* Blossom remains an implementation detail.
* Resources can be shared across multiple Bible datasets.
* New resources can be added without creating new kinds.
* Clients can selectively download resources.
* Overlay resources can be reused across Bible versions.
* Full datasets and individual chapters can coexist.
* Future storage strategies can be introduced without modifying resource identifiers.
