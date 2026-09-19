# Runtime Services and Ownership

## Status

Current

---

# Purpose

This document describes how the KJVOnly.bible runtime owns and exposes shared
application capabilities.

The current implementation separates four responsibilities:

```text
Application
    = composition root and lifecycle owner

ApplicationContext
    = Svelte-facing capability surface

WorkspaceRuntime
    = coordinator for visible Workspace state

Application / Domain Services
    = behavior boundaries consumed by modules and UI
```

The central rule is:

> `Application` may own many implementation objects, but
> `ApplicationContext` exposes only capabilities that runtime/Svelte consumers
> actually need.

This keeps Nostr transport, Resource processing, persistence, Outbox internals,
and Pane persistence out of normal module code.

Related documents:

```text
docs/01_application-architecture/001-application-overview.md
docs/01_application-architecture/002-workspace-runtime.md
docs/01_application-architecture/003-runtime-rendering.md
docs/03_implementation/runtime/004-rendering-engine.md
docs/03_implementation/runtime/005-buffer-contract.md
```

---

# Scope

This document covers:

* `Application`,
* `ApplicationContext`,
* root Svelte startup/shutdown,
* `WorkspaceRuntime`,
* shared application services,
* Domain service exposure,
* `ModuleResourceSelectionResolver`,
* private composition dependencies,
* subscription ownership,
* and rules for adding new runtime capabilities.

It does not redefine Resource resolution, Nostr, Outbox, IndexedDB, or
Domain-specific behavior.

---

# High-Level Ownership

The runtime object graph is conceptually:

```text
+layout.svelte
    ↓
Application
    ├── private infrastructure
    │     ├── NostrSigner
    │     ├── NostrClient
    │     ├── ResourceWorkerClient
    │     ├── ResourceSelectionService
    │     └── OutboxProcessor
    │
    ├── application/runtime capabilities
    │     ├── AuthenticationService
    │     ├── AccountService
    │     ├── ToastService
    │     ├── SettingsService
    │     ├── WorkspaceRuntime
    │     └── ModuleResourceSelectionResolver
    │
    └── Domain services
          ├── Bible services
          ├── NotesService
          ├── Reading Plans services
          └── StrongsService

Application
    ↓ selected capabilities only
ApplicationContext
    ↓
Svelte modules / runtime presentation
```

The important asymmetry is intentional:

```text
Application owns more than ApplicationContext exposes.
```

---

# Application Is the Composition Root

The composition root is:

```text
src/lib/application/runtime/application.ts
```

`Application` constructs the concrete object graph and wires dependencies.

It creates infrastructure such as:

```text
NostrSigner
NostrClient
ResourceDiscovery
ResourceWorkerClient
ResourceSelectionService
OutboxProcessor
IndexedDB stores
Resource loaders
Resource publication strategies
```

It also creates application-facing objects such as:

```text
AuthenticationService
AccountService
WorkspaceRuntime
ToastService
SettingsService
ModuleResourceSelectionResolver
```

and all Domain services exposed to modules.

Module code should not recreate this object graph.

---

# Composition Does Not Mean Exposure

A constructed object is not automatically a public runtime capability.

Use this decision:

```text
Application creates object
    ↓
Does Svelte/runtime code need this object directly?
    ├── yes → consider ApplicationContext
    └── no  → keep private
```

Current private `Application` fields include:

```typescript
private readonly nostrSigner: NostrSigner;
private readonly nostrClient: NostrClient;
private readonly resourceWorkerClient: ResourceWorkerClient;
private readonly resourceSelectionService: ResourceSelectionService;
private readonly outboxProcessor: OutboxProcessor;
```

These are required implementation dependencies, not module-facing services.

---

# Application Lifecycle

`Application` owns lifecycle transitions for the graph it creates.

Current states:

```text
created
starting
started
stopped
```

Public operations:

```typescript
start(): Promise<void>
stop(): Promise<void>
```

The root Svelte layout does not manually start or stop individual infrastructure
objects.

---

# Root Svelte Bootstrap

The application shell is:

