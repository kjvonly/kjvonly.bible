# KJVOnly CLI

The KJVOnly CLI normalizes source documents and builds, stages, and publishes application Resources from declarative YAML manifests.

Its publication workflow replaces resource-specific publishing scripts with a generic workflow that can publish different Resource types without adding Bible-, dictionary-, Strong's-, or other domain-specific logic to the publishing code.

The CLI is written in TypeScript and runs on Node.js.


## Recursive Normalized Document import (build/stage)

Import a directory of canonical `.nd.json` Normalized Documents (including
nested directories) into ordinary staged Resource and Filesystem events:

```bash
kjvonly import normalized-documents ./content --manifest ./publication.yaml --root library --output-manifest ./publication.generated.json
```

The configuration-only YAML manifest supplies publication settings (`kind`, `nostr.relays`,
`staging.path`, and optional Blossom strategy). It is still loaded and validated
through the existing manifest loader. The directory importer compiles one
Resource per `.nd.json` file, with a published identity and Filesystem path
that mirror `library/<relative path>`. It then runs the same Manifest build
executor used by `build`.

The input YAML must not contain existing Resource, Collection, or Filesystem
definitions; combining explicit definitions with a separate source-directory
root is deferred to a later slice.

Only `.nd.json` files are imported by this initial command. Other files,
hidden paths, and symlinks are skipped; invalid `.nd.json` documents abort the
batch before any staging begins. An empty selection is an error. Files up to
1 MiB use inline gzip+hex; larger documents require `defaults.strategy` for
the existing object-upload path. The staging directory is resolved relative
to the YAML manifest. A generated publication Manifest is saved as JSON after
successful staging and contains all built Resources, including object-upload
metadata needed for Blossom publication. Each directory import builds in a
private staging generation, seeded from the previously published generation
for signed-event reuse. After the build succeeds, the generated Manifest is
atomically updated to point to the new generation. Failed imports leave the
previous generated Manifest and staged events unchanged. Previous generations
are retained on disk (including orphaned generations from interrupted runs)
until explicitly cleaned up. The original YAML is never rewritten.

This command **stages but does not publish**. Afterwards use:

```bash
kjvonly publish ./publication.generated.json
```

The generalized classifier's optional `.json` structural hints are not yet
part of this initial directory command. Generic file import and other semantic
families remain future work.

For the implemented behavior and longer-term design (clearly distinguished),
see [Filesystem recursive import](docs/filesystem-recursive-import-discovery.md).

### Incremental rebuild and exceptional reprocessing

Normal import builds use each source's **modification time, byte size, and
build-definition revision** (plus signing identity where relevant) to decide
whether a previously signed Resource or staged object artifact can be reused.
Unchanged inputs do **not** require a fresh SHA-256 read of every source file.
Blossom still uses SHA-256 for an artifact when that artifact is actually staged.
Dependent Filesystem events are rebuilt when referenced Resource events change.

This is an intentional fast-path tradeoff: if another tool replaces file contents
while preserving *both* the size and modification time, the CLI may reuse an
older staged event. To request reprocessing in that exceptional case, update
its modification time and rerun import, then **publish the generated Manifest**:

```bash
find ./content -type f -name '*.nd.json' -exec touch {} +
kjvonly import normalized-documents ./content --manifest ./publication.yaml --root library --output-manifest ./publication.generated.json
kjvonly publish ./publication.generated.json
```

The same approach can target a single `.nd.json` file. There is no requirement
for an import-specific `--force` option or mandatory whole-tree source hashing.
Do not delete the staging generation still referenced by the generated Manifest.

### Staging generations and source-backed objects

The generated JSON Manifest is a **local pointer** to the last successful
staging generation, not a record of completed remote publication. Each new
import copies the previous generation for event reuse and switches the pointer
only after a successful build. Previously selected generations are retained;
failed builds discard their unfinished generation. A crash can leave an
unreferenced generation that must be cleaned up manually.

