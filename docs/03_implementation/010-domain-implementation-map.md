# Domain Implementation Map

**Status:** Current Implementation Guide

---

# Purpose

This document maps the current KJVOnly client implementation to its architectural owners.

It answers:

> **Which part of the application owns each implementation responsibility, and through which boundary should other parts of the application collaborate with it?**

This document is not a new architecture specification.

It records the ownership model that is now implemented in the client after the runtime, Resource, authentication, Notes, Reading Plans, Outbox, and general-cleanup refactors.

The current source remains authoritative when an older document or historical example disagrees with this map.

Physical directory and import-boundary conventions are documented separately in:

```text
011-target-code-organization.md
```

---

# Core Ownership Principle

Implementation ownership follows the rule:

> **Code belongs to the owner that gives the code its application meaning.**

KJVOnly currently has five important ownership areas:

```text
Domains

Application

Resource Boundary

Infrastructure

Shared
```

These areas collaborate, but collaboration does not transfer ownership.

A technical mechanism also does not become an owner merely because multiple parts of the application use it.

---

# Current High-Level Ownership Model

```text
Application
    = composition root
      + runtime coordination
      + cross-domain application behavior
      + application-owned services
      + publication/outbox coordination

Domains
    = application meaning
      + domain objects
      + domain behavior
      + domain persistence adapters
      + domain Resource interpretation/publication
      + domain presentation

Resource
    = generic Resource lifecycle contracts and machinery

Infrastructure
    = concrete technical capabilities
      such as IndexedDB and Nostr transport

Shared
    = owner-neutral utilities only
```

The dependency direction should make those responsibilities visible.

---

# Current Domains

The current primary Domains are:

```text
Bible
Notes
Reading Plans
Strong's
```

There is **not** currently a separate Settings Domain.

Settings are application preferences and are owned by the Application layer through `SettingsService`.

Strong's is also no longer treated as merely an internal Bible helper. It has its own Domain boundary and Resource lifecycle, while still being consumed primarily from Bible-related presentation.

---

# Public Owner Boundaries

The current public boundaries include:

```text
$lib/application
$lib/application/ui

$lib/domains/bible
$lib/domains/bible/ui

$lib/domains/notes
$lib/domains/notes/ui

$lib/domains/reading-plans
$lib/domains/reading-plans/ui

$lib/domains/strongs

$lib/resource
$lib/shared
```

The root API represents the logical owner.

A separate `/ui` API exists only where Svelte/browser-only presentation must remain separate from Node-safe contracts and services.

Internal implementation code may use direct internal imports where appropriate.

Composition roots and integration tests may intentionally import concrete implementations.

---

# Application Ownership

The Application layer owns behavior that is application-wide rather than meaningful to one Domain.

Current Application responsibilities include:

```text
Application composition
ApplicationContext
Workspace Runtime
Pane / Buffer coordination
Module Resource selection
application settings
account/authentication coordination
Toast behavior
per-container NavigationService creation
Outbox publication coordination
Archive import/export coordination
application configuration
```

The Application layer must not absorb Domain behavior merely because it constructs or coordinates Domain services.

---

# Application as Composition Root

The concrete `Application` class is the main browser-runtime composition root.

It constructs and wires:

```text
Application services
Workspace Runtime
Resource Worker client
Resource-selection orchestration
Domain services
Domain persistence adapters
Resource handlers
Outbox
Nostr infrastructure
Account/authentication strategies
```

The direct runtime import rule is intentionally strict:

```text
src/routes/+layout.svelte
    ↓
concrete Application
```

`+layout.svelte` is the browser application bootstrap boundary and is the only runtime location that should directly import the concrete `Application` class.

Normal application code should instead consume:

```text
$lib/application
$lib/application/ui
ApplicationContext
Domain APIs
```

This avoids making lower-level code depend back on the concrete composition root.

---

# ApplicationContext

`ApplicationContext` is the intentional Svelte-facing runtime capability surface.

It is not a registry of every object constructed by `Application`.

