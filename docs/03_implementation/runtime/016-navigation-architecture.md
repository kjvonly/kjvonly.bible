# Navigation Architecture

## Status

**Current / Accepted Application Standard**

This document defines the implemented navigation architecture for KJVOnly.bible.

The architecture is no longer based on replacing Pane Buffers or giving every stacked Module its own Buffer identity. The runtime Buffer model has been removed. A leaf Pane now owns its persisted navigation state directly.

The core rule is:

> **A leaf Pane owns one flat, persistent navigation stack. Each entry owns a serializable `NavigationState`; previous entries remain mounted while hidden; Resource selections belong to the navigation entry; and the Pane persists the semantic stack directly in `Pane.state.navigation`.**

---

# 1. Core Runtime Model

The current runtime relationship is:

```text
Workspace
    ↓
Pane tree
    ↓
leaf Pane
    ├── id
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

The persisted representation and runtime representation are intentionally different:

```text
persisted
    Pane.state.navigation
        = NavigationState[]

runtime
    NavigationView[]
        = mounted component entries
```

`NavigationState` is semantic and serializable.

`NavigationView` contains runtime component information and is not persisted.

---

# 2. Pane Identity

`paneID` identifies the visible Workspace region that owns one navigation session.

A push does not create a new Pane.

For example:

```text
Pane a
    modules.root
    search.results
```

pushing Bible produces:

```text
Pane a
    modules.root
    search.results
    bible.reader
```

The `paneID` remains `a`.

`PaneNavigationService` owns that Pane identity. Feature components should obtain navigation through the Pane navigation context rather than receiving `paneID` merely to navigate or resolve Resources.

---

# 3. One Flat Navigation Stack

Application navigation uses one flat stack.

Do not maintain separate concepts for:

```text
Pane module history
Module-internal history
cross-Module history
```

Example:

```text
modules.root
plans.subscriptions
plans.subscription-details
bible.reader
refs.root
```

These are entries in one navigation history.

Same-Module and cross-Module navigation differ in how the next `NavigationState` is built, but not in how history is represented.

---

# 4. The `modules.root` Invariant

Every normal leaf Pane has `modules.root` as the bottom navigation entry.

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

This gives every Pane a stable empty/default state.

The Modules launcher is not a hidden Buffer or a second rendering layer. It is an ordinary registered navigation view whose stable ID is:

```text
modules.root
```

---

# 5. NavigationState

Every persisted entry is represented by `NavigationState`.

Conceptually:

```ts
interface NavigationState<TView = string | number> {
    module: Modules;
    view: TView;
    state: NavigationViewState;
}
```

`module` identifies the feature/Module policy owner.

`view` is a stable registered semantic view ID.

`state` contains serializable semantic view state.

Examples:

```ts
{
    module: Modules.BIBLE,
    view: 'bible.reader',
    state: {
        bibleLocationRef: '43_3_16',
        resourceSelections: {...}
    }
}
```

```ts
{
    module: Modules.NOTES,
    view: 'notes.root',
    state: {
        noteID: '...'
    }
}
```

Do not persist:

```text
Svelte component constructors
DOM nodes
services
workers
callbacks
Pane objects
runtime subscriptions
```

---

# 6. Stable View IDs and Registration

Features own stable view IDs and navigation registrations.

Examples include:

```text
modules.root
bible.reader
search.results
notes.root
plans.subscriptions
archive.root
profile.root
login.root
settings.root
```

The application composition root registers feature-owned view registrations into the navigation view registry.

Conceptually:

```text
feature
    exports view IDs + registrations

Application
    registers them

NavigationViewRegistry
    stable view ID
        → Svelte component
