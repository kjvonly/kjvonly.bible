# Navigation Architecture

## Status

**Current / Accepted Application Standard**

This document defines the implemented navigation architecture for KJVOnly.bible.

The runtime Buffer model has been removed. A visible leaf Pane now owns one flat navigation session and persists its semantic stack directly in:

```text
Pane.state.navigation
```

The core rule is:

> **Navigate deeper by pushing a `NavigationState`, return by popping one entry, keep previous entries mounted while hidden, split only when the user wants another Pane, and keep Resource selections scoped to the navigation interaction that owns them.**

---

# 1. Core Runtime Model

The current relationship is:

```text
Workspace
    ↓
Pane tree
    ↓
leaf Pane
    ├── paneID
    └── state.navigation: NavigationState[]
            ↓
NavigationRuntimeFactory
            ↓
PaneNavigationService
            ↓
internal NavigationService
            ↓
NavigationView[] runtime stack
```

The persisted and runtime representations are intentionally different:

```text
persisted
    NavigationState[]

runtime
    NavigationView[]
        component
        navigationState
```

`NavigationState` is semantic and serializable.

`NavigationView` contains runtime component information and is never persisted.

---

# 2. Leaf Pane State Is Required

Only leaf Panes are rendered.

A rendered leaf Pane must have `Pane.state`.

Fresh Workspace initialization creates leaf state. Split creation creates leaf state. Persisted leaf restoration requires leaf state.

Therefore `NavigationRuntimeFactory.create(paneID)` treats a missing `Pane.state` as an invalid runtime condition rather than silently creating non-persisted navigation.

Branch Panes are structural tree nodes and intentionally do not own leaf navigation state.

---

# 3. One Flat Navigation Stack

Each leaf Pane owns one navigation history.

Do not maintain separate histories for:

```text
Module-internal navigation
cross-Module navigation
popup navigation
```

Example:

```text
modules.root
plans.subscriptions
plans.subscription-details
bible.reader
refs.root
```

These are five entries in one flat stack.

Same-Module versus cross-Module navigation changes how the next state is built. It does not create another history abstraction.

---

# 4. The `modules.root` Invariant

Every normal Pane navigation stack begins with:

```text
modules.root
```

Examples:

```text
modules.root
```

```text
modules.root
bible.reader
```

```text
modules.root
search.results
bible.reader
```

The invariant is enforced both when parsing persisted navigation and when creating a fresh Pane runtime.

A persisted pre-invariant/rootless stack is treated as unsupported and the Pane initializes from the current initial destinations.

---

# 5. NavigationState

Every persisted navigation interaction is represented by:

```ts
interface NavigationState<TView = string | number> {
    module: Modules;
    view: TView;
    state: NavigationViewState;
}
```

`module` identifies the Module/feature policy owner.

`view` is a stable registered semantic view ID.

`state` contains serializable semantic state.

Examples include:

```text
query
bookID
bibleLocationRef
subID
navReadings
resourceSelections
```

Do not persist:

```text
Svelte components
DOM nodes
callbacks
services
workers
Pane objects
navigation services
runtime subscriptions
```

---

# 6. Stable View IDs and Registration

Features own their stable namespaced view IDs and registration data.

Examples include:

```text
modules.root
bible.reader
bible.menu
search.results
refs.root
notes.root
plans.subscriptions
plans.subscription-details
archive.root
profile.root
login.root
settings.root
```

Application composition registers those mappings into `NavigationViewRegistry`.

Conceptually:

```text
feature-owned registrations
    ↓
Application composition
    ↓
NavigationViewRegistry
    stable view ID → Svelte component
```

Generic navigation code must not import feature components and branch on Module type.

Unknown/unregistered persisted view IDs are not compatibility-mapped. The affected Pane discards that persisted navigation stack and initializes from the current application destinations.

---

# 7. NavigationStateBuilder

`NavigationStateBuilder` owns construction of new semantic entries.

Feature code supplies:

```text
Module
view ID
semantic view state
```

The builder derives Resource-selection state through `ModuleResourceSelectionBuilder`.

Caller-provided `resourceSelections` are not treated as an authoritative bypass around Module Resource policy.

For a new independent interaction:

```text
ModuleResourceSelectionBuilder.independent(module)
```

