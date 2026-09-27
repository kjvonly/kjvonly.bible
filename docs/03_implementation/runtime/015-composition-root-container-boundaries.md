# Composition Roots and Container Boundaries

## Status

**Current Application Standard / Architecture Guidance**

Repository path:

```text
docs/03_implementation/runtime/015-composition-root-container-boundaries.md
```

---

# 1. Purpose

This document defines where KJVOnly.bible composes runtime dependencies and where feature code consumes them.

The central rule is:

> **Composition belongs at explicit ownership boundaries; feature leaves consume already-composed capabilities instead of reconstructing infrastructure.**

The current runtime has several meaningful composition levels:

```text
Application
Workspace/Pane runtime
NavigationEntry
feature/module subtree
worker/operation composition roots
```

---

# 2. Application Is the Main Composition Root

`Application` owns construction of long-lived application capabilities.

Conceptually:

```text
Application
    composes
        application services
        Resource infrastructure/services
        Domain-facing services
        WorkspaceRuntime
        Navigation runtime collaborators
        authentication/account capabilities
        Settings
        publication/outbox capabilities
        archive coordination
        other application-owned infrastructure
```

Concrete infrastructure imports are acceptable here because composition is the responsibility.

---

# 3. ApplicationContext Is the Svelte Capability Surface

`ApplicationContext` exposes the subset of Application-owned capabilities that the Svelte runtime legitimately consumes.

It is not intended to expose every internal object created by `Application`.

The distinction is:

```text
Application
    owns implementation graph

ApplicationContext
    exposes intentional Svelte-facing capabilities
```

Do not turn `ApplicationContext` into an unrestricted service locator.

---

# 4. Root Layout Provides ApplicationContext

The root Svelte composition boundary constructs/obtains the `Application` and provides its stable context to the Svelte subtree.

Startup/readiness is separate from context identity.

Conceptually:

```text
Application constructed
    ↓
ApplicationContext available/provided
    ↓
startup lifecycle executes
    ↓
UI becomes ready
```

Consumers should not interpret context existence itself as readiness for every asynchronous subsystem.

---

# 5. WorkspaceRuntime Owns Workspace Composition

`WorkspaceRuntime` owns the structural Workspace model:

```text
Pane tree
Pane lookup
split/delete geometry
Workspace persistence orchestration
layout-relevant structural state
```

It does not own feature-specific Domain behavior.

Feature code should not construct or mutate Workspace tree nodes directly for ordinary navigation.

---

# 6. NavigationRuntimeFactory Is the Per-Pane Runtime Factory

Each rendered leaf Pane needs an isolated navigation runtime.

`NavigationRuntimeFactory.create(paneID)` composes it.

The factory owns construction/wiring of:

```text
NavigationStatePersistence
internal NavigationService
PaneNavigationService
NavigationStateBuilder dependency
NavigationViewResolver dependency
Resource-selection policy dependency
split callback
close-Pane callback
restore/fresh initialization
```

This composition belongs at the application/runtime layer, not in features.

---

# 7. Rendered Leaf Pane Is a Runtime Context Boundary

The Pane component is an important Svelte composition boundary.

It:

```text
receives paneID
creates/obtains one Pane navigation runtime
provides NavigationRuntimeContext
creates/provides PaneLayoutContext
renders PaneNavigationContainer
owns Pane-level measurement binding
```

Every rendered leaf Pane therefore has isolated navigation and layout contexts.

---

# 8. NavigationRuntimeContext

`NavigationRuntimeContext` exposes the narrow `PaneNavigation` capability to feature descendants.

It does not expose the generic internal stack.

Features can request semantic navigation without receiving runtime authority such as:

```text
views
hydrate
persist
arbitrary-state result registration
```

The Pane runtime remains the owner of those operations.

---

# 9. PaneLayoutContext

`PaneLayoutContext` is composed once by the rendered Pane and exposes reactive layout measurement owned by that Pane.

Example:

```text
clientHeight
```

Descendants consume the Pane measurement rather than threading it through every navigation/component prop or independently measuring incompatible containers.

---

# 10. PaneNavigationContainer Is a Renderer, Not a Feature Container

`PaneNavigationContainer` owns rendering of the Pane's runtime `NavigationView[]` stack.

It:

```text
renders every entry
hides non-active entries
keys entries by NavigationView identity
creates one NavigationEntry wrapper per runtime entry
```

It does not own feature-specific semantic behavior.

It also does not create a second feature navigation stack inside each feature.

---

# 11. NavigationEntry Is the Per-Interaction Context Boundary

`NavigationEntry` is the composition boundary for one mounted navigation interaction.

It provides `NavigationEntryContext` containing:

```text
that entry's NavigationState
isActive
onResult
whenActive
updateState
updateResourceSelection
```

The feature component itself is rendered without a generic mutable `obj` prop.

Entry-specific state/capability comes from the nearest context.

---

# 12. Feature Entry Components

A registered feature view should consume:

```text
ApplicationContext capabilities it legitimately needs
NavigationRuntimeContext for Pane navigation
NavigationEntryContext for its interaction state
PaneLayoutContext for Pane-owned layout measurement when needed
feature/domain services through public boundaries
```

It should not reconstruct:

```text
NavigationService
NavigationStatePersistence
NavigationViewRegistry
Workspace traversal
Resource selection policy
```

---

# 13. Feature Contexts

A feature may define another context when several descendants share feature-local runtime state/capability.

Settings currently demonstrates this with concepts such as:

```text
SettingsContext
SettingsNavigationContext
```

These contexts are scoped under the mounted Settings navigation entry.

They do not replace Pane navigation or ApplicationContext.

---

# 14. Settings Composition Boundary

Settings no longer owns an independent generic application navigation stack.

The Pane navigation runtime mounts Settings views through registered Settings navigation view IDs.

The Settings navigation entry composes Settings-specific runtime concerns such as:

```text
reactive Settings projection
SettingsService subscription
SettingsContext
SettingsNavigationService facade
SettingsNavigationContext
Settings view resolution within the registered Settings entry family
```

Application Settings values remain owned by `SettingsService`.

Settings-specific UI navigation semantics remain owned by the Settings facade/context while using the shared Pane stack underneath.

---

# 15. Domain Services Are Not Composition Roots for Application Runtime

Domain services own Domain behavior.

They should not compose application presentation/runtime infrastructure.

Avoid:

```text
Domain service
    constructs PaneNavigationService
    reads Svelte context
    traverses Workspace
    creates UI component registry
```

Domain services receive explicit semantic inputs from the application/presentation layer.

---

# 16. Resource Policy Composition

Application composition owns the Resource-selection builder/resolver dependencies needed by navigation/features.

Feature code consumes the semantic boundary.

It should not construct policy graphs itself.

Conceptually:

```text
Application composition
    ModuleResourceSelectionBuilder
    ModuleResourceSelectionResolver
    NavigationStateBuilder

feature entry
    supplied/available semantic boundary
```

---

# 17. View Registration Composition

Features own their stable view IDs and registration declarations.

Application composition owns registration into the shared `NavigationViewRegistry`.

This avoids import-time global registration side effects.

Conceptually:

```text
Bible exports registrations
Plans exports registrations
Settings exports registrations
...
    ↓
Application composition
    ↓
NavigationViewRegistry.registerAll(...)
```

The runtime can then resolve persisted stable view IDs without importing feature components directly.

---

# 18. Layout Shell Boundaries

The shared Pane/view presentation primitives are:

```text
PaneSurface
ViewHeader
ViewBody
```

They live under:

```text
client/kjvonly-pwa/src/lib/application/runtime/pane/components/
```

Their ownership is intentionally different:

```text
PaneSurface
    one Pane-wide visual shell

ViewHeader
    one navigation view's standard header region

ViewBody
    one navigation view's normal body / primary scroll region
```

These are presentation boundaries only. Semantic navigation state remains owned by `NavigationState` / `NavigationEntryContext`.

---

# 19. Shell Ownership

A clean composition normally follows:

```text
Pane
    owns Pane identity + Pane layout context

PaneNavigationContainer
    owns stack rendering + the single PaneSurface

NavigationEntry
    owns one mounted entry context

feature view
    composes ViewHeader / ViewBody as needed

feature content
    owns feature-specific layout
```

Avoid nesting multiple `PaneSurface` owners or multiple layers that each claim the same height, overflow, outline, or scrolling responsibility.

---

# 20. Container Versus View

A container/composition component may legitimately own:

```text
context providers
service subscriptions
feature runtime facade creation
entry/root lifecycle wiring
header/body composition
```

A leaf/view component should focus on:

```text
presentation
user interaction
semantic feature behavior requests
```

Do not move composition responsibilities downward merely to reduce file count.

---

# 21. Runtime Results Stay at the Entry Boundary

Navigation result handling is composed through `NavigationEntryContext`.

A child feature returns semantic result data with `backWithResult()`.

The parent entry owns interpretation.

The generic runtime owns delivery timing/lifecycle.

This keeps cross-view coordination out of global application services unless the behavior is actually application-global.

---

# 22. Split Crosses Composition Boundaries Intentionally

Split combines:

```text
feature semantic request
Pane navigation state creation
Workspace structural mutation
```

The Pane navigation service acts as the boundary.

A feature requests split semantically.

The runtime invokes the Workspace splitter through composed callbacks.

This is an intentional integration boundary, not an excuse for features to depend directly on Workspace internals.

---

# 23. Worker Composition Roots

Workers are separate execution/composition roots.

A worker cannot consume Svelte `ApplicationContext`.

It must explicitly construct or receive the dependencies required by its protocol.

Examples include:

```text
Resource workers
search workers
Notes worker
Plans worker
archive ephemeral worker
verification worker
```

Keep worker protocol and dependencies explicit.

---

# 24. Ephemeral Operation Composition

Some operations are intentionally composed only for their duration.

Archive import/export is the key example:

```text
start operation
    ↓
create worker/runtime
    ↓
perform operation
    ↓
return result/event
    ↓
terminate/release
```