```

Generic navigation code must not import feature components and branch on Module type.

---

# 7. Mounted-State Preservation

The primary runtime behavior is persistent mounted navigation.

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

Back from `C` destroys only `C`:

```text
A  mounted + hidden
B  mounted + visible
```

`B` is the exact previously mounted component instance.

This preserves naturally:

```text
local Svelte state
scroll position
browser input state
editor state
DOM identity
runtime subscriptions owned by the mounted view
```

A browser reload reconstructs components, so exact DOM identity does not survive reload. The semantic navigation hierarchy does.

---

# 8. PaneNavigationService

`PaneNavigationService` is the feature-facing navigation boundary for one Pane.

Normal semantic operations include:

```text
pushView
pushModule
back
backWithResult
split
updateResourceSelection
canGoBack
```

It owns:

```text
Pane identity
navigation state construction
runtime stack coordination
persistence coordination
split requests
runtime result handlers
```

It does not own feature-specific business meaning.

Features decide what semantic destination to request.

---

# 9. No General Stack Replacement API

There is intentionally no general `replaceModule()` operation.

A feature should not be able to arbitrarily destroy the Pane's navigation history.

Incorrect pattern:

```text
feature view
    → wipe entire stack
    → install unrelated root
```

Normal navigation is:

```text
push
back
split
```

If a flow needs terminal behavior, keep that behavior narrow and owned by the flow rather than exposing a general stack-reset primitive.

Authentication is the current example: successful Login completion unwinds Login entries to the invariant Modules root and then pushes Profile. This behavior is isolated in Login-owned application code rather than exposed as a generic feature API.

---

# 10. Push Semantics

## Same Module

`pushView()` creates a new entry using the active Module and current Resource-selection context.

Conceptually:

```text
plans.subscriptions
    ↓ pushView
plans.subscription-details
```

## Different Module

`pushModule()` creates a related target state using the destination Module's Resource policy.

Conceptually:

```text
search.results
    ↓ pushModule(BIBLE)
bible.reader
```

Both operations append to the same flat stack.

The previous entry remains mounted hidden.

---

# 11. Back Semantics

Back is a real stack pop.

Given:

```text
modules.root
search.results
bible.reader
```

Back from Bible becomes:

```text
modules.root
search.results
```

The existing Search component is revealed.

Back at the bottom `modules.root` entry is not how the Pane is deleted. Modules-root close is Workspace policy.

---

# 12. Runtime Results

Some flows need to return a completion result to the direct parent before popping.

`backWithResult()` supports this without persisting callbacks.

Conceptually:

```text
Plans
    ↓ open Bible reading
Bible
    ↓ finish reading
runtime result delivered to mounted Plans parent
    ↓
Bible popped
Plans revealed
```

Result handlers are runtime-only.

They are intentionally absent from persisted `NavigationState`.

---

# 13. Resource-Selection Ownership

Resource selections belong to the navigation interaction:

```text
NavigationState.state.resourceSelections
```

They do not belong to:

```text
Pane globally
WorkspaceRuntime
paneID lookup
legacy Buffer state
```

This matters because hidden entries remain mounted and must continue using the Resource context captured for their own interaction.

---

# 14. NavigationStateBuilder

`NavigationStateBuilder` owns Resource-selection derivation when a new entry is created.

Conceptually:

```text
new independent entry
    → ModuleResourceSelectionBuilder.independent(module)

related entry
    → ModuleResourceSelectionBuilder.related(
          module,
          originating selections
      )
```

Caller-provided Resource selections are not treated as an authoritative bypass around Module Resource policy.

The resulting Resource snapshot is stored in the new navigation state.

---

# 15. ModuleResourceSelectionResolver

`ModuleResourceSelectionResolver` accepts `NavigationState` directly.

Current API shape:

```ts
find(navigationState, resourceType)
require(navigationState, resourceType)
```

There is no pane-based resolver API.

The resolver normalizes Resource selections through the Module selection builder and writes the normalized result back to the navigation state when needed.

Feature views should not implement their own fallback/default Resource policy.

---

# 16. Resource Selection Updates

Changing a Resource selection for the active navigation interaction must update that interaction, not a Pane-global snapshot.

Conceptually:

```text
active NavigationState
    ↓
