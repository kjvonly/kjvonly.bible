# Target Code Organization

**Status**

Refactoring Guide

---

# Purpose

This document defines the target physical organization for the KJVOnly client implementation.

It translates the ownership model defined by the Application Architecture, Resource Boundary, and `010-domain-implementation-map.md` into a concrete TypeScript/Svelte directory structure and dependency direction.

This document answers:

> **How should the codebase be physically organized so that architectural ownership is visible and enforceable?**

This is an implementation organization guide.

It does not introduce new architectural ownership.

---

# Goal

The current codebase is primarily organized by technical role:

```text
components/
models/
modules/
services/
workers/
nostr/
```

This makes it difficult to determine which architectural owner gives a file its meaning.

The target organization should instead make ownership apparent from location.

Conceptually:

```text
owner
    ↓
implementation responsibility
    ↓
technical mechanism
```

rather than:

```text
technical mechanism
    ↓
unrelated application responsibilities
```

The primary organizational boundary is therefore ownership.

---

# Target Top-Level Structure

The intended client organization is:

```text
client/src/lib/

    application/

    domains/

    resource/

    infrastructure/

    components/
```

Each area has a distinct purpose.

```text
application/
    application-wide coordination and Runtime

domains/
    Domain-owned application behavior

resource/
    Resource Boundary implementation

infrastructure/
    reusable technical capabilities

components/
    genuinely shared presentation primitives
```

---

# Complete Target Shape

The target structure should evolve approximately toward:

```text
client/src/lib/

├── application/
│   ├── runtime/
│   │   ├── workspace/
│   │   ├── pane/
│   │   ├── buffer/
│   │   └── module/
│   │
│   ├── services/
│   │
│   ├── events/
│   │
│   └── navigation/
│
├── domains/
│   ├── bible/
│   │   ├── api/
│   │   ├── objects/
│   │   ├── services/
│   │   ├── persistence/
│   │   ├── resources/
│   │   ├── modules/
│   │   │   ├── reading/
│   │   │   └── search/
│   │   └── components/
│   │
│   ├── notes/
│   │   ├── api/
│   │   ├── objects/
│   │   ├── services/
│   │   ├── persistence/
│   │   ├── resources/
│   │   ├── modules/
│   │   │   ├── list/
│   │   │   └── search/
│   │   └── components/
│   │
│   ├── reading-plans/
│   │   ├── api/
│   │   ├── objects/
│   │   ├── services/
│   │   ├── persistence/
│   │   ├── resources/
│   │   ├── modules/
│   │   └── components/
│   │
│   └── settings/
│       ├── api/
│       ├── objects/
│       ├── services/
│       ├── persistence/
│       └── components/
│
├── resource/
│   ├── nostr/
│   ├── discovery/
│   ├── resolution/
│   ├── installation/
│   ├── publishing/
│   │   └── outbox/
│   ├── synchronization/
│   ├── archives/
│   └── shared/
│
├── infrastructure/
│   ├── nostr/
│   ├── persistence/
│   ├── http/
│   ├── blossom/
│   ├── workers/
│   ├── compression/
│   └── crypto/
│
└── components/
    └── ...
```

This is a target organization, not a requirement to create every directory immediately.

Directories should be introduced when implementation actually requires them.

---

# Organizational Rule

The first question when placing code is:

> **Who owns this responsibility?**

Only after ownership is known should the implementation role determine the subdirectory.

For example:

```text
Bible chapter parser
    ↓
Bible owns the meaning
    ↓
domains/bible/resources/
```

not:

```text
parser
    ↓
global parsers/
```

Likewise:

```text
Notes repository
    ↓
Notes owns the state
    ↓
domains/notes/persistence/
```

not:

```text
repository
    ↓
global repositories/
```

---

# Domains

Domain code lives beneath:

```text
domains/
```

Each Domain should be understandable largely from its own subtree.

The primary Domains are:

```text
domains/
    bible/
    notes/
    reading-plans/
    settings/
```

A Domain may contain:

```text
api/
objects/
services/
persistence/
resources/
modules/
components/
```