Current capabilities include application-wide services such as:

```text
AuthenticationService
AccountService
ToastService
SettingsService
NavigationServiceFactory
WorkspaceRuntime
ModuleResourceSelectionResolver
KJVOnlyArchiveService
```

and Domain-facing services required directly by Svelte presentation, including current Bible, Notes, Reading Plans, and Strong's services.

A service belongs in `ApplicationContext` when:

```text
Svelte needs the capability
AND
Application owns/constructs the runtime instance
```

A service should not be exposed merely because doing so is convenient for a test or internal implementation.

---

# Per-Container State

Not every Svelte-facing service should be a singleton.

`NavigationService` is the current example.

Login/Profile/Archive containers need independent navigation stacks.

Therefore ownership is:

```text
Application
    owns NavigationServiceFactory
        ↓
ApplicationContext
        ↓
Svelte container
    creates its own NavigationService instance
```

This preserves application-controlled construction without incorrectly sharing per-container state.

---

# Workspace Runtime Ownership

Workspace behavior belongs to the Application Runtime.

Current ownership is:

```text
Application
    ↓
WorkspaceRuntime
    ↓
PaneService
```

`WorkspaceRuntime` is the public Workspace coordinator.

`PaneService` is an internal implementation detail behind it.

Current Workspace responsibilities include:

```text
initialization
Pane lookup
Pane splitting
Pane deletion/collapse
Buffer replacement
Pane-ID allocation
Workspace persistence
layout derivation
Pane dimension publication/subscription
Workspace change notifications
```

Svelte/runtime consumers should use `WorkspaceRuntime`, not `PaneService`.

---

# Pane Ownership

Pane is an Application Runtime object.

A Pane owns structural placement information such as:

```text
identity
left/right child relationships
split orientation
Buffer association
transient recreation toggle
```

Pane IDs are stable rendered identities.

Pane objects may become stale after tree mutation.

Pane IDs are not reused during the page lifetime.

A split preserves the original Pane ID on the existing-side child and assigns a new ID to the newly created sibling.

Delete collapses only the minimum surrounding branch.

---

# `pane.toggle`

`pane.toggle` remains an Application Runtime implementation detail with important learned behavior.

It is used to force Svelte module recreation when required.

It must not be removed casually merely because it appears unusual.

The field is transient and is not persisted.

---

# Buffer Ownership

Buffer is an Application Runtime abstraction.

Current important Buffer state is:

```text
key
componentName
bag
resourceSelections
```

Conceptually:

```text
Pane
    ↓
Buffer
    ├── Module identity
    ├── module runtime/navigation bag
    └── captured Resource selections
```

Buffer identity is independent from Pane identity.

Buffer remains Domain-agnostic.

A new Domain Module should not require a change to Buffer semantics merely because its navigation payload differs.

Historical fields such as `name`, `component`, `keyboardBindings`, `selected`, `onFocus`, and `NullBuffer` are not part of the current contract.

---

# Module Resource Selection Ownership

Resource selection is coordinated by the Application but Domain semantics remain Domain-owned.

Current flow:

```text
ResourceSelectionService
    ↓
ModuleResourceSelectionBuilder
    ↓
Domain/module contributor
    ↓
ModuleBufferFactory
    ↓
Buffer.resourceSelections
    ↓
ModuleResourceSelectionResolver
    ↓
Module UI
```

Important ownership rules:

```text
Application
    owns selection orchestration and Buffer capture

Domain contributor
    defines what Resource Types its Module requires

Domain service
    receives PublishedResourceReference
    and does not know Pane/Buffer mechanics
```

Generic application code should not branch on a specific Domain to determine Domain Resource semantics.

---

# Application Settings

Settings are application-owned preferences.

Current ownership is:

```text
Application
    ↓
SettingsService
    ↓
ApplicationContext
    ↓
Svelte settings UI / interested runtime consumers
```

Settings persistence and application of settings belong to `SettingsService`.

Settings are not currently modeled as an independent Domain.