For a related interaction:

```text
ModuleResourceSelectionBuilder.related(
    targetModule,
    originatingSelections
)
```

---

# 8. Resource-Selection Ownership

Resource selections belong to the navigation interaction:

```text
NavigationState.state.resourceSelections
```

They do not belong to:

```text
Pane globally
paneID lookup
WorkspaceRuntime
legacy Buffer state
```

This is required because hidden entries remain mounted and must continue consuming the Resource context captured for their own interaction.

Example:

```text
Bible entry A → KJV
Search entry
Bible entry B → ASV
```

Changing Bible entry B must not mutate Bible entry A.

---

# 9. ModuleResourceSelectionResolver

`ModuleResourceSelectionResolver` accepts `NavigationState` directly.

Current API shape:

```ts
find(navigationState, resourceType)
require(navigationState, resourceType)
```

There is no pane-based Resource resolver API.

The resolver owns normalization/fallback through the Module Resource-selection builder. Feature views should not recreate Resource fallback policy themselves.

---

# 10. Feature-Facing PaneNavigation

Features receive the narrow `PaneNavigation` capability.

Conceptually:

```ts
interface PaneNavigation {
    pushView(view, state): void;
    pushModule(module, view, state): void;
    split(direction, module, view, state): void;
    backWithResult(result): Promise<void>;
    back(): void;
    closePane(): boolean;
}
```

Features do not receive:

```text
navigation.views
persist()
onResult(navigationState, ...)
active-entry Resource mutation by arbitrary state
mutable NavigationState returned from push/split
```

The feature-facing contract requests navigation. It does not expose runtime stack authority.

---

# 11. PaneNavigationService

`PaneNavigationService` is the concrete Pane runtime/shell implementation behind `PaneNavigation`.

It additionally owns runtime responsibilities such as:

```text
views
hydrate
persist
runtime result handler registration
active-entry Resource updates
Pane identity
Workspace split/close callbacks
```

Runtime shell code may use the concrete service.

Feature views should use the narrow `PaneNavigation` surface plus their nearest `NavigationEntryContext`.

---

# 12. Navigation Runtime Context

Each rendered Pane provides one navigation runtime context.

The feature-facing context exposes the narrow Pane navigation capability rather than generic stack mechanics.

Pane-local navigation means two Panes can navigate independently without a global NavigationService singleton.

`paneID` remains Workspace identity and should not be threaded through normal feature views merely to navigate or resolve Resources.

---

# 13. Mounted-State Preservation

`PaneNavigationContainer` renders every runtime stack entry and hides non-active entries.

Starting with:

```text
A
```

push `B`:

```text
A  mounted + hidden
B  mounted + visible
```

push `C`:

```text
A  mounted + hidden
B  mounted + hidden
C  mounted + visible
```

Back from `C` becomes:

```text
A  mounted + hidden
B  mounted + visible
```

`B` is the exact previously mounted component instance.

This naturally preserves:

```text
local Svelte state
scroll position
input state
editor state
DOM identity
entry-owned subscriptions/runtime state
```

A browser reload reconstructs components, so runtime DOM identity does not survive reload. The semantic navigation stack does.

---

# 14. Keyed Entry Rendering

The renderer must key entries by the runtime `NavigationView` object:

```svelte
{#each $views as navigationView, index (navigationView)}
    ...
{/each}
```

This is required when a pop and a subsequent push reuse the same stack depth.

Without the key, Svelte may reuse the previous `NavigationEntry` component by index and render stale feature UI even though the navigation stack contains a different view.

---

# 15. NavigationEntry

Each runtime entry is rendered through `NavigationEntry`.

`NavigationEntry` receives:

```text
NavigationView
concrete PaneNavigationService
```

It renders:

```svelte
<ViewComponent></ViewComponent>
```

There is no generic `obj` prop and no `bind:obj` contract.

The feature component obtains its semantic state and entry-scoped operations from `NavigationEntryContext`.

---

# 16. NavigationEntryContext

Every mounted entry provides its own nearest Svelte context.

Current conceptual surface:

```ts
interface NavigationEntryContext {
    readonly navigationState: NavigationState;

    isActive(): boolean;

    onResult(handler): () => void;

    whenActive(handler): () => void;

    updateState(
        key,
        value
    ): void;

    updateResourceSelection(
        resourceType,
        value
    ): void;
}
```