but none of these subdirectories are mandatory.

Only create them when they represent real implementation responsibilities.

---

# Domain Public API

Each Domain should expose an explicit public boundary.

Preferred location:

```text
domains/<domain>/api/
```

The public API is the normal entry point for external consumers.

For example:

```text
domains/bible/api/
domains/notes/api/
domains/reading-plans/api/
```

Consumers should prefer:

```text
import { ... } from '$lib/domains/bible/api'
```

rather than importing internal files such as:

```text
$lib/domains/bible/services/...
$lib/domains/bible/persistence/...
$lib/domains/bible/objects/...
```

The API boundary makes ownership enforceable.

---

# Domain Internals

Everything except the Domain's public API should be treated as private implementation unless explicitly shared.

Conceptually:

```text
domains/bible/

    api/
        public

    objects/
        internal

    services/
        internal

    persistence/
        internal

    resources/
        internal

    modules/
        presentation owned by Bible
```

TypeScript export visibility alone does not define architectural visibility.

Directory ownership does.

---

# Domain Objects

Domain Objects belong beneath the Domain that gives them meaning.

Preferred location:

```text
domains/<domain>/objects/
```

Examples:

```text
domains/bible/objects/
    bible-location.ts
    chapter.ts
    verse.ts

domains/notes/objects/
    note.ts

domains/reading-plans/objects/
    reading-plan.ts
    completed-reading.ts
```

A global `models/` directory should gradually disappear.

---

# Domain Services

A service belongs under a Domain when only that Domain gives the behavior meaning.

Preferred location:

```text
domains/<domain>/services/
```

Examples:

```text
domains/bible/services/
    chapter-service.ts
    annotations-service.ts

domains/notes/services/
    notes-service.ts

domains/reading-plans/services/
    progression-service.ts
```

Do not keep a service globally shared merely because more than one consumer calls it.

The key question is ownership, not caller count.

---

# Domain Persistence

Persistence behavior specific to a Domain belongs beneath that Domain.

Preferred location:

```text
domains/<domain>/persistence/
```

For example:

```text
domains/notes/persistence/
    notes-repository.ts

domains/bible/persistence/
    chapters-repository.ts

domains/reading-plans/persistence/
    plan-repository.ts
```

These components may use generic IndexedDB infrastructure.

They own Domain-specific:

* record mapping,
* query semantics,
* indexes required by Domain behavior,
* and persistence APIs.

---

# Resource Mapping Inside a Domain

Domain-specific translation between Resource content and Domain information belongs with the Domain.

Preferred location:

```text
domains/<domain>/resources/
```

This directory may contain:

```text
parser
serializer
resource-type mapping
Domain validation adapter
Resource-to-Domain conversion
```

For example:

```text
domains/bible/resources/
    chapters-resource.ts

domains/notes/resources/
    notes-resource.ts
```

These files understand Bible or Notes meaning.

They should not own relay communication.

---

# Domain Modules

Modules are Runtime presentation units, but their application behavior belongs to their Domain.

Preferred location:

```text
domains/<domain>/modules/
```

Examples:

```text
domains/bible/modules/
    reading/
    search/

domains/notes/modules/
    list/
    search/

domains/reading-plans/modules/
    reader/
```

This keeps presentation behavior near the Domain it represents while preserving the Module concept used by the Workspace Runtime.

---

# Domain Components

Presentation components meaningful only within one Domain should live with that Domain.

For example:

```text
domains/bible/components/
    verse.svelte
    chapter-header.svelte

domains/notes/components/
    note-editor.svelte
```

They should not move into the root `components/` directory simply because they are Svelte components.

---

# Bible Domain

The Bible Domain target shape may resemble:

```text
domains/bible/

├── api/
│   └── index.ts
│
├── objects/
│   ├── chapter.ts
│   ├── verse.ts
│   └── bible-location-reference.ts
│
├── services/
│   ├── chapter-service.ts
│   ├── annotations-service.ts
│   └── strongs-service.ts
│
├── persistence/
│   ├── chapter-repository.ts
│   └── annotations-repository.ts
│
├── resources/
│   ├── chapters-resource.ts
│   ├── annotations-resource.ts
│   └── strongs-resource.ts
│
├── modules/
│   ├── reading/
│   └── search/
│
└── components/
```

