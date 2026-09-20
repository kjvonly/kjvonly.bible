# Reading Plans Domain Implementation

**Status:** Current
**Domain:** Reading Plans

---

# Purpose

This document describes the current Reading Plans implementation after the Resource/Domain/Outbox refactor.

The Domain intentionally separates three different lifecycle concepts:

```text
Plan Definitions
Plan Subscriptions
Plan Progress
```

They are related but they are not one persistence object.

The central rule is:

> Plan Definitions are reference/published data. Plan Subscriptions and Plan Progress are user-owned mutable application state.

---

# High-Level Architecture

```text
Plan Definitions
    published Resources
        ↓
    Resource Worker installation
        ↓
    accepted PlanDefinition Domain Objects

Plan Subscriptions
    local user action
        ↓
    accepted PlanSubscription Domain Objects
        + ResourceInstallation revision state
        + Outbox publication

Plan Progress
    local completion action
        ↓
    accepted PlanProgress Domain Objects
        + ResourceInstallation revision state
        + Outbox publication

accepted subscriptions + progress
        ↓
Plans worker
        ↓
Sub runtime/UI projections
```

The UI consumes all three, but their lifecycle and ownership are different.

---

# Scope

This document covers:

- Plan Definition Domain Objects,
- Plan Subscription snapshots,
- Plan Progress,
- Resource identities,
- module Resource selection,
- persistence,
- Plan Definition inbound installation,
- Subscription/Progress outbound publication,
- encoded reading decoding,
- worker runtime projection,
- typed worker messages,
- Bible navigation handoff,
- current limitations and synchronization boundary,
- testing and extension rules.

---

# Domain Objects

## PlanDefinition

```ts
interface PlanDefinition {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly encodedReadings: readonly string[];
}
```

Identity:

```text
<publisher>/<group>/<planKey>
```

The definition contains application content only.

Publisher/group/key transport identity is represented by `id` rather than duplicated inside Resource payload fields.

## PlanSubscription

```ts
interface PlanSubscription {
    readonly id: string;
    readonly planDefinitionId: string;
    readonly name: string;
    readonly description: string;
    readonly encodedReadings: readonly string[];
    readonly dateSubscribed: number;
}
```

Identity:

```text
<publisher>/<group>/<subscriptionId>
```

A subscription is a snapshot.

The plan name, description, and encoded readings are copied into the subscription when the user subscribes.

This means a subscription remains usable even if the source Plan Definition later changes or disappears.

## PlanProgress

```ts
interface PlanProgress {
    readonly id: string;
    readonly completedReadingIndexes:
        readonly number[];
}
```

`PlanProgress.id` is the Plan Subscription application ID.

Progress is intentionally separate from the subscription snapshot.

Completed readings are represented as zero-based indexes into the subscription's encoded reading list.

---

# Shared Persistence

All three accepted object types use the shared:

```text
domain_objects
```

store.

Each Domain store reads/writes only its own `objectType`.

Conceptually:

```text
Plan Definition
    objectType = reading-plans/definition

Plan Subscription
    objectType = reading-plans/subscription

Plan Progress
    objectType = reading-plans/progress
```

The exact constants in source remain authoritative.

Collection reads use the shared `objectType` index.

There is no generic physical `plans` store.

---

# Plan Definition Resources

Plan Definitions use:

```text
Resource Type
    kjvonly/plans/readings
```

An individual definition Resource is:

```text
kjvonly/plans/readings/<group>/<planKey>
```

The default group is:

```text
default
```

Example application identity:

```text
<publisher>/default/mcheyne
```

Plan Definition resources are installed through the Resource Worker.

---

# Plan Definition Inbound Lifecycle

```text
Decoded Resource
    ↓
PlanDefinitionInterpreter
    ↓
PlanDefinitionValidator
    ↓
PlanDefinitionInstaller
    ↓
PlanDefinition Domain Object
    + ResourceInstallation
```

## Interpreter

The interpreter requires exactly two Resource path segments:

```text
<group>/<planKey>
```

One Resource produces one candidate.

## Validator

The validator accepts the canonical Plan Definition content shape and removes transport concerns from application content.

## Installer

The installer requires exactly one validated candidate.

Application identity is derived from:

```text
Resource publisher
+ group
+ plan key
```

The installer persists both the Domain Object and installation provenance in one transaction.