Examples of current settings behavior include:

```text
theme
font size
paragraph visibility
pericope visibility
Bible version display preferences
layout-related presentation preferences
```

Settings subscribers receive the current `Settings` snapshot directly.

Consumers should not respond to a Settings notification by unnecessarily rereading persisted settings.

---

# Bible Domain

The Bible Domain owns Bible meaning and Bible-specific behavior.

Current responsibilities include:

```text
Bible chapters
Bible versions
book/chapter/verse concepts
Bible location references
Bible navigation
Bible book names
paragraphs
pericopes
text markup
Bible search
Bible search indexes
Bible metadata/groupings
Bible Resource interpretation
Bible Resource validation
Bible Resource publication mapping
Bible-specific persistence adapters
Bible presentation Modules
```

Bible services exposed through the Domain root include capabilities such as:

```text
ChapterService
ParagraphsService
PericopesService
BibleTextMarkupService
BibleBooknamesService
SearchService
VerseService
BibleVersionsService
BookGroupingsService
BibleLocationReferenceService
BibleNavigationService
```

---

# Bible Chapter Presentation

The Bible reading Module is presentation for the Bible Domain hosted by the Application Runtime.

Conceptually:

```text
WorkspaceRuntime
    ↓
Pane
    ↓
Buffer
    ↓
Bible UI
    ↓
Bible services
    ↓
Bible Domain persistence / Resource references
```

The Bible UI does not own:

```text
Pane-tree mutation
Resource Resolution
raw Nostr access
IndexedDB database construction
Outbox processing
```

---

# Bible Text Markup

The current writable Bible annotation/highlight concept is `BibleTextMarkup`.

It replaces the older legacy annotation runtime path.

Text markup is Bible-owned because its meaning is tied to Bible location and token indexes.

Current ownership includes:

```text
BibleTextMarkup Domain Object
BibleTextMarkupService
Bible text-markup persistence
Bible text-markup Resource interpretation/publication
```

Publication still passes through generic Resource/Outbox machinery.

Do not reintroduce the removed legacy annotation architecture during cleanup.

---

# Bible Search

Bible Search is a Bible capability.

It is not a standalone Search Domain.

Bible owns:

```text
Bible query meaning
Bible search results
Bible index interpretation
Bible search runtime behavior
```

Generic search/index technology could be infrastructure when shared, but Bible search policy remains Bible-owned.

---

# Bible Location References

Bible location interpretation belongs to Bible.

`BibleLocationReferenceService` supports the canonical Bible location format used by multiple runtime flows.

Other Domains may carry Bible location values when requesting navigation, but they should not duplicate Bible parsing semantics.

The service supports both versioned and unversioned references where the current contract permits them.

---

# Bible Navigation

`BibleNavigationService` is Bible-owned navigation behavior.

Its current responsibility is moving between Bible chapters while preserving the Bible-location contract.

It does not own Workspace placement.

Current chapter navigation includes Genesis/Revelation wraparound behavior.

Historical internal pub/sub state was removed because no active caller used it.

---

# Strong's Domain

Strong's is a current independent Domain boundary.

It owns:

```text
Strong's Domain models
Strong's lookup behavior
Strong's Resource interpretation
Strong's Resource-selection contribution
Strong's persistence
```

The public boundary is:

```text
$lib/domains/strongs
```

Bible presentation may consume Strong's behavior, but Bible does not own the Strong's implementation.

The generic Resource lifecycle still passes through the Resource Boundary.

---

# Notes Domain

Notes owns application meaning associated with Notes.

Current responsibilities include:

```text
Note Domain Objects
Notes listing
Notes search/index behavior
Notes persistence
Notes Resource interpretation
Notes Resource publication
Notes collection change notifications
Notes presentation Modules
```

The public root is:

```text
$lib/domains/notes
```

Browser-only presentation exports are available through:

```text
$lib/domains/notes/ui
```

---

# Notes Synchronization Boundary

Normal Notes reads do not own remote synchronization/acquisition.