This keeps entry ownership narrow:

```text
feature may mutate its own semantic state
feature may register results for its own entry
feature may wait for its own activation
feature may update its own active Resource selection
```

A feature cannot select another arbitrary `NavigationState` and mutate it.

---

# 17. Entry-Scoped Semantic State Updates

`updateState()` mutates the `NavigationState` owned by that exact mounted entry and persists the Pane.

`resourceSelections` are explicitly excluded from generic `updateState()`.

Resource changes must use `updateResourceSelection()` so Module Resource policy is applied.

---

# 18. Entry Activity and `whenActive()`

Hidden entries remain mounted but are not active.

`isActive()` checks whether the entry is currently the top entry in the Pane.

`whenActive()` runs a callback once the mounted entry becomes active again.

Typical use:

```text
child returns a result
parent receives it while still hidden
parent schedules active-only mutation
child pops
parent becomes active
scheduled callback runs once
```

Pending `whenActive()` subscriptions are owned by `NavigationEntry` and are canceled when that entry is destroyed.

This prevents dormant Pane-navigation subscriptions from surviving a popped entry.

---

# 19. Runtime Results

Some child flows need to return data or completion intent to their direct mounted parent.

Use:

```ts
await navigation.backWithResult(result)
```

Flow:

```text
child active
    ↓
find direct previous mounted entry
    ↓
await its runtime result handlers
    ↓
if handlers succeed, pop child
```

If a result handler fails, the active child remains mounted and active. The result is not silently discarded.

Result callbacks are runtime-only and are never persisted in `NavigationState`.

Children should return data/intent. The parent owns interpretation and subsequent navigation/mutation.

---

# 20. Push Semantics

## Same Module

```ts
navigation.pushView(view, state)
```

uses the active Module identity and derives a related Resource snapshot.

## Different Module

```ts
navigation.pushModule(module, view, state)
```

creates the requested target Module state related to the current active interaction.

Both operations append to the same flat Pane history.

The previous entry remains mounted hidden.

---

# 21. Back Semantics

Back is a real stack pop.

Given:

```text
modules.root
search.results
bible.reader
```

Back becomes:

```text
modules.root
search.results
```

The Search view is revealed; it is not reconstructed.

Back never removes the final `modules.root` entry.

## Standard Pane Back Control

`<KJVBackButton>` is the standard leading Back control for Pane navigation.

Its primary interaction remains ordinary Back:

```text
tap / click
    ↓
navigation.back()
```

It also provides a deliberate press-and-hold shortcut for escaping a deep Pane history:

```text
press and hold for 1.5 seconds
    ↓
navigation.escapePane()
```

The hold-progress ring is intentionally delayed for 300 ms. Normal taps therefore do not flash partial progress. After the delay, the ring traces over the remaining hold interval.

`escapePane()` is Pane-level behavior, not another meaning of `back()`. A feature whose leading action has different semantics should render its own control instead of using `<KJVBackButton>`.

---

# 22. Persistence Ordering

Persistence mutation must happen before publishing the corresponding runtime stack change.

For push:

```text
resolve component
    ↓
append persisted NavigationState
    ↓
publish runtime NavigationView stack
```

For Back:

```text
pop persisted NavigationState
    ↓
publish runtime stack pop
```

This ordering prevents synchronous subscribers such as `whenActive()` handlers from performing re-entrant navigation against stale persisted state.

Runtime and persistence should not temporarily disagree during a notification.

---

# 23. Persistence

Navigation is persisted directly on the leaf Pane:

```text
Pane.state.navigation = NavigationState[]
```

Workspace persistence owns the recursive Pane tree.

`NavigationStatePersistence` owns validation and mutation of the navigation array within the current leaf Pane state.

It resolves Pane state lazily by `paneID` so navigation does not retain a stale mutable `PaneState` object across Workspace structural changes.

---

# 24. Restore and Hydration

On startup/reload:

```text
persisted Pane tree
    ↓
restore leaf Pane.state
    ↓
NavigationRuntimeFactory.create(paneID)
    ↓
restore NavigationState[]
    ↓
validate modules.root invariant
    ↓
ensure every persisted view is currently registered
    ↓
resolve stable view IDs to components
    ↓
hydrate NavigationView[]
```