Do not make an operation-long object Application-global merely because it needs several collaborators.

---

# 25. Browser Test Hosts as Composition Roots

Focused browser tests often need a small test composition root.

A valid browser fixture should compose the same architectural boundaries relevant to the behavior under test.

For Pane navigation, that may include:

```text
NavigationViewRegistry
NavigationViewResolver
NavigationStateBuilder
PaneNavigationService
NavigationRuntimeContext
PaneLayoutContext
PaneNavigationContainer
```

Do not resurrect deleted production containers or obsolete runtime models merely to make tests easier.

---

# 26. Dependency Direction

Preferred direction:

```text
composition root
    knows concrete implementations

feature/runtime boundary
    exposes narrow capability

leaf feature
    depends on semantic capability

Domain
    independent from Workspace/Svelte mechanics
```

Avoid the reverse:

```text
Domain/leaf component
    reaches upward to construct infrastructure
```

---

# 27. Public Entry Points

Cross-domain/application imports should use intentional owner entrypoints.

Within the same owner/domain, relative imports are preferred.

Browser/Svelte exports that cannot be Node-safe belong under a browser/UI entrypoint rather than being re-exported through a Node-safe root.

Composition roots may import concrete internal implementation where ownership requires it.

---

# 28. Subscription Ownership

The component/service that creates a subscription owns its cleanup unless ownership is explicitly transferred.

Examples:

```text
Settings navigation entry
    subscribes SettingsService
    cleans up on destruction

NavigationEntry
    creates whenActive runtime subscriptions
    cleans up on entry destruction

Application
    owns Application-lifetime subscriptions
```

Keep subscription lifetime aligned with composition lifetime.

---

# 29. Avoid Wrapper Inflation

Do not add a new container simply because a feature needs access to another capability.

First ask whether the existing owner can provide a context/facade.

Too many nested containers can create conflicting ownership of:

```text
height
scroll
outline/border
padding
header
navigation
subscriptions
```

Composition boundaries should correspond to real ownership boundaries.

---

# 30. Anti-Patterns

Avoid:

```text
feature constructs its own generic application NavigationService
feature creates NavigationRuntimeFactory
feature registers views at import time
leaf component traverses Workspace
Domain service reads Svelte context
feature passes arbitrary NavigationState around to mutate other entries
multiple layers provide competing Pane layout measurements
old-style generic mutable obj prop used as component state boundary
Settings owns a separate generic stack inside the Pane stack
feature view creates another PaneSurface or alternate Pane layout authority
worker reaches into ApplicationContext
```

---

# 31. Review Questions

Before introducing a container/factory/context, ask:

```text
What lifecycle does this object have?
Who should construct it?
Who should clean it up?
Is it Application-, Pane-, entry-, feature-, view-, or operation-scoped?
Can a narrower context expose the capability?
Am I duplicating an existing composition root?
Does a Domain now know about presentation/runtime mechanics?
Does this container own a real shell/context/subscription responsibility?
Will two Panes/instances receive independent objects where required?
```

---

# 32. Architecture Invariants

1. `Application` is the primary application composition root.
2. `ApplicationContext` exposes intentional Svelte-facing capabilities only.
3. `WorkspaceRuntime` owns Workspace structure.
4. `NavigationRuntimeFactory` composes one leaf Pane's navigation runtime.
5. A rendered Pane provides Pane-scoped navigation and layout contexts.
6. `NavigationEntry` provides one entry-scoped context.
7. Feature contexts stay inside the feature subtree that owns them.
8. Settings uses the shared Pane stack rather than a separate generic app-navigation stack.
9. Domain services remain independent from Workspace/Svelte navigation mechanics.
10. Stable view registration is composed explicitly by the application.
11. `PaneSurface`, `ViewHeader`, and `ViewBody` remain presentation-only components.
12. Workers and ephemeral operations are separate composition roots.
13. Subscription cleanup follows composition lifetime.
14. Leaf components consume capabilities instead of rebuilding infrastructure.

---

# 33. Testing Guidance

High-value composition tests include:

```text
two Panes receive independent navigation runtimes
nearest NavigationEntryContext returns the correct entry
Settings instances share SettingsService but not navigation/local UI state
browser fixture uses current Pane contexts and registered views
worker protocol runs without ApplicationContext
view registry is complete and duplicate-safe
split delegates Workspace mutation through navigation boundary
Pane deletion is rejected for final root Pane
component destruction cleans up entry/feature subscriptions
```

---

# 34. Summary

Current composition is intentionally layered:

```text
Application
    global services + registries + runtime collaborators

WorkspaceRuntime
    Workspace structure

NavigationRuntimeFactory
    one Pane navigation runtime

Pane
    Pane contexts + stack renderer

NavigationEntry
    one interaction context

feature entry/container
    feature contexts/subscriptions/facades

view
    presentation + semantic user interaction

Domain service/store
    Domain behavior/truth

worker/operation root
    isolated background/ephemeral composition
```

Put construction where lifecycle and ownership are clearest, then expose the narrowest capability downstream.