Exact names should follow the existing implementation as it is moved.

Do not rename working concepts merely to make this tree look symmetrical.

---

# Notes Domain

The Notes target may resemble:

```text
domains/notes/

├── api/
├── objects/
│   └── note.ts
├── services/
├── persistence/
├── resources/
├── modules/
│   ├── list/
│   └── search/
└── components/
```

Notes Search remains Notes-owned.

There is no shared Search Domain.

---

# Reading Plans Domain

The Reading Plans target may resemble:

```text
domains/reading-plans/

├── api/
├── objects/
│   ├── reading-plan.ts
│   └── completed-reading.ts
├── services/
├── persistence/
├── resources/
├── modules/
└── components/
```

Completed readings remain part of Reading Plans even if they have an independent Resource representation.

---

# Settings Domain

Settings should contain preferences with actual application meaning.

Potential structure:

```text
domains/settings/

├── api/
├── objects/
├── services/
├── persistence/
└── components/
```

Local-only settings do not need Resource-related code.

A `resources/` directory should only be introduced if settings are deliberately given an external Resource lifecycle.

---

# Application

Application-wide code lives beneath:

```text
application/
```

This is not a dumping ground for anything used by more than one Domain.

Code belongs here only when its meaning is genuinely application-wide.

---

# Application Runtime

Runtime composition belongs under:

```text
application/runtime/
```

Expected concepts include:

```text
workspace/
pane/
buffer/
module/
```

Conceptually:

```text
application/runtime/

    workspace/
        workspace runtime behavior

    pane/
        pane tree and operations

    buffer/
        buffer and navigation context

    module/
        module instance registration/loading
```

---

# Workspace Runtime

The Workspace Runtime should eventually own logic currently concentrated in `+page.svelte`.

Target:

```text
application/runtime/workspace/
```

Responsibilities include:

* root Pane tree,
* Pane operations,
* Workspace restoration,
* layout mutation,
* Module placement,
* and future Workspace snapshot behavior.

`+page.svelte` should become primarily the SPA shell and renderer.

---

# Pane

Pane implementation belongs under:

```text
application/runtime/pane/
```

This includes:

* Pane type,
* tree operations,
* split behavior,
* close behavior,
* replacement behavior,
* and Pane traversal.

Pane must not contain Domain behavior.

---

# Buffer

Buffer belongs under:

```text
application/runtime/buffer/
```

It owns the Runtime association between:

```text
Pane
    ↓
Buffer
    ├── Navigation Context
    └── Module Instance
```

Buffer must remain Domain-agnostic.

---

# Module Runtime

Generic Module loading and lifecycle behavior belongs under:

```text
application/runtime/module/
```

Domain-specific Module implementations remain inside their Domains.

This produces:

```text
application/runtime/module/
    generic Module runtime

domains/bible/modules/
    Bible modules

domains/notes/modules/
    Notes modules
```

---

# Application Navigation

Cross-Domain navigation primitives belong under:

```text
application/navigation/
```

This may contain shared navigation values and behavior such as:

```text
Navigation Context

Bible location navigation reference

Module-opening requests
```

This layer coordinates navigation.

It does not own the underlying Domain information.

---

# Shared Identifiers

A value used to communicate between owners may be application-level when neither consumer should own the dependency.

The existing Bible Location Reference is an important example.

A practical location may be:

```text
application/navigation/bible-location-reference.ts
```

or another application-level shared-identifiers location.

The final location should reflect how the refactor exposes it.

---

# Application Services

Cross-Domain coordination belongs beneath:

```text
application/services/
```

Examples may include services that genuinely coordinate multiple owners.

A service does not belong here merely because multiple callers use it.

Before placing a service here, ask:

> **Would this behavior still make sense if one of its consuming Domains disappeared?**

If the answer is no, it likely belongs to the remaining owner.

---

# Application Events

The event infrastructure and shared event contracts belong under:

