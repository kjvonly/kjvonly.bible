# Resource Publishing CLI

## Status

**Status:** Captured Implementation Record with current deltas
**Last full historical capture:** 2026-09-08
**Current-source verification:** 2026-10-06 for Resource contracts and Filesystem overlay support
**Scope:** Manifest-driven Resource build, staging, Blossom publication, Nostr reconciliation/publication, Collections, Filesystem overlays, logging, and repository integration

This document consolidates the captured Resource Publishing CLI design and implementation state from:

```text
20260903-kjvonly-resource-publishing-cli-design-spec.md
20260905-kjvonly-resource-publishing-cli-implementation-and-integration-spec.md
20260908-kjvonly-resource-publishing-cli-implementation-and-integration-spec.md
```

The September 8 capture explicitly superseded the September 5 implementation snapshot and is therefore the primary source for the implementation details below.

Most sections below intentionally preserve the September 8 captured implementation record. Current deltas are called out explicitly where later source has been re-verified rather than silently rewriting historical behavior.

## 2026-10-04 Resource Contract Delta

The application Resource contract has moved beyond the September capture in several important ways. Before publishing the next Resource set, the CLI manifests/source must be verified and updated to emit the current contract.

For a Bible Chapter Resource, the target envelope is now:

```text
d = kjvonly/bible/chapter/kjvs/<chapterRef>
t = bible/chapter
dataType = kjvonly.bible.chapter
dataVersion = 1
version = kjvs
representation = content
```

The fields have separate responsibilities:

```text
d / resourceId
    = publisher-controlled Resource ID; generic consumers treat it as opaque

t / resourceType
    = canonical application Resource Type used for routing/ownership

dataType + dataVersion
    = semantic payload contract used for parsing/validation

other scalar tags such as version
    = Domain-owned Resource metadata
```

Current application Resource Types include:

```text
bible/chapter
bible/booknames
bible/paragraphs
bible/pericopes
bible/search-index
bible/text-markup
strongs/definition
reading-plans/plan-definition
reading-plans/plan-subscription
reading-plans/plan-progress
notes/note
filesystem/entry
normalized-content/document
```

There is no separate Resource `category` concept. Resource Type and semantic datatype must not be conflated, and Resource Type must not be inferred from the `d` path.

Current CLI source and the smoke manifest have been source-verified against this Resource contract, and the Filesystem smoke graph has been published successfully. The historical sections below remain the September capture and intentionally retain their original examples.

---

## 2026-10-06 Filesystem Overlay Delta

Current CLI source adds a third top-level manifest assembly category:

```text
resources
collections
filesystems
```

Current build order is:

```text
Resources
    ↓
Collections
    ↓
Filesystems
```

A Filesystem definition builds an ordinary Resource with:

```text
t = filesystem/entry
dataType = kjvonly.filesystem.entries
dataVersion = 1
representation = content
f = <manifest root>
```

Its decoded semantic content is:

```text
complete filesystem path → ResourceDescriptor
```

`d/resourceId` identifies the Filesystem Resource; `f` identifies its independent root/mount. Payload keys are complete paths including the root and must be strict descendants of it.

Filesystem placement may reference named Resources or Collections already built in the same manifest. A Resource placement without `key` expands every staged concrete Resource under `<placement>/<concrete-key>`; supplying `key` selects one concrete staged Resource. A Collection placement points to the Collection Resource itself.

Target descriptors are constructed from the already-signed staged Nostr Resource/Collection events plus `manifest.nostr.relays`, so Filesystem assembly remains independent of whether the target event uses `content` or `descriptors` representation.

Generated Filesystem events use dedicated staging under:

```text
events/__filesystems__/
```

Top-level Resource, Collection, and Filesystem manifest names are validated as staging-safe logical names before build work begins. They are limited to one non-hidden path segment and 128 UTF-8 bytes, and cannot use the generated staging directory names `__collections__` or `__filesystems__`. This prevents manifest names from colliding with or disappearing inside the Node staging layout.

and reuse the exact prior signed Filesystem event when the semantic input revision is unchanged. The revision includes publisher, root, event definition, relay list, generated paths, and exact target event IDs.

