# Architecture Migration

## Status

Completed / Historical Record

---

# Purpose

This document records the architectural migration that reorganized the KJVOnly client around explicit ownership boundaries.

It began as the migration plan for moving the existing implementation away from broad technical-role folders and implicit dependencies toward explicit application, domain, Resource, runtime, and infrastructure ownership.

That migration is now substantially complete.

This document is retained to explain:

* what the migration was trying to accomplish,
* the rules that guided it,
* the major outcomes,
* and which current documents should be used for implementation guidance.

It is no longer the active step-by-step migration plan.

For current implementation guidance, prefer:

```text
docs/03_implementation/010-domain-implementation-map.md
docs/03_implementation/011-target-code-organization.md
docs/03_implementation/runtime/
docs/03_implementation/resources/
docs/03_implementation/persistence/004-outbox-implementation.md
```

When documentation disagrees with the source, the current source is authoritative.

---

# Original Goal

The migration was primarily organizational.

The application already contained most of the required behavior, but ownership was obscured by historical organization around broad technical categories such as:

```text
components
models
modules
services
workers
nostr
```

The migration aimed to make architectural ownership visible without unnecessarily redesigning working behavior.

The central rule was:

> Move responsibilities according to ownership, not merely according to file type.

The intended result was:

```text
Application
    = composition and lifecycle

Domains
    = application meaning and behavior

Resource
    = transport-independent published Resource boundary

Infrastructure
    = technical adapters and persistence

Runtime
    = Workspace / Pane / Buffer coordination

UI
    = presentation over those capabilities
```

---

# Migration Principles

Several principles from the original migration remain current coding rules.

## Preserve Behavior

Structural cleanup should avoid changing application behavior unless a concrete defect requires it.

Do not combine architectural movement with unrelated redesign merely because the code is already being touched.

## Trace Before Moving

Before moving, deleting, or hiding implementation:

```text
trace callers
    ↓
identify responsibility
    ↓
identify owner
    ↓
identify legitimate external consumers
    ↓
define the smallest public boundary
    ↓
update consumers
    ↓
validate behavior
```

## Public APIs Are Deliberate

Public APIs should expose legitimate cross-owner concepts.

They should not export every implementation for convenience.

The current convention is generally:

```text
external consumer
    → owner root API

browser/Svelte consumer
    → owner /ui API when required

internal implementation
    → direct internal imports when appropriate
```

## Composition Wiring Is Different

Composition roots, workers, concrete persistence adapters, and integration tests may intentionally import concrete implementations.

The migration was never intended to eliminate every deep import.

The goal is correct ownership and dependency direction, not cosmetic path flattening.

---

# Major Completed Outcomes

## Application Ownership

`Application` is now the concrete composition root.

It constructs and wires long-lived application/domain capabilities and infrastructure.

The concrete `Application` class is intentionally not part of the public `$lib/application` barrel.

The runtime bootstrap boundary is:

```text
src/routes/+layout.svelte
```

That is the only runtime location that should import the concrete `Application` class directly.

Normal consumers use application capabilities rather than constructing the application.

---

## ApplicationContext

`ApplicationContext` is now the intentional Svelte-facing runtime capability surface.

It is not a generic container for everything constructed by `Application`.

Svelte code consumes application-owned services through this context when those services represent runtime capabilities required by presentation code.

Examples include Workspace runtime capabilities, Settings, authentication/account behavior, Bible services, and Reading Plans services.

Per-container state uses factories where necessary rather than being converted into accidental global singletons.

---

## Application Public APIs

The Application layer now has two intentional public entry points:

```text
$lib/application
$lib/application/ui
```

`$lib/application` exposes browser-safe application contracts and capabilities.

`$lib/application/ui` exposes Svelte/browser presentation components and helpers.

This split exists because exporting browser-only Svelte components through the root application barrel caused Node test imports to transitively load browser dependencies such as Quill and fail on `document` access.

The old nested public barrels under application runtime/resources/outbox organization were consolidated.

Internal organization may still use those folders.

They are not separate public architectural owners.

---

## Domain Ownership

The main application Domains are now explicit:

```text
Bible
Notes
Reading Plans
Strong's
```

Each Domain owns its application meaning, services, persistence behavior, Resource interpretation/validation/installation, and module-specific behavior.

Settings is application-owned rather than a separate Domain.