```text
application/events/
```

Domain-specific event declarations may remain with the Domain if their meaning belongs entirely there.

Application Events represent completed facts.

They should not replace Public APIs for commands.

---

# Resource Boundary Implementation

The Resource Boundary implementation lives beneath:

```text
resource/
```

This directory owns the external Resource lifecycle.

It does not own Domain meaning or generic transport capability.

---

# Resource Structure

Target:

```text
resource/

├── nostr/
├── discovery/
├── resolution/
├── installation/
├── publishing/
│   └── outbox/
├── synchronization/
├── archives/
└── shared/
```

These directories correspond to Resource Boundary responsibilities rather than individual Domains.

---

# Resource Nostr Mapping

Generic Resource-to-Nostr event behavior belongs under:

```text
resource/nostr/
```

Potential responsibilities include:

* Resource event parsing,
* Resource event validation,
* Resource event construction,
* Published Resource address extraction,
* and Resource tag handling.

Generic relay connections themselves belong to Infrastructure.

---

# Resource Discovery

Location:

```text
resource/discovery/
```

Responsibilities include:

* discovery input handling,
* Nostr Resource filter creation,
* relay-result normalization,
* deduplication,
* current publication selection,
* and bounded reference traversal.

Discovery may call generic Nostr Infrastructure.

It must not interpret Domain schemas.

---

# Resource Resolution

Location:

```text
resource/resolution/
```

Responsibilities include:

* representation dispatch,
* descriptor parsing,
* external retrieval coordination,
* integrity verification,
* descriptor collection handling,
* and resolution failures.

Provider-specific retrieval belongs behind Infrastructure adapters.

---

# Resource Installation

Location:

```text
resource/installation/
```

Generic Installation coordination belongs here.

It coordinates:

```text
Verified Resource Content
        ↓
Owning Domain Resource Mapping
        ↓
Candidate Domain Objects
        ↓
Domain Validation
        ↓
Acceptance
```

The actual Bible/Notes/Plans interpretation remains in:

```text
domains/<domain>/resources/
```

---

# Resource Publishing

Location:

```text
resource/publishing/
```

Generic publication preparation and coordination belongs here.

The durable queue belongs beneath:

```text
resource/publishing/outbox/
```

Possible responsibilities include:

* publication intent,
* Resource publication preparation,
* Outbox state,
* retry coordination,
* safe coalescing,
* and publication result state.

---

# Synchronization

Location:

```text
resource/synchronization/
```

Responsibilities include:

* LWW reconciliation,
* `modifiedAt` / `created_at` comparison,
* candidate selection,
* coordination with Installation,
* and superseding stale publication work where appropriate.

It does not directly persist Domain state.

---

# Resource Archives

Location:

```text
resource/archives/
```

Responsibilities include:

* `.kjva` envelope,
* archive validation,
* Resource entry export,
* Resource entry import,
* and archive format versioning.

Domain Resource serialization remains with the owning Domain.

---

# Resource Shared Code

Use:

```text
resource/shared/
```

sparingly.

Only genuinely shared Resource Boundary concepts belong there.

Examples might include:

```text
PublishedResourceIdentity

ResourceRepresentation

ResourceDescriptor
```

Do not create `shared/` merely to avoid deciding ownership.

---

# Infrastructure

Technical capabilities live beneath:

```text
infrastructure/
```

Infrastructure should know how to perform technical work.

It should not decide application policy.

---

# Nostr Infrastructure

Location:

```text
infrastructure/nostr/
```

Responsibilities include:

* relay connections,
* subscriptions,
* REQ execution,
* AUTH handling,
* event publication transport,
* generic event verification,
* and Nostr-library adaptation.

It should not know:

```text
Bible chapter
Note
Reading Plan
Resource Installation policy
LWW Domain meaning
```

---

# Persistence Infrastructure

Location:

```text
infrastructure/persistence/
```

Responsibilities include generic storage capabilities such as:

* IndexedDB database initialization,
* transactions,
* schema/version upgrade mechanics,
* generic storage helpers,
* and infrastructure-level adapters.