## Freshness policy

Plan Definitions use `ResourceInstallation.modifiedAt` to reject an older/equal Resource version for the same application identity.

Thus reference Plan Definitions can be updated by a newer published Resource.

This differs from writable user state such as Notes, where inbound overwrite policy is intentionally more conservative.

---

# PlanDefinitionService

`PlanDefinitionsService` is a local accepted-state service.

It provides:

```text
get(id)
list()
```

Normal reads do not perform remote discovery.

The Discover UI lists installed accepted Plan Definitions.

Remote refresh/synchronization is a separate concern.

---

# Encoded Reading Format

Plan Definitions store readings compactly in `encodedReadings`.

A reading string contains semicolon-separated Bible ranges.

Example:

```text
1/1/1-31;47/1/1-25;15/1/1-11;51/1/1-26
```

`EncodedReadingsDecoderService` converts this into `Readings` containing `BCV[]` values used by the UI/Bible-navigation flow.

The decoder receives a `BookNameLookup` rather than directly depending on Booknames storage.

That keeps decoding logic independent from persistence.

It also calculates total verse counts for each reading group.

---

# Plan Definition UI Projection

`PlanDefinitionView` extends the accepted definition with derived:

```text
nestedReadings
```

The accepted `PlanDefinition` remains the persisted source of truth.

Decoded readings are UI/runtime projection state.

---

# Module Resource Selection

The Plans module currently requires:

```text
Bible Booknames Resource
Plan Definition Resource
Plan Subscription Resource
```

The contributor is:

```text
PlansModuleResourceSelectionContributor
```

Plan Definition Resource Type:

```text
kjvonly/plans/readings
```

Plan Subscription Resource Type:

```text
kjvonly/plans/subscriptions
```

When a required Plans selection is absent and a current user ID is available, the contributor can create current-user `default` selections.

Existing application selections remain authoritative.

In normal startup, installed/bootstrap selections may already satisfy Plan Definition selection before the module is created.

Progress does not need an independent selected collection because Progress identity is derived from the accepted subscription identity.

---

# Plan Subscriptions

A subscription is user-owned mutable application state.

Resource Type:

```text
kjvonly/plans/subscriptions
```

Selected collection source:

```text
kjvonly/plans/subscriptions/<group>
```

Individual publication:

```text
kjvonly/plans/subscriptions/<group>/<subscriptionId>
```

The default group is:

```text
default
```

---

# Creating a Subscription

The Discover Details UI resolves the selected Plan Subscription source from the current Buffer.

It creates a new application ID with:

```text
createPlanSubscriptionIdForSource(
    selectedSubscriptionSource,
    uuid
)
```

The subscription copies the selected definition snapshot:

```text
planDefinitionId
name
description
encodedReadings
dateSubscribed
```

Then:

```text
PlanSubscriptionsService.put(subscription)
    ↓
atomic Domain Object + ResourceInstallation + Outbox write
    ↓
Outbox wake
    ↓
PlansPubSubService.putSub(subscription)
```

The worker update is a derived-runtime update after accepted durable state is committed.

---

# Subscription Publication

`PlanSubscriptionResourcePublication` derives publication identity from `PlanSubscription.id`.

Representation:

```text
content
```

Media type:

```text
application/json+gzip+hex
```

Payload excludes the application `id` because Resource publisher/path encode identity.

---

# Plan Progress

Progress Resource Type:

```text
kjvonly/plans/progress
```

Progress publication uses the same publisher/group/subscription ID parts as its associated subscription:

```text
kjvonly/plans/progress/<group>/<subscriptionId>
```

Payload:

```ts
{
    completedReadingIndexes: number[];
}
```

The subscription snapshot is not rewritten when progress changes.

---

# completeReading()

`PlanProgressService.completeReading(subscriptionId, readingIndex)` performs the read-modify-write inside one transaction.

Behavior:

1. validate the reading index,
2. load existing progress from the transaction store,
3. return unchanged if the reading is already completed,
4. otherwise append/sort the new index,
5. build the Resource publication,
6. persist Progress + ResourceInstallation revision state + Outbox atomically,
7. wake Outbox only when state changed.

This makes completion idempotent for an already-completed reading.

---

# Current Inbound / Outbound Coverage

The current implementation is intentionally asymmetric.

## Plan Definitions

