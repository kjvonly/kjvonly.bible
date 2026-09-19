# Target Code Organization

**Status:** Current Refactoring Guide

---

# Purpose

This document defines the physical organization and import-boundary conventions for the KJVOnly client implementation.

It translates the current ownership model into practical TypeScript/Svelte rules for:

* where code belongs,
* which files form public boundaries,
* how browser-only presentation code is separated from Node-safe contracts,
* how Application composition differs from Application public APIs,
* how Domains collaborate,
* how the Resource Boundary is exposed,
* when concrete Infrastructure imports are intentional,
* and when a new `index.ts` should **not** be created.

This is an implementation organization guide. It does not introduce new architectural ownership.

The current source is authoritative when an older example or historical document disagrees with this guide.

---

# Core Goal

The codebase should make ownership visible from directory placement and import paths.

Prefer:

```text
owner
    ↓
responsibility
    ↓
technical implementation
```

rather than:

```text
technical mechanism
    ↓
unrelated application responsibilities
```

A caller should normally know **which logical owner it consumes**, not the internal folder where that owner currently implements the capability.

Examples of meaningful external boundaries are:

```text
$lib/application
$lib/application/ui

$lib/domains/bible
$lib/domains/bible/ui

$lib/resource
$lib/shared
```

External callers should not normally need to know implementation paths such as:

```text
application/outbox/...
application/resources/...
application/runtime/...

domains/bible/services/...
domains/bible/persistence/...

resource/installation/...
resource/content/...
resource/resolution/...
```

unless the caller is itself part of that owner or is intentionally composing/testing a concrete implementation.

---

# Current Top-Level Structure

The primary client organization is:

```text
client/kjvonly-pwa/src/lib/

    application/
    domains/
    resource/
    infrastructure/
    shared/
    components/
```

Responsibilities:

```text
application/
    application-wide composition and runtime coordination

domains/
    Domain-owned behavior, models, persistence, Resource integration,
    workers, and presentation

resource/
    generic Resource lifecycle and Resource Boundary implementation

infrastructure/
    concrete technical capabilities and adapters

shared/
    genuinely owner-neutral utilities

components/
    genuinely reusable presentation primitives
```

This top-level division is architectural.

Subdirectories beneath each owner are implementation organization and should evolve only when they represent real responsibilities.

---

# Public API Convention

The current convention is:

```text
one public root API for a logical owner
+
one browser-only /ui API when that owner exposes Svelte/browser code
```

Current examples:

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

The goal is **not**:

```text
one index.ts in every folder
```

The goal is:

```text
one deliberate public boundary per logical owner
```

with a separate `/ui` boundary only when browser-only exports would otherwise contaminate a Node-safe root API.

---

# Why Root APIs Matter

A public root API lets an external consumer depend on the owner rather than its folder structure.

Prefer:

```ts
import {
    BibleNavigationService,
    type BCV
} from '$lib/domains/bible';
```

instead of:

```ts
import { BibleNavigationService }
    from '$lib/domains/bible/services/bibleNavigation.service';

import type { BCV }
    from '$lib/domains/bible/models/bible.model';
```

The first form says:

> I depend on the Bible Domain.

The second form says:

> I depend on the Bible Domain's current internal folder structure.

The root API should expose only capabilities intentionally available outside the owner.

---

# Why UI Has a Separate Boundary

Svelte components and browser-only libraries must not be re-exported from a root API that is also imported by Node tests, workers, persistence code, or other non-browser code.

This was learned concretely during cleanup.

A root Application barrel temporarily exported Svelte/runtime presentation. That created a transitive path similar to:

```text
$lib/application
    ↓
Pane presentation
    ↓
Module component resolver
    ↓
Notes presentation
    ↓
note.svelte
    ↓
Quill
    ↓
document
```

Node Vitest then failed with:

```text
ReferenceError: document is not defined
```

Therefore:

```text
$lib/application
    Node-safe/browser-safe contracts and runtime capabilities

$lib/application/ui
    Svelte components and browser-only presentation helpers
```

The same rule applies to Domains that expose Svelte presentation:

```text
$lib/domains/bible
$lib/domains/bible/ui
```

Root APIs should remain safe for service tests, workers, and non-Svelte consumers.