The old `NotesResourceAcquisition` path was removed because it had no production caller and mixed ordinary Notes access with Resource discovery/install behavior.

Future Notes synchronization should be introduced deliberately as synchronization responsibility rather than hidden inside `NotesService` reads.

---

# Notes Module Communication

Notes presentation should communicate through Notes/Application boundaries rather than taking ownership of another Notes Module.

Current Notes collection notifications are Domain-facing facts.

A completed fact may be represented by a Domain/Application event.

A command should remain an explicit behavior request to the owning service.

Do not use events merely to avoid calling a public behavior API.

---

# Reading Plans Domain

Reading Plans owns plan meaning and progression.

Current responsibilities include:

```text
PlanDefinition
PlanSubscription
PlanProgress
plan discovery/presentation models
subscription snapshot behavior
completed-reading/progress behavior
Reading Plans persistence
Reading Plans Resource interpretation
Reading Plans Resource publication
Reading Plans worker behavior
Reading Plans presentation Modules
```

Current services include:

```text
PlanDefinitionsService
PlanSubscriptionsService
PlanProgressService
PlansPubSubService
SubsEnricherService
EncodedReadingsDecoderService
```

The public root is:

```text
$lib/domains/reading-plans
```

Browser presentation is exposed through:

```text
$lib/domains/reading-plans/ui
```

---

# Reading Plans Subscription Semantics

A Reading Plan subscription is a snapshot of the selected plan definition at subscription time.

The user may subscribe to a plan they do not own.

The subscription/progress lifecycle remains Reading Plans-owned even though the underlying data is published through generic Resource infrastructure.

---

# Reading Plans to Bible Navigation

Reading Plans may request navigation into Bible content.

Dependency direction is intentionally one-way:

```text
Reading Plans
    → Bible contracts

Bible
    ✕ Reading Plans implementation
```

Bible owns the shared Bible-reading navigation shape needed by Bible presentation.

Reading Plans extends that shape with Reading Plans-specific state such as subscription identity and return-view information.

This avoids a Bible ↔ Reading Plans type cycle.

Reading Plans does not perform Bible retrieval itself.

---

# Reading Plans Worker

The Reading Plans worker is a separate composition root for worker execution.

It may construct its own local domain helpers such as:

```text
SubsEnricherService
EncodedReadingsDecoderService
```

rather than sharing browser Application instances.

Worker commands and responses have explicit typed contracts.

The worker execution environment does not change Domain ownership.

---

# Resource Boundary

The Resource layer owns generic Resource lifecycle concepts and machinery.

Its public root is:

```text
$lib/resource
```

Current public concepts include areas such as:

```text
PublishedResourceReference
Resource identifiers
Resource loading
Resource content encoding/decoding
Resource descriptors
Resource resolution
Resource interpretation/validation contracts
Resource installation contracts
Resource receipts
Resource publication contracts
Resource worker client
```

The Resource layer does not own Bible, Notes, Reading Plans, or Strong's meaning.

---

# Domain Resource Integration

Domains participate in the Resource lifecycle at Domain-owned boundaries.

Typical ownership is:

```text
Resource Boundary
    owns generic content / resolution / installation protocol

Domain
    owns Resource Type meaning
    interpreter
    validator
    Domain Object mapping
    publication mapping
    persistence transaction semantics
```

For example, Bible chapter interpretation belongs to Bible even though the generic `ResourceInterpreter` contract belongs to `$lib/resource`.

---

# Resource Discovery

`ResourceDiscovery` is generic Resource lifecycle implementation.

It is composed by `Application` and remains hidden from normal Svelte consumers.

Svelte code should not receive raw discovery infrastructure through `ApplicationContext` merely for convenience.

Discovery identifies published Resources; Domain interpretation/installation remains separate.

---

# Resource Resolution

Resource Resolution owns generic representation handling such as:

```text
inline content
Resource descriptors
descriptor collections
resolution strategies
content decoding
verified resolved content
```

