# State Ownership and Context Boundaries

## Status

**Current Application Standard / Architecture Guidance**

Repository path:

```text
docs/03_implementation/runtime/007-state-ownership-context-boundaries.md
```

Related navigation detail:

```text
docs/03_implementation/runtime/016-navigation-architecture.md
```

---

# 1. Purpose

This document defines how KJVOnly.bible decides:

```text
who owns state
where state lives
how long state lives
how state is accessed
how state is mutated
how state is synchronized
what is persisted
what remains runtime-only
```

The central rule is:

> **State lives at the narrowest scope that correctly owns its lifecycle, sharing, persistence, and mutation rules.**

Many apparent reactivity, navigation, persistence, or synchronization bugs are ownership bugs first.

---

# 2. Current State Scopes

The current application uses several distinct state scopes:

```text
application-global
Workspace-owned
Pane-local
navigation-entry-local
feature/module-local
view-local
Domain-owned
operation-local
```

These scopes must not be collapsed into one generic state container.

---

# 3. Application-Global State

Application-global state belongs to application-owned services composed by `Application` and exposed through `ApplicationContext` when Svelte consumers need them.

Examples include:

```text
SettingsService
AuthenticationService
AccountService
ResourceSelectionService
ToastService
Outbox/application publication services
Domain-facing application services
```

Application-global means:

```text
multiple Panes may consume the same authority
multiple mounted feature instances may observe the same value
lifecycle normally follows the Application rather than one Pane or component
```

Do not copy an application authority into each feature merely to make it locally convenient.

A local reactive projection is allowed when it has a clear synchronization owner.

---

# 4. Workspace-Owned State

`WorkspaceRuntime` owns Workspace geometry and structural Pane state.

Conceptually:

```text
WorkspaceRuntime
    owns
        Pane tree
        split geometry
        Pane allocation/deletion
        branch collapse
        Workspace persistence orchestration
```

Feature views do not mutate the Workspace tree directly for ordinary navigation.

A navigation split crosses the navigation/Workspace boundary through the Pane navigation service rather than exposing Workspace mutation to feature code.

---

# 5. Pane-Local Persisted State

A leaf Pane owns its persisted navigation state:

```text
Pane.state.navigation
    = NavigationState[]
```

A rendered leaf Pane is expected to have a `PaneState`.

Only structural branch nodes may omit leaf state.

The Pane does not own one global Resource-selection snapshot for every mounted interaction. Resource selections belong to individual navigation entries.

---

# 6. Pane-Local Runtime Capabilities

A rendered Pane establishes runtime capabilities that are intentionally not application-global.

Current Pane-scoped contexts include:

```text
NavigationRuntimeContext
PaneLayoutContext
```

`NavigationRuntimeContext` exposes the narrow feature-facing Pane navigation capability.

`PaneLayoutContext` exposes reactive Pane layout measurements such as `clientHeight`.

Each rendered Pane receives independent context instances.

This is what allows two Panes to navigate and measure independently even when they render the same feature.

---

# 7. Navigation Entry State

Each mounted navigation interaction owns one `NavigationState`.

Conceptually:

```ts
interface NavigationState<TView = string | number> {
    module: Modules;
    view: TView;
    state: NavigationViewState;
}
```

`NavigationState.state` contains serializable semantic state for that interaction.

Examples include:

```text
Bible location
Plan subscription ID
search query/navigation inputs
note ID
Settings page or row IDs
entry Resource selections
```

The navigation entry is the correct scope for state that must:

```text
survive Back/forward-style mounted navigation
remain isolated from other entries in the same Pane
persist with the Pane navigation stack
be reconstructed after reload
```

---

# 8. NavigationEntryContext

Every mounted `NavigationEntry` provides an entry-specific `NavigationEntryContext`.

The context exposes the current entry's state and scoped operations rather than giving feature code arbitrary stack authority.

Conceptually:

```ts
interface NavigationEntryContext {
    readonly navigationState: NavigationState;

    isActive(): boolean;

    onResult(handler): () => void;

    whenActive(handler): () => void;

    updateState(
        key: string,
        value: NavigationStateValue | undefined
    ): void;

    updateResourceSelection(
        resourceType: string,
        value: PublishedResourceReference
    ): void;
}
```

The nearest entry context wins in the Svelte tree.

Therefore hidden mounted entries continue to see their own navigation state rather than the active top entry's state.

---

# 9. Semantic State Mutation

Feature code mutates the semantic state of its own entry through `NavigationEntryContext.updateState()`.