```text
src/routes/+layout.svelte
```

It constructs one application:

```typescript
const application =
    new Application(
        createApplicationConfig()
    );
```

and provides the application-facing context:

```typescript
provideApplicationContext(
    application.context
);
```

During `onMount`:

```text
request persistent browser storage
    ↓
AuthenticationService.tryLogin()
    ↓
Application.start()
    ↓
render child application when ready
```

On disposal:

```text
Application.stop()
```

The layout bridges Svelte lifecycle to the application lifecycle; it does not
own the lower-level services itself.

---

# Startup Policy

Authentication restoration happens before `Application.start()` because startup
policy may depend on the current user.

`Application.start()` then performs:

```text
restore global Resource selections
    ↓
initialize WorkspaceRuntime
    ↓
configure default Nostr Resource relays
    ↓
load account state if authenticated
    ↓
refresh account asynchronously
    ↓
wake durable Outbox processing
    ↓
mark application started
    ↓
start bootstrap Resource installation asynchronously
```

Bootstrap Resource installation intentionally does not block application
interactivity.

---

# Shutdown Policy

`Application.stop()` currently tears down shared infrastructure in this order:

```text
ResourceWorkerClient.dispose()
    ↓
NostrClient.dispose()
    ↓
NostrSigner.clear()
```

The worker is stopped before transport so it cannot issue another discovery
request while the Nostr client is being disposed.

This ordering belongs in `Application`, not Svelte components.

---

# ApplicationContext

The Svelte-facing contract is:

```text
src/lib/application/runtime/application-context.ts
```

The current surface is:

```text
Application services
    AuthenticationService
    AccountService
    ToastService
    SettingsService
    NavigationServiceFactory

Workspace/runtime
    WorkspaceRuntime
    ModuleResourceSelectionResolver

Bible
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

Notes
    NotesService

Reading Plans
    PlanDefinitionsService
    PlanSubscriptionsService
    PlanProgressService
    PlansPubSubService
    SubsEnricherService
    EncodedReadingsDecoderService

Strong's
    StrongsService
```

That list is a deliberate runtime capability surface, not a reflection of every
object inside `Application`.

---

# What ApplicationContext Deliberately Hides

The following implementation objects are intentionally absent:

```text
NostrSigner
NostrClient
NostrAccountStrategy
ResourceDiscovery
ResourceWorkerClient
ResourceSelectionService
PaneService
OutboxProcessor
IndexedDB stores
Resource publication strategies
```

This prevents transport, storage, and composition details from leaking into
modules.

---

# Per-Container State Uses Application-Owned Factories

Not every Svelte-facing capability is a singleton. `NavigationService` stores a
container-local navigation stack, so sharing one instance across Login and
Profile containers would couple unrelated UI state.

The current ownership is:

```text
Application
    → NavigationServiceFactory
        ↓ exposed through ApplicationContext
Svelte container
    → factory.create()
        ↓
independent NavigationService instance
```

This preserves the rule that Svelte does not construct application services
directly while still allowing independent per-container state.

Workers follow a related rule: a Worker is a separate composition root and may
construct its own local domain helpers instead of reaching through
`ApplicationContext`.

---

# Context Provision and Access

The context is provided with:

```typescript
provideApplicationContext(
    context: ApplicationContext
): void
```

and consumed with:

```typescript
useApplicationContext(): ApplicationContext
```

Normal consumers import these through:

```text
$lib/application
```

`useApplicationContext()` throws if the context has not been provided. A
rendered application module is expected to be below the root application
layout.

---

# Runtime Context vs Public Import APIs

These are different boundaries:

```text
ApplicationContext
    = runtime capability access

index.ts
    = compile-time import boundary
```

Normal external consumers should prefer:

```text
$lib/application
$lib/application/ui
$lib/domains/bible
$lib/domains/notes
$lib/domains/reading-plans
$lib/domains/strongs
```

Internal implementation files may use direct internal imports when that avoids
barrel cycles or better represents implementation dependencies.

---

# WorkspaceRuntime

The public Workspace coordinator is:

```text
src/lib/application/runtime/workspace/workspace-runtime.ts
```

Current responsibilities include:

```text
initialize Workspace state
find Pane
derive visible layout
read/publish Pane dimensions
subscribe to Pane dimensions
persist Workspace
replace Buffer
split Pane
close Pane
delete Pane
publish Workspace changes
allocate Pane IDs
```

Workspace-aware modules use this boundary rather than reaching into Pane
persistence helpers.

---

# PaneService Is Internal

`PaneService` remains an implementation dependency but is not exposed through
`ApplicationContext`.

Composition is:

```text
Application
    ↓
PaneService
    ↓
WorkspaceRuntime
    ↓
Svelte/runtime consumers
```

`PaneService` implements lower-level persistence and Pane-dimension state.
`WorkspaceRuntime` is the public coordinator.

---

# Workspace Mutation Boundary

A module may request Workspace behavior but should not implement Pane-tree
mutation itself.

For example:

```text
module UI
    ↓
workspaceRuntime.splitPane(...)
    ↓
Pane-tree mutation
    ↓
Workspace persistence
    ↓
Workspace change publication
```

Module transitions use:

```text
workspaceRuntime.replaceBuffer(...)
```

rather than mutating `pane.buffer.componentName` directly. This ensures a new
Buffer and its Resource-selection snapshot are created together.

---

# Workspace Persistence and Notifications

The public persistence command is:

```typescript
workspaceRuntime.persistWorkspace();
```

Svelte/domain modules should not call `PaneService.save()` directly.

`WorkspaceRuntime.subscribe()` publishes current runtime change types:

```text
pane-split
pane-deleted
pane-buffer-replaced
```

Pane-dimension publication/subscription is also exposed through
`WorkspaceRuntime`, while the underlying `PaneService` mechanism stays private.

---

# ModuleResourceSelectionResolver

The runtime-specific Resource context capability is:

```text
ModuleResourceSelectionResolver
```

Its contract is intentionally narrow:

```typescript
require(
    paneID: string,
    resourceType: string
): PublishedResourceReference;
```

Resolution flow:

```text
paneID
    ↓
WorkspaceRuntime.findPane()
    ↓
Pane.buffer
    ↓
Buffer.resourceSelections
    ↓
PublishedResourceReference
```

The resolver exposes the Resource snapshot captured for one Module Instance.

---

# Why ResourceSelectionService Is Private

`ResourceSelectionService` owns current/global Resource-selection policy.

A running Module Instance should normally use the Resource selections captured
inside its Buffer.

Therefore module UI uses:

```text
ModuleResourceSelectionResolver
```

not:

```text
ResourceSelectionService
```

directly.

This protects Buffer snapshot semantics from mutable global selection changes.

---

# Shared Application Services

The main application-level services are:

```text
AuthenticationService
AccountService
ToastService
SettingsService
```

They own application-wide state or behavior rather than Domain behavior.

`Application` constructs one instance and exposes it because runtime/Svelte
consumers use it directly.

---

# AuthenticationService

Implementation:

```text
src/lib/application/services/authentication.service.ts
```

It owns:

```text
authentication state
saved-login restoration orchestration
explicit login orchestration
current user ID
state subscriptions
```

Public concepts include:

```text
getState
subscribe
tryLogin
login
tryGetUserId
getUserId
```

The application-facing state remains generic:

```text
signed-out
authenticated
read-only
userId
```

Nostr-specific credential and signer behavior remains behind
`AuthenticationStrategy` / `NostrAuthenticationStrategy`.

---

# AccountService

Implementation:

```text
src/lib/application/services/account/account.service.ts
```

It owns:

```text
account state
account subscriptions
load
refresh
setup
```

The current implementation uses a Nostr account strategy internally, but UI
consumes only `AccountService`.

Relay preferences are part of `AccountState`:

```text
NostrAccountStrategy
    ↓
AccountState
    ↓
AccountService
    ↓
Profile UI
```

This avoids a second Nostr-specific relay state channel.

---

# ToastService