Nostr publication category order is explicit:

```text
ordinary Resources
    ↓
Collections
    ↓
Filesystems
```

This is application-owned category ordering, not a complete dependency/topological
sort among events within one category.

Collection events retain the accepted v1 behavior of being rebuilt/re-signed on each build. Therefore a newly signed Collection event intentionally changes a dependent Filesystem overlay's input revision. Collection reuse remains a deferred optimization.

The V1 flow was smoke-built and published with `zarf/manifest/filesystem-smoke.yaml`, producing two live mappings:

```text
filesystem-smoke/content/chapter/1_1
filesystem-smoke/content/collection
```

The relay payload confirmed that both mappings point to the target Nostr Resource events, preserving the normal Resource resolution chain rather than bypassing it for Blossom.

---

# 1. Purpose

The Resource Publishing CLI is the producer-side companion to the application's inbound Resource architecture.

The application consumes published Resources through discovery, resolution, decoding, interpretation, validation, and installation.

The CLI works in the opposite direction:

```text
repository source data
    ↓
manifest publication intent
    ↓
Resource build
    ↓
signed local deployment artifacts
    ↓
external artifact publication
    ↓
Nostr reconciliation/publication
    ↓
published Resource state
```

Its core purpose is to replace one-off Bash seed workflows with a generic, manifest-driven Node/TypeScript publishing tool.

The CLI is intentionally not aware of application concepts such as:

```text
bootstrap
application defaults
Bible seeding
Strong's seeding
Reading Plans policy
```

Those meanings belong to repository manifests, Make targets, and application policy.

The CLI owns generic publication mechanics.

---

# 2. Producer / Consumer Boundary

The producer and consumer architectures are intentionally separate.

Producer side:

```text
Source File
    ↓
Manifest Resource Definition
    ↓
Build Pipeline
    ↓
Signed Resource Event
       or
External Artifact + Descriptor Event
    ↓
Publication
```

Consumer side:

```text
Published Resource
    ↓
Resource Discovery
    ↓
Resource Resolution
    ↓
Content Decoding
    ↓
Domain Interpretation
    ↓
Domain Validation
    ↓
Domain Installation
```

The CLI must not contain consumer-side Domain interpretation or installation behavior.

The PWA must not know how publisher staging, manifest rendering, NIP-77 reconciliation, or external artifact upload is implemented.

---

# 3. Repository / Workspace Boundary

The captured implementation used a separate CLI workspace:

```text
client/cli/
```

The browser application remained separate:

```text
client/kjvonly-pwa/
```

The captured repository shape was:

```text
kjvonly.bible/
├── client/
│   ├── cli/
│   └── kjvonly-pwa/
├── data/
├── relay/
├── zarf/
│   ├── docker/
│   ├── manifest/
│   └── scripts/
└── Makefile
```

The relationship is:

```text
CLI
    publishes Resources

PWA
    discovers/resolves/consumes Resources
```

Do not merge the CLI and PWA merely because both use TypeScript.

---

# 4. Runtime and Package

The captured implementation used:

```text
TypeScript
Node.js
Node ESM / NodeNext
```

The CLI package identity was captured as:

```json
{
  "name": "@kjvonly/cli",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "kjvonly": "./dist/main.js"
  }
}
```

The captured development validation command was:

```bash
cd client/cli
npm run test && npm run build
```

This is distinct from the Resource build command described below.

---

# 5. Command Model

The CLI exposed three primary commands:

```text
kjvonly build <manifest>
kjvonly publish <manifest>
kjvonly sync <manifest>
```

Their semantics are intentionally distinct.

## 5.1 `build`

`build` prepares the current local deployment state.

It may:

```text
load/render/validate the manifest
expand Resource sources
encode Resource content
stage external artifacts
calculate artifact hashes/sizes
build ResourceDescriptor documents
build Collections
build Filesystem overlays
construct Nostr events
sign events
reuse unchanged staged state
remove stale local staged state
```

It does not require publication to remote targets.

## 5.2 `publish`

`publish` publishes/reconciles the exact state produced by `build`.

A key captured invariant is:

> `publish` must not rebuild or re-sign Resource events.