---

# Public API, Composition Root, and Runtime Context

Keep these three concepts separate:

```text
Application
    = concrete runtime composition root

ApplicationContext
    = Svelte-facing runtime capability surface

application/index.ts
    = compile-time public Application API
```

They solve different problems.

A type being exported from `$lib/application` does not imply it belongs in `ApplicationContext`.

A service being constructed by `Application` does not imply all callers should import the concrete `Application` class.

---

# Application Organization

Application-wide code lives beneath:

```text
application/
```

Current organization includes responsibilities such as:

```text
application/
    application.ts
    index.ts
    config/
    models/
    modules/
    outbox/
    resources/
    runtime/
    services/
    ui/
```

Application is not a dumping ground for anything used by more than one Domain.

Code belongs here only when its responsibility is genuinely application-wide.

---

# Application Composition Root

The concrete composition root is:

```text
application/application.ts
```

It constructs and wires long-lived runtime dependencies such as:

* authentication/account services,
* Settings,
* Workspace Runtime,
* Domain services,
* Resource services and worker clients,
* Resource-selection services,
* Outbox processing,
* Nostr infrastructure,
* and other application-owned capabilities.

The concrete `Application` class is intentionally **not** exported from:

```text
$lib/application
```

The only runtime source file that should directly import `Application` is:

```text
src/routes/+layout.svelte
```

That route layout is the browser bootstrap boundary.

Normal runtime code consumes public Application APIs, ApplicationContext, Domain APIs, or Resource APIs instead.

---

# Application Root API

The public Application root is:

```text
application/index.ts
```

External non-UI consumers use:

```text
$lib/application
```

Its deliberate public surface includes categories such as:

```text
Application configuration
ApplicationContext contracts/helpers
Settings model/service contracts
account/auth strategy contracts
Modules
Workspace Runtime contracts
Pane/Workspace layout contracts
Resource-selection application contracts
Outbox application contracts
```

Before adding an export ask:

```text
Is this a stable Application capability?
Does an external owner actually need it?
Can exposing it create an upward barrel cycle?
Would exporting it load browser-only code?
```

Do not add an implementation merely because another layer wants a shorter import.

---

# Application UI API

Browser-facing Application presentation uses:

```text
application/ui/index.ts
```

External browser code imports:

```text
$lib/application/ui
```

This API may expose Svelte components and DOM helpers such as:

```text
PaneContainer
Buffer presentation
Settings presentation
scroll helpers
DOM event helpers
```

Do not re-export these through `$lib/application`.

---

# Application Internal Imports

Code inside `application/` should normally use direct internal imports.

For example:

```text
application/application.ts
    → ./runtime/...
    → ./services/...
    → ./resources/...
```

Do not force Application implementation files to import back through `$lib/application`.

That can create self-barrel cycles.

Public barrels are for callers outside the owner.

---

# ApplicationContext

`ApplicationContext` is the capability surface supplied to the Svelte component tree.

Conceptually:

```text
Application
    constructs runtime capabilities
        ↓
ApplicationContext
    exposes selected capabilities
        ↓
Svelte containers/components
```

A capability belongs in ApplicationContext only when Svelte actually needs runtime access to it.

Do not expose composition-only infrastructure for convenience.

---

# Per-Container Runtime State

Some state must remain independent per rendered container.

Do not turn such state into a global ApplicationContext singleton merely to centralize construction.

The current Navigation service is the important example.

Use:

```text
Application
    → NavigationServiceFactory
        ↓ ApplicationContext
Svelte container
    → factory creates independent NavigationService
```

This preserves Application-owned construction while keeping Login/Profile navigation stacks independent.

---

# Application Runtime

Workspace/runtime implementation remains beneath:

```text
application/runtime/
```

Current areas include:

```text
buffer/
pane/
rendering/
workspace/
```

These folders organize implementation.

They do not each need a public barrel.

External callers use `$lib/application` for Node-safe runtime capabilities and `$lib/application/ui` for presentation.

---

# Workspace Runtime

`WorkspaceRuntime` is the public Workspace coordinator.

`PaneService` remains an internal implementation detail.

```text
Application
    ↓
WorkspaceRuntime
    ↓
PaneService
```

