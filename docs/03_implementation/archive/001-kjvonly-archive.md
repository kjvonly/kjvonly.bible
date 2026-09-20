# KJVOnly Archive Implementation

**Status:** Implemented

---

# Purpose

This document describes the current implementation of KJVOnly archive import and export in the PWA.

The archive implementation realizes the Resource Archive architecture by making accepted Resource-backed Domain state portable without preserving original transport packaging.

The implementation is intentionally composed from existing application capabilities:

```text
Domain Objects
+ ResourceInstallation state
        ↓
Archive export
        ↓
.kjva
        ↓
Archive import
        ↓
DecodedResourceContent
        ↓
existing Resource handlers
        ↓
existing Domain interpretation / validation / installation
```

The archive subsystem does not define a second Domain validation or installation lifecycle.

---

# Scope

This implementation covers:

* `.kjva` archive format version 1,
* gzip JSON encoding and decoding,
* archive structural validation,
* export selection by `objectType`,
* optional export filtering by `objectId` pattern,
* persistence reads from `DOMAIN_OBJECTS` and `RESOURCE_INSTALLATIONS`,
* import freshness prefiltering,
* Domain-to-Resource reconstruction,
* reuse of existing Resource handlers and installers,
* an ephemeral Archive Worker,
* Application-owned archive service composition,
* generic import-completion notifications,
* post-import runtime refresh/invalidation for interested owners,
* the Archive application Module,
* browser file import and download behavior,
* transferable worker byte buffers,
* and browser round-trip tests.

This implementation does not archive:

```text
OUTBOX
RESOURCE_RECEIPTS
NOSTR_EVENTS
Pane / Buffer state
Settings
transient runtime caches
```

---

# Archive Format

A `.kjva` file is gzip-compressed UTF-8 JSON.

Version 1 is intentionally small:

```ts
interface KJVOnlyArchiveV1 {
    readonly version: 1;

    readonly domain_objects:
        Readonly<Record<string, ArchivedDomainObject>>;

    readonly resource_installations:
        Readonly<Record<string, ResourceInstallation>>;
}
```

The top-level JSON therefore has the shape:

```json
{
  "version": 1,
  "domain_objects": {},
  "resource_installations": {}
}
```

An empty export is still a valid archive and therefore still produces a non-empty gzip file.

---

# Archived Domain Object

The archive stores the accepted persisted Domain Object representation:

```ts
interface ArchivedDomainObject {
    readonly id: string;
    readonly objectType: string;
    readonly objectId: string;
    readonly value: unknown;
}
```

The archive does not define Domain-specific value schemas.

Those schemas continue to belong to their Domains.

---

# ResourceInstallation in Archives

`ResourceInstallation` is used as the durable Resource-state record associated with a Domain Object.

The current shape is:

```ts
interface ResourceInstallation {
    readonly id: string;
    readonly objectType: string;
    readonly objectId: string;
    readonly publisher: string;
    readonly resourceId?: string;
    readonly modifiedAt: number;
}
```

`resourceId` is optional because locally authored Resource-backed state may exist before an external Resource identity has been observed through installation.

The archive preserves the stored record as-is.

`modifiedAt` is the Resource revision timestamp used for object-level freshness comparisons.

Archive export never invents a new `modifiedAt`.

---

# Export Workset

Export starts from `RESOURCE_INSTALLATIONS` rather than scanning every Domain Object.

Conceptually:

```text
RESOURCE_INSTALLATIONS
        ↓
apply export selection
        ↓
load matching DOMAIN_OBJECTS by installation.id
        ↓
build KJVOnlyArchiveV1
        ↓
validate archive structure
        ↓
JSON
        ↓
gzip
```

This has two important effects:

1. derived/supporting Domain Objects without Resource state are naturally excluded;
2. unselected Domain Objects do not need to be loaded.

If a selected `ResourceInstallation` has no matching Domain Object, export fails rather than silently dropping the inconsistent state.

Export does not mutate persistence while repairing inconsistencies.

---

# Export Selection

Export selection is based on Domain `objectType`.

The current application supports these Resource-backed object types:

```text
bible/chapter
bible/booknames
bible/paragraphs
bible/pericopes
bible/text-markup
bible/search-index
notes/note
reading-plans/plan-definition
reading-plans/plan-subscription
reading-plans/plan-progress
strongs/definition
```

The Archive UI presents these as selectable export categories.

User-owned state is selected by default in the current UI:

```text
Notes
Bible Text Markups
Reading Plan Subscriptions
Reading Plan Progress
```

Large/reference datasets remain available but are not selected by default.

---

# Export Pattern Filtering

Each selected object type may optionally include `objectId` patterns.

The UI accepts comma-delimited patterns and converts them into structured selection data before sending the request to the Archive Worker.

For example:

```text
kjv/*,kjvs/*
```

or:

```text
default/*,*my-sermon-note*
```

Only `*` wildcard matching is supported.

A blank filter or `*` means all objects of the selected type.

Matching is performed against the full `objectId` tail after removing the publisher segment.

Example:

```text
objectId:
<publisher>/kjvs/10_13

match target:
kjvs/10_13
```

Therefore:

```text
kjvs      → no match
kjvs/*    → match
```

For a Note:

```text
objectId:
<publisher>/default/my-sermon-note-001

match target:
default/my-sermon-note-001
```

Therefore:

```text
default/*          → match
*my-sermon-note*   → match
```

Filtering occurs before matching Domain Objects are loaded.

---

# Archive Codec

`KJVOnlyArchiveCodec` owns encoding and decoding.

Export encoding:

```text
KJVOnlyArchiveV1
    ↓
JSON.stringify
    ↓
UTF-8
    ↓
gzip
    ↓
Uint8Array
```

Import decoding:

```text
Uint8Array
    ↓
gunzip
    ↓
UTF-8
    ↓
JSON.parse
    ↓
archive validation
```

The archive codec does not perform Domain validation.

---

# Archive Structural Validation

`KJVOnlyArchiveValidator` validates archive structure and pairing invariants.

It checks things such as:

```text
supported version
valid domain_objects map
valid resource_installations map
map key === record.id
matching Domain Object exists for each ResourceInstallation
paired objectType agrees
paired objectId agrees
publisher exists
modifiedAt is valid
resourceId is absent or valid
```

It deliberately does not validate Domain payloads such as Notes, Chapters, Text Markups, Plans, or Strong's definitions.

Those payloads must pass through their existing Resource handlers during import.

---

# Import Entry Point

Archive import joins the existing Resource lifecycle at decoded Resource content.

Conceptually:

```text
.kjva
    ↓
Archive decode + structural validation
    ↓
archive ResourceInstallation workset
    ↓
freshness prefilter
    ↓
Domain → Resource reconstruction
    ↓
DecodedResourceContent
    ↓
ResourceProcessor.processDecoded(...)
    ↓
existing ResourceHandler
    ↓
existing Interpreter
    ↓
existing Validator
    ↓
existing Installer
```

Archive import never directly writes imported Domain Objects into IndexedDB.

---

# Import Workset and Freshness

`archive.resource_installations` defines the import workset.

For every archived installation, the importer reads the current local `RESOURCE_INSTALLATIONS` record by the same ID.

If:

```text
archive.modifiedAt <= local.modifiedAt
```

the archive item is reported as `current` and is not sent through Resource processing.

If no local record exists, or the archived revision is newer, processing continues.

This check is an optimization and early result classification.

The Domain installer remains authoritative and retains its own freshness check.

No local record is deleted during import workset filtering.

---

# Domain-to-Resource Reconstruction

The archive stores accepted Domain state, not serialized transport content.

Before archived state can re-enter normal Resource handling, the importer reconstructs canonical Resource content.

This uses `ResourcePublicationResolver`.

The resolver maps:

```text
objectType
+ objectId
+ Domain value
        ↓
ResourcePublication
```

The publication builders are the same Domain-owned conversions used for normal outbound Resource publication where available.

For inbound/reference types that previously had no publication path, reusable Domain-to-Resource publication builders were added in the owning Domain resource folders.