```text
Inbound Resource installation
    implemented

Local write/publication
    not implemented
```

## Plan Subscriptions

```text
Local write/publication
    implemented

Inbound Resource interpreter/validator/installer
    implemented
```

## Plan Progress

```text
Local write/publication
    implemented

Inbound Resource interpreter/validator/installer
    implemented
```

Inbound Resource handling does not by itself mean multi-device synchronization policy is complete. Synchronization remains a separate application responsibility.

---

# Plans Worker

The Plans worker builds the runtime `Sub` projection used by My Plans / Next Readings UI.

It does not own authoritative persistence.

Authoritative worker inputs are:

```text
Booknames lookup data
accepted PlanSubscription[]
accepted PlanProgress[]
```

Derived worker state includes:

```text
decoded nested readings
completed-reading Set
next reading index
percent complete
```

The worker can rebuild all derived values from accepted inputs.

---

# Worker Composition Root

The worker is a separate composition root.

It constructs its own:

```text
EncodedReadingsDecoderService
SubsEnricherService
```

The main `Application` also owns instances of these services for Svelte/runtime consumers through `ApplicationContext`.

That duplication of stateless helper construction is intentional.

The worker does not reach through `ApplicationContext`.

---

# Typed Worker Message Contract

The current worker boundary uses explicit types from:

```text
models/plans-worker.model.ts
```

Commands are a discriminated union including:

```text
init
GET_ALL_SUBS
PUT_SUB
PUT_PROGRESS
refresh
```

Worker messages include:

```text
PLANS_WORKER_INITIALIZED
PlansSubscriptionsMessage
```

`PlansPubSubService` exposes a typed `PlansWorkerPort` and typed subscriber callbacks.

This replaced the older open-ended/`any` worker payload boundary.

---

# PlansPubSubService

`PlansPubSubService` is application-owned and exposed through `ApplicationContext`.

It owns:

```text
worker lifetime
initialization handshake
main-thread subscriber routing
worker command publication
explicit worker refresh signaling
```

Initialization is idempotent for the service lifetime.

`refresh()` is intentionally argument-free. If the worker has never been initialized, refresh is a no-op because a later normal initialization will read current accepted state. If initialization is in progress, the service waits for it before sending the refresh command.

The first call sends:

```text
booknamesById
subscriptions
progress
```

and resolves when the worker sends `PLANS_WORKER_INITIALIZED`.

UI subscribers consume `PlansSubscriptionsMessage` for the derived `Map<string, Sub>` projection.

---

# Application Startup for Plans Runtime

`plansContainer.svelte` loads accepted state through:

```text
PlanSubscriptionsService.list()
PlanProgressService.list()
```

and obtains Booknames before initializing `PlansPubSubService`.

This keeps normal worker initialization based on accepted local Domain state supplied by the main thread.

The worker does not query persistence during normal initialization or incremental `putSub` / `putProgress` commands.

An explicit `refresh` command is the exception. On refresh, the worker reloads accepted `PlanSubscription` and `PlanProgress` state from IndexedDB itself, rebuilds the derived `Sub` projection, and republishes subscriptions. This keeps cross-worker reconciliation work off the main thread.

---

# Sub Projection

`Sub` is runtime/UI state derived from a `PlanSubscription`.

It includes:

```text
subscription identity
snapshot name/description
nested decoded readings
completedReadingIndexes Set
nextReadingsIndex
percentCompleted
```

`planSubscriptionToSub()` receives both:

```text
BookNameLookup
EncodedReadingsDecoderService
```

explicitly.

It no longer reaches into a global decoder singleton.

---

# SubsEnricherService

`SubsEnricherService` derives:

```text
lowest incomplete reading index
has-next-reading state
percent complete
```

Derived values do not belong in durable `PlanSubscription` or `PlanProgress` state.

This keeps persistence normalized around accepted user state.

---

# Navigation Into Bible

When a user chooses a Reading, Reading Plans replaces the current Buffer with the Bible module and places navigation context in `Buffer.bag`.

The Reading Plans type:

```text
NavReadings
```

extends the Bible-owned:

```text
BibleReadingNavigation
```

This preserves one-way Domain dependency:

```text
Reading Plans
    → Bible

Bible
    ✕ Reading Plans
```

The Bible Domain does not import Reading Plans models.

