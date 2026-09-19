# Resource Selection Implementation

**Status:** Current
**Area:** Application Runtime / Resource Selection

---

# Purpose

This document describes how KJVOnly.bible chooses Resource sources for new module instances and preserves those choices for the lifetime of each module Buffer.

The central rule is:

> Resource selection is application/runtime context. Domain services receive `PublishedResourceReference` values, but do not know about Pane, Buffer, Workspace, or selection policy.

The current flow is:

```text
ResourceSelectionService
    ↓
ModuleResourceSelectionContributor
    ↓
ModuleResourceSelectionBuilder
    ↓
ModuleBufferFactory
    ↓
Buffer.resourceSelections
    ↓
Pane
    ↓
ModuleResourceSelectionResolver
    ↓
PublishedResourceReference
    ↓
Domain service
```

---

# Scope

This document covers:

- application-wide current and fallback Resource selections,
- persistence of current selections,
- module-owned Resource requirements,
- related vs independent Buffer creation,
- Buffer Resource-selection snapshots,
- module Resource resolution by `paneID`,
- user-owned default Resources such as Notes and Bible Text Markup,
- Reading Plans default Resource selection,
- dependency direction and extension rules.

This document does not define Resource Discovery, Resolution, Installation, publication, synchronization, or UI for choosing alternate Resource publishers.

---

# Core Distinction

The application has two distinct kinds of Resource-selection state.

## Application selection state

`ResourceSelectionService` owns the application's effective current selections.

It is used when creating a new module Buffer.

## Module selection state

`Buffer.resourceSelections` is a snapshot captured for one concrete module instance.

Once a module is running, normal module code reads from the Buffer snapshot rather than repeatedly consulting mutable global selection state.

```text
Application selections
    ↓
create module Buffer
    ↓
capture module-specific selections
    ↓
Buffer.resourceSelections
    ↓
module lifetime
```

A later application-wide selection change does not silently rewrite the Resource context of an existing Buffer.

---

# ResourceSelections

Selections are represented as:

```ts
Record<string, PublishedResourceReference>
```

The key is the Resource Type.

A `PublishedResourceReference` contains:

```ts
{
    publisher: string;
    resourceId: string;
}
```

`parseResourceSelections()` validates that each map key matches the Resource Type encoded by the corresponding `resourceId`.

This prevents storing a Resource under an unrelated type key.

---

# ResourceSelectionService

Implementation:

```text
src/lib/application/resources/resource-selection.service.ts
```

The service owns two maps.

## Current selections

Current selections are established by:

- restored persisted state,
- bootstrap initialization,
- explicit application/user selection.

Only current selections are persisted.

## Fallback selections

Fallback selections are immediate application defaults supplied during composition.

They make core Resource Types usable before bootstrap discovery/installation finishes.

Fallbacks are not persisted merely because the application started with them.

Lookup follows:

```text
current selection
    ↓ if missing
fallback selection
```

This separation matters because a bootstrap-provided default may replace a fallback, while an explicitly restored/current selection remains authoritative.

---

# Persistence

Current Resource selections are persisted through:

```text
LocalStorageResourceSelectionStore
```

Current storage key:

```text
resourceSelections
```

The store serializes `ResourceSelections` as JSON and validates them through `parseResourceSelections()` when restoring.

`ResourceSelectionService.restore()` restores persisted current selections.

`ResourceSelectionService.initializeMissing()` initializes only Resource Types that do not already have a current selection.

A fallback alone does not block bootstrap initialization.

---

# Effective Snapshot

`ResourceSelectionService.snapshot()` returns the effective application selection state used for module creation.

Conceptually:

```text
fallback selections
    overlaid by
current selections
```

Returned references are copied.

The snapshot is not a live view into `ResourceSelectionService`.

---

# Module-Owned Selection Policy

Generic Application code does not own a table of module Resource requirements.

Instead each module has a `ModuleResourceSelectionContributor`.

The contributor contract is:

```ts
interface ModuleResourceSelectionContributor {
    readonly module: Modules;

    build(
        context: ModuleResourceSelectionBuildContext
    ): ResourceSelections;
}
```

The build context contains:

```text
originatingSelections
currentSelections
```

Module-specific contributors live with the Domain that owns those semantics.

Current contributors include:

```text
Bible
Bible Search
Strong's
Notes
Reading Plans
explicit Resource-free modules
```

The generic builder composes contributors but does not know their Domain-specific Resource Types.

---

# Generic Required-Selection Mechanism

`buildRequiredResourceSelections()` implements the common inheritance rule:

```text
originating Buffer selection
    ↓ if missing
current application selection
```

The helper is mechanism only.

The Domain contributor decides which Resource Types are required and whether additional Domain-specific defaults must be derived.

---

# Current Module Requirements

## Bible

The Bible module currently requests:

```text
Bible Chapters
Paragraphs
Pericopes
Bible Booknames
Strong's Definitions
Bible Text Markup
Notes
```

The contributor also derives user-owned defaults for Notes and Text Markup when no selection already exists.

## Bible Search

```text
Bible Search Index
Bible Chapters
Bible Booknames
```

## Strong's

```text
Strong's Definitions
Bible Chapters
Bible Search Index
Bible Booknames
```

## Notes

```text
Bible Chapters
Bible Booknames
Notes
```

If no Notes Resource is selected and a current authenticated user exists, the Notes contributor derives that user's default Notes selection.

## Reading Plans

```text
Bible Booknames
Plan Definitions
Plan Subscriptions
```

When missing, Plan Definition and Plan Subscription selections are derived from the current authenticated user.

## Resource-free modules

Modules with no Resource requirements use `NoResourceModuleResourceSelectionContributor`.

The application explicitly registers Resource-free contributors for modules such as:

```text
MODULES
LOGIN
SETTINGS
NULL
PROFILE
```

Unregistered modules fail rather than silently being treated as Resource-free.

---

# User-Owned Default Resources

Some module defaults depend on the authenticated identity.

The contributors depend only on the narrow application capability:

```ts
tryGetUserId(): string | undefined
```

They do not receive Nostr private keys or Nostr-specific authentication state.

This keeps Resource-selection policy dependent on application identity rather than authentication mechanism.

## Bible Text Markup

If no Text Markup source is already selected, the Bible contributor derives a default from:

```text
current user publisher
+
selected Bible Chapter Resource version/path
```

An existing selection always wins.

## Notes

Bible and Notes module contributors may derive the current user's default Notes Resource when one is missing.

## Reading Plans

The Plans contributor may derive the current user's default Plan Definition and Plan Subscription Resource selections when missing.

---

# ModuleResourceSelectionBuilder

Implementation:

```text
src/lib/application/resources/module-resource-selection-builder.ts
```

Responsibilities:

1. find the contributor registered for the requested module,
2. obtain the current application selection snapshot,
3. provide originating + current selections to the contributor,
4. return the completed `ResourceSelections` snapshot.

It deliberately does not contain code such as:

```ts
if (module === Modules.BIBLE) {
    // ...
}
```

Adding or changing module Resource semantics should normally change that Domain's contributor, not the generic builder.

---

# Independent vs Related Module Creation

`ModuleBufferFactory` supports two creation modes.

## Independent

```text
ModuleBufferFactory.independent(module)
    ↓
empty originating selections
    ↓
module contributor
    ↓
new Buffer snapshot
```

## Related

```text
ModuleBufferFactory.related(module, originatingBuffer)
    ↓
originatingBuffer.resourceSelections
    ↓
module contributor
    ↓
new Buffer snapshot
```

Related creation preserves compatible Resource context from the originating module before falling back to newer application selections.

This is important when navigation connects two modules that should continue using the same Bible/version/publisher context.

---

# Buffer Contract

A Buffer contains:

```text
key
componentName
bag
resourceSelections
```

`resourceSelections` belongs to the module instance just as `bag` holds module navigation/runtime state.