Domain persistence logic remains inside Domains.

Resource Boundary persistence logic remains inside `resource/`.

---

# HTTP Infrastructure

Location:

```text
infrastructure/http/
```

Generic HTTP transport lives here.

Resource Resolution decides why a request is needed.

HTTP Infrastructure only performs it.

---

# Blossom Infrastructure

Location:

```text
infrastructure/blossom/
```

Generic Blossom access may live here if it becomes substantial enough to warrant its own capability.

It should return technical results rather than Domain information.

---

# Worker Infrastructure

Location:

```text
infrastructure/workers/
```

This directory owns worker execution capabilities, not worker business responsibility.

Avoid a design where all worker code is moved here regardless of meaning.

For example:

```text
Bible indexing behavior
    belongs to Bible

worker message/execution adapter
    belongs to Infrastructure
```

---

# Compression and Crypto

Generic technical operations may live under:

```text
infrastructure/compression/
infrastructure/crypto/
```

Examples:

* gzip,
* SHA-256,
* byte transformations,
* signing adapters where appropriate.

Resource policy remains outside these directories.

---

# Shared Components

Root:

```text
components/
```

should contain only genuinely reusable presentation primitives without Domain meaning.

Examples:

```text
Button.svelte
Menu.svelte
Dialog.svelte
Splitter.svelte
```

Domain-specific presentation stays with the Domain.

Application Runtime presentation may stay near the Runtime when it is meaningful only there.

---

# No Global `models/`

The current global:

```text
models/
```

should disappear over time.

Replace it with owner-local types.

```text
models/note
    → domains/notes/objects/

models/pane
    → application/runtime/pane/

models/resource
    → resource/shared/
```

A TypeScript type is not architecturally shared merely because it is a model.

---

# No Generic Global `services/`

The current global:

```text
services/
```

should also shrink substantially or disappear.

Services move according to ownership:

```text
Bible-only
    → domains/bible/services/

Notes-only
    → domains/notes/services/

Runtime
    → application/runtime/ or application/services/

Resource lifecycle
    → resource/

technical capability
    → infrastructure/
```

This is one of the most important changes in the refactor.

---

# No Domain-Owned Raw Nostr Transport

A Domain should not import:

```text
infrastructure/nostr/
```

directly for ordinary Resource behavior.

Avoid:

```text
Bible
    ↓
Relay
```

Prefer:

```text
Bible
    ↕
Resource Boundary
    ↕
Nostr Infrastructure
```

This preserves offline-first behavior and protocol isolation.

---

# Allowed Dependency Direction

The target dependency direction is:

```text
Presentation
    ↓
Owner Public API
    ↓
Domain / Application Owner
    ↓
Resource Boundary when external lifecycle is required
    ↓
Infrastructure
```

More concretely:

```text
Domain Module
    → same Domain API

Application Runtime
    → Domain APIs

Domain
    → Domain-local persistence abstraction

Resource Boundary
    → Domain public Resource integration point

Domain persistence
    → persistence infrastructure

Resource Boundary
    → Nostr / HTTP / Blossom infrastructure
```

---

# Forbidden Dependency Direction

The refactor should eliminate patterns such as:

```text
Domain A
    → Domain B internals

Domain
    → raw relay API

UI Module
    → IndexedDB directly

Infrastructure
    → Domain service

Resource Discovery
    → Domain repository

Outbox
    → Workspace Runtime

Domain persistence
    → Pane service
```

These directions violate ownership.

---

# Domain-to-Domain Collaboration

Cross-Domain collaboration must use an explicit boundary.

Allowed mechanisms are:

```text
Public API

Application Event

Shared Identifier

Navigation Context
```

Example:

```text
Reading Plans
    ↓
Bible Location Reference
    ↓
Navigation Context
    ↓
Workspace Runtime
    ↓
Bible Module
```

Reading Plans does not import Bible internals simply because it opens Bible content.

---

# Domain Public API Imports

A useful convention is to expose a Domain barrel:

```text
domains/bible/api/index.ts
```

Consumers may import from that boundary.

Avoid broad barrels at:

```text
domains/bible/index.ts
```