The signed staged event is an immutable deployment artifact.

## 5.3 `sync`

`sync` composes:

```text
build
    ↓
publish
```

The manifest remains the publication policy for both phases.

---

# 6. Source Organization

The September 8 capture described this conceptual source organization:

```text
client/cli/src/
├── main.ts
├── cli/
├── composition/
├── application/
│   ├── build/
│   │   ├── artifact/
│   │   ├── collection/
│   │   ├── descriptor/
│   │   ├── encoding/
│   │   ├── inline/
│   │   └── source/
│   ├── publish/
│   │   ├── blossom/
│   │   ├── nostr/
│   │   └── preflight/
│   └── sync/
├── domain/
├── ports/
└── adapters/
    ├── blossom/
    ├── encoding/
    ├── logging/
    ├── manifest/
    ├── source/
    ├── staging/
    ├── strategy/
    ├── time/
    └── nostr/
        ├── auth/
        ├── negentropy/
        ├── publication/
        ├── relay/
        └── signer/
```

The organizing principle was:

> Folder structure should communicate responsibility.

The capture explicitly discouraged collapsing these areas into one large application or infrastructure folder.

---

# 7. Architectural Boundary

The captured CLI architecture was hexagonal:

```text
CLI Interface
    ↓
Application Use Cases
    ↓
Domain / Pure Models
    ↓
Ports
    ↓
Adapters
```

Responsibilities were separated as follows.

## Application

Application code owns workflow and policy such as:

```text
build orchestration
publication orchestration
sync composition
preflight ordering
batch coordination
staging reconciliation
```

## Domain

Domain code owns stable publishing concepts and invariants.

## Ports

Ports define required capabilities without binding application code to concrete libraries.

Examples include:

```text
logging
signing
staging repositories
relay reconciliation
event publication
artifact publication
manifest/source access
```

## Adapters

Adapters own concrete mechanics such as:

```text
filesystem
Nostr protocol/library behavior
Blossom HTTP behavior
manifest parsing/rendering
encoding
logging output
clock/time
```

The captured implementation explicitly rejected a giant Nostr service.

---

# 8. Composition Root

The CLI had one explicit composition root.

It assembled concrete implementations for:

```text
manifest loading/rendering/validation
source discovery
encoders
staging repositories
artifact repositories
clock/time
signer
logger
Blossom preflight/publication
Nostr preflight
Nostr reconciliation
Nostr EVENT publication
build use cases
publish use cases
sync use case
CLI handlers
```

Command handlers were intended to remain thin.

They should not rebuild the dependency graph themselves.

---

# 9. Stable Import Aliases

The captured implementation used package aliases for cross-boundary imports, conceptually:

```json
{
  "imports": {
    "#adapters/*": "./dist/adapters/*",
    "#application/*": "./dist/application/*",
    "#cli/*": "./dist/cli/*",
    "#composition/*": "./dist/composition/*",
    "#domain/*": "./dist/domain/*",
    "#ports/*": "./dist/ports/*"
  }
}
```

TypeScript source imports used `.js` suffixes for Node ESM / NodeNext compatibility.

The intent was structural stability: moving a file inside a layer should not require rewriting long relative import chains across the codebase.

---

# 10. Manifest as Publication Policy

The manifest is the repository/operator-facing publication contract.

The captured implementation required:

```yaml
version: 1
```

The manifest determined things such as:

```text
Resource kind
staging root
Nostr relays
publication strategies
Blossom mirrors
source paths
event encodings
event tags
object-upload behavior
Collections
Filesystem overlays
```

The CLI must not infer application-specific policy that belongs in the manifest.

The publisher secret key is not manifest data.

The captured implementation read it from:

```text
NOSTR_SECRET_KEY
```

---

# 11. Manifest Rendering

Manifest values could be environment-driven.

Captured design example:

```yaml
nostr:
  relays:
    - "{{ env.NOSTR_RELAY_PRIMARY }}"
    - "{{ env.NOSTR_RELAY_SECONDARY }}"

strategies:
  primary:
    type: blossom
    urls:
      - "{{ env.BLOSSOM_PRIMARY }}"
      - "{{ env.BLOSSOM_SECONDARY }}"
```