Svelte should consume `WorkspaceRuntime` through ApplicationContext rather than importing `PaneService`.

Current Workspace responsibilities include:

* initialization,
* Pane lookup,
* split,
* delete/collapse,
* Buffer replacement,
* Pane-ID allocation,
* persistence,
* layout derivation,
* Pane dimensions,
* and Workspace change notifications.

The earlier target of moving Workspace logic out of `+page.svelte` is already implemented for the current phase.

---

# Domains

Domain-owned code lives beneath:

```text
domains/
```

Current primary Domains are:

```text
domains/
    bible/
    notes/
    reading-plans/
    strongs/
```

Settings is currently an Application capability, not a separate Settings Domain.

Do not create `domains/settings/` merely to match an older target tree.

---

# Domain Internal Shape

A Domain may contain directories such as:

```text
models/
services/
persistence/
resources/
runtime/
workers/
modules/
ui/
utils/
events/
metadata/
```

Not every Domain needs every folder.

Do not create empty symmetrical structures.

The first question remains:

> Who owns this responsibility?

Only after ownership is known should implementation role determine the subdirectory.

---

# Domain Root API

Each Domain exposes its intentional external surface from:

```text
domains/<domain>/index.ts
```

External non-UI consumers import from:

```text
$lib/domains/<domain>
```

Examples:

```text
$lib/domains/bible
$lib/domains/notes
$lib/domains/reading-plans
$lib/domains/strongs
```

The previous recommendation to create:

```text
domains/<domain>/api/index.ts
```

is obsolete.

The Domain root itself is the public API.

---

# Domain UI API

When a Domain exposes Svelte presentation to another owner, it uses:

```text
domains/<domain>/ui/index.ts
```

External presentation consumers use:

```text
$lib/domains/<domain>/ui
```

Current examples:

```text
$lib/domains/bible/ui
$lib/domains/notes/ui
$lib/domains/reading-plans/ui
```

The old public presentation barrels at:

```text
domains/<domain>/modules/index.ts
```

were removed.

`modules/` may still contain implementation files; it is not the public presentation boundary.

---

# Domain Internals

Everything not intentionally exported from the Domain root or `/ui` API should be treated as implementation detail by other owners.

Examples:

```text
domains/bible/services/
domains/bible/persistence/
domains/bible/resources/
domains/bible/models/
```

TypeScript `export` visibility alone does not define architectural visibility.

A symbol may be exported for use inside the Domain, tests, workers, or composition wiring without becoming part of the Domain public API.

---

# Domain Models

Current code generally uses:

```text
domains/<domain>/models/
```

That is acceptable.

Do not rename `models/` to `objects/` solely to satisfy an older target document.

Examples:

```text
Bible location/reference types
    → domains/bible/models/

Note models
    → domains/notes/models/

Reading Plan definition/subscription/progress
    → domains/reading-plans/models/
```

---

# Domain Services and Construction

A service belongs under a Domain when that Domain gives the behavior meaning.

Examples:

```text
domains/bible/services/
domains/notes/services/
domains/reading-plans/services/
domains/strongs/services/
```

Long-lived Domain services used by the main Svelte runtime are normally constructed by `Application` and exposed through ApplicationContext only when Svelte needs them.

That does not move ownership of the service into Application.

Examples established during cleanup include:

```text
BibleLocationReferenceService
BibleNavigationService
BookGroupingsService
SubsEnricherService
EncodedReadingsDecoderService
```

---

# Domain Persistence

Domain-specific persistence behavior belongs under:

```text
domains/<domain>/persistence/
```

Typical responsibilities include:

* Domain-object write transactions,
* Domain-specific record mapping,
* Domain query semantics,
* Domain indexes,
* and atomic Domain write + Outbox operations.

These adapters may intentionally import concrete shared database infrastructure such as:

```text
$lib/infrastructure/persistence/application.db
```

Do not create a generic Infrastructure barrel merely to hide that dependency.

The important direction is:

```text
Domain persistence adapter
    → persistence infrastructure
```

not the number of path segments.

---

# Domain Resource Integration

Domain-specific interpretation, validation, Resource publication mapping, installation behavior, and module Resource requirements belong under:

```text
domains/<domain>/resources/
```

This code may know:

* Domain Resource types,
* Domain Resource paths,
* Domain object identities,
* Domain validation rules,
* Resource-to-Domain interpretation,
* publication mapping,
* and module Resource requirements.

It should not own generic relay transport.

---

# Domain Modules and UI

Domain module implementations remain near the owning Domain:

```text
domains/<domain>/modules/
```

These are Runtime presentation implementations, not automatically public APIs.

Same-Domain implementation files may import them directly.

Cross-owner presentation imports should use the Domain `/ui` API.

---

# Domain Workers

Domain workers may live beneath:

```text
domains/<domain>/workers/
```

A worker is a separate composition root.

It does not consume Svelte ApplicationContext.

It may construct its own local Domain services and infrastructure adapters.

Conceptually:

```text
Main browser runtime
    → Application composition root

Worker runtime
    → worker composition root
```

Do not introduce global singletons solely so both runtimes can share construction.

---

# Bible Domain

The Bible Domain currently contains responsibilities such as:

```text
models/
services/
persistence/
resources/
runtime/
workers/
modules/
ui/
metadata/
utils/
```

Public boundaries:

```text
$lib/domains/bible
$lib/domains/bible/ui
```

Bible owns Bible location semantics.

`BibleLocationReferenceService` remains Bible-owned even though Application constructs the main runtime instance.

---

# Notes Domain

Notes owns:

* Note models,
* Note persistence,
* Notes search/list behavior,
* Notes Resource mapping,
* Notes publication transactions,
* Notes workers,
* and Notes presentation.

Public boundaries:

```text
$lib/domains/notes
$lib/domains/notes/ui
```

The removed `NotesResourceAcquisition` path should not be recreated as ordinary Notes read behavior.

Remote discovery/synchronization is a synchronization responsibility rather than a hidden side effect of `NotesService` reads.

---

# Reading Plans Domain

Reading Plans owns:

* Plan definitions,
* subscriptions,
* progress,
* Reading Plans Resource mappings,
* worker/pub-sub behavior,
* reading enrichment/decoding,
* and plan presentation.

Public boundaries:

```text
$lib/domains/reading-plans
$lib/domains/reading-plans/ui
```

The Reading Plans worker has an explicit typed command/response contract.

Do not weaken that boundary back to open-ended messages or `any` payloads.

---

# Strong's Domain

Strong's exposes its current public API from:

```text
$lib/domains/strongs
```

A `/ui` API should be introduced only if Strong's later exposes browser presentation that another owner must consume.

Do not create it for symmetry.

---

# Cross-Domain Dependencies

Cross-Domain dependencies should be intentional and one-directional where possible.

A Domain should not import another Domain's internal folders.

Prefer:

```text
Domain A
    → $lib/domains/domain-b
```

or for presentation:

```text
Domain A UI
    → $lib/domains/domain-b/ui
```

Avoid:

```text
Domain A
    → domains/domain-b/services/...
    → domains/domain-b/models/...
    → domains/domain-b/modules/...
```

---

# Bible / Reading Plans Dependency Direction

The Bible/Reading Plans type cycle was explicitly removed.

Keep the direction:

```text
Reading Plans
    → Bible contracts

Bible
    ✕ Reading Plans
```

Bible defines the small reading-navigation contract its presentation needs.

Reading Plans may extend/use that Bible-owned contract with plan-specific state.

Do not reintroduce a Bible model dependency on Reading Plans merely because a plan can navigate into Bible content.

---

# Resource Boundary

Generic Resource lifecycle implementation lives beneath:

```text
resource/
```

Current implementation areas include:

```text
content/
descriptors/
installation/
interpretation/
loading/
models/
nostr/
publication/
receipts/
resolution/
services/
utils/
validation/
worker/
```

The Resource public API is:

```text
$lib/resource
```

---

# Resource Root API

`resource/index.ts` exposes stable Resource concepts and browser-safe Resource services needed by external owners.

Current categories include:

```text
Resource model contracts
PublishedResourceReference
Resource identifiers
installation contracts and results
interpretation/validation contracts
publication contracts
Resource loading/reference building
Resource receipt contracts/services
content decorators/encoder/decoder
descriptor contracts/decoder/validator
resolution contracts and generic resolvers
ResourceService
ResourceProcessor
ResourceWorkerClient
```