copy current ResourceSelections
    ↓
replace requested selection
    ↓
ModuleResourceSelectionBuilder.update(...)
    ↓
normalized ResourceSelections
    ↓
active NavigationState.state.resourceSelections
    ↓
persist Pane state
```

Do not mutate the originating Resource selection map in place when the builder contract expects a new normalized snapshot.

---

# 17. Persistence

Navigation is persisted directly on the leaf Pane:

```text
Pane.state.navigation
    = NavigationState[]
```

There is no runtime Buffer persistence envelope.

A persisted leaf Pane conceptually looks like:

```ts
{
    id: 'a',
    state: {
        navigation: [
            {
                module: Modules.MODULES,
                view: 'modules.root',
                state: {...}
            },
            {
                module: Modules.BIBLE,
                view: 'bible.reader',
                state: {...}
            }
        ]
    }
}
```

Workspace persistence owns the recursive Pane tree.

Navigation persistence owns validation and mutation of the navigation array inside leaf `Pane.state`.

---

# 18. Restore / Hydration

On startup or reload:

```text
persisted Pane tree
    ↓
restore leaf Pane.state
    ↓
NavigationRuntimeFactory.create(paneID)
    ↓
find current Pane state
    ↓
parse NavigationState[]
    ↓
resolve each stable view ID
    ↓
hydrate runtime NavigationView[]
```

All restored entries mount.

Only the top entry is visible.

There is intentionally no legacy Buffer/module navigation reconstruction path.

Breaking navigation changes are preferred over keeping old Buffer-era compatibility layers indefinitely.

---

# 19. Split Semantics

Split belongs at the Pane navigation boundary because it combines semantic navigation state construction with Workspace geometry.

Feature code requests:

```ts
navigation.split(
    direction,
    module,
    view,
    state
)
```

The originating Pane stack does not change.

A new Pane is created with its own independent navigation runtime.

## Working destination

Splitting to a working view creates:

```text
modules.root
target view
```

Example:

```text
Pane A
    modules.root
    search.results

split Bible

Pane B
    modules.root
    bible.reader
```

## Modules destination

Splitting explicitly to Modules creates only:

```text
modules.root
```

Never:

```text
modules.root
modules.root
```

---

# 20. Modules Root Close Policy

`modules.root` is the empty/default state of a Pane.

Closing a normal working view uses Back:

```text
modules.root
bible.reader
    ↓ close/back
modules.root
```

The Pane remains.

Closing `modules.root` means close the Pane itself.

If other Panes exist, Workspace structurally deletes the target Pane and collapses the immediate parent branch.

If `modules.root` is the sole root leaf Pane, structural deletion is rejected and the final Pane remains.

The Workspace must never end with zero Panes.

---

# 21. Authentication Flow

Signed-out startup still obeys the Modules-root invariant.

Conceptually:

```text
modules.root
login.root
```

A deeper Login flow may be:

```text
modules.root
login.root
login.nsec
```

After successful authentication, Login-owned completion code unwinds to the Modules root and pushes Profile:

```text
modules.root
profile.root
```

This is deliberately narrower than a generic stack-replacement API.

---

# 22. Navigation Runtime Context

The Pane navigation Svelte context exposes the Pane's `PaneNavigationService`.

Pane identity is available from:

```ts
navigation.paneID
```

The context does not duplicate a separate `paneID` field.

Registered navigation views do not receive generic navigation internals such as `paneID` or a generic NavigationService prop by default.

They receive their actual rendering state and request navigation from context when needed.

---

# 23. Navigation Entry Context

Each mounted navigation entry provides its own `NavigationState` to descendants that require entry-scoped state.

This is important for nested components such as Bible Reader descendants that need Resource context without threading `navigationState` through every intermediate prop.

Conceptually:

```text
PaneNavigationContainer
    ↓
