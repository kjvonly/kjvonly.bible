# Notes Domain Implementation

**Status:** Current
**Domain:** Notes
**Application object type:** `notes/note`
**Resource type:** `kjvonly/notes/entries`

---

# Purpose

This document describes the current Notes Domain implementation.

Notes are application Domain Objects first. Nostr is only the transport used by the Resource publication/synchronization boundary.

The central local model is:

```text
Notes UI
    ↓
NotesService
    ↓
accepted Note Domain Objects
    ↓
domain_objects
    ↓
Notes search worker projection
```

Writable changes use:

```text
NotesService
    ↓
NotesResourcePublication
    ↓
ONE IndexedDB transaction
    ├── domain_objects
    ├── resource_installations
    └── outbox
    ↓
search runtime update
    ↓
Outbox wake
    ↓
Resource publication strategy
```

Inbound explicit Resource installation uses:

```text
Decoded Notes Resource
    ↓
NoteInterpreter
    ↓
NoteValidator
    ↓
NoteInstaller
    ↓
domain_objects + resource_installations
```

---

# Scope

This document covers:

- Note Domain Object shape,
- Notes application identity,
- standalone and Bible-linked Notes,
- Notes Resource identity,
- module Resource selection,
- persistence,
- inbound Resource installation,
- `NotesService`,
- Notes search runtime/worker,
- local collection propagation,
- create/update/delete flows,
- Outbox publication,
- current synchronization boundary,
- UI behavior and known limitations,
- testing and extension rules.

This document does not define a completed multi-device synchronization system, conflict resolution, or multi-source aggregation.

Notes participate in the shared KJVOnly Archive subsystem through their existing Domain-to-Resource conversion and normal inbound Resource handler.

---

# Domain Model

The accepted Note shape is:

```ts
interface Note {
    id: string;
    bibleLocationRef: string | undefined;
    bibleReferenceText: string | undefined;
    text: string;
    html: string;
    title: string;
    dateCreated: number;
    dateUpdated: number;
    tags: NoteTag[];
}
```

A Note can therefore be:

```text
standalone
or
associated with a Bible location
```

Standalone Notes use `undefined` for Bible-reference fields.

They do not use a synthetic location sentinel.

---

# Note Identity

A Note application ID is:

```text
<publisher>/<name>/<noteId>
```

Created by:

```text
createNoteId(publisher, name, noteId)
```

Example:

```text
<user-pubkey>/default/550e8400-e29b-41d4-a716-446655440000
```

The three segments are application identity.

The ID does not contain the Resource Type or a Nostr event ID.

---

# Resource Identity

Notes use:

```text
Resource Type
    kjvonly/notes/entries
```

A selected Notes Resource source represents a named collection:

```text
kjvonly/notes/entries/<name>
```

An individual published Note Resource is:

```text
kjvonly/notes/entries/<name>/<noteId>
```

The Resource publisher supplies the application `publisher` segment.

Thus:

```text
Resource
    publisher = <publisher>
    resourceId = kjvonly/notes/entries/<name>/<noteId>

Domain Object
    id = <publisher>/<name>/<noteId>
```

Resource identity and Domain identity are related but intentionally different.

---

# Module Resource Selection

The Notes module requires:

```text
Bible Chapter Resource
Bible Booknames Resource
Notes Resource
```

The Notes-specific contributor is:

```text
NotesModuleResourceSelectionContributor
```

It uses normal application selections first.

If no Notes selection exists and an authenticated/read-only user ID is available, it creates the default user Notes source:

```text
publisher = current user
resourceId = kjvonly/notes/entries/default
```

The selected Notes source is captured on the module `Buffer`.

UI code resolves it through `ModuleResourceSelectionResolver`.

Domain services receive `PublishedResourceReference`; they do not know about Pane/Buffer mechanics.

---

# Creating New Notes

The Notes UI creates application identity from the selected Notes source.

```text
selected Notes source
    ↓
createNoteIdForSource(source, uuid)
    ↓
<publisher>/<name>/<uuid>
```

Standalone Notes are initialized without a Bible reference.

Bible-linked Notes additionally use the selected Bible Chapter and Booknames Resources to derive initial reference text/content.

A newly created Note remains UI state until the user saves it through `NotesService.put()`.

---

# Persistence

Accepted Notes are stored in the shared:

```text
domain_objects
```

store using:

```text
objectType = notes/note
objectId = Note.id
```

`IndexedDBNotesStore` provides:

```text
get(id)
getAll()
put(note)
delete(id)
```

`getAll()` uses the shared `objectType` index rather than a Notes-specific physical object store.

This is the current Domain persistence model across the application.

---

# NotesService

`NotesService` is the application-facing Notes capability exposed through `ApplicationContext`.

It owns/co-ordinates:

```text
initial accepted Note loading
search worker runtime
search/result subscriptions
local Note writes
deletes
Resource publication mapping
Outbox wakeup
```

It deliberately does not own Resource discovery or remote synchronization.

---

# Startup / Initial Accepted State

When `NotesService` is constructed it starts one asynchronous load of accepted Notes from the Domain store.