The exact export list is deliberate.

---

# Resource Root API Stopping Rule

Not every external Resource import should be forced through `$lib/resource`.

Concrete implementation wiring may remain on concrete paths.

Examples include categories such as:

```text
IndexedDB Resource receipt storage
ResourceDiscovery composition
Nostr-specific Resource resolution strategies
Nostr-specific Resource publication strategies
other composition-specific implementations
```

The correct question is:

> Is this a stable Resource capability external owners should depend on?

not:

> Can this import path be made shorter?

---

# Avoid Resource Barrel Cycles

Before exporting a concrete implementation from `$lib/resource`, inspect its dependency graph.

A concrete store may depend on Application database infrastructure that itself imports Resource types.

A cycle conceptually like:

```text
resource/index.ts
    → concrete IndexedDB Resource store
        → application.db
            → Resource contracts
```

is worse than leaving the concrete implementation on a direct path.

Public API cleanup must improve dependency direction, not merely hide it.

---

# Resource and Domain Ownership

Generic Resource lifecycle belongs to `resource/`.

Domain meaning remains with Domains.

Conceptually:

```text
Published Resource
    ↓
Resource resolution
    ↓
Domain Resource integration
    ↓
Domain Object
    ↓
Domain persistence/application behavior
```

Resource code must not become a global home for Bible/Notes/Plans schema meaning.

---

# Resource Publication and Outbox

Resource publication contracts and Application Outbox contracts participate in the same flow but remain separate owners.

Conceptually:

```text
Domain change
    ↓
Domain Resource publication mapping
    ↓
Application publication intent / Outbox
    ↓
publication strategy
    ↓
transport
```

Public contracts live at:

```text
Resource publication
    → $lib/resource

Application Outbox
    → $lib/application
```

Do not merge these merely because both participate in publishing.

---

# Infrastructure

Concrete technical capabilities live beneath:

```text
infrastructure/
```

Current major areas include:

```text
infrastructure/nostr/
infrastructure/persistence/
```

Infrastructure should know how to perform technical work.

It should not own application/domain policy.

---

# Infrastructure Does Not Need a Root Barrel

There is no rule requiring a broad:

```text
$lib/infrastructure
```

public API.

Composition roots and persistence adapters may intentionally import concrete paths such as:

```text
$lib/infrastructure/persistence/application.db
$lib/infrastructure/nostr/...
```

A broad barrel can obscure the concrete technology being depended on and can introduce cycles.

Create an Infrastructure public API only when there is a real stable abstraction to expose.

---

# Nostr Infrastructure

Nostr implementation belongs beneath:

```text
infrastructure/nostr/
```

Responsibilities include categories such as:

* authentication/account strategy implementation,
* Nostr client/relay transport,
* Nostr event persistence,
* protocol adaptation,
* and publication/read mechanics.

Normal Domain UI should not import Nostr infrastructure directly.

Application composition may intentionally wire concrete Nostr implementations.

---

# Persistence Infrastructure

Shared IndexedDB/database mechanics live beneath:

```text
infrastructure/persistence/
```

Domain persistence adapters may use the concrete application database implementation.

That is appropriate when their responsibility is explicitly persistence.

Avoid pushing Domain semantics down into the database layer.

---

# Shared

Genuinely owner-neutral utilities live beneath:

```text
shared/
```

The public boundary is:

```text
$lib/shared
```

Current examples include:

```text
sleep
alphabetic sequence conversion
```

Do not place something in `shared/` merely because two owners use it.

Ask whether the behavior has meaning independent of those owners.

---

# Shared vs Infrastructure

Use `shared/` for owner-neutral code that is not an external technical adapter.

Examples:

```text
timer helper
simple sequence conversion
```

Use `infrastructure/` when code adapts or implements a technical capability such as:

```text
IndexedDB
Nostr
external transport
platform integration
```

A simple `sleep()` helper is not Infrastructure.

---

# Shared Components

Root presentation primitives live beneath:

```text
components/
```

They should be genuinely reusable and carry no Domain meaning.