A module transition that requires a new module instance should create a new Buffer rather than merely mutate `componentName`, because the new module needs its own Resource-selection snapshot.

---

# ModuleResourceSelectionResolver

Svelte/module consumers resolve Resource context through:

```text
ModuleResourceSelectionResolver
```

Typical use:

```ts
const source =
    moduleResourceSelectionResolver.require(
        paneID,
        RESOURCE_TYPE
    );
```

Resolution performs:

```text
paneID
    ↓
WorkspaceRuntime.findPane()
    ↓
Pane.buffer
    ↓
Buffer.resourceSelections
    ↓
required Resource Type
    ↓
PublishedResourceReference
```

The resolver fails when the Pane does not exist, has no Buffer, or the required Resource Type is absent.

---

# Dependency Direction

Correct:

```text
Svelte/module code
    ↓
ModuleResourceSelectionResolver
    ↓
PublishedResourceReference
    ↓
Domain service
```

Incorrect:

```text
Domain service
    ↓
Pane / Buffer / Workspace
```

Domain services must remain independent from module runtime mechanics.

---

# Selection vs Presentation

A required Resource Type does not imply that the Resource must always be visibly rendered.

For overlays such as Paragraphs, Pericopes, or Text Markup, these are separate concerns:

```text
which Resource source is selected?
```

and:

```text
is that overlay currently shown?
```

Settings/UI presentation toggles must not be represented by adding/removing required module Resource Types.

---

# Selection vs Write Ownership

Module Resource selection describes read/use context.

It does not automatically determine write ownership.

For user-owned data, write policy normally derives from the authenticated application identity even if future read selection allows other publishers.

Keep those policies distinct.

---

# Public Boundary

External Domain code consumes the stable application contracts through:

```text
$lib/application
```

Application-internal implementation files use direct imports where appropriate to avoid self-barrel cycles.

`ResourceSelectionService` itself remains Application-owned composition state and is not exposed as a normal Svelte capability. Running modules consume the captured Buffer context through `ModuleResourceSelectionResolver`.

---

# Important Files

Application mechanics:

```text
src/lib/application/resources/
    resource-selection.service.ts
    resource-selection-store.ts
    resource-selections.ts
    module-resource-selection-contributor.ts
    module-resource-selection-builder.ts
    module-resource-selection-resolver.ts
    no-resource-module-resource-selection-contributor.ts
```

Persistence:

```text
src/lib/infrastructure/persistence/
    local-storage-resource-selection-store.ts
```

Buffer integration:

```text
src/lib/application/runtime/buffer/
    module-buffer-factory.ts
    models/buffer.model.ts
```

Domain contributors:

```text
src/lib/domains/bible/resources/
src/lib/domains/notes/resources/
src/lib/domains/reading-plans/resources/
src/lib/domains/strongs/resources/
```

---

# Invariants

Preserve these rules:

```text
Module Resource semantics belong to Domain/module contributors.

The generic builder contains no module-specific Resource IDs or branching.

Every module has an explicitly registered contributor.

A Buffer captures a Resource-selection snapshot.

Related module creation prefers originating selections.

Module/UI code reads through ModuleResourceSelectionResolver.

Domain services receive PublishedResourceReference values.

Domain services do not depend on Pane/Buffer/Workspace selection mechanics.

Authentication-dependent defaults depend on user identity, not private-key mechanics.
```

---

# Anti-Patterns

Do not reintroduce:

- a central `MODULE_RESOURCE_REQUIREMENTS` table,
- `if (module === ...)` branches in the generic builder,
- normal module reads directly against mutable `ResourceSelectionService`,
- deriving a Resource source from a Bible version string when a selected reference already exists,
- Resource-selection logic inside Domain services,
- Resource-source prop drilling when `paneID` and the resolver are already available.

---

# Relationship to Other Docs

See also:

```text
docs/03_implementation/modules/001-module-contract.md
docs/03_implementation/modules/003-navigation-context.md
docs/03_implementation/resources/004-resource-installation.md
docs/03_implementation/resources/005-resource-lifecycle-content.md
```