Unencoded Blossom artifacts may be stored as symlinks to the original source
files instead of immutable copies. Keeping an old Manifest and event signatures
does not guarantee that those original bytes remain available after source
changes or deletion. Publish promptly or keep the source tree available;
rebuild and republish after changes. Automatic staging-generation garbage
collection and concurrent-import locking are not part of this command.

See [Filesystem recursive import and discovery](docs/filesystem-recursive-import-discovery.md)
for the implemented boundaries, staging guarantees, tests, and deferred scope.

---

## Mental Model

The most important model to understand is:

```text
Manifest
   ↓
build
   ↓
Local staged deployment state
   ↓
publish
   ↓
Blossom + Nostr
```

The CLI exposes four top-level command families. Parsing is independent of Resource publication:

```text
parse html <directory>
build <manifest>
publish <manifest>
sync <manifest>
import normalized-documents <directory> --manifest <manifest> --root <filesystem-root> --output-manifest <output.json>
```

`parse html` recursively converts supported HTML-family source files into validated `NormalizedDocument` JSON. It does not require a manifest, stage Resources, or publish to Blossom/Nostr. The user can review and organize the resulting files before including them in a manifest. See [Normalized Content Parsing](docs/normalized-content-parsing.md) for the conversion contract and options.

The manifest-driven publication commands are:

```text
build
    → reads sources
    → creates artifacts and/or Nostr events
    → signs events
    → writes local staging

publish
    → reads existing staging
    → preflights required endpoints
    → publishes missing Blossom artifacts
    → reconciles Nostr event IDs
    → publishes missing signed events

sync
    → build
    → publish
```

`build` and `publish` are intentionally separate.

`publish` does not silently rebuild source content. The staged state produced by `build` is the state being published.

For most automated publishing workflows, `sync` is the expected command.

---

## Resource Build Paths

A manifest Resource follows one of two build paths.

### Inline Resource

A Resource without `object-upload` places the source content directly into the Nostr event.

```text
Source
   ↓
encoding
   ↓
Nostr event
   ↓
sign
   ↓
staged event
```

### Descriptor-Backed Resource

A Resource with `object-upload` publishes the content externally and puts a `ResourceDescriptor` into the Nostr event.

```text
Source
   ↓
artifact staging
   ↓
SHA-256 + size
   ↓
publication strategy
   ↓
ResourceDescriptor
   ↓
descriptor event
   ↓
sign
   ↓
staged event
```

For the currently supported Blossom strategy:

```text
ResourceDescriptor
    strategy.type = blossom

    strategy.data
        urls[]
        sha256
        size
```

The artifact and the Nostr descriptor event are separate pieces of deployment state.

---

## Collections

Collections group descriptors generated by multiple manifest Resources.

For example:

```text
KJV Resource
    ↓
KJV descriptor ─────┐
                    │
                    ├── Bible Chapters Collection
                    │
KJVS descriptor ────┘
    ↑
KJVS Resource
```

A Collection references manifest Resource names:

```yaml
collections:
  bible-chapters:
    event:
      encoding:
        - hex

      tags:
        - ["d", "kjvonly/resources/collections/bible-chapters"]
        - ["m", "application/json+hex"]
        - ["t", "resource/descriptor-collection"]
        - ["dataType", "kjvonly.resource-descriptor-collection"]
        - ["dataVersion", "1"]
        - ["representation", "descriptors"]

    resources:
      - bible-bundle-kjv
      - bible-bundle-kjvs
```

The resulting Collection event contains the generated descriptors in deterministic manifest order.

Collection staging records a semantic input revision over the signer, event definition, and ordered descriptor payload. An unchanged Collection therefore reuses the exact previously signed event; a changed Resource descriptor or nested Collection event produces a new Collection revision. Legacy pre-reuse Collection staging remains readable and is migrated on the next build.

Collections are assembly definitions. They are not another Resource representation.

---

## Filesystems

Filesystems are a third manifest assembly category. They build ordinary `representation = content` Resources whose semantic payload maps complete filesystem paths to deferred `ResourceDescriptor` values.

Build category order is explicit:

```text
Resources
    ↓
Collections
    ↓
Filesystems
```

A Filesystem definition chooses a root and explicitly places named Resources or Collections beneath it. `root` is emitted as Resource metadata `f`; `d` remains the independent Resource identity.

Example:

```yaml
filesystems:
  library:
    root: library

    event:
      encoding:
        - hex
      tags:
        - ["d", "kjvonly/filesystem/library"]
        - ["m", "application/json+hex"]
        - ["t", "filesystem/entry"]
        - ["dataType", "kjvonly.filesystem.entries"]
        - ["dataVersion", "1"]
        - ["representation", "content"]

    directories:
      - path: bible/chapters
        resources:
          kjvs:
            resource: bible-chapters-kjvs

      - path: bootstrap
        collections:
          defaults:
            collection: application-defaults
```

Resource placement without `key` expands every staged concrete key under `<placement>/<key>`. Supplying `key` selects exactly one staged Resource and places it at the placement basename. Collection placement always refers to the Collection Resource itself.

Generated payload keys are complete paths including the root. The builder rejects paths equal to the root, paths outside the root, exact collisions, and file/directory prefix collisions before signing the Filesystem Resource.

Filesystem omission is not deletion on the client: a later overlay that omits a mapping does not delete previously accepted Filesystem state.

---

# Getting Started

## Install

The CLI lives in the `client` npm workspace:

```text
client/
├── kjvonly-pwa/
├── cli/
└── packages/
    └── normalized-content/
```

Install workspace dependencies from `client/`:

```bash
npm install
```

Then:

```bash
cd cli
```

## Build

```bash
npm run build
```

The build first builds the shared `@kjvonly/normalized-content` package and removes stale CLI `dist` output before TypeScript compilation. Compiled output is written to:

```text
dist/
```

The CLI entry point is:

```text
dist/main.js
```

## Test

Run the complete CLI test suite:

```bash
npm run test
```

During development, the normal verification command is:

```bash
npm run test && npm run build
```

---

# Running the CLI

After building:

```bash
node dist/main.js --help
```

## Normalize HTML Source Files

```bash
node dist/main.js parse html ./sermons --root-selector '#content'
```

Recursively converts `.html`, `.htm`, and `.cfm` source documents to adjacent `NormalizedDocument` JSON files, without publishing them. Output files are protected from replacement unless `--overwrite` is supplied. Parsing failures are reported per file. See [Normalized Content Parsing](docs/normalized-content-parsing.md) for extraction, diagnostics, and output safety details.

## Build Only

```bash
node dist/main.js build path/to/manifest.yaml
```

Builds and stages the desired local publication state without performing network publication.

## Publish Existing Staging

```bash
node dist/main.js publish path/to/manifest.yaml
```

Publishes the already-staged state.

It does not rebuild the Resource sources first.

## Build and Publish

```bash
node dist/main.js sync path/to/manifest.yaml
```

Equivalent conceptually to:

```text
build
  ↓
publish
```

---

# Signing

Nostr events are signed using the runtime environment variable:

```text
NOSTR_SECRET_KEY
```

For example:

```bash
export NOSTR_SECRET_KEY="$(cat ~/.config/nostr/dev.key)"
```

The signing secret is intentionally handled separately from normal manifest template configuration.

Do not place `NOSTR_SECRET_KEY` inside a manifest or expose it to manifest templating.

---

# Manifests

The CLI currently accepts manifest version:

```yaml
version: 1
```

A typical manifest contains:

```yaml
version: 1

kind: 37770

staging:
  path: ./.kjvonly

nostr:
  relays:
    - ws://localhost:3334

defaults:
  strategy: local

strategies:
  local:
    type: blossom
    urls:
      - http://localhost:3335

resources:
  # Resource definitions

collections:
  # Collection definitions

filesystems:
  # Filesystem overlay definitions
```


Resource events use an explicit envelope. Every Resource, Collection, and Filesystem event must contain exactly one of each:

```text
d
m
t
dataType
dataVersion
representation
```