The important ownership rule is:

> A feature may mutate its own navigation-entry semantic state; it may not select an arbitrary `NavigationState` elsewhere in the stack and mutate it.

`updateState()` does not own Resource-selection changes.

The reserved `resourceSelections` field must be changed through the Resource-specific operation so Module Resource policy remains centralized.

---

# 10. Resource Selection State

Resource selections are captured per navigation interaction:

```text
NavigationState.state.resourceSelections
```

They are snapshot state, not a live Pane-global value.

A new destination receives Resource selections through `NavigationStateBuilder`, which delegates to `ModuleResourceSelectionBuilder`.

Conceptually:

```text
originating NavigationState
    ↓
originating resourceSelections
    ↓
ModuleResourceSelectionBuilder.related(...)
    ↓
new NavigationState snapshot
```

When no originating selections exist:

```text
ModuleResourceSelectionBuilder.independent(...)
```

An existing entry updates one selection through `updateResourceSelection()`, which applies Module policy and persists the Pane.

---

# 11. Feature/Module-Local State

Some state belongs to one mounted feature subtree but not to persisted navigation.

Examples:

```text
SettingsContext reactive Settings projection
SettingsNavigationContext semantic Settings navigation facade
editor runtime objects
feature-specific transient services
component-tree coordination state
```

Use a feature context when several descendants of one mounted feature need the same runtime capability or reactive projection.

Do not place it in `ApplicationContext` merely because prop drilling is inconvenient.

---

# 12. View-Local State

View-local UI state should normally remain in the component that owns it.

Examples:

```text
search input text that does not need reload persistence
expanded/collapsed presentation state
hover/focus state
local menu state
temporary selection state
scroll-owned presentation details
```

Persistent mounted navigation already preserves component-local state while an entry is hidden.

Do not promote local state into persisted navigation merely to survive Back within the same mounted session.

Persist it only when reload/restoration semantics require it.

---

# 13. Domain-Owned State

Domain truth belongs to Domain stores/services rather than navigation or presentation state.

Examples:

```text
Note Domain Objects
Reading Plan subscriptions/progress
Bible-derived installed Domain Objects
Text Markup Domain Objects
```

Navigation may carry the semantic ID needed to locate a Domain Object.

It should not duplicate the Domain Object as navigation authority.

Good:

```text
NavigationState.state.noteID
    ↓
NotesService / Domain store
    ↓
Note
```

Avoid:

```text
NavigationState.state.note = entire mutable Domain authority
```

unless the value is explicitly a serializable snapshot with that intended meaning.

---

# 14. Live State Versus Snapshot State

Ownership and freshness are separate questions.

Examples:

```text
SettingsService values
    application-owned + live

NavigationState.state.resourceSelections
    entry-owned + snapshot

Domain Object
    Domain-owned + authoritative

search results
    view/runtime-owned + derived

editor draft
    feature/view-owned + draft
```

See:

```text
runtime/013-live-vs-snapshot-state.md
```

for the detailed freshness model.

---

# 15. Persistence Ownership

Persistence must have one clear owner.

Current examples:

```text
Workspace tree / Pane state
    WorkspaceRuntime + navigation persistence boundary

Navigation stack
    NavigationStatePersistence

Settings
    SettingsService

Domain Objects
    owning Domain persistence/service

Outbox
    Outbox store/service
```

Feature components request mutations through their owning boundary.

They should not call Workspace persistence merely because they changed navigation-entry state.

---

# 16. Runtime-Only State

Some navigation state must deliberately remain runtime-only.

Examples:

```text
Svelte component constructors
NavigationView objects
result handlers
whenActive subscriptions
DOM nodes
service instances
worker handles
subscription cleanup functions
```

These objects are reconstructed or re-registered when runtime components are mounted.

Do not serialize them into `NavigationState`.

---

# 17. Results and Activation Callbacks

Navigation result handlers are owned by mounted entries.

`onResult()` registers a handler for the current entry.

`backWithResult()` delivers to the direct mounted parent before the child is popped.

`whenActive()` is for work that must happen only after the current entry becomes active again.

These registrations are runtime lifecycle state, not persisted state.

The entry boundary owns cleanup when the entry is destroyed.

---

# 18. Context Selection Rules

Choose context based on ownership, not convenience.

Use `ApplicationContext` for:

```text
Application-owned capabilities
long-lived services
shared Domain/application services
```

Use `NavigationRuntimeContext` for:

```text
one Pane's feature-facing navigation capability
```

Use `NavigationEntryContext` for:

```text
one mounted interaction's NavigationState
entry result/activation lifecycle
entry semantic-state mutation
entry Resource selection mutation
```

Use `PaneLayoutContext` for:

```text
reactive measurements owned by one rendered Pane
```

Use feature contexts for:

```text
one feature subtree's runtime projection/capability
```

Use component-local state for:

```text
one view/component's presentation state
```

---

# 19. Stable Identity Over Cached Runtime Objects

When a structure may be replaced or reorganized, prefer stable semantic identity over caching a mutable runtime object.

Examples:

```text
paneID
NavigationState semantic IDs
Domain Object IDs
Resource references
Settings row/page IDs
```

Workspace code may re-resolve the current Pane by `paneID` after structural changes.

Feature code should not keep a mutable Pane object merely to navigate later.

---

# 20. Multi-Instance Rules

Two mounted instances may intentionally share some authorities and isolate others.

Example: two Settings Panes.

Shared:

```text
SettingsService values
```

Independent:

```text
PaneNavigationService runtime
NavigationState[] stack
root search query
scroll position
mounted DOM identity
PaneLayoutContext
```

This distinction is a useful test of correct ownership.

---

# 21. Synchronization Rules

When application-global state changes, mounted projections may synchronize from the owning service.

Synchronization must not be mistaken for a second mutation path.

For example:

```text
Settings row user mutation
    ↓
SettingsService.update...
    ↓
persist + apply
    ↓
service subscriber snapshots
    ↓
all mounted Settings projections update
```

A subscriber should not republish the same mutation simply because it observed the authoritative update.

---

# 22. Anti-Patterns

Avoid:

```text
feature traverses Workspace tree to find navigation state
feature caches Pane object as long-lived identity
paneID used to find another entry's Resource selections
application-global mutable singleton for Pane navigation
feature receives concrete PaneNavigationService stack internals
feature mutates navigation.views directly
feature writes Pane.state.navigation directly
feature stores Domain truth inside navigation state
resourceSelections changed through generic state mutation
runtime callbacks persisted inside NavigationState
```

---

# 23. Review Questions

Before adding state, ask:

```text
Who is authoritative for this value?
Who needs to see it?
How long must it live?
Must it survive hiding?
Must it survive Back?
Must it survive reload?
Is it live or a snapshot?
Is it Domain truth, semantic navigation state, or presentation state?
Who is allowed to mutate it?
Which boundary owns persistence?
```

If these answers are unclear, the state probably does not yet have a correct owner.

---

# 24. Architecture Invariants

1. Application-wide authorities are composed by `Application` and exposed intentionally.
2. Workspace geometry belongs to `WorkspaceRuntime`.
3. Every rendered leaf Pane owns persisted Pane state.
4. Every navigation interaction owns its own `NavigationState`.
5. Entry Resource selections live under `NavigationState.state.resourceSelections`.
6. Feature code mutates only its own entry through entry-scoped APIs.
7. Runtime result/activation handlers are not persisted.
8. Domain truth remains in Domain-owned stores/services.
9. Feature contexts are scoped to the mounted subtree that owns them.
10. Component-local state remains local unless a broader lifecycle requires promotion.
11. Stable semantic IDs are preferred over cached mutable runtime objects.
12. Persistence has one clear owner for each state category.
13. Multi-Pane navigation state is isolated.
14. Shared application values and Pane-local interaction state are not conflated.

---

# 25. Testing Guidance

High-value ownership tests include:

```text
two Panes navigate independently
same feature in two Panes keeps independent entry state
hidden entry retains local DOM state
Resource update changes only the active owning entry
Back reveals the same previous component instance
result handler belongs only to direct parent entry
whenActive callback does not leak after entry destruction
Settings mutation synchronizes multiple mounted Settings instances
reload restores semantic navigation but not DOM identity
```

---

# 26. Summary

The current ownership model is:

```text
Application
    application-global capabilities

WorkspaceRuntime
    Pane tree + geometry

Pane.state
    persisted leaf-Pane state

PaneNavigationService
    one Pane's navigation runtime

NavigationState
    one persisted interaction

NavigationEntryContext
    one mounted interaction's state + scoped operations

feature context / local $state
    feature and presentation runtime state

Domain store/service
    Domain truth
```

Keep those scopes explicit. Most runtime complexity becomes manageable once every value has one clear owner, lifetime, mutation path, and persistence boundary.