Strong's is its own Domain rather than Bible-owned implementation detail.

---

## Domain Public APIs

External non-UI consumers use Domain root APIs such as:

```text
$lib/domains/bible
$lib/domains/notes
$lib/domains/reading-plans
$lib/domains/strongs
```

Browser-only Domain presentation exports use `/ui` boundaries where required:

```text
$lib/domains/bible/ui
$lib/domains/notes/ui
$lib/domains/reading-plans/ui
```

The old `modules/index.ts` presentation barrels were removed.

Internal Domain implementation may still import concrete files directly.

---

## Cross-Domain Dependency Direction

Cross-Domain dependencies were audited and reduced.

One important circular type dependency between Bible and Reading Plans was removed.

Reading Plans may depend on Bible navigation/location concepts because Reading Plans references Bible readings.

Bible should not depend on Reading Plans-specific state.

The current direction is therefore:

```text
Reading Plans
    → Bible

Bible
    ✕ Reading Plans
```

This is representative of the broader migration rule: dependencies should follow meaning and ownership.

---

## Workspace Runtime

Workspace behavior was extracted from historical page-local implementation into an explicit runtime boundary.

Current ownership is:

```text
Application
    → WorkspaceRuntime
        → PaneService internally
```

`WorkspaceRuntime` is the public Workspace coordinator.

`PaneService` is an internal implementation detail.

Workspace runtime owns/co-ordinates:

```text
initialization
Pane lookup
split
delete/collapse
Buffer replacement
Pane-ID allocation
persistence
layout derivation
Pane dimensions
Workspace notifications
```

The runtime implementation is documented in:

```text
docs/03_implementation/runtime/
    001-root-runtime.md
    002-pane-tree.md
    003-grid-layout.md
    004-rendering-engine.md
    005-buffer-contract.md
    006-runtime-services.md
```

---

## Buffer / Pane Cleanup

Historical Buffer scaffolding was removed.

The important Buffer contract is now centered on:

```text
key
componentName
bag
resourceSelections
```

Buffer identity remains distinct from Pane identity.

Pane IDs remain stable during the page lifetime.

The transient `pane.toggle` recreation behavior remains intentionally because it protects against stale Svelte module rendering in known Bible navigation scenarios.

It should not be removed casually.

---

## Resource Selection

Resource-selection ownership was clarified.

Module Resource semantics belong to Domain/module contributors rather than generic application branching.

A Buffer captures its Resource-selection snapshot.

Module UI resolves selections through the runtime/application selection boundary.

Domain services receive `PublishedResourceReference` values and remain independent from Pane/Buffer mechanics.

Generic code should not reintroduce module-specific branching such as:

```ts
if (module === Modules.BIBLE) {
    // ...
}
```

---

## Resource Boundary

The Resource layer now exposes a deliberate public API through:

```text
$lib/resource
```

That API includes stable Resource contracts and browser-safe Resource services such as Resource models, identifiers, installation contracts, interpretation/validation contracts, publication contracts, content pipeline contracts, descriptor/resolution contracts, receipts, Resource services, and the Resource Worker client.

Concrete implementations remain concrete when exposing them through the root barrel would weaken ownership or introduce circular dependencies.

Examples that may intentionally remain on concrete paths include:

```text
IndexedDBResourceReceiptStore
ResourceDiscovery
Nostr-specific resolution strategies
Nostr-specific publication strategies
```

The migration intentionally stopped short of exporting everything merely to remove path depth.

Current Resource implementation documentation lives under:

```text
docs/03_implementation/resources/
```

---

## Resource Installation

Resource installation now has an explicit Domain-owned boundary.

The generic Resource layer performs decoding and dispatch.

The Domain owns:

```text
meaning
identity
validation
freshness/duplicate policy
Domain Object persistence
ResourceInstallation provenance
```

Domain Object state and Resource installation provenance are persisted atomically through Domain-specific installation transactions.

---

## Outbox / Publication

Outbound publication was moved behind an application-wide durable Outbox.

The current flow is:

```text
Domain write
    ↓
publication intent
    ↓
atomic Domain state + Outbox persistence
    ↓
OutboxProcessor
    ↓
publication strategy
    ↓
transport
```

The Outbox supports Resource publication and native application-owned Nostr-event publication through separate strategies.

It stores final publication intents and uses same-ID overwrite for last-write-wins coalescing.

Synchronization remains a separate responsibility.