These fields intentionally describe different concerns:

```text
d
    Resource identity

t
    Resource/application type

dataType + dataVersion
    semantic payload contract

representation + m
    how that Resource is represented and encoded
```

Resource Type and datatype are **not aliases**. A Bible Chapter Resource demonstrates the distinction:

```text
t        = bible/chapter
dataType = kjvonly.bible.chapter
```

The Resource Type says what application object/concept the Resource represents. The datatype says what semantic structure the payload represents and therefore which semantic validator can understand it.

`dataVersion` is a positive integer encoded as a Nostr tag string. Additional scalar tags are Resource metadata. Generic CLI code preserves them without assigning Domain meaning. For descriptor-backed Resources, those tags are copied into `ResourceDescriptor.resourceMetadata` so they survive deferred resolution. Bible Chapter Resources, for example, publish `version` separately from Resource identity and datatype.

Relative `staging.path` and Resource paths are resolved relative to the manifest file, not the shell's current working directory.

This allows manifests to remain portable regardless of where the CLI command is invoked.

## Example Descriptor-Backed Resource

```yaml
resources:
  bible-bundle-kjv:
    path: ../../data/json.gz/kjv.json.gz

    event:
      encoding:
        - hex

      tags:
        - ["d", "kjvonly/bible/chapter/kjv"]
        - ["m", "application/json+hex"]
        - ["t", "bible/chapter"]
        - ["dataType", "kjvonly.bible.chapter"]
        - ["dataVersion", "1"]
        - ["representation", "descriptors"]
        - ["version", "kjv"]

    object-upload:
      mediaType: application/json+gzip
      encoding: []
```

`event.encoding` and `object-upload.encoding` are independent.

For example:

```text
object-upload.encoding: []
    → preserve the existing .json.gz artifact bytes

event.encoding:
    - hex
    → hex encode the descriptor JSON placed into the Nostr event
```

---

# Staging

`build` creates the current desired local deployment state under the manifest's staging root.

Conceptually:

```text
.kjvonly/
├── artifacts/
└── events/
```

Resource, Collection, and Filesystem manifest names participate directly in this staging layout. They must therefore be staging-safe logical names: one visible path segment, at most 128 UTF-8 bytes, not dot-prefixed, and not a reserved generated-directory name. The reserved names are currently `__collections__` and `__filesystems__`.

Resource names create namespaces beneath those directories.

Example:

```text
.kjvonly/
├── artifacts/
│   ├── bible-bundle-kjv/
│   └── bible-bundle-kjvs/
│
└── events/
    ├── __collections__/
    ├── __filesystems__/
    ├── bible-bundle-kjv/
    └── bible-bundle-kjvs/
```

Staging represents **current desired state**, not publication history.

Incremental builds attempt to reuse unchanged state.

For inline and descriptor-backed Resources, source mtime, byte size,
source/definition revisions, and signing identity where applicable determine
when rebuilding is required. Matching metadata intentionally allows signed
Resource event and artifact reuse without rereading and hashing every file.

Identity object uploads may be staged as symlinks to mutable sources. Byte-changing transformations are staged as materialized files. Reusing a signed event is separate from checking whether the relay already has that event.

---

# Publication

Publication follows a few important rules.

## Preflight Before Mutation

All required endpoints are checked before normal publication begins.

This includes:

```text
Nostr relays
Blossom servers
```

The current policy is strict: every configured target is required.

## Publication Order

Publication order is:

```text
Blossom artifacts
       ↓
ordinary Resource Nostr events
       ↓
Collection Nostr events
       ↓
Filesystem Nostr events
```

This orders broad publication categories so referenced artifacts and earlier Resource categories are attempted first. The application publisher owns the Nostr category order; staging adapters do not. This is not a complete dependency/topological sort among events inside one category.

## Nostr Reconciliation

Nostr publication is reconciled by event ID.

```text
local staged event IDs
        ↓
NIP-77 / Negentropy
        ↓
missing event IDs
        ↓
read only missing staged events
        ↓
publish exact signed events
```