Navigation entry wrapper
    provides this entry's NavigationState
    ↓
feature descendants
```

The nearest entry context wins.

Hidden entries therefore continue to resolve their own state rather than the currently visible top entry's state.

---

# 24. Rendering Boundary

`PaneNavigationContainer` is the Pane's navigation renderer.

It renders all runtime entries and hides non-active entries rather than destroying them.

Registered views receive the navigation-owned object one-way.

Conceptually:

```svelte
<ViewComponent
    obj={navigationView.obj}
/>
```

Do not bind the child back to the navigation entry object.

The child owns mutations through semantic navigation/state APIs, not by replacing the parent's runtime entry object.

---

# 25. Generic NavigationService

The generic `NavigationService` is an internal stack-mechanics primitive.

It is not the feature-facing application navigation API and is no longer exported as a general application service.

It owns mechanics such as:

```text
mounted runtime entry array
active/top entry visibility
push
back/hydration mechanics
```

`PaneNavigationService` adds application semantics around that primitive.

Do not create feature-owned generic NavigationService stacks for application navigation.

---

# 26. Workspace Ownership

Workspace owns geometry:

```text
Pane tree
split direction
Pane allocation
Pane deletion
branch collapse
Workspace persistence trigger
```

Navigation owns semantic history:

```text
Module/view destination
NavigationState creation
runtime stack
Back
result handling
Resource context
```

The split boundary intentionally touches both systems, but generic stack mechanics do not own Workspace geometry.

---

# 27. State Ownership Summary

Use this ownership model:

```text
ApplicationContext
    application-global services

WorkspaceRuntime
    Pane tree geometry and persistence orchestration

Pane.state
    persisted state belonging to one leaf Pane

PaneNavigationService
    one Pane's navigation session

NavigationState
    one persisted navigation interaction

NavigationState.state.resourceSelections
    Resource snapshot for that interaction

Navigation entry context
    entry-scoped access for nested descendants

feature context / local $state
    feature-specific live UI state
```

Do not put Pane navigation state into ApplicationContext as a global singleton.

---

# 28. Identity Rules

Keep these identities distinct:

```text
paneID
Module enum/type
stable navigation view ID
NavigationState object identity
runtime NavigationView identity
Svelte/DOM component identity
Domain Object IDs
Resource IDs
```

The runtime Buffer key identity no longer exists.

A stable semantic ID is preferred over holding a mutable Pane object reference across operations.

---

# 29. Persistence and Runtime Identity

Within one live session:

```text
persisted NavigationState object
    ↔ runtime NavigationView.obj.navigationState
```

should refer to the same logical state object where the runtime expects mutations to be persisted directly.

Across a browser reload:

```text
semantic state survives
runtime component identity does not
```

This distinction is intentional.

---

# 30. Multi-Pane Isolation

Every Pane owns an isolated navigation runtime.

Example:

```text
Pane A
    modules.root
    bible.reader @ John 1

Pane B
    modules.root
    bible.reader @ Romans 8