All entries mount.

Only the top entry is visible.

If a persisted view ID is no longer registered, the entire Pane navigation stack is discarded and replaced with the application's current validated initial destinations.

There is intentionally no legacy Buffer/module reconstruction path.

---

# 25. Fresh Initialization

Fresh destinations are validated before any state is persisted.

The destination sequence must:

```text
contain at least one destination
start with modules.root
contain only registered view IDs
```

Only after validation does normal push persistence create the fresh stack.

---

# 26. Split Semantics

Split combines semantic navigation construction with Workspace geometry.

Feature request:

```ts
navigation.split(
    direction,
    module,
    view,
    state
)
```

The originating Pane stack remains unchanged.

A working split creates the new Pane with:

```text
modules.root
target
```

Splitting explicitly to Modules creates only:

```text
modules.root
```

Never:

```text
modules.root
modules.root
```

Destination components are resolved before Workspace mutation so an invalid target cannot create a malformed Pane.

---

# 27. Modules Root Close Policy

`modules.root` is the empty/default Pane state.

Closing a normal view uses Back:

```text
modules.root
bible.reader
    ↓
modules.root
```

Closing `modules.root` requests structural Pane deletion.

If other Panes exist, Workspace removes the target Pane and collapses the parent branch.

The sole final Pane cannot be removed.

`navigation.escapePane()` handles that final-Pane case explicitly:

```text
multiple Panes
    → close current Pane

sole final Pane
    → discard current Pane history
    → create a fresh modules.root NavigationState
    → replace the runtime/persisted stack with that single root
```

The reset is intentionally narrow and owned by `PaneNavigationService`; feature code does not receive a general stack-replacement API.

The Workspace must never contain zero Panes.

---

# 28. Authentication Flow

Signed-out startup still obeys the root invariant:

```text
modules.root
login.root
```

A deeper flow may be:

```text
modules.root
login.root
login.nsec
```

Successful authentication returns a runtime result to `login.root`.

Login-owned completion code waits until the Login root is active, removes the completed Login flow, and pushes Profile:

```text
modules.root
profile.root
```

This is deliberately narrower than exposing a generic stack replacement operation.

---

# 29. Settings Navigation

Settings no longer owns a separate generic NavigationService stack.

Its registered view IDs participate directly in the Pane's flat navigation history:

```text
settings.root
settings.group
settings.select
settings.custom
```

`SettingsNavigationService` remains a feature facade that translates declarative Settings rows/search results into `PaneNavigation.pushView()` requests.

The shared Settings runtime state is provided by the Settings entry component and feature-local contexts, not by a `SettingsContainer` navigation shell.

See:

```text
docs/03_implementation/modules/003-settings-module.md
```

---

# 30. No General Stack Replacement API

There is no feature-facing operation for:

```text
clear whole stack
replace whole stack
pop to arbitrary root
```

A feature should not arbitrarily destroy unrelated Pane history.

Normal semantic navigation is:

```text
push
Back
runtime result
split
modules.root close
Pane escape
```

`Pane escape` is the single narrow exception that may replace a stack, and only when structural Pane deletion is rejected for the sole final Pane. The replacement destination is always a fresh `modules.root`.

---

# 31. Workspace Ownership

Workspace owns geometry:

```text
Pane tree
split direction
Pane allocation
Pane deletion
branch collapse
Workspace persistence orchestration
```

Navigation owns semantic history:

```text
Module/view destination
NavigationState construction
runtime mounted stack
Back/results
entry Resource context
```

Split intentionally touches both boundaries.

Feature code should not mutate the Workspace tree directly for ordinary navigation.

---

# 32. State and Identity Summary

Keep these identities distinct:

```text
paneID
Module enum/type
stable view ID
NavigationState identity
NavigationView identity
Svelte component/DOM identity
Domain Object ID
Resource ID
```

Current ownership:

```text
ApplicationContext
    application-global services

WorkspaceRuntime
    Pane geometry + persistence orchestration

Pane.state
    persisted leaf Pane state

PaneNavigationService
    one Pane navigation runtime

NavigationState
    one semantic persisted interaction

NavigationState.state.resourceSelections
    Resource snapshot for that interaction

NavigationEntryContext
    entry-scoped runtime operations

feature/local $state
    live feature UI state
```