if that makes private implementation accidentally public.

Public surface area should remain deliberate.

---

# Internal Imports

Within one owner, ordinary relative or owner-local imports are acceptable.

For example:

```text
domains/bible/services/chapter-service.ts
    → ../persistence/chapter-repository
```

The architecture does not require interfaces between every pair of files inside the same owner.

DDD boundaries exist between owners, not between every class.

---

# Resource-to-Domain Integration

The Resource Boundary needs a deliberate way to ask the owning Domain to interpret Resource content.

A target dependency might conceptually be:

```text
resource/installation/
        ↓
Domain Resource Integration API
        ↓
domains/bible/resources/
```

The exact interface is intentionally left to implementation work.

Important constraints:

* Resource code does not parse Bible schema itself.
* Bible code does not perform relay Discovery itself.
* Installation coordinates the boundary.
* Bible validates Bible meaning.

---

# Domain-to-Resource Publication

The reverse path should preserve the same ownership.

Conceptually:

```text
Bible Domain
    ↓
Bible Resource Mapping
    ↓
Resource Publishing
    ↓
Nostr Event Processing
    ↓
Nostr Infrastructure
```

The Domain determines the information being represented.

The Resource Boundary determines its external lifecycle.

---

# Existing Nostr Files

Existing files under:

```text
client/src/lib/nostr/
```

should not simply be moved wholesale into:

```text
resource/nostr/
```

They first need classification.

For example:

```text
chapters.nostr.ts
```

likely contains two responsibilities:

```text
Bible-specific Resource knowledge
    → domains/bible/resources/

generic event/query behavior
    → resource/ or infrastructure/nostr/
```

Likewise:

```text
offline.nostr.ts
```

should be decomposed based on actual responsibilities rather than renamed as one unit.

---

# `+page.svelte`

The route remains:

```text
client/src/routes/+page.svelte
```

because the application is still a single-route SPA.

The target is not to remove it.

The target is to reduce its responsibilities.

Eventually:

```text
+page.svelte
    owns:
        shell rendering
        Runtime attachment
        recursive presentation hookup

Workspace Runtime
    owns:
        Workspace state
        Pane tree mutation
        Buffer lifecycle
        Runtime commands
```

Routing must not become the application's primary navigation model.

Panes remain the navigation/composition model.

---

# Svelte Components and Domain APIs

A Domain Module component may call its own Domain API directly.

For example:

```text
BibleReading.svelte
    ↓
Bible API
```

It does not need an Application Service simply because the caller is UI code.

Application Services are for genuinely application-level coordination.

---

# Persistence Dependency Rule

Domain persistence implementation may depend on generic IndexedDB infrastructure:

```text
domains/notes/persistence/
    ↓
infrastructure/persistence/
```

But generic persistence infrastructure must not depend back on Notes.

Likewise:

```text
resource/publishing/outbox/
    ↓
infrastructure/persistence/
```

is allowed.

---

# Search Organization

Search remains a feature within its owner.

Target examples:

```text
domains/bible/modules/search/
domains/bible/services/search-service.ts

domains/notes/modules/search/
domains/notes/services/search-service.ts
```

If shared search-engine integration is substantial, technical adapters may live in Infrastructure.

For example:

```text
infrastructure/search/
    flexsearch adapter
```

The adapter knows how to execute indexing/search operations.

It does not determine Bible or Notes search meaning.

---

# Tests

Tests should follow ownership where practical.

For example:

```text
domains/bible/
    ...
    tests/

resource/resolution/
    ...
    tests/
```

or colocated test files.

The exact test layout is not architecturally important.

The important rule is that tests should reinforce ownership boundaries rather than require importing private code across owners.

---

# Naming

Prefer names that describe application responsibility.

Good:

```text
BibleApi

ChapterService

ResourceResolver

OutboxRepository

WorkspaceRuntime
```

Avoid generic names that erase ownership:

```text
DataService

CommonManager

GlobalStore

UtilityService

ResourceHelper
```

A generic name is often a warning that responsibility is unclear.

---

# `shared/` Policy