`ToastService` is an application-owned message channel:

```text
producer
    ↓
showToast(message)
    ↓
ToastService
    ↓
root UI subscriber
    ↓
presentation / timeout
```

It owns publication, not visual presentation.

---

# SettingsService

`SettingsService` owns settings behavior and persistence:

```text
read localStorage
normalize settings
write localStorage
apply settings to the application DOM
notify subscribers
```

The direction is:

```text
settings UI
    ↓
SettingsService
    ↓
localStorage + application DOM
```

Svelte components should not reimplement settings persistence independently.

---

# Subscription Ownership

Application services own authoritative shared state. Components own local
presentation state derived from it.

When a service returns an unsubscribe closure, the component should clean it up
with its lifecycle.

`SettingsService` currently uses subscriber IDs and explicit
`unsubscribe(subscriberID)` calls instead.

The concrete API differs, but the ownership rule is the same:

```text
service
    = authoritative state

component
    = subscription + presentation
```

---

# Domain Services

Domain services are exposed through `ApplicationContext` when module UI needs
to perform Domain behavior.

Examples include:

```text
ChapterService
ParagraphsService
PericopesService
BibleTextMarkupService
BibleBooknamesService
SearchService
VerseService
BibleVersionsService
NotesService
PlanDefinitionsService
PlanSubscriptionsService
PlanProgressService
StrongsService
```

`Application` composes their concrete stores, Resource loaders, write
transactions, publication mappings, and Outbox dependencies.

---

# Domain Services Must Not Own Workspace Runtime

Domain services should not know about:

```text
Pane IDs
Pane trees
Buffers
Workspace layout
Svelte components
Module transitions
```

Correct direction:

```text
module UI
    ├── WorkspaceRuntime
    ├── ModuleResourceSelectionResolver
    └── Domain service
```

A Resource-aware module resolves its selected `PublishedResourceReference`
through the runtime resolver and then passes Domain/resource values to the
Domain service.

---

# Read Infrastructure Stays Behind Domain Services

A read-oriented Domain service may internally use:

```text
IndexedDB store
ResourceLoader
ResourceWorkerClient
```

Conceptually:

```text
module asks Domain service for object
    ↓
local store lookup
    ↓ miss
ResourceLoader
    ↓
ResourceWorkerClient.install(...)
    ↓
Resource pipeline installs Domain Object
    ↓
service returns Domain value
```

The module sees the Domain operation, not the Resource worker.

---

# Write Infrastructure Stays Behind Domain Services

A write-oriented service may internally use:

```text
IndexedDB write transaction
ResourcePublication mapping
OutboxProcessor
```

Conceptually:

```text
module UI
    ↓
Domain service write
    ↓
Domain write transaction
    ↓
publication entry
    ↓
Outbox
    ↓
transport strategy
```

The module does not require direct access to `OutboxProcessor`, `NostrClient`,
or `NostrSigner`.

---

# Tests Do Not Define ApplicationContext

Integration tests may need lower-level fixture infrastructure. That does not
justify exposing it through the production context.

For example, relay tests may construct their own:

```text
NostrSigner
NostrClient
```

for fixture publication while the `Application` under test still exposes only
normal production capabilities.

Rule:

> Test convenience must not define the production runtime API.

---

# Stateful Does Not Mean Context-Exposed

A useful distinction is:

```text
stateful shared object
    ⇒ Application may need to own it

stateful shared object
    ⇏ ApplicationContext must expose it
```

Examples of private stateful objects:

```text
NostrClient
ResourceSelectionService
OutboxProcessor
ResourceWorkerClient
PaneService
```

`ApplicationContext` is about allowed consumer operations, not object lifetime.

---

# Deciding Whether to Add an ApplicationContext Field

Ask these questions:

1. Does runtime/Svelte code need to invoke it directly?
2. Is there already a higher-level service that owns the behavior?
3. Would exposure leak transport, storage, or framework details?
4. Is the object only needed by tests?
5. Is the behavior really a Workspace operation that belongs in
   `WorkspaceRuntime`?