The September 8 local-development `app-data.yaml` capture intentionally used explicit localhost endpoints instead.

---

# 12. Relative Path Semantics

Relative manifest paths were resolved relative to the manifest file, not the operator's current shell directory.

For example, from:

```text
zarf/manifest/app-data.yaml
```

this:

```yaml
staging:
  path: ./.kjvonly
```

resolved to:

```text
zarf/manifest/.kjvonly/
```

and repository data could be referenced consistently using paths relative to the manifest.

This behavior matters because the CLI may be invoked from a different working directory, including Make targets that run from `client/cli`.

---

# 13. Resource Definitions

Each manifest `resources` entry describes one publication definition.

A definition may expand to:

```text
one source file
many source files in a directory
inline Resource events
descriptor-backed external Resources
Collections
```

The manifest definition name is not necessarily the Resource Identifier.

Example from the capture:

```text
manifest definition:
    bible-chapters-kjvs

concrete Resource ID:
    kjvonly/bible/chapters/kjvs/1_1
```

---

# 14. Resource Identity

The captured implementation published KJVOnly Resources using kind:

```text
37770
```

Long-lived Resource identity was addressable Nostr identity:

```text
publisher pubkey
+
kind
+
d tag
```

The signed event ID represented one publication revision, not the long-lived Resource identity.

The `t` tag supplied Resource classification.

Captured examples included:

```text
kjvonly/bible/chapters
kjvonly/search/bible
kjvonly/overlays/paragraphs
kjvonly/overlays/pericopes
kjvonly/bible/booknames
kjvonly/strongs/definitions
kjvonly/resources/collections
```

The CLI did not maintain a second category registry.

---

# 15. Representation Model

The captured implementation used Resource representation tags such as:

```text
content
descriptors
```

An inline Resource typically used:

```text
representation = content
```

A descriptor-backed Resource or Collection typically used:

```text
representation = descriptors
```

The representation describes the meaning of `event.content`.

---

# 16. Inline Resource Pipeline

For already-compressed inline content, the captured pipeline was:

```text
source bytes
    ↓
event encoding
    ↓
event.content
    ↓
signed kind-37770 event
```

For example, an existing `.json.gz` chapter could be hex-encoded for Nostr without recompressing it.

Typical metadata from the capture included:

```text
d = kjvonly/bible/chapters/kjvs/<key>
m = application/json+gzip+hex
t = kjvonly/bible/chapters
representation = content
```

---

# 17. Descriptor-Backed Pipeline

Descriptor-backed publication has two distinct encoding pipelines.

External object pipeline:

```text
source
    ↓
object-upload.encoding
    ↓
external artifact bytes
    ↓
SHA-256 + size
    ↓
publication locations
```

Descriptor-event pipeline:

```text
ResourceDescriptor[]
    ↓
JSON
    ↓
event.encoding
    ↓
signed Nostr event
```

Do not conflate:

```text
object-upload.encoding
```

with:

```text
event.encoding
```

The captured implementation commonly used:

```text
outer descriptor event:
    application/json+hex

resolved external artifact:
    application/json+gzip
```

---

# 18. Artifact Staging and Integrity

Descriptor-backed artifacts recorded:

```text
SHA-256
size
source revision metadata
```

When no object transformation was required, the Node staging adapter could use a symbolic link instead of copying large source files.

Conceptually:

```text
source artifact
    ↓
symlink-backed staging entry
```

This preserved artifact identity and hashing behavior without unnecessary local duplication.

Build established the artifact bytes that publication was allowed to upload.

Publication must not knowingly upload bytes that differ from staged identity.

---

# 19. Incremental Build

The staging tree represented the desired local deployment state.

The captured invariant was:

```text
unchanged source
    ↓
reuse staged signed event
    ↓
same created_at
    ↓
same signature
    ↓
same event ID
```

Invoking `sync` again must not create a new event revision merely because time passed.

Filesystem source revision metadata and Nostr event timestamps remained separate concepts:

```text
filesystem mtime / size
    = local incremental-build input

event.created_at
    = signed Nostr publication timestamp
```

Never substitute one for the other.

---