The archive subsystem does not duplicate Domain-specific path parsing or content mapping.

---

# Supported Reconstruction Types

Archive worker composition currently registers all Resource-backed object types installed by the shared content Resource processor:

```text
Bible Chapter
Bible Booknames
Bible Paragraphs
Bible Pericopes
Bible Text Markup
Bible Search Index
Note
Reading Plan Definition
Reading Plan Subscription
Reading Plan Progress
Strong's Definition
```

A composition test enumerates these types to reduce the risk that a new installable Resource type is added without archive reconstruction support.

---

# Bundle Normalization

Archives do not preserve original bundle boundaries.

For example, a Chapter may have originally been installed from:

```text
kjvonly/bible/chapters/kjvs
```

but the stored Domain Object represents one chapter:

```text
<publisher>/kjvs/1_1
```

Archive import reconstructs the canonical individual Resource:

```text
kjvonly/bible/chapters/kjvs/1_1
```

The same normalization applies to Strong's and other bundle-installed data.

The archived `ResourceInstallation.resourceId`, when present, may still preserve the original bundle provenance.

The newly installed Resource state after archive import reflects the canonical individual Resource used for that import.

---

# DecodedResourceContent Construction

After reconstruction, the importer builds normal decoded Resource content:

```ts
{
    publisher: publication.publisher,
    resourceId: publication.resourceId,
    resourceType: publication.resourceType,
    modifiedAt: installation.modifiedAt,
    mediaType: publication.mediaType,
    value: publication.value
}
```

The archived revision timestamp is preserved.

The archive does not generate a new Resource revision merely because data was exported or imported.

---

# Import Results

Import is processed independently per archived Resource-backed object.

The current result statuses are:

```text
current
handled
unsupported
failed
```

One invalid or unsupported item does not require unrelated valid items to be rolled back.

The Archive UI summarizes the result after import.

---

# Local Resource Writes

Archive export depends on `ResourceInstallation` being present for locally authored Resource-backed state as well as externally installed state.

The local write transactions for:

```text
Notes
Bible Text Markup
Reading Plan Subscription
Reading Plan Progress
```

therefore commit three stores atomically:

```text
DOMAIN_OBJECTS
+ RESOURCE_INSTALLATIONS
+ OUTBOX
```

This replaces the older local-write shape:

```text
DOMAIN_OBJECTS
+ OUTBOX
```

The `ResourceInstallation` record for a local write may omit `resourceId`.

---

# Local Revision Timestamp

A local Resource-backed write assigns one Resource revision timestamp at the durable write boundary.

The write transaction compares the current clock to the existing Resource-state revision:

```text
modifiedAt = max(
    nowEpochSeconds(),
    existing.modifiedAt + 1
)
```

This protects against:

* multiple local writes within the same second;
* local clocks behind a previously accepted Resource revision.

The same `modifiedAt` is copied onto the queued `ResourcePublication` intent.

Nostr publication reuses that timestamp as `created_at` rather than inventing another revision later.

Therefore:

```text
ResourceInstallation.modifiedAt
        =
ResourcePublication.modifiedAt
        =
Nostr event.created_at
```

for one local Resource revision.

Archive export simply preserves the stored revision.

---

# Deletion

For a local Resource deletion, the Domain write transaction removes the corresponding `ResourceInstallation` and queues the deletion publication in the Outbox using the newly allocated revision timestamp.

A deleted Domain Object therefore does not remain in the archive export workset.

---

# Archive Worker

Archive import/export uses a dedicated ephemeral Worker.

The Worker is not a long-lived application Worker.

Each operation follows:

```text
Application calls import/export
        ↓
KJVOnlyArchiveWorkerClient creates Worker
        ↓
Worker performs one bounded operation
        ↓
result or error returned
        ↓
client terminates Worker
```

A new Worker is created for every import and every export operation.

The Worker is also terminated on errors and message failures.

Archive bytes cross the worker boundary as transferable `ArrayBuffer` ownership rather than being structured-cloned when possible:

```text
Import
    main-thread archive bytes
        → transfer ownership
        → Archive Worker

Export
    Archive Worker gzip bytes
        → transfer ownership
        → main thread
```