6. Can the consumer contract be narrower than the implementation object?

If the answer points to an existing higher-level boundary, use that boundary
instead of enlarging `ApplicationContext`.

---

# Adding a New Application Service

Preferred sequence:

```text
1. Define the application-facing behavior/state.
2. Decide which object owns authoritative state.
3. Keep transport/storage details behind explicit dependencies.
4. Construct the service in Application.
5. Add it to ApplicationContext only if runtime consumers need it.
6. Consume it through useApplicationContext().
7. Add service-level tests.
8. Add integration tests where composition matters.
```

The context field is the result of an ownership decision, not the starting
point.

---

# Adding a New Domain Service

Preferred flow:

```text
Domain defines service
    ↓
Application composes stores/loaders/write dependencies
    ↓
ApplicationContext exposes service if module UI needs it
    ↓
Domain module consumes service
```

Do not pass `Pane`, `Buffer`, or `ApplicationContext` into Domain services just
because the caller is a module.

---

# Adding a New Workspace Capability

Workspace behavior should normally extend `WorkspaceRuntime`.

Examples:

```text
Pane creation/deletion
Pane splitting
Buffer replacement
Workspace persistence
Pane dimensions
future focus coordination
```

If an operation concerns visible runtime structure or Module placement,
`WorkspaceRuntime` is the likely owner. Domain behavior does not belong there.

---

# Typical Module Consumption

A module may consume several independent capabilities:

```typescript
const {
    workspaceRuntime,
    moduleResourceSelectionResolver,
    chapterService
} = useApplicationContext();
```

Each has a separate responsibility:

```text
workspaceRuntime
    = Workspace operation

moduleResourceSelectionResolver
    = Resource context for this Module Instance

chapterService
    = Bible Domain behavior
```

Do not collapse these into one oversized service.

---

# Anti-Patterns

Do not reintroduce the following without a concrete architectural reason:

```text
ApplicationContext.nostrSigner
ApplicationContext.nostrClient
ApplicationContext.resourceDiscovery
ApplicationContext.resourceSelectionService
ApplicationContext.resourceService
ApplicationContext.nostrAccountStrategy
ApplicationContext.paneService
```

Also avoid:

```text
DomainService(ApplicationContext)
```

and avoid component-owned instances of shared application services.

Normal module code should not manipulate transport, Resource worker, Outbox,
Pane persistence, or shared settings storage directly.

---

# Recent Boundary Cleanup

Recent cleanup established these precedents:

| Removed context capability | Why |
| --- | --- |
| `ResourceDiscovery` | Composition/discovery implementation. |
| `ResourceSelectionService` | Modules consume captured Buffer snapshots. |
| `NostrClient` | Transport infrastructure. Tests own fixture clients. |
| Generic Resource install capability | Reads should enter through Domain services. |
| `NostrAccountStrategy` / relay provider | Account state belongs to `AccountService`. |
| `PaneService` | Workspace implementation belongs behind `WorkspaceRuntime`. |

These are useful examples when evaluating future context fields.

---

# Testing Strategy

Test the boundary that owns the behavior.

Service/unit tests should cover state transitions, subscriptions, errors,
persistence delegation, and runtime mutation policy without constructing the
full application when unnecessary.

Use `Application` when composition or lifecycle itself is under test.

Use browser tests when real browser infrastructure matters, such as:

```text
IndexedDB
Resource Web Worker
local relay transport
relay → Resource → Domain Object installation
```

Where possible, integration tests should enter through the same Domain or
application service boundary used by production code.

---

# Characterization Before Cleanup

Before deleting or hiding a shared service, trace:

```text
imports
runtime consumers
test consumers
startup/shutdown uses
persistence effects
subscriptions
```

A context field with no UI consumer is a strong cleanup candidate, but the
underlying object may still be needed privately by `Application`.

That distinction was important for `ResourceSelectionService`, `NostrClient`,
and `PaneService`.

---

# Important Files