# 20. Signed Events as Deployment Artifacts

A central captured rule is:

> Signed staged events are immutable deployment artifacts.

Once built and staged, the exact JSON event should be publishable without rebuilding or re-signing.

That property makes reconciliation meaningful because the staged event ID is stable.

---

# 21. Staging Index

The current Nostr staging boundary exposes metadata-only listing for ordinary Resource events, Collection events, and Filesystem events. The Node staging adapter owns finding and reading staged events for a requested category; it does not own publication category selection or ordering.

The application Nostr publisher currently requests the categories in this order:

```text
Resource
    ↓
Collection
    ↓
Filesystem
```

The publication path was designed so reconciliation can inspect event identity without opening every event JSON file.

Conceptually:

```text
list staged metadata by publication category
    ↓
combine metadata in application-owned category order
    ↓
reconcile exact IDs
    ↓
read exact JSON only for missing IDs
```

This is category ordering, not a topological sort of dependencies among events within one category. Metadata-only listing remains a performance invariant.

---

# 22. Local Deletion Reconciliation

Build reconciled the local staging tree with current source definitions.

If a previously staged source disappeared locally, stale local staging could be removed.

The captured architecture explicitly separated this from remote deletion.

```text
local source deletion
    → local staged-state cleanup

remote Resource deletion
    → separate explicit future workflow
```

Build/publish/sync must not hide remote deletion behavior.

A future explicit `prune` workflow was discussed but not part of the captured core implementation.

---

# 23. Publication Preflight

The captured publisher performed strict preflight before partial publication began.

The goal was to avoid starting a deployment that could not satisfy all required targets.

Configured targets were treated as required rather than best-effort mirrors unless manifest policy said otherwise.

---

# 24. Publication Order

The captured required publication order was:

```text
external artifacts
    ↓
Nostr Resource events that reference them
```

This ensures a descriptor-backed Resource is not published before the referenced bytes are available.

---

# 25. Blossom Publication

The September 8 capture used Blossom strategies with:

```text
urls[]
```

rather than one singular URL.

A descriptor could therefore record multiple mirrors.

Captured semantics:

```text
artifact
    ↓
ensure on every configured Blossom target
    ↓
descriptor urls[]
```

The captured PWA work also updated the Blossom consumer to understand `urls[]` and try mirrors sequentially until one returned a successful response.

That PWA behavior should be validated separately against current source if this CLI document is promoted to Current.

---

# 26. Nostr Publication Architecture

The CLI used Nostr for signed Resource-event publication.

The captured architecture separated:

```text
relay reconciliation
EVENT publication
signing
AUTH
relay connection mechanics
```

The CLI's concrete Nostr implementation had moved to `nostr-tools` by the September 8 capture.

The architecture did not require the PWA to use the same Nostr library.

---

# 27. NIP-77 Reconciliation

Publication did not blindly resend every staged event.

Instead, the captured implementation used NIP-77 reconciliation to determine which staged event IDs were missing from each relay.

Conceptually:

```text
staged event metadata
    ↓
per-relay reconciliation
    ↓
missing event IDs
    ↓
read only corresponding staged JSON
    ↓
normal EVENT publication
```

Actual event transfer remained ordinary Nostr `EVENT` publication.

NIP-77 was used to reconcile set membership, not as a replacement event-transfer protocol.

---

# 28. Exact-ID Reconciliation Batching

A large-set integration issue led to a captured implementation refinement: reconciliation used bounded exact-ID batches rather than one broad publisher/kind session.

The September 8 capture documented batch size:

```text
50
```

This is a captured implementation value, not verified against present CLI source.

The architecture was:

```text
staged reconciliation entries
    ↓
chunk into bounded batches
    ↓
exact IDs + author + kind filter per batch
    ↓
existing one-session NIP-77 helper
    ↓
accumulate missing IDs
```

Batch coordination belonged in the relay reconciler, not the low-level Negentropy session helper.

---

# 29. Why Author and Kind Remained in Batch Filters

The captured implementation retained publisher and kind context alongside exact IDs.

The intent was to keep reconciliation scoped to the expected publication namespace while still avoiding the broad-set behavior that had failed at larger scale.

