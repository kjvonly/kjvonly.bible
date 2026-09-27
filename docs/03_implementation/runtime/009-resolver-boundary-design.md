# Resolver and Boundary Design

## Status

**Current Application Standard / Architecture Guidance**

Repository path:

```text
docs/03_implementation/runtime/009-resolver-boundary-design.md
```

---

# 1. Purpose

This document defines how KJVOnly.bible uses resolvers, builders, factories, services, registries, and contexts to keep ownership boundaries explicit.

The recurring pattern is:

```text
caller knows semantic intent/identity
    ↓
narrow boundary
    ↓
lookup / construction / policy / runtime implementation
```

The central rule is:

> **Callers should ask for semantic capabilities or values; boundary objects should hide traversal, lookup, construction, framework details, and policy implementation.**

---

# 2. Why Boundaries Matter

Without a resolver/builder/service boundary, feature code tends to accumulate implementation knowledge.

Bad shape:

```text
feature component
    knows Workspace tree
    knows navigation persistence shape
    knows Resource-selection map structure
    knows fallback rules
    knows component registry
    knows Domain storage details
```

Preferred shape:

```text
feature component
    asks semantic boundary
        ↓
owner performs implementation work
```

This makes policy testable and allows implementations to change without spreading structural knowledge.

---

# 3. Current Boundary Types

Use the boundary that matches the responsibility.

```text
resolver
    semantic identity → existing value/implementation

registry
    stable ID → registered implementation

builder
    policy-driven construction/transformation

factory
    composes a valid runtime object/session

service
    behavior/operation owner

context
    scopes an already-composed capability to a Svelte subtree
```

These words are not interchangeable.

---

# 4. NavigationViewRegistry

`NavigationViewRegistry` owns the mapping:

```text
stable navigation view ID
    →
Svelte component
```

Features export their view registrations.

Application composition registers them explicitly.

The registry does not understand:

```text
feature semantic state
Resource requirements
Pane geometry
Domain behavior
```

Duplicate registration is an error.

Unknown view lookup is an error.

---

# 5. NavigationViewResolver

`NavigationViewResolver` resolves a `NavigationState` to its registered runtime component.

Conceptually:

```text
NavigationState.view
    ↓
NavigationViewRegistry.require(view)
    ↓
NavigationComponent
```

The resolver does not validate feature-specific semantic state.

That remains the destination feature's responsibility.

This is an important boundary:

```text
generic runtime
    knows stable view registration

feature view
    knows semantic state contract
```

---

# 6. NavigationStateBuilder

`NavigationStateBuilder` constructs valid semantic entries.

It owns:

```text
module
view
semantic state copy
Resource-selection derivation
```

Feature callers do not get to inject authoritative `resourceSelections` through ordinary destination state.

The builder strips caller-supplied Resource selections and derives them through Module Resource policy.

Conceptually:

```text
push request
    ↓
NavigationStateBuilder.create(...)
    ↓
ModuleResourceSelectionBuilder
    ↓
NavigationState
```

This prevents navigation callers from bypassing Resource policy.

---

# 7. ModuleResourceSelectionBuilder

`ModuleResourceSelectionBuilder` owns Module Resource-selection policy.

Important operations are conceptually:

```ts
independent(module)
related(module, originatingSelections)
update(module, selections, resourceType, value)
```

The builder decides how a target Module's Resource snapshot is formed.

Feature UI should not reproduce those rules.

---

# 8. ModuleResourceSelectionResolver

`ModuleResourceSelectionResolver` resolves Resource selections for a specific `NavigationState`.

Current conceptual API:

```ts
find(navigationState, resourceType)
require(navigationState, resourceType)
```

The significant ownership rule is:

> Resource lookup is entry-scoped through `NavigationState`, not Pane-location-scoped.

A hidden entry can therefore continue resolving its own captured Resource snapshot even while another entry is active above it.

Feature code should not traverse the Workspace or inspect another runtime entry to resolve Resources.

---

# 9. PaneNavigationService

`PaneNavigationService` is a service/facade boundary rather than a general-purpose stack exposed to features.

It composes:

```text
NavigationService
NavigationStateBuilder
NavigationViewResolver
ModuleResourceSelectionBuilder
NavigationStatePersistence
Pane split/close callbacks
```

The concrete service owns shell/runtime authority.

Features receive the narrower `PaneNavigation` capability through `NavigationRuntimeContext`.

This separation prevents feature code from depending on:

```text
runtime views array
persistence mechanics
arbitrary result registration by state
stack hydration
active-entry implementation details
```

---

# 10. NavigationEntryContext as a Scoped Boundary

`NavigationEntryContext` is not a global service locator.

It scopes one mounted entry's capabilities to its descendants:

```text
navigationState
isActive
onResult
whenActive
updateState
updateResourceSelection
```

This avoids APIs shaped like:

```text
updateState(arbitraryNavigationState, ...)
```

The context itself establishes which entry is allowed to mutate.

---

# 11. NavigationRuntimeFactory

`NavigationRuntimeFactory` is a composition factory for one rendered leaf Pane.

It owns creation of:

```text
NavigationStatePersistence
internal NavigationService
PaneNavigationService
restore/fresh initialization
modules.root invariant enforcement
registered-view hydration checks
```

A feature component should never construct this runtime graph itself.

The factory is application/runtime composition, not feature behavior.

---

# 12. PaneNavigationSplitter

Split crosses two ownership systems:

```text
navigation semantic destination
+
Workspace geometry
```

The split boundary owns that coordination.

Feature code requests:

```text
split(direction, module, view, state)
```

The navigation/runtime boundary constructs valid destination navigation state and delegates Workspace structural creation through the split owner.

Feature code does not directly create a Pane and then manually install a navigation stack.

---

# 13. Settings Resolvers

Settings remains a strong example of semantic resolver boundaries.

The declarative Settings definition contains stable semantic IDs.

Resolvers map those IDs to presentation implementations such as:

```text
Settings icon component
custom Settings view component
formatter
page/row definition
```

The definition does not persist Svelte component constructors as semantic data.

This is the same principle used by application navigation view registration.

---

# 14. Domain Boundaries

Domain services/factories should receive semantic inputs and remain independent from Workspace/navigation implementation.

Good:

```text
feature
    obtains selected Resource reference from application boundary
    ↓
Domain service
    consumes explicit Resource/Domain input
```

Avoid:

```text
Domain service
    receives paneID
    traverses Workspace
    reads navigation state
```

Navigation and Workspace are application presentation/runtime concerns, not Domain concerns.

---

# 15. Resolver Versus Factory

Use a resolver when the semantic object already exists and must be located/interpreted.

Examples:

```text
view ID → registered component
Resource Type → selected Resource reference
Settings page ID → Settings page definition
```

Use a factory/builder when a valid new object must be constructed according to invariants.

Examples:

```text
new NavigationState
new Pane navigation runtime
new Resource selection snapshot
```

Do not hide object construction inside something named a resolver if it has mutation/creation semantics.

---

# 16. Resolver Versus Service

A resolver answers a semantic lookup question.

A service owns behavior.

Examples:

```text
NavigationViewResolver
    Which component implements this view ID?

ModuleResourceSelectionResolver
    Which Resource reference does this entry use?

PaneNavigationService
    Perform semantic navigation.

SettingsService
    Read/update/persist application Settings.
```

Keeping the distinction clear makes dependencies easier to reason about.

---

# 17. Context Versus Service

A context does not automatically own behavior.

It scopes access to a capability already owned elsewhere.

Examples:

```text
NavigationRuntimeContext
    scopes PaneNavigation to one Pane subtree

NavigationEntryContext
    scopes one entry's state/operations

PaneLayoutContext
    scopes one Pane's reactive layout measurement

SettingsContext
    scopes one mounted Settings projection
```

The service/runtime behind the context remains the behavior owner.

---

# 18. Public API and Import Boundaries

Resolvers/services that are legitimate cross-domain/application dependencies should be consumed through the owning public boundary.

Within one domain/owner, relative imports are appropriate.

Across domains, use owner public entrypoints.

Browser/Svelte presentation exports belong under browser-safe UI entrypoints when the root owner entrypoint must remain Node-safe.