```text
src/lib/application/index.ts
src/lib/application/ui/index.ts
src/lib/application/runtime/application.ts
src/lib/application/runtime/application-context.ts
src/lib/application/runtime/workspace/workspace-runtime.ts
src/routes/+layout.svelte

src/lib/application/services/authentication.service.ts
src/lib/application/services/account/
src/lib/application/services/settings.service.ts
src/lib/application/services/toast.service.ts
src/lib/application/services/navigation-service-factory.ts
src/lib/application/services/pane.service.svelte.ts

src/lib/application/resources/module-resource-selection-resolver.ts
src/lib/application/resources/module-resource-selection-builder.ts
src/lib/application/resources/resource-selection.service.ts
```

The boundary rule is:

```text
$lib/application
    = browser-safe application contracts/capabilities

$lib/application/ui
    = Svelte/browser-only application presentation exports

src/lib/application/runtime/application.ts
    = concrete composition root, imported directly only by +layout.svelte
```

---

# Ownership Decision Table

| Concern | Current owner | In `ApplicationContext`? |
| --- | --- | --- |
| Application lifecycle | `Application` | No |
| Nostr signing | infrastructure | No |
| Nostr transport | infrastructure | No |
| Authentication state | `AuthenticationService` | Yes |
| Account state | `AccountService` | Yes |
| Settings | `SettingsService` | Yes |
| Toast publication | `ToastService` | Yes |
| Per-container navigation construction | `NavigationServiceFactory` | Yes |
| Workspace operations | `WorkspaceRuntime` | Yes |
| Pane persistence internals | `PaneService` | No |
| Buffer construction | `ModuleBufferFactory` | No |
| Global Resource selection | `ResourceSelectionService` | No |
| Per-Buffer Resource lookup | `ModuleResourceSelectionResolver` | Yes |
| Resource worker lifecycle | `ResourceWorkerClient` | No |
| Outbox processing | `OutboxProcessor` | No |
| Bible behavior | Bible Domain services | Yes |
| Bible reference/navigation helpers | Bible Domain services owned by `Application` | Yes |
| Notes behavior | `NotesService` | Yes |
| Reading Plans behavior | Reading Plans services | Yes |
| Reading Plans enrichment/decoding helpers | Reading Plans Domain services owned by `Application` | Yes |
| Strong's behavior | `StrongsService` | Yes |

---

# Runtime Ownership Invariants

The current implementation should preserve these rules:

```text
Application owns construction and lifecycle.

ApplicationContext exposes consumer capabilities,
not the complete object graph.

Transport, Resource, Outbox, and persistence infrastructure stay private.

WorkspaceRuntime is the public Workspace coordinator.

PaneService stays behind WorkspaceRuntime.

Module Resource reads use Buffer snapshots through
ModuleResourceSelectionResolver.

Domain services do not depend on Pane/Buffer/Workspace structures.

Application services own shared application state.

Svelte components own presentation and subscription cleanup,
not authoritative shared state.

Tests do not add production context fields merely for fixture convenience.

Public index.ts boundaries remain intentional and selective.
```

---

# Future Evolution

The ownership model can support future capabilities such as:

```text
multiple Workspaces
named/detached Buffers
explicit focus coordination
new account capabilities
new Domain services
alternative transport implementations
alternative persistence adapters
```

The extension rule remains:

```text
new implementation dependency
    ↓
Application composes it
    ↓
identify the true application/domain owner
    ↓
expose only the capability runtime UI actually needs
```

A new feature should not automatically add every implementation object to
`ApplicationContext`.

---

# Big Takeaway

The runtime service architecture is intentionally layered:

```text
Svelte / module UI
    ↓
ApplicationContext
    ↓
Application service / Domain service / WorkspaceRuntime
    ↓
private implementation dependencies
    ↓
infrastructure
```

`Application` knows the complete object graph.

`ApplicationContext` knows only the capabilities UI is allowed to use.

`WorkspaceRuntime` owns Workspace coordination.

Application services own application-wide state and policy.

Domain services own Domain behavior.

Infrastructure stays behind those boundaries.

Maintaining that dependency direction is the primary rule for future runtime
service work.