This avoids copying large `.kjva` payloads such as Bible/Strong's exports merely to cross the worker boundary.

There is no idle Archive Worker when no archive operation is running.

---

# Why Archive Has Its Own Worker

Archive processing can include:

```text
gzip / gunzip
large JSON parse/stringify
large IndexedDB scans
filtering
many Domain-to-Resource reconstructions
many Resource installs
```

Keeping this bounded work off the main Svelte thread avoids turning the long-lived Resource Worker protocol into an archive-specific API.

The existing `ResourceWorkerClient` remains responsible for normal application Resource acquisition.

Archive processing does not route archive messages through it.

---

# Shared Resource Processing Composition

The Archive Worker reuses the existing decoded-content processing composition from:

```text
src/lib/resource/worker/resource-worker-composition.ts
```

Specifically:

```ts
createContentResourceProcessor()
```

That factory constructs the shared `ResourceProcessor` with the registered Domain Resource handlers, installers, receipt service, and persistence dependencies.

Both normal Resource processing and archive processing therefore use the same Domain installation implementation.

The difference is only how content reaches `DecodedResourceContent`.

---

# Archive Worker Composition

`createKJVOnlyArchiveWorkerOperations()` composes:

```text
KJVOnlyArchiveCodec
KJVOnlyArchiveExporter
KJVOnlyArchiveImporter
ResourcePublicationResolver
createContentResourceProcessor()
Application IndexedDB
```

Export performs:

```text
exporter.export(selection)
    ↓
codec.encode(archive)
```

Import performs:

```text
codec.decode(bytes)
    ↓
import workset / reconstruction
    ↓
processor.processDecoded(...)
```

---

# Application Ownership

`Application` owns one `KJVOnlyArchiveService` capability.

`ApplicationContext` exposes that capability to Svelte.

The service is intentionally thin:

```text
KJVOnlyArchiveService
    ↓
KJVOnlyArchiveWorkerClient
```

The Worker client owns Worker creation and termination.

Svelte does not construct archive Workers directly.

`KJVOnlyArchiveService` also owns the application-level observation boundary for completed imports:

```ts
archiveService.subscribeToImports(subscriber)
```

An import-completion event contains:

```text
import result
Resource Types that were actually handled
```

Only entries whose import outcome is `handled` contribute to `importedResourceTypes`.

Entries reported as current, unsupported, or failed do not cause false refresh notifications.

The Archive service does not know how any Domain/runtime responds to the event.

---

# Post-Import Runtime Reconciliation

Archive import may update accepted IndexedDB state from a short-lived Worker while other long-lived main-thread services/workers already hold derived or cached state.

The import-completion event lets those owners independently decide whether they need to refresh.

Current consumers include:

```text
Reading Plans
    → PlansPubSubService
    → signal Plans Worker refresh
    → worker reloads Subscription/Progress state from IndexedDB

Notes
    → NotesService / Notes search runtime
    → signal Notes Worker refresh
    → worker reloads accepted Notes from IndexedDB
    → rebuild FlexSearch projection

Bible Search
    → SearchRuntime
    → invalidate initialized index state
    → reset worker indexes
    → next search reloads the currently selected index

Bible Booknames
    → BibleBooknamesService
    → clear in-memory Booknames cache
    → next get() reloads accepted state

Bible Text Markup
    → BibleTextMarkupService
    → reload currently subscribed markup IDs
    → publish through the service's existing subscriber path
```

The Archive subsystem itself contains none of these Domain-specific refresh rules.

Application composition registers the interested owners as subscribers.

This is intentionally different from forcing every imported Resource into every already-open Module.

For example, imported Bible Chapters, Paragraphs, and Pericopes are not forced into an already-open Bible Reader. Those Module instances retain their captured Resource selections. Newly imported sources become available for future Module creation or explicit Resource-selection changes.

---

# Archive Module

Archive is a standalone application Module.

It is registered as:

```text
Modules.ARCHIVE
```

The Archive Module requires no Resource selections because it operates on persisted application Resource-backed state rather than a Pane-specific selected Resource source.