The old runtime Buffer key identity no longer exists.

---

# 33. Pane and View Presentation Components

The shared presentation components now use the current runtime vocabulary:

```text
PaneSurface
ViewHeader
ViewBody
```

They live under:

```text
client/kjvonly-pwa/src/lib/application/runtime/pane/components/
```

Ownership is:

```text
PaneNavigationContainer
    owns one PaneSurface

feature navigation view
    composes ViewHeader / ViewBody as needed
```

`PaneSurface` is the single Pane-wide visual shell. `ViewHeader` and `ViewBody` are view-region layout primitives and do not own navigation state.

This naming intentionally removes the last UI association with the deleted runtime Buffer model.

---

# 34. Removed Legacy Architecture

The navigation refactor removed or superseded:

```text
runtime Buffer model
Buffer.componentName
Buffer.bag navigation state
Buffer.resourceSelections ownership
ModuleBufferFactory
Pane.buffer navigation ownership
paneID-based Resource resolution
legacy Module component resolver for navigation
NavigationServiceFactory
feature-owned generic NavigationService stacks
legacy generic NavigationContainer
NavigationView.obj
bind:obj navigation rendering
PaneNavigationService.replaceModule()
feature-facing canGoBack stack inspection
generic popup navigation shells for migrated flows
```

Do not reintroduce these as compatibility layers unless a new explicit requirement justifies them.

---

# 35. Important Anti-Patterns

Avoid:

```text
reconstructing the previous view on Back
storing components/callbacks/services in NavigationState
separate internal and cross-Module histories
paneID-based Resource resolution
Pane-global Resource snapshots
arbitrary cross-entry state mutation
feature access to navigation.views
feature code mutating Workspace geometry for ordinary navigation
feature code wiping the Pane stack
unkeyed NavigationEntry rendering
caller-owned lifecycle leaks for entry-scoped subscriptions
```

---

# 36. Regression Tests That Matter

High-value coverage includes:

## Mounted identity

```text
A → B → Back
```

Verify the exact mounted `A` DOM instance is revealed.

## Same-depth replacement identity

Pop one view and push another at the same depth. Verify the old `NavigationEntry` is destroyed and the new registered component mounts.

## Persistence/runtime ordering

Verify a synchronous activation callback can navigate again without corrupting persisted stack state.

## Result flow

Verify the direct parent receives the result before child pop, and a failed handler keeps the child active.

## Split root invariant

```text
working split → [modules.root, target]
Modules split → [modules.root]
```

## Restore compatibility

Verify rootless/unsupported persisted navigation initializes current destinations and unregistered persisted views are discarded.

## Resource isolation

Verify different entries/Panes retain independent Resource snapshots.

## Multi-Pane isolation

Verify one Pane's navigation, result handlers, state updates, and Resource changes do not affect another Pane.

---

# 37. Adding a New Navigable View

A new view should normally:

```text
1. define a stable namespaced view ID
2. define serializable semantic state
3. register view ID → component from the owning feature
4. let Application register the feature registrations
5. validate feature-specific state at the feature boundary when required
6. navigate through PaneNavigation
7. consume its own NavigationEntryContext
8. resolve Resources from its NavigationState
9. use Back/results instead of reconstructing its parent
10. add focused tests for nontrivial transitions
```

Do not create another navigation subsystem because one feature has a child view.

---

# 38. Summary

The implemented model is:

```text
Workspace
    → Pane tree

leaf Pane
    → paneID
    → Pane.state.navigation: NavigationState[]

NavigationRuntimeFactory
    → one persisted Pane runtime

PaneNavigation
    → narrow feature-facing navigation capability

PaneNavigationService
    → concrete runtime/shell authority

internal NavigationService
    → generic mounted stack mechanics

NavigationEntry
    → keyed runtime entry wrapper
    → NavigationEntryContext

NavigationState
    → module + stable view + serializable state

NavigationState.state.resourceSelections
    → interaction Resource snapshot

NavigationViewRegistry
    → stable view ID → component

Workspace split
    → new Pane with modules.root base
```

The refactor is complete when new navigation work follows these boundaries rather than recreating Buffer-era ownership or feature-local stack infrastructure.