Concrete transport-specific strategies may remain on concrete implementation paths when composition needs them.

The root Resource API is not intended to re-export every concrete Nostr/IndexedDB implementation.

---

# Resource Installation

Resource Installation is generic acceptance coordination around Domain-owned handlers.

Conceptually:

```text
Resolved Resource content
    ↓
Domain ResourceHandler / interpreter / validator
    ↓
Domain Object
    ↓
Domain persistence transaction
    ↓
Resource installation metadata / receipt
```

Generic installation machinery does not become the owner of Domain interpretation.

---

# Resource Selection

Resource selection is Application-owned orchestration over Domain-defined requirements.

This distinction is important:

```text
Application
    owns current/fallback selections and Buffer capture

Domain
    owns what Resource Types a Module requires
```

Domain contributors should remain the place where module-specific Resource requirements are defined.

---

# Resource Publication

Domain write behavior produces publication intent through Domain-specific mapping.

Current Resource publication flow is conceptually:

```text
Domain behavior
    ↓
Domain persistence/write transaction
    ↓
ResourcePublication
    ↓
Outbox
    ↓
publication strategy
    ↓
Nostr transport
```

Domain code determines what the information means and how it maps to a Resource.

Generic publication infrastructure determines how the publication intent is delivered.

---

# Outbox Ownership

The current Outbox implementation lives under the Application layer because it coordinates more than one publication-intent family.

It supports publication strategies including:

```text
ResourcePublication
NostrEventPublication
```

Current ownership includes:

```text
durable pending publication state
same-ID overwrite/coalescing
publication scheduling
publisher strategy dispatch
retry/restart behavior
```

The Outbox does not own Domain meaning.

Domain persistence/write transactions create final publication intents and place them into the Outbox atomically with local state changes where required.

---

# Nostr Infrastructure

Nostr is infrastructure/transport.

Current Nostr infrastructure includes capabilities such as:

```text
signing
AUTH
relay communication
Nostr client operations
account strategy
Nostr event persistence/publication
```

Domains should not depend on raw Nostr transport.

The Application composition root wires Nostr infrastructure to Resource/Application strategies.

---

# Authentication and Account Ownership

Authentication state/policy is application-owned.

Nostr-specific interpretation is infrastructure strategy behavior.

Current direction:

```text
AuthenticationService
    = application-facing authentication capability

NostrAuthenticationStrategy
    = Nostr-specific implementation

AccountService
    = application-facing account capability

NostrAccountStrategy
    = Nostr-specific implementation
```

Raw Nostr signer/client infrastructure is not exposed to ordinary Svelte consumers.

Relay preferences are part of application account state rather than a separate Nostr-specific UI state channel.

---

# Persistence Ownership

The browser currently uses shared IndexedDB infrastructure.

A shared physical database does not imply shared architectural ownership.

Ownership follows the information being persisted.

Examples:

```text
Bible records
    → Bible persistence adapters

Notes records
    → Notes persistence adapters

Reading Plans records
    → Reading Plans persistence adapters

Strong's records
    → Strong's persistence adapters

Workspace state
    → Application Runtime persistence

Nostr event records
    → Nostr infrastructure

Resource receipts/install metadata
    → Resource implementation

Outbox entries
    → Application Outbox
```

Domain persistence adapters may intentionally depend on the concrete shared application database implementation.

That is different from allowing UI code to access IndexedDB directly.

---

# Workers

Workers are execution environments, not architectural owners.

Each worker is also a separate composition root for the code executing inside it.

Examples:

```text
Resource Worker
    composes Resource installation/runtime processing

Bible workers
    execute Bible-owned indexing/processing behavior

Notes worker
    executes Notes-owned worker behavior

Reading Plans worker
    executes Reading Plans-owned worker behavior
```

A worker may construct its own local stateless/domain helper rather than sharing a browser `ApplicationContext` instance.

> **Execution changes. Ownership does not.**

---

# Shared Ownership

`$lib/shared` is reserved for genuinely owner-neutral utilities.

Current examples include:

```text
sleep
alphabetic sequence conversion
```

A helper should not be moved into Shared merely because multiple owners could theoretically call it.

If one Domain gives the behavior its meaning, it belongs to that Domain.

---

# Shared Components

Generic visual primitives may remain under:

```text
$lib/components
```

when they contain no Domain meaning.

Examples include:

```text
buttons
SVG icons
layout primitives
generic presentation controls
```

Domain-specific presentation belongs with the Domain.

---

# Domain UI Ownership

Domain presentation remains Domain-owned but browser-only.

Current public presentation boundaries are:

```text
$lib/domains/bible/ui
$lib/domains/notes/ui
$lib/domains/reading-plans/ui
```

The root Domain API remains Node-safe.

The `/ui` boundary exists specifically to avoid pulling Svelte/browser dependencies into workers, persistence tests, and Node unit tests.

Same-Domain implementation code may still import concrete Svelte files directly when appropriate.

---

# Module Rendering

The Application Runtime resolves a Buffer's module identity to a Domain presentation component.

Conceptually:

```text
Pane tree
    ↓
deriveWorkspaceLayout()
    ↓
PaneContainer
    ↓
Buffer
    ↓
module component resolver
    ↓
Domain /ui API
    ↓
Module component
```

Unknown module identities should fail clearly rather than silently falling back to Bible.

---

# Cross-Domain Dependency Rule

One Domain should not import another Domain's private implementation.

Preferred collaboration is through:

```text
Domain root API
Domain /ui API for browser presentation
Application coordination
shared owner-defined contract where appropriate
```

The recent Bible/Reading Plans navigation cleanup is the current example:

```text
Reading Plans
    → Bible-owned navigation contract

Bible
    ✕ Reading Plans model
```

Dependency direction should reflect meaning rather than convenience.

---

# Application Events and Domain Notifications

Notifications represent completed facts.

Conceptually:

```text
"This happened."
```

Commands represent requested behavior.

Conceptually:

```text
"Please do this."
```

Do not use event/pub-sub machinery merely to avoid calling a service API.

Likewise, dead pub/sub state should be removed when no behavior depends on it.

---

# Import Boundary Rule

External consumers should depend on logical owners.

Prefer:

```text
$lib/application
$lib/application/ui
$lib/domains/bible
$lib/domains/bible/ui
$lib/resource
$lib/shared
```

rather than importing internal folders merely because a file is easy to reach.

However, direct concrete imports remain appropriate for:

```text
Application composition wiring
worker composition roots
infrastructure adapters
concrete Resource/Nostr strategies
integration tests of a concrete implementation
internal implementation files within the same owner
```

The goal is meaningful ownership, not eliminating every deep path.

---

# Current Ownership Classification

When classifying new or existing code, use:

| Owner | Question |
| --- | --- |
| Bible | Does Bible meaning give the behavior its purpose? |
| Notes | Does Notes meaning give the behavior its purpose? |
| Reading Plans | Does plan/subscription/progress meaning give the behavior its purpose? |
| Strong's | Does Strong's data/lookup meaning give the behavior its purpose? |
| Application Runtime | Does it coordinate Pane/Buffer/Module interaction? |
| Application Service | Is it application-wide coordination or preference/state behavior? |
| Application Outbox | Does it durably coordinate publication intents across publisher strategies? |
| Resource | Is it generic Resource lifecycle behavior or contract? |
| Infrastructure | Is it a concrete reusable technical capability/adaptor? |
| Shared | Is it genuinely owner-neutral utility behavior? |
| Shared UI | Is it presentation with no Domain meaning? |

If ownership is ambiguous, resolve that ambiguity before moving or exposing the code.

---

# Current Implementation Map