Do not create a barrel merely to hide directory depth.

---

# 19. Error Semantics

A semantic `require(...)` boundary should fail clearly when the requested value is required but absent.

A semantic `find(...)` boundary may return absence when absence is part of the contract.

Do not silently invent fallback behavior in callers.

Fallback policy belongs to the boundary that owns it.

Examples:

```text
Resource resolver/builder
    owns Resource selection normalization/fallback

Settings definition resolver
    owns valid Settings ID lookup

Navigation registry
    owns registered view lookup
```

---

# 20. Validation Ownership

The generic navigation resolver validates only what it owns: that a registered component exists for the stable view ID.

Feature views validate their own semantic state contracts.

For example, a Plans detail view may require:

```text
module == Modules.PLANS
view == expected Plans view ID
state.subID is valid
```

A Bible reader may validate its Bible-specific state.

Do not make the generic registry understand every feature's state schema.

---

# 21. Keep Traversal Behind Boundaries

If a caller repeatedly performs:

```text
find owner
find nested runtime object
inspect map
apply fallback
throw if missing
```

that is usually evidence for a resolver/service boundary.

The feature should express intent, not reconstruct infrastructure traversal.

---

# 22. Keep Policy Behind Builders

If construction requires rules such as:

```text
inherit only compatible Resource Types
copy semantic state but exclude reserved fields
always start split Pane at modules.root
normalize a Resource update
```

put those rules behind the owning builder/factory/service.

Callers should not reimplement invariant-preserving construction.

---

# 23. Anti-Patterns

Avoid:

```text
feature imports generic NavigationService and builds its own app stack
feature reads navigation.views to decide normal behavior
feature constructs NavigationState by hand when builder policy is required
feature passes resourceSelections as authoritative destination state
feature resolves Resources from paneID or Workspace traversal
Domain service depends on Pane/NavigationState
registry branches on feature-specific semantic state
resolver owns unrelated mutation behavior
feature duplicates Settings/view/component mapping
leaf component constructs application runtime services
```

---

# 24. Review Questions

Before adding a dependency, ask:

```text
What semantic question is the caller trying to answer?
Who owns the policy behind that answer?
Is this lookup, construction, behavior, or scoping?
Does a resolver/builder/service already own it?
Am I exposing runtime structure when a semantic capability would suffice?
Am I making a generic boundary understand feature-specific meaning?
Could the caller be independent of Workspace/navigation implementation?
Can this boundary be tested without rendering the full app?
```

---

# 25. Architecture Invariants

1. Stable view ID resolution belongs to the navigation registry/resolver.
2. Feature-specific state validation belongs to the feature.
3. `NavigationStateBuilder` owns construction of navigation state.
4. Resource-selection derivation belongs to `ModuleResourceSelectionBuilder`.
5. Resource lookup is entry-scoped through `NavigationState`.
6. Features receive narrow Pane navigation capability rather than stack internals.
7. `NavigationRuntimeFactory` composes Pane navigation infrastructure.
8. Context scopes capability; it does not silently become global authority.
9. Domain services do not traverse Workspace/navigation runtime.
10. Callers use semantic identity rather than implementation traversal.
11. Builders/factories protect construction invariants.
12. Resolvers expose clear `find`/`require` absence semantics.

---

# 26. Testing Guidance

Boundary tests should assert contracts rather than private implementation steps.

High-value examples:

```text
registered view ID resolves expected component
unknown/duplicate view registration fails
NavigationStateBuilder derives Resource selections instead of trusting caller state
related Resource selection policy receives copied originating snapshot
entry resolver reads the supplied NavigationState, not active Pane state
split creates modules.root + target without duplicating root
feature-facing PaneNavigation does not expose runtime views
Settings semantic IDs resolve through Settings-owned resolvers
Domain service tests do not require Workspace construction
```

---

# 27. Summary

The current boundary model is:

```text
semantic ID / request
    ↓
resolver | builder | factory | service
    ↓
implementation detail
```

Use the narrowest boundary that owns the behavior. Keep Workspace traversal, stack mechanics, Resource policy, component registration, and construction invariants out of feature leaves and Domain services.