Domain-specific presentation stays beneath the owning Domain.

Application-runtime presentation stays beneath Application implementation and is exposed through `$lib/application/ui` when external browser consumers need it.

---

# Svelte Service Consumption

Svelte components should not normally construct long-lived application/domain services directly.

Avoid:

```ts
const service = new SomeDomainService(...);
```

inside a Svelte container when the service belongs to the application runtime.

Prefer:

```text
Application
    constructs service/factory
        ↓
ApplicationContext
        ↓
Svelte
```

This keeps ownership and lifecycle explicit.

---

# Svelte Must Not Reach Into Infrastructure

Active Svelte code should consume application/domain capabilities rather than concrete infrastructure.

Avoid:

```text
Svelte
    → infrastructure/persistence

Svelte
    → infrastructure/nostr
```

Prefer:

```text
Svelte
    → ApplicationContext / Domain API
        → service
            → persistence/transport implementation
```

---

# Internal Imports

Inside one owner, direct internal imports are normal.

For example:

```text
domains/bible/services/chapter.service.ts
    → ../models/...
    → ../resources/...
```

or:

```text
application/application.ts
    → ./runtime/...
    → ./services/...
```

Do not route every internal dependency through the owner's public barrel.

Public/DDD boundaries exist between owners, not between every pair of files.

---

# Composition-Root Imports

Composition roots are a deliberate exception to ordinary public-API consumption.

`Application` may need concrete implementations from Domains, Resource, and Infrastructure.

A worker composition root may need concrete Domain and Infrastructure implementations as well.

Those imports are wiring, not architectural leaks.

Do not replace useful concrete composition imports with broad barrels merely for consistency.

---

# Test Imports

Tests should use the public surface appropriate to what they test.

Examples:

```text
Domain behavior test
    → Domain public API when practical

Resource contract/integration test
    → $lib/resource

browser UI test
    → public /ui boundary where appropriate
```

A test whose subject is a concrete implementation may import that implementation directly.

For example:

```text
Nostr strategy integration test
    → concrete Nostr strategy

IndexedDB adapter test
    → concrete IndexedDB adapter
```

Do not hide the subject under a barrel just to satisfy an import-style rule.

---

# Entry Points Are Special

Files loaded by the platform/runtime may have no ordinary inbound TypeScript import.

Examples include:

```text
Svelte route entrypoints
worker entrypoints
```

Do not classify a file as dead solely because static import tracing reports zero callers.

Before deleting a zero-reference file, determine whether it is:

* a route,
* a worker entrypoint,
* loaded dynamically,
* referenced by configuration,
* or intentionally retained reference/generator code.

---

# Dead-Code Audit Rule

Before deleting code:

```text
1. trace static callers
2. check dynamic/module-resolver usage
3. check worker/route/config entrypoints
4. inspect tests
5. determine actual responsibility
6. remove only when genuinely dead
```

Do not delete based only on filename age or visual similarity to newer code.

---

# Reference / Generator Code

Some historical metadata/data-generation specs are intentionally retained as reference material even though they are skipped and are not normal runtime behavior.

Do not delete such files merely because they have no production callers.

Intentional reference code is different from accidental dead code.

---

# Allowed Dependency Direction

A useful high-level direction is:

```text
Presentation
    ↓
ApplicationContext / Owner public API
    ↓
Application or Domain behavior
    ↓
Resource Boundary when external lifecycle is required
    ↓
Infrastructure
```

More concretely:

```text
Domain UI
    → same Domain API/service

Application Runtime
    → Domain public APIs/contracts

Domain persistence
    → persistence infrastructure

Domain Resource integration
    → Resource contracts

Resource concrete strategy
    → transport infrastructure

Application composition root
    → concrete implementations across owners
```

---

# Forbidden / Suspicious Dependency Directions

Treat patterns such as these as architectural smells requiring explanation:

```text
Domain A
    → Domain B internals

Domain
    → raw Nostr transport for ordinary Resource behavior

Svelte UI
    → IndexedDB directly

Svelte UI
    → Nostr client directly

Infrastructure
    → Domain service/policy

Resource generic code
    → Bible/Notes/Plans meaning

Domain persistence
    → Pane/Workspace Runtime

lower-level owner
    → Application composition root
```