| Implementation responsibility | Current owner |
| --- | --- |
| Bible chapters | Bible |
| Bible paragraphs | Bible |
| Bible pericopes | Bible |
| Bible text markup | Bible |
| Bible search/index behavior | Bible |
| Bible location parsing | Bible |
| Bible chapter navigation | Bible |
| Bible book names/grouping | Bible |
| Strong's lookup/data | Strong's |
| Notes | Notes |
| Notes search/index behavior | Notes |
| Reading Plan definitions | Reading Plans |
| Reading Plan subscriptions | Reading Plans |
| Reading Plan progress/completed readings | Reading Plans |
| Settings | Application |
| Authentication state/policy | Application |
| Account state | Application |
| Pane / Buffer / Workspace | Application Runtime |
| module Resource-selection orchestration | Application |
| module Resource-selection requirements | owning Domain contributor |
| Outbox | Application |
| generic Resource models/contracts | Resource |
| Resource resolution | Resource |
| Resource installation coordination | Resource |
| Resource receipts | Resource |
| Resource Worker client/runtime | Resource |
| Nostr client/signer/AUTH | Infrastructure |
| IndexedDB database implementation | Infrastructure |
| Domain IndexedDB adapters | owning Domain |
| Nostr event persistence/publication | Nostr Infrastructure |
| generic visual controls | Shared Components |
| owner-neutral utilities | Shared |

---

# Current Cleanup Status

The major structural ownership refactor is substantially complete for the current phase.

Completed direction includes:

```text
Domain code organized under explicit Domains
Application-owned Workspace Runtime
Application composition root
ApplicationContext capability boundary
Domain root APIs
Domain /ui APIs
Application root + /ui APIs
Resource root API
Shared root API
Svelte service construction moved behind Application ownership
legacy global service singletons substantially removed
dead runtime wrappers and utilities removed
Bible ↔ Reading Plans type cycle removed
Resource-selection semantics moved into Domain contributors
```

Future cleanup should therefore be evidence-driven rather than assuming another broad ownership migration is required.

---

# Parked / Separate Work

The following are not part of ordinary ownership cleanup unless explicitly selected:

```text
named/detached Buffer manager
focus/selection runtime redesign
major Resource/Nostr architecture changes
future synchronization work
```

Known legacy code in a parked area should not be used as justification for reopening unrelated architecture.

---

# Completion Criteria

For the current phase, ownership is in a good state when:

```text
Domain behavior is located with its Domain.

Domain root APIs expose intentional non-browser contracts.

Domain /ui APIs isolate browser-only presentation.

Application owns runtime/composition behavior rather than Domain meaning.

Only +layout.svelte imports the concrete Application runtime root.

ApplicationContext exposes intentional Svelte capabilities,
not composition internals.

WorkspaceRuntime owns Pane/Buffer coordination.

Domains do not depend on raw Nostr transport.

Resource generic behavior does not own Domain meaning.

Resource-selection semantics remain Domain-owned.

Cross-Domain dependencies use intentional public contracts.

Workers compose their own runtime dependencies without becoming owners.

Persistence follows the information owner despite a shared physical database.

Concrete implementation imports remain only where composition/testing actually requires them.
```

---

# What This Document Does Not Define

This document does not define:

* exact Domain Object schemas,
* Resource protocol behavior,
* IndexedDB schema,
* exact Svelte layout implementation,
* future synchronization policy,
* future detached Buffer behavior,
* or every concrete class dependency.

Those concerns belong to their corresponding architecture and implementation documents.

Physical organization and public import conventions are defined in:

```text
011-target-code-organization.md
```

---

# Big Takeaway

The implementation now expresses ownership through both placement and dependency direction.

```text
Responsibility
    ↓
Owner
    ↓
Public Boundary
    ↓
Implementation
```

Bible meaning belongs to Bible.

Notes meaning belongs to Notes.

Reading Plan meaning belongs to Reading Plans.

Strong's meaning belongs to Strong's.

Workspace and application coordination belong to Application.

Generic Resource lifecycle behavior belongs to Resource.

Concrete transport and persistence mechanisms belong to Infrastructure.

Owner-neutral helpers belong to Shared.

> **Keep application meaning with the owner that gives it meaning, and let composition wire owners together without collapsing their boundaries.**