The low-level NIP-77 session remained responsible for one reconciliation session only.

---

# 30. Per-Relay Independence

Each configured relay was reconciled independently.

A Resource event could therefore be:

```text
already present on relay A
missing on relay B
```

Only the missing relay required EVENT publication.

The publication result should preserve per-relay outcomes rather than collapse all relay state into one global flag.

---

# 31. NIP-42 Authentication

The captured Nostr adapter supported reactive NIP-42 AUTH behavior.

AUTH retry was bounded.

The CLI should not enter an unbounded challenge/retry loop.

The captured implementation kept AUTH behavior around the reconciliation/publication operation rather than teaching the low-level Negentropy session about application/manifests.

---

# 32. EVENT Publication

Once reconciliation identified a missing event ID, the publisher:

```text
looked up the exact staged signed event
    ↓
published it using ordinary Nostr EVENT
```

It did not reconstruct the event.

It did not re-sign the event.

This preserves the deployment artifact that reconciliation evaluated.

---

# 33. Unknown Reconciliation IDs

The captured implementation treated a reconciliation result containing an unknown staged event ID as an error.

The publisher should not attempt to fabricate or infer a staged event that the current local deployment state does not contain.

---

# 34. Collections

The CLI could build Resource Collections in addition to ordinary Resources.

Collections used the same signed staging/publication machinery.

The September 8 capture recorded one accepted v1 limitation:

```text
Collection events may be rebuilt/re-signed each build
```

This was explicitly considered separate from ordinary Resource incremental event reuse.

Collection incremental reuse was deferred optimization work.

---

# 35. Filesystem Overlays

Current V1 Filesystem overlay support is documented in:

```text
docs/03_implementation/tooling/002-filesystem-overlays.md
```

The manifest category is declarative and composes already-built named Resources and Collections into filesystem paths. Filesystem publication is still ordinary Resource publication; the special behavior is semantic payload assembly and, on the client, specialized Filesystem persistence.

The first validation manifest is:

```text
zarf/manifest/filesystem-smoke.yaml
```

`zarf/manifest/app-data.yaml` integration remains intentionally deferred until end-to-end client installation is proven.

---

# 36. App-Data Manifest

The captured repository integration used:

```text
zarf/manifest/app-data.yaml
```

The manifest was not a special CLI mode.

It was an ordinary manifest expressing KJVOnly repository publication policy.

The captured development scope included definitions for:

```text
KJVS individual Bible chapters
KJVS Bible chapter bundle
KJVS Bible search index
Paragraph overlay
Pericope overlay
Bible book names
Strong's bundle
application-defaults Collection
```

The captured implementation intentionally omitted some production expansion, such as individual Strong's publications, through manifest policy rather than CLI branching.

---

# 37. Application Defaults Are Manifest Policy

The CLI did not know that a Collection named `application-defaults` was special.

That meaning belonged to the application/repository.

The same CLI mechanism could build any other Collection described by a manifest.

This is a core separation rule:

```text
application meaning
    = manifest/repository policy

publication mechanics
    = CLI
```

---

# 38. Make Integration

The captured repository exposed app-data build/publish/sync workflows through Make.

An important operational rule was that pipelines preserve process failures.

Logging/formatting pipelines must not accidentally turn a failed CLI command into a successful Make target.

The exact Make targets should be verified against current repository source before being documented as present-day commands.

---

# 39. Structured Logging

Structured verbose logging was treated as part of the integration/debugging contract.

The captured implementation had:

```text
Logger port
structured event names
human-readable formatter
persistent verbose logs
```

Logs could provide evidence for:

```text
source reuse
artifact reuse
preflight
Blossom ensure/upload
reconciliation batches
AUTH
missing-event publication
per-relay outcomes
```

Logging must not expose:

```text
private keys
secret material
raw sensitive content
unnecessarily verbose protocol payloads
```

---

# 40. Security Invariants

The captured CLI design established several security boundaries:

1. secret keys do not belong in manifests;
2. signed staged events are immutable deployment artifacts;
3. artifact integrity is checked against staged hash/size identity;
4. publication preflight occurs before partial deployment;
5. all configured required publication targets must succeed according to manifest policy;
6. logs must not expose secret signing material;
7. Nostr protocol mechanics remain in adapters rather than leaking through application code.