Avoid broad global `shared/` directories.

A shared directory frequently becomes an escape hatch from ownership.

Before placing anything in shared code, ask:

```text
Does one owner give this concept meaning?
    yes → put it there

Is it genuinely application-wide?
    yes → application/

Is it a generic technical capability?
    yes → infrastructure/

Is it a Resource protocol concept?
    yes → resource/
```

Only create a shared location after those answers fail legitimately.

---

# Dependency Cycles

The target organization should avoid owner-level dependency cycles.

Especially avoid:

```text
Bible → Reading Plans → Bible

Domain → Resource → Domain private implementation

Application Runtime → Domain internal → Runtime
```

Where collaboration creates a cycle, introduce the appropriate public boundary or application-level coordination.

Do not solve cycles by moving unrelated code into `shared/`.

---

# Migration Strategy

The target directories should be introduced incrementally.

Do not create the entire empty hierarchy before the code requires it.

Recommended pattern:

```text
select one owner
    ↓
create target boundary
    ↓
move implementation
    ↓
update imports
    ↓
verify behavior
    ↓
commit
```

A practical initial sequence is:

```text
1. Bible
2. Notes
3. Reading Plans
4. Workspace Runtime
5. Resource Boundary
6. Persistence cleanup
7. Infrastructure cleanup
```

The exact sequence may change when dependency analysis begins.

---

# Compatibility During Migration

Temporary compatibility imports or facades are acceptable when they allow gradual migration.

For example:

```text
old service import
    ↓
temporary forwarding API
    ↓
new Domain API
```

These should be visibly temporary and removed once consumers have migrated.

Avoid maintaining two authoritative implementations.

---

# Target End State

After the structural refactor, the repository should communicate architecture through location.

A developer encountering:

```text
domains/notes/
```

should know that Notes owns the code.

A developer encountering:

```text
resource/resolution/
```

should know the code handles generic Resource Resolution.

A developer encountering:

```text
infrastructure/nostr/
```

should know the code implements protocol transport capability rather than Domain behavior.

A developer encountering:

```text
application/runtime/
```

should know the code composes Workspace interaction rather than owning application content.

---

# Completion Criteria

The target organization is substantially established when:

* Domain files live primarily beneath their Domain.
* Domain consumers use explicit public APIs.
* Domain internals are no longer casually imported cross-Domain.
* Workspace, Pane, Buffer, and Module Runtime live under Application Runtime.
* `+page.svelte` no longer owns most Runtime mutation logic.
* generic Nostr transport is separated from Resource-specific processing.
* Domains do not directly query relays for ordinary Resource behavior.
* Resource Discovery, Resolution, Installation, Publishing, Synchronization, and Archives have clear implementation homes.
* Domain-specific Resource mapping remains Domain-owned.
* IndexedDB mechanics are separated from Domain persistence semantics.
* global `models/` and `services/` directories have largely disappeared.
* shared UI components contain genuinely shared presentation only.
* directory structure communicates architectural ownership without needing a separate explanation for every file.

---

# What This Document Does Not Require

This structure does not require every Domain to have:

```text
api/
objects/
services/
persistence/
resources/
modules/
components/
```

Empty symmetry is not a goal.

It also does not require:

* repository interfaces for every persisted object,
* factories for every Domain Object,
* dependency injection containers,
* controller layers,
* strategy objects,
* or one class per responsibility.

These are implementation tools, not DDD requirements.

Introduce them only when the implementation benefits from them.

---

# Big Takeaway

The target codebase should make ownership visible at the filesystem level.

```text
client/src/lib/

    domains/
        application meaning

    application/
        application coordination and Runtime

    resource/
        external Resource lifecycle

    infrastructure/
        technical capability

    components/
        genuinely shared presentation
```

The directory structure should reinforce the same rule as the architecture:

> **Place code with the owner that gives the responsibility meaning.**

DDD in KJVOnly is therefore not a folder template.

It is the alignment of:

```text
Meaning
    ↓
Ownership
    ↓
Dependency Boundary
    ↓
Code Location
```

When those four agree, the implementation reflects the architecture.