The CLI does not rebuild or re-sign an event during publication.

The exact signed event created during `build` is what gets published.

Relay authentication uses NIP-42 when required.

Remote-only events are ignored by ordinary publication; the CLI is reconciling whether its desired local events are present, not mirroring the entire relay.

---

# Verbose Logging

Use `-v` to emit structured execution tracing:

```bash
node dist/main.js sync -v path/to/manifest.yaml
```

Raw logs intentionally use one event per line:

```text
[verbose] build.resource.start {"resourceName":"..."}
[verbose] artifact.reused {"resourceName":"...","sha256":"..."}
[verbose] nostr.reconcile.complete {"relay":"...","missingCount":0}
```

This format is designed to remain machine-, grep-, and pipe-friendly.

For a more readable hierarchical view:

```bash
node dist/main.js sync -v path/to/manifest.yaml \
  | node scripts/format-verbose-log.mjs
```

To preserve the raw trace while viewing the formatted output:

```bash
node dist/main.js sync -v path/to/manifest.yaml \
  | tee /tmp/kjvonly-verbose.log \
  | node scripts/format-verbose-log.mjs
```

Never add secrets, source payloads, event content, AUTH signatures, or complete signed events to verbose logs.

---

# Repository Structure

The source tree follows explicit architectural boundaries:

```text
src/
├── main.ts
├── cli/
├── composition/
├── application/
├── domain/
├── ports/
└── adapters/
```

The important mental model is:

```text
CLI
 ↓
Application
 ↓
Domain + Ports
 ↑
Adapters

Composition wires everything together.
```

This is not intended to be a rigid framework. The boundaries exist primarily to keep publishing policy separate from filesystem, network, signing, and protocol mechanics.

## `cli/`

Command-line parsing and invocation.

Command handlers should remain thin:

```text
parse arguments
    ↓
invoke application use case
```

Do not implement publication behavior directly in command handlers.

## `application/`

Application workflows and publishing policy.

The top level follows the command model:

```text
application/
├── build/
├── parse/
├── publish/
└── sync/
```

### Parse

`application/parse/` owns batch conversion, HTML interpretation, and import-only diagnostics. The canonical `NormalizedDocument` contract and validation live in the shared `@kjvonly/normalized-content` package, not in the CLI parser. Parsing does not invoke Resource staging or publication.

### Build

```text
application/build/
├── artifact/
├── collection/
├── descriptor/
├── encoding/
├── filesystem/
├── inline/
└── source/
```

These folders correspond to the major stages of constructing local deployment state.

### Publish

```text
application/publish/
├── blossom/
├── nostr/
└── preflight/
```

These services decide what should be published and in what order.

Protocol and network mechanics belong in adapters rather than here.

## `domain/`

Pure publication concepts and deterministic models.

Examples include:

```text
Manifest
ConcreteSource
ResourceDescriptor
Nostr event models
staging filename models
definition revisions
publication results
```

Domain code should remain IO-free where practical.

## `ports/`

Interfaces representing meaningful external boundaries.

Examples:

```text
SourceRepository
ManifestLoader
EventSigner
ByteEncoder
staging repositories
BlossomPublicationClient
NostrEventPublisher
NostrRelayReconciler
Logger
Clock
```

A port should represent a real ownership or testing boundary. Do not introduce interfaces simply to mirror every class.

## `adapters/`

Concrete infrastructure implementations.

Examples:

```text
Node filesystem
YAML/Nunjucks manifest loading
gzip/hex encoding
Blossom HTTP
Nostr signing
NIP-42 authentication
NIP-77 / Negentropy
Nostr event publication
staging repositories
console logging
```

Nostr-specific adapters are further organized by responsibility:

```text
adapters/nostr/
├── auth/
├── negentropy/
├── publication/
├── relay/
└── signer/
```

Adapters own infrastructure mechanics, not application policy.

## `composition/`

The composition root constructs the object graph.

This is where concrete adapters are selected and registered.

If a new implementation satisfies an existing port, this is usually where it enters the running application.

---