Some tests/composition roots may be exceptions, but those exceptions should be explicit.

---

# Domain-to-Domain Collaboration

Cross-Domain collaboration should use an intentional contract.

Possible forms include:

```text
Domain root public API
Domain /ui API
shared owner-neutral contract
Application coordination capability
```

Do not introduce a generic shared abstraction merely to avoid choosing dependency direction.

When one Domain conceptually depends on another, make that direction explicit and avoid a reverse dependency.

---

# Public API Export Checklist

Before adding a symbol to an owner root `index.ts`, ask:

```text
1. Is it intentionally usable outside this owner?
2. Is it stable enough to be part of the owner boundary?
3. Is it browser-safe for the root API?
4. Would exporting it create a barrel cycle?
5. Is it a concrete composition implementation that should remain direct?
6. Is there an actual external caller requiring it?
```

If the answer is unclear, keep the implementation private until a real external need exists.

Prefer explicit exports over broad `export *`.

The intended public surface should be reviewable in one file.

---

# When to Add `/ui`

Add a `/ui` public API when both are true:

```text
1. the owner has browser/Svelte presentation external callers need
2. exporting it from the root would make the root browser-only or Node-unsafe
```

Do not create `/ui` merely for symmetry.

Strong's currently does not require one simply because Bible, Notes, and Reading Plans have one.

---

# When Not to Add an `index.ts`

Do not add a public `index.ts` merely because a folder exists.

Folders such as these normally remain implementation organization beneath an existing owner boundary:

```text
application/outbox/
application/resources/
application/runtime/

resource/content/
resource/installation/
resource/resolution/
```

Only add another public entry point when it represents a genuinely separate boundary, such as browser-only `/ui`.

---

# Naming

Prefer names that expose responsibility.

Good:

```text
WorkspaceRuntime
ChapterService
ResourceResolver
ResourceReceiptService
ModuleResourceSelectionContributor
BibleNavigationService
```

Be suspicious of generic names such as:

```text
DataService
CommonManager
GlobalStore
UtilityService
ResourceHelper
```

Generic names often indicate unclear ownership.

---

# Refactoring Strategy

Do not reorganize the whole codebase at once.

Use small slices.

A typical boundary cleanup should be:

```text
1. identify one owner boundary
2. trace external callers
3. decide which symbols are truly public
4. add/adjust the root API
5. update external callers
6. keep internal imports direct
7. verify browser-only code did not leak into Node-safe barrels
8. run tests/build
```

For dead-code cleanup:

```text
1. trace callers
2. verify entrypoint status
3. verify replacement behavior
4. remove implementation + orphaned tests together
5. validate
```

---

# Current Boundary Stopping Point

The current cleanup has already established the major intended boundaries:

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

Do not continue broad import churn merely because some concrete paths remain.

Remaining direct implementation imports should be evaluated by responsibility rather than automatically normalized.

Further cleanup should generally prioritize:

```text
correctness
ownership
stale behavior
missing tests
dead state
misleading documentation
```

rather than further broad barrel creation.

---

# Decision Checklist

When deciding where code belongs, ask:

```text
1. Who owns the meaning?
2. Is this Application-wide coordination or Domain behavior?
3. Is this generic Resource lifecycle or Domain Resource meaning?
4. Is this technical Infrastructure?
5. Is it genuinely owner-neutral Shared code?
6. Is the caller external to the owner?
7. Does the caller need Node-safe code or browser UI?
8. Is a direct concrete import intentional composition wiring?
9. Would a new barrel create a dependency cycle?
10. Is there a real caller requiring the proposed public export?
```

The physical organization should make the answers increasingly obvious.

---

# Final Rule

The directory tree and import graph should communicate ownership.

Prefer:

```text
external caller
    → owner root API

external browser presentation caller
    → owner /ui API

owner implementation
    → direct internal imports

composition root
    → concrete implementations when wiring requires them
```

Avoid both extremes:

```text
everything imports internals everywhere
```

and:

```text
every folder gets a barrel and every concrete implementation is hidden behind it
```

The target is a small number of meaningful, stable boundaries that match the actual runtime architecture.