The module is available from the existing Modules list.

It is not owned by the Bible Domain and Bible UI contains no Archive-specific toolbar item.

---

# Archive Module Navigation

The Archive container follows the existing per-container navigation pattern.

Conceptually:

```text
ArchiveContainer
    ↓
NavigationServiceFactory.create()
    ↓
Archive landing view
    ├── Import
    └── Export
```

The landing view is a simple two-row list for consistency with the rest of the application.

Import and Export are separate child views.

The landing view has the normal close action.

Child views use a back arrow to return to the Archive landing view.

---

# Import UI

The Import child view keeps browser file selection at the UI edge.

The header contains:

```text
Back
Import title
Import action icon
```

The Import action opens a file picker for `.kjva`, reads the selected file into bytes, and calls:

```ts
archiveService.import(bytes)
```

The core archive subsystem does not create DOM file inputs.

---

# Export UI

The Export child view presents the selectable Resource-backed object types and optional comma-delimited filter fields.

The header contains:

```text
Back
Export title
Export action icon
```

The Export action builds `KJVOnlyArchiveExportSelection`, calls:

```ts
archiveService.export(selection)
```

then creates the browser download from the returned bytes.

The core archive subsystem does not create DOM download anchors.

---

# SVG/UI Convention

Archive Import and Export header actions use local Svelte SVG components under the shared component SVG directory, following the same project convention used by other application icons.

The icons are based on open-source Google Material icon paths and are kept as local source components rather than loaded remotely.

Svelte Archive views retain the existing section-divider comment style used by the application UI source.

---

# Tests

The archive implementation has unit coverage for:

```text
archive model validation
codec gzip round-trip
malformed archives
export selection
objectId wildcard matching
export persistence behavior
import freshness filtering
Domain-to-Resource reconstruction
import outcome mapping
Archive Worker client lifecycle
Worker termination on success/failure
transferable import/export byte buffers
archive worker composition registrations
Application archive service delegation
import-completion subscription / unsubscribe behavior
handled-Resource-Type event filtering
```

Browser coverage verifies real IndexedDB and Worker behavior.

Representative round-trip tests cover:

```text
export
→ gzip
→ remove local state
→ import through ephemeral Archive Worker
→ normal Resource handler/install path
→ Domain state restored
```

Bundle-derived Bible Chapter and Strong's state are included to verify canonical individual Resource reconstruction.

Separate browser installation tests cover Notes, Plan Subscriptions, and Plan Progress through the normal Resource installation path.

Post-import runtime tests also cover the refresh/invalidation behavior that crosses persistent storage and long-lived projections, including Reading Plans and Notes workers. Bible Search, Booknames, and Text Markup have focused refresh/invalidation coverage at their owning runtime/service boundaries.

---

# Important Invariants

The current implementation relies on these invariants:

```text
Archive format is gzip JSON.

Archive version 1 contains:
    version
    domain_objects
    resource_installations

ResourceInstallation defines the export/import Resource-backed workset.

Archive export never creates a new modifiedAt.

Locally authored Resource-backed state receives ResourceInstallation state at durable write time.

Archive import never directly restores Domain Objects.

Archive import reconstructs DecodedResourceContent.

Existing Resource handlers perform Domain interpretation and validation.

Existing installers remain authoritative for freshness and persistence.

Archive import does not enqueue imported data for publication.

Outbox is not archived.

Original transport encoding is not archived.

Original bundle boundaries are not reconstructed.

Archive Worker is ephemeral per operation.

Bible has no Archive-specific UI responsibility.
```

---

# Extension Rule

When adding a new Resource-backed Domain Object type that should participate in archives:

1. register its normal Resource handler in the shared content Resource processor;
2. provide a reusable Domain-to-Resource publication/reconstruction builder;
3. register that builder in Archive Worker `ResourcePublicationResolver` composition;
4. expose the type in Archive export selection UI if users should be able to export it;
5. add focused tests proving reconstruction and installation.

Do not add Archive-specific Domain validation or installation code.

The Archive subsystem should continue to stop at the existing decoded Resource content boundary.