---

## Nostr Ownership

Nostr is now treated as infrastructure/transport rather than application meaning.

Raw Nostr clients/signers are not exposed to normal Svelte consumers for convenience.

Authentication and account behavior are exposed through application-facing capabilities.

Resource transport uses Nostr behind Resource/application boundaries.

---

## Worker Ownership

Workers are separate composition roots.

They may construct their own local instances of stateless/domain helpers rather than reaching through Svelte `ApplicationContext` or relying on application-global singletons.

This rule was applied to services such as:

```text
BibleLocationReferenceService
SubsEnricherService
EncodedReadingsDecoderService
```

---

## Shared Utilities

Cross-owner utilities that do not belong to Domain/Application/Infrastructure semantics use:

```text
$lib/shared
```

For example, the generic `sleep` helper was moved out of infrastructure because timing utility behavior is not infrastructure ownership.

---

## Dead Code / Historical Paths

The migration and subsequent cleanup removed significant obsolete scaffolding, including historical Buffer state, obsolete split wrappers, unused UI components, legacy helpers, stale context exposures, old Notes Resource acquisition code, and multiple global service singletons.

Historical/reference code is not automatically dead code.

Some metadata/data-generation specs were intentionally retained as skipped reference material for possible future utilities.

Deletion still requires caller tracing and an ownership decision.

---

# Migration Phases — Final Status

The original migration phases can now be considered substantially complete:

```text
Bible Domain                complete for current phase
Notes Domain                complete for current phase
Reading Plans Domain        complete for current phase
Strong's Domain             complete for current phase
Workspace Runtime           complete for current phase
Application ownership       complete for current phase
Resource integration        complete for current phase
Background worker ownership complete for current phase
Public API normalization    complete for current phase
General dead-code cleanup   ongoing maintenance
Documentation alignment     ongoing maintenance
```

"Complete" here means the intended ownership boundary exists and is usable.

It does not mean the subsystem can never evolve.

---

# What Remains Ongoing

Architecture migration is no longer an active project phase.

The remaining work is ordinary maintenance and refinement:

```text
small correctness fixes
dead-code removal
focused test coverage
documentation alignment
boundary enforcement when new code is added
synchronization work where separately planned
```

Large redesigns should be treated as new architecture work rather than silently folded into cleanup.

Import/export remains a separately parked legacy area and is not part of this completed migration record.

---

# Current Boundary Rules

The practical rules that survive the migration are:

```text
1. Current source is authoritative.

2. Application is the composition root.

3. +layout.svelte is the runtime bootstrap location that imports Application directly.

4. ApplicationContext exposes intentional Svelte runtime capabilities.

5. External consumers use owner root APIs.

6. Browser-only public presentation exports use /ui boundaries.

7. Internal implementation may use direct imports within its owner.

8. Workers are separate composition roots.

9. Domain services do not depend on Pane/Buffer mechanics.

10. Resource transport/infrastructure remains behind Resource/Application boundaries.

11. Concrete implementation imports are acceptable in composition wiring.

12. Do not create a barrel merely to hide directory depth.

13. Trace callers before deleting or moving code.

14. Preserve behavior during structural cleanup unless fixing a concrete defect.
```

---

# Validation Rule

Future structural cleanup should continue to validate:

```text
npm run test && npm run build
```

and use browser tests when browser/integration behavior is affected:

```text
npm run test:browser
```

Architectural cleanup is successful when the dependency/ownership boundary becomes clearer without unnecessarily changing behavior.

---

# Current References

Use these documents for current implementation guidance rather than treating this historical record as a live migration checklist:

```text
docs/03_implementation/010-domain-implementation-map.md
docs/03_implementation/011-target-code-organization.md

docs/03_implementation/runtime/
docs/03_implementation/resources/
docs/03_implementation/platform/005-application-startup.md
docs/03_implementation/persistence/004-outbox-implementation.md
```

The accepted architecture ADRs remain the architectural baseline unless explicitly revised.

---

# Big Takeaway

The migration succeeded by making ownership explicit without treating cleanup as a rewrite.

The enduring pattern is:

```text
identify responsibility
    ↓
identify owner
    ↓
expose only legitimate public concepts
    ↓
keep implementation behind that boundary
    ↓
validate behavior
```

The repository now largely reflects that model.

Future work should maintain those boundaries rather than restarting the migration.