---

# 41. Testing Philosophy

Unit tests were intended to remain network-independent.

Protocol adapters could be tested with controlled fakes/mocks while real repository integration was validated separately.

The captured implementation considered real app-data integration stronger evidence than fixture-only tests because it exercised:

```text
large Resource sets
real manifest expansion
incremental staging
Blossom publication
NIP-42
NIP-77 reconciliation
missing-only EVENT publication
Collection replacement
```

---

# 42. Captured Integration Evidence

The September 8 document recorded successful large-set publication/reconciliation against local infrastructure.

The important captured rerun behavior was:

```text
unchanged chapter Resource events
    → reused locally
    → recognized as already present remotely
    → not republished

Collection event
    → rebuilt/re-signed under current v1 behavior
    → new event ID
    → published as current addressable replacement
```

The September 8 capture therefore considered the previous September 5 large-set NIP-77 blocker resolved.

This is historical integration evidence, not a substitute for re-running current integration tests when the CLI source is available.

---

# 43. Idempotency Goal

The intended `sync` behavior was:

```text
same source + same definition + same staged state
    ↓
same Resource event IDs
    ↓
remote reconciliation sees them already present
    ↓
no duplicate publication
```

The captured exception was v1 Collection rebuilding/re-signing.

---

# 44. Failure Semantics

Publication failures should fail the operation visibly.

The CLI must not silently continue after a required target fails.

Because staged events are immutable, retrying publication should reuse the same signed event rather than generating a replacement revision.

This supports safe retry behavior.

---

# 45. Development vs Production Policy

The CLI is generic across environments.

Differences between development and production belong in manifests/environment values.

Examples from the captured design included:

```text
local relay vs production relays
local Blossom vs production mirrors
reduced development Resource scope
production Strong's expansion
additional Bible versions
```

Do not add environment-specific branches to the core CLI when the difference can be expressed as publication policy.

---

# 46. Locked Captured Decisions

The September 8 implementation record treated the following as established decisions:

1. The CLI is manifest-driven and application-domain agnostic.
2. `build`, `publish`, and `sync` have separate semantics.
3. `publish` does not rebuild or re-sign events.
4. Signed staged events are immutable deployment artifacts.
5. Nostr reconciliation uses NIP-77.
6. Event transfer uses ordinary Nostr EVENT publication.
7. The captured CLI Nostr adapter uses `nostr-tools`.
8. NIP-42 authentication is reactive and bounded.
9. Relay reconciliation is independent per relay.
10. Reconciliation timestamps come from signed event `created_at`, not filesystem mtime.
11. Staged event listing is metadata-only.
12. Event JSON is opened only for IDs identified as missing.
13. Unknown reconciliation IDs fail.
14. Large reconciliation uses bounded exact-ID batches.
15. The captured batch size was 50.
16. Batching belongs in the relay reconciler, not the low-level session helper.
17. Blossom descriptors use `urls[]`.
18. Artifact publication precedes Resource-event publication.
19. Local source deletion cleans local staging only.
20. Remote cleanup requires an explicit workflow.
21. Zero-transform artifacts may be symlink-staged.
22. Collections may be re-signed each build under the captured v1 behavior.
23. Filesystem overlays build after Resources and Collections and publish after both.
24. Filesystem overlay payload keys are complete strict-descendant paths; `root` is published as `f`.
25. Unchanged Filesystem semantic inputs reuse the exact signed staged Filesystem event.
26. Structured verbose logging is part of operational debugging.
27. The CLI does not know that `application-defaults` means bootstrap.
28. Resource-specific development omissions are manifest policy, not CLI branching.

These decisions should be revalidated against current CLI source before being treated as present-day implementation invariants.

---

# 47. Explicit Non-Goals

The captured design explicitly avoided:

```text
KJVS-specific branches
Strong's-specific batch logic
consumer bootstrap logic in the CLI
manual REQ/set-diff replacement for NIP-77
one giant Nostr service
remote deletion hidden inside build
re-signing events during publish
using filesystem mtime as Nostr event revision time
opening every staged event JSON before reconciliation
```