# Imports

Cross-boundary imports use stable Node package namespaces:

```ts
import type {
	Manifest
} from '#domain/manifest/manifest.js';

import type {
	Logger
} from '#ports/logging/logger.js';

import {
	NodeSourceRepository
} from '#adapters/source/node-source-repository.js';
```

Nearby files within the same feature may continue to use relative imports.

A useful rule is:

```text
same local feature
    → relative import

cross major architectural boundary
    → # namespace
```

Avoid introducing long chains such as:

```text
../../../../ports/...
```

when a stable namespace exists.

---

# Adding Features

Before adding a class, first decide **which responsibility owns the behavior**.

A useful question is:

> Is this publication policy, a pure model, an external contract, or an infrastructure implementation?

That usually identifies the correct folder.

## Add a New Encoding

A new byte transform should normally:

1. implement the `ByteEncoder` port,
2. live under `adapters/encoding/`,
3. be registered with the encoding registry in the composition root,
4. include focused unit tests.

Do not add encoding-specific conditionals throughout Resource builders.

## Add a New Publication Strategy

A new external ResourceDescriptor strategy should normally require:

```text
strategy adapter
+
composition registration
+
manifest/schema support
```

The goal is to avoid spreading strategy-specific checks throughout application services.

## Add a New Nostr Capability

Protocol mechanics belong under:

```text
adapters/nostr/
```

Application code should depend on the relevant Nostr port rather than `nostr-tools` directly.

Keep distinctions such as:

```text
relay connection
authentication
Negentropy reconciliation
event publication
```

visible rather than collapsing them into one generic `NostrService`.

## Add a New CLI Command

A command should remain an interface over application behavior.

Prefer:

```text
CLI command
    ↓
new or existing application use case
```

rather than putting filesystem/network logic into `create-cli.ts`.

---

# Development Guidelines

A few conventions are important when extending the CLI.

### Keep generic code generic

The CLI should not contain special cases for:

```text
Bible
Strong's
dictionaries
reading plans
or another particular Resource type
```

Resource-specific deployment policy belongs in manifests.

### Preserve build/publish separation

Do not make `publish` rebuild sources.

Do not make a network publisher regenerate or re-sign staged events.

### Preserve exact staged events

A staged signed event is complete publication state.

Publication should transmit that exact event.

### Keep external effects behind boundaries

Filesystem, network, clock, signing, and protocol behavior should remain outside pure domain logic and behind meaningful ports where appropriate.

### Prefer focused services

Avoid catch-all abstractions such as:

```text
FileSystemService
NostrService
ResourceEverythingService
```

The current organization intentionally keeps responsibilities visible.

### Keep tests beside implementations

Specs live beside the implementation they primarily exercise:

```text
foo.ts
foo.spec.ts
```

When changing behavior, update or add the focused spec in the same area.

---

# Common Development Workflow

After making a change:

```bash
npm run test && npm run build
```

For publication-related changes, also exercise a real manifest when appropriate:

```bash
node dist/main.js build -v path/to/manifest.yaml

node dist/main.js sync -v path/to/manifest.yaml \
  | node scripts/format-verbose-log.mjs
```

When debugging publication, inspect the staged state before assuming the network layer is responsible:

```text
Manifest
  ↓
source expansion
  ↓
staging
  ↓
preflight
  ↓
Blossom
  ↓
Nostr reconciliation/publication
```

The verbose trace is intentionally organized around those seams.

---

# Summary

The shortest useful model for this repository is:

```text
Manifest describes publication intent.

build converts that intent into signed local staged state.

publish reconciles that staged state with external targets.

sync composes build and publish.

Resources produce content events or descriptors.

Collections aggregate Resource descriptors.

Filesystems map full application-visible paths to descriptors for already-built Resources and Collections.

Application code owns workflow and policy.

Ports define external boundaries.

Adapters implement infrastructure mechanics.

Composition selects implementations.

The CLI stays thin and generic.
```

If a new feature preserves those boundaries, it will usually fit naturally into the existing codebase.