```text
IndexedDBNotesStore.getAll()
    ↓
NotesSearchRuntime.initialize(notes)
```

Search/read operations wait on that initialization promise.

The search worker is therefore a projection of accepted local Domain state, not an independent persistence authority.

---

# Notes Search Runtime

`NotesSearchRuntime` wraps the Notes Web Worker.

Main-thread commands include:

```text
initialize
put
remove
search
get-all
refresh
```

The worker owns the in-memory FlexSearch index.

Normal startup seeds the worker from accepted Notes loaded by `NotesService`. After initialization, local Note writes/deletes maintain the projection incrementally.

`refresh` is different: it is an explicit cross-worker reconciliation command. The Notes worker reloads accepted Notes from `IndexedDBNotesStore` itself, rebuilds the FlexSearch document, and republishes the current collection. This is used after persistence changes performed outside `NotesService`, such as KJVOnly Archive import.

Search results are routed back through `NotesService` by request/result ID.

There is no separately persisted Notes search-index Domain Object.

For the broader search persistence distinction, see:

```text
persistence/003-search-indexes.md
```

---

# Local Publish / Subscribe

`NotesService` maintains lightweight result subscribers.

Each subscription has:

```text
subscriber id
result-channel id
callback
```

This supports both:

```text
query-specific search results
and
collection-change refresh behavior
```

The stable collection channel is:

```text
NOTES_COLLECTION_CHANGED = notes:collection-changed
```

The Bible Reader uses Notes search to derive Notes associated with the active chapter.

This is local application propagation, not network synchronization.

---

# Local Create / Update Flow

`NotesService.put(note)` performs:

```text
wait for initial Notes load
    ↓
NotesResourcePublication.create(note)
    ↓
IndexedDBNotesWriteTransaction
    ├── write Note Domain Object
    ├── create/update ResourceInstallation revision state
    └── write Outbox publication intent
    ↓ transaction commit
NotesSearchRuntime.put(note)
    ↓
Outbox wake
```

The durable local state and durable outbound intent are written atomically.

The derived search worker is updated only after the transaction commits.

This ordering prevents the UI/search projection from advertising a Note that failed durable persistence.

---

# Note Resource Publication

Create/update publication derives Resource identity from the Note application ID.

```text
Note.id
    <publisher>/<name>/<noteId>

Resource
    publisher = <publisher>
    resourceType = kjvonly/notes/entries
    resourceId = kjvonly/notes/entries/<name>/<noteId>
```

Representation:

```text
content
```

Media type:

```text
application/json+gzip+hex
```

The Resource value excludes `id` because identity is encoded by publisher + Resource path.

The value contains the Note content fields.

---

# Delete Flow

Deletion is an explicit Resource operation.

`NotesService.delete(noteId)` performs:

```text
create ResourceDeletionPublication
    ↓
ONE IndexedDB transaction
    ├── delete Note Domain Object
    ├── remove ResourceInstallation revision state
    └── write deletion intent to Outbox
    ↓ transaction commit
NotesSearchRuntime.remove(noteId)
    ↓
Outbox wake
```

The delete does not need to look up a relay event first.

The Resource identity is deterministically derived from the Note application ID.

Because Outbox uses the same durable object key for subsequent writes, update/delete operations for the same Note participate in normal last-write-wins coalescing.

---

# Inbound Notes Resources

`NoteInterpreter` supports two Resource shapes.

## Individual Note

```text
kjvonly/notes/entries/<name>/<noteId>
```

produces one candidate.

## Named bundle

```text
kjvonly/notes/entries/<name>
```

expects an object whose keys are Note IDs and produces one candidate per entry.

The Notes Resource root by itself is not accepted.

Paths deeper than an individual Note are rejected.

---

# Validation

`NoteValidator` validates Note content with a strict Zod schema.

Validated content includes:

```text
optional Bible location/reference text
plain text
HTML
Title
created/updated timestamps
Note tags
```

Transport identity is not trusted from payload fields.

Publisher/name/note ID come from Resource identity and interpreter output.

---

# Installation

`NoteInstaller` derives application identity from:

```text
Resource publisher
+ Notes name
+ candidate Note ID
```

Installation writes:

```text
Note Domain Object
ResourceInstallation provenance
```

in one installation transaction.

## Freshness policy

The installer reads the current `ResourceInstallation` for the Note application ID.

If:

```text
incoming modifiedAt <= current ResourceInstallation.modifiedAt
```

the candidate is skipped.

If the incoming Resource is newer, the installer replaces the accepted Note and writes the new `ResourceInstallation` in the same installation transaction.

This gives Notes the same object-level Resource freshness model used by Archive import and other freshness-aware Resource installers. Broader multi-device synchronization/conflict policy remains separate from this basic revision ordering.

---

# Resource Worker Composition

The Resource Worker registers:

```text
NoteInterpreter
NoteValidator
NoteInstaller
NoteResourceHandler
```

The generic Resource layer decodes and dispatches the Resource.

The Notes Domain owns:

```text
meaning
identity
validation
installation policy
Domain persistence mapping
```

---

# Synchronization Boundary

Normal Notes reads are local.