These are useful architectural guardrails even when the CLI source is later refactored.

---

# 48. High-Level Build Flow

```mermaid
flowchart TD
    A[Operator / Make] --> B[CLI build]
    B --> C[Manifest Loader]
    C --> D[Render + Validate]
    D --> E[Build Resources]

    E --> F[Signed Resource Events]
    F --> G[Build Collections]
    G --> H[Signed Collection Events]

    F --> I[Filesystem Placement Resolution]
    H --> I
    I --> J[Filesystem Content]
    J --> K[Signed Filesystem Event]

    F --> L[Signed Staging]
    H --> L
    K --> L
```

Within the Resource phase, ordinary inline and descriptor-backed pipelines retain their existing encoding/artifact behavior. The important current dependency order is Resource → Collection → Filesystem.

---

# 49. High-Level Publish Flow

```mermaid
flowchart TD
    A[Publish Manifest] --> B[Load Manifest]
    B --> C[Resolve Staging Root]
    C --> D[Preflight Required Targets]

    D --> E[Ensure Blossom Artifacts]
    E --> F[Nostr Staged Publisher]

    F --> G[List Resource Metadata]
    G --> H[List Collection Metadata]
    H --> I[List Filesystem Metadata]
    I --> J[Combine in Application Publication Order]
    J --> K[Reconcile Exact IDs per Relay]
    K --> L[Publish Missing Events in Preserved Category Order]
    L --> M[Published]
```

The application publisher owns which staging categories participate and the category order `Resource → Collection → Filesystem`. The staging adapter only fulfills category-specific listing and exact staged-event reads. This ordering does not claim a complete dependency/topological sort within a category.

---

# 50. Captured Reconciliation Flow

```mermaid
flowchart TD
    A[Staged Reconciliation Entries] --> B[Chunk into bounded batches]

    B --> C[Exact IDs + publisher + kind]
    C --> D[NIP-77 Session]
    D --> E[Missing IDs]

    E --> F[Accumulate / Deduplicate]
    F --> G[Read only missing staged events]
    G --> H[EVENT publication]
```

The captured batch size was 50.

That value requires current-source verification before being described as current.

---

# 51. End-to-End Mental Model

Producer:

```text
repository source data
    ↓
manifest publication intent
    ↓
CLI build
    ↓
current staged deployment state
    ↓
preflight
    ↓
ensure external artifacts
    ↓
reconcile event IDs per relay
    ↓
read only missing signed events
    ↓
publish exact staged events
    ↓
relay / Blossom state
```

Consumer:

```text
PWA discovery
    ↓
Published Resource
    ↓
inline decode OR descriptor resolution
    ↓
integrity validation
    ↓
Domain interpretation/validation
    ↓
Domain installation
```

The producer and consumer share Resource contracts, not runtime implementation ownership.

---

# 52. Source-Verification Checklist

When changing the CLI, verify at least:

```text
commands remain build/publish/sync
manifest version remains 1 unless intentionally migrated
Resource → Collection → Filesystem build ordering remains explicit
Blossom artifacts publish before Nostr events
application-owned Nostr publication category order remains Resource → Collection → Filesystem
Filesystem target descriptors are built from signed staged events
Filesystem input revision includes exact target event IDs
Collections retain their documented v1 incremental behavior unless intentionally optimized
NIP-77 / exact-ID reconciliation behavior remains valid
Blossom descriptor shape remains urls[]
current Make targets and local endpoints
current tests/build commands
```

Because this document retains a historical September capture plus later source-verified deltas, update the dated delta sections when behavior changes rather than silently treating historical examples as current.

---

# 53. Historical Capture Disposition

This document consolidates the unique implementation/design material from the three dated CLI captures.

Those dated files were useful during active implementation because they represented successive checkpoints:

```text
2026-09-03
    design baseline

2026-09-05
    intermediate implementation/integration snapshot

2026-09-08
    later implementation state after resolving the large-set reconciliation blocker
```

The consolidated implementation record should now be the primary reference under `docs/03_implementation/tooling/`.

The dated captures can be recovered from version control if historical slice-by-slice detail is needed.