```

They must have:

```text
different paneID values
independent Pane.state.navigation arrays
independent PaneNavigationService instances
independent runtime stacks
independent NavigationState objects
```

Mutating Pane A must not mutate Pane B.

Persistence/restore must reconstruct both stacks independently.

---

# 31. Compatibility Policy

The following legacy architecture has been removed:

```text
BufferBag
Buffer.componentName
Buffer.resourceSelections
Buffer runtime persistence envelope
ModuleBufferFactory
legacy Module component resolver
legacy Buffer → NavigationState bootstrap
pane-based ModuleResourceSelectionResolver APIs
Workspace Buffer replacement navigation
Pane.toggle navigation invalidation
PaneNavigationService.replaceModule()
generic NavigationServiceFactory
legacy generic NavigationContainer
```

Do not reintroduce these as compatibility layers unless a new explicit architectural requirement justifies them.

The project intentionally chose to start fresh rather than indefinitely support old persisted navigation shapes.

---

# 32. UI Components Named Buffer

UI components such as:

```text
BufferContainer
BufferBody
```

may still exist as layout/shell components.

Their names are historical UI terminology and do not imply that the removed runtime `Buffer` model still exists.

Do not infer runtime state ownership from those component names.

---

# 33. Important Anti-Patterns

Avoid:

```text
reconstructing the previous view on Back
storing component constructors in persisted state
creating a second Pane merely to navigate deeper
separate internal and cross-Module history stacks
paneID-based Resource resolution
Pane-global Resource snapshots
feature code mutating Workspace tree directly for ordinary navigation
feature code wiping the entire stack
legacy Buffer/module bootstrap logic
global navigation singleton
passing Pane objects through feature/domain APIs
binding child components back to navigation-owned entry objects
```

---

# 34. Regression Tests That Protect the Architecture

High-value tests include:

## Mounted identity

```text
A
→ B
→ Back
```

Verify the exact mounted `A` DOM/component instance is revealed.

## Split root invariant

Working split:

```text
[modules.root, target]
```

Modules split:

```text
[modules.root]
```

## Multi-Pane persistence

Persist two independent Pane navigation stacks, JSON round-trip them, restore both runtimes, and prove mutating one Pane leaves the other unchanged.

## Result completion

Verify a result is delivered to the direct mounted parent before the active child is popped.

## Resource isolation

Two mounted entries or Panes with different Resource selections must resolve their own snapshots independently.

---

# 35. Example — Search to Bible and Back

Start:

```text
modules.root
search.results
```

Open Bible:

```text
modules.root
search.results   hidden, still mounted
bible.reader     visible
```

Back:

```text
modules.root
search.results   visible, same mounted instance
```

No Pane split and no reconstruction of Search are required.

---

# 36. Example — Split Bible From Search

Origin:

```text
Pane A
    modules.root
    search.results
```

Split:

```text
Pane A
    modules.root
    search.results

Pane B
    modules.root
    bible.reader
```

Back/close Bible in Pane B:

```text
Pane B
    modules.root
```

Close Modules in Pane B:

```text
Pane A remains
Pane B is structurally removed
```

---

# 37. Example — Authentication

Signed out:

```text
modules.root
login.root
login.nsec
```

Authentication succeeds:

```text
unwind Login entries
push profile.root
```

Result:

```text
modules.root
profile.root
```

Back from Profile can return to Modules, not to a completed Login flow.

---

# 38. Extension Pattern for a New Navigation View

A new feature view should normally:

```text
1. define a stable namespaced view ID
2. define serializable semantic state
3. register view ID → component from the owning feature
4. let Application register the feature's registrations
5. navigate with pushView/pushModule/split
6. resolve Resources from NavigationState when needed
7. use Back instead of reconstructing the parent
8. add focused behavior tests for nontrivial transitions
```

Do not add a new navigation subsystem because one feature has a new child view.

---

# 39. Summary

The current KJVOnly.bible navigation model is:

```text
Workspace
    → Pane tree

leaf Pane
    → paneID
    → Pane.state.navigation: NavigationState[]

NavigationRuntimeFactory
    → creates one Pane navigation runtime

PaneNavigationService
    → semantic feature-facing navigation boundary

internal NavigationService
    → generic mounted stack mechanics

NavigationState
    → module + stable view + serializable semantic state

NavigationState.state.resourceSelections
    → Resource snapshot for one interaction

NavigationViewRegistry
    → stable view ID → component

Workspace split
    → new Pane with modules.root base
```

The key behavioral rule remains:

> **Navigate deeper by pushing, return by popping, preserve previous mounted views, split only when the user wants another Pane, and keep semantic navigation state directly on the Pane rather than reconstructing legacy Buffer/module state.**