The navigation bag includes the selected readings and the current reading index needed by Bible presentation.

Reading Plans-specific fields such as subscription ID and return view stay in `NavReadings`.

---

# Completion on Return

When the user returns to a Plans view with `navReadings` still in the Buffer bag, the UI treats that reading as completed:

```text
read navReadings
    ↓
PlanProgressService.completeReading()
    ↓
remove navReadings from Buffer bag
    ↓
PlansPubSubService.putProgress()
```

This updates accepted progress durably first and then updates the worker projection.

---

# Application Composition

`Application` constructs and exposes through `ApplicationContext`:

```text
PlanDefinitionsService
PlanSubscriptionsService
PlanProgressService
PlansPubSubService
SubsEnricherService
EncodedReadingsDecoderService
```

Application composition also registers `PlansPubSubService` as a consumer of generic Archive import-completion events. When handled imported Resource Types include Plan Subscription or Plan Progress, it signals `refresh()` to the Plans worker.

The concrete IndexedDB stores/write transactions and Resource-publication mappers remain composition details.

Plan Definition, Subscription, and Progress inbound handler composition remains inside the Resource Worker.

---

# Synchronization Boundary

Normal Plan reads are local accepted-state reads.

Plan Subscription and Plan Progress now have explicit inbound Resource interpretation, validation, freshness-aware installation, and Resource Worker registration. The same handlers are reused by KJVOnly Archive import.

Archive import can update accepted Plan state from a separate worker. The generic Archive import event therefore signals the already-running Plans worker to refresh its derived projection from IndexedDB when Subscription/Progress Resources were actually handled.

Broader multi-device synchronization remains separate from normal `list()`/`get()` methods and from the existence of inbound handlers. Plans UI/services should not query Nostr directly for synchronization.

---

# Current Known Limitations

The current implementation intentionally does not yet provide:

```text
subscription delete/unsubscribe lifecycle
progress deletion/reset semantics beyond current writes
multi-device conflict resolution/synchronization
Plan Definition authoring/publication
```

There are also older UI/helper shapes in the Plans module that can be cleaned independently without changing the accepted Domain model.

---

# Testing

Current tests cover:

```text
Plan Definition identity
Plan Definition interpreter/validator/installer/handler
Plan Definition store/service behavior
module Resource selection
Plan Subscription identity/source/publication
Plan Subscription interpreter/validator/installer/handler
subscription persistence/write transaction
Plan Progress publication/write transaction/service behavior
Plan Progress interpreter/validator/installer/handler
encoded reading decoding
Subs enrichment
Plans worker / PlansPubSubService message behavior
Plans worker refresh from IndexedDB
```

Browser installation tests also exercise Subscription and Progress through the real Resource processing / IndexedDB path.

---

# Architectural Invariants

1. Plan Definition, Subscription, and Progress are distinct Domain Objects.
2. A Subscription is a snapshot of the Plan Definition at subscribe time.
3. Progress is separate from the Subscription and reuses its application ID.
4. Accepted state lives in Domain persistence; worker state is derived.
5. Plan Definition, Subscription, and Progress inbound installation are implemented through normal Resource handlers.
6. Subscription/Progress writes persist Domain state + ResourceInstallation state + Outbox intent atomically.
7. Worker messages are explicitly typed.
8. The worker is a separate composition root and does not use `ApplicationContext`.
9. Normal worker initialization is seeded by the main thread; explicit refresh reloads Subscription/Progress state from IndexedDB inside the worker.
10. Reading Plans may depend on Bible navigation types; Bible must not depend on Reading Plans.
11. Normal Plans reads are local; synchronization is separate.

---

# Important Files

```text
src/lib/domains/reading-plans/models/
src/lib/domains/reading-plans/persistence/
src/lib/domains/reading-plans/resources/
src/lib/domains/reading-plans/services/
src/lib/domains/reading-plans/workers/kjvplans.worker.ts
src/lib/domains/reading-plans/modules/

src/lib/application/runtime/application.ts
src/lib/application/runtime/application-context.ts
```

---

# Final Mental Model

```text
Plan Definition
    = installed reference data

Plan Subscription
    = durable user snapshot

Plan Progress
    = durable completion state

Plans worker Sub
    = derived UI/navigation projection

Outbox
    = durable outbound publication

Synchronization
    = separate future responsibility
```