```text
Notes UI
    ↓
NotesService
    ↓
accepted local Notes
```

The previously implemented `NotesResourceAcquisition` path was removed because ordinary Notes reads should not enumerate/query relays.

Remote synchronization remains a separate responsibility.

A future synchronization component may:

```text
discover remote Notes
install accepted remote changes
apply a conflict policy
update local accepted state
notify Notes runtime projections
```

That work should not be added back into `NotesService.getAllNotes()` or search operations.

---

# Notes and Bible

The Bible Reader uses Notes as a separate Domain capability.

It subscribes to Notes collection changes and performs a Notes search using the active book/chapter reference.

The dependency is:

```text
Bible UI
    → Notes public/domain capability
```

Notes are not text markup.

Bible Text Markup controls visual formatting of Bible words; Notes are separate user-authored Domain Objects.

---

# Current UI Behavior

## Editing

The Note editor uses Quill in the browser.

User edits update:

```text
html
text
title
```

in component state.

Saving calls `NotesService.put()`.

## dateUpdated

The current Note editor does not automatically advance `dateUpdated` when Save is clicked.

That field is persisted exactly as supplied by the UI Domain Object.

Changing that behavior should be treated as an explicit Note-domain behavior change, not hidden persistence behavior.

## Drafts

A newly created Note is transient UI state until saved.

Closing without saving does not publish or persist it.

## Archive import/export

Notes participate in the shared application Archive subsystem.

Archive export selects persisted Note Domain Objects through their `ResourceInstallation` state. Archive import reconstructs normal Notes Resource content through `NotesResourcePublication`, then re-enters the existing Notes Resource interpreter, validator, and installer.

After Archive import successfully handles Notes Resources, the application-level Archive import event calls `NotesService.refresh()`. The main thread sends only a refresh command; the Notes worker reloads accepted Notes from IndexedDB and rebuilds its derived search projection off the main thread.

Notes do not own a separate archive importer/exporter and Notes UI contains no ad-hoc archive implementation.

See:

```text
03_implementation/archive/001-kjvonly-archive.md
```

---

# Failure Semantics

## Domain/Outbox transaction fails

No committed Note change should be advertised to the search worker.

## Search worker update fails after commit

Durable Note state and Outbox state remain authoritative.

The search projection can be rebuilt from accepted Notes.

## Relay publication fails

The Outbox entry remains pending according to the application-wide Outbox behavior.

The local accepted Note remains committed.

## Application closes after local commit

The durable Outbox preserves the outbound intent for later processing.

---

# Application Composition

`Application` constructs:

```text
IndexedDBNotesStore
IndexedDBNotesWriteTransaction
NotesResourcePublication
NotesService
```

`NotesService` is exposed through `ApplicationContext`.

Application composition also registers `NotesService` as a consumer of generic Archive import-completion events. The service refreshes only when handled imported Resource Types include the Notes Resource Type.

Svelte Notes/Bible consumers use that application-owned instance rather than constructing Notes services themselves.

Inbound Resource handler/interpreter/validator/installer composition remains in the Resource Worker.

---

# Public Boundaries

External consumers use:

```text
$lib/domains/notes
$lib/domains/notes/ui
```

The root Domain API is kept separate from browser-only Svelte exports.

Internal Notes implementation code may use direct internal imports.

---

# Testing

Current tests cover:

```text
Note identity
Resource source identity
module Resource selection
interpreter
validator
installer
Resource handler
IndexedDB Notes store
installation transaction
write transaction
Resource publication
NotesService
Notes search runtime/worker behavior
```

When adding synchronization later, add synchronization-specific tests rather than changing local search tests into relay tests.

---

# Architectural Invariants

1. Notes are application Domain Objects first.
2. Normal Notes reads/search are local and do not query relays.
3. The selected Notes Resource source determines publisher/name identity for new Notes.
4. Notes are persisted in the shared `domain_objects` store.
5. Search state is derived worker state, not an independent source of truth.
6. Create/update writes persist Domain state + ResourceInstallation revision state + Outbox intent atomically.
7. Delete removes Domain state + ResourceInstallation revision state while persisting the deletion intent atomically.
8. Search runtime changes happen after durable commit.
9. Inbound installation is freshness-aware through `ResourceInstallation.modifiedAt`.
10. Cross-worker persistence changes can rebuild the Notes worker projection through `NotesService.refresh()`.
9. Resource discovery/synchronization stays outside `NotesService`.
10. Notes are distinct from Bible Text Markup.

---

# Important Files

```text
src/lib/domains/notes/models/
src/lib/domains/notes/persistence/
src/lib/domains/notes/resources/
src/lib/domains/notes/runtime/search/
src/lib/domains/notes/services/notes.service.ts
src/lib/domains/notes/workers/kjvnotes.worker.ts
src/lib/domains/notes/modules/

src/lib/application/runtime/application.ts
src/lib/application/runtime/application-context.ts
```

---

# Final Mental Model

```text
accepted Notes
    = local Domain state

Notes search worker
    = derived local projection

Resource installation
    = explicit inbound acceptance path

Outbox
    = durable outbound publication

Synchronization
    = separate future responsibility
```
