# 0003 Manifest Events

## Status

Proposed

## Context

KJVOnly needs a way to bootstrap larger datasets from Nostr.

Some resources are too large to store directly in event content, so they are stored in Blossom. Nostr should still provide discovery, authorship, and integrity metadata.

## Decision

Use manifest events as bootstrap entrypoints.

A manifest event describes a dataset and lists the resources required to load it.

```ts
export const MANIFEST_KIND = 37778
```

The manifest kind does not mean "Blossom". It means "dataset manifest".

Storage is handled per resource using a strategy.

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

```json
{
  "name": "KJV Bible",
  "version": "kjv",
  "resources": [
    {
      "id": "bibleindex",
      "type": "bible-index",
      "strategy": "blossom",
      "file": "bibleindex.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    },
    {
      "id": "booknames",
      "type": "book-names",
      "strategy": "blossom",
      "file": "booknames.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    },
    {
      "id": "kjv",
      "type": "bible-chapter",
      "strategy": "blossom",
      "file": "kjv.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    },
    {
      "id": "paragraphs",
      "type": "paragraphs",
      "strategy": "blossom",
      "file": "paragraphs.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    },
    {
      "id": "pericopes",
      "type": "pericopes",
      "strategy": "blossom",
      "file": "pericopes.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    },
    {
      "id": "strongs",
      "type": "strongs",
      "strategy": "blossom",
      "file": "strongs.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    }
  ]
}
```

For the KJV with Strong's dataset:

```json
{
  "name": "KJV Bible with Strong's Concordance",
  "version": "kjvs",
  "resources": [
    {
      "id": "kjvs",
      "type": "bible-chapter",
      "strategy": "blossom",
      "file": "kjvs.json.gz",
      "m": "application/gzip",
      "url": "http://localhost:3335/<sha256>.gz",
      "sha256": "<sha256>"
    }
  ]
}
```

## Resource Fields

| Field      | Description                                    |
| ---------- | ---------------------------------------------- |
| `id`       | Stable resource identifier inside the manifest |
| `type`     | Logical resource type                          |
| `strategy` | Loader strategy, such as `blossom`             |
| `file`     | Original filename                              |
| `m`        | MIME type                                      |
| `url`      | Location of the resource                       |
| `sha256`   | Expected content hash                          |

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

## Design Rules

* Manifest events describe datasets.
* Manifest kind does not imply Blossom.
* Storage strategy is declared per resource.
* Every remote resource must include a hash.
* Clients must verify downloaded resources before storing them.
* Resource types should be stable and independent of filenames.

## Consequences

* The app can bootstrap from one Nostr event.
* Storage backends can change without changing domain kinds.
* Blossom remains an implementation detail.
* New resources can be added without creating new kinds.
* Clients can selectively download resources.
