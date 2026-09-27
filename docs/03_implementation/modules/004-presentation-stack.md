# Module Presentation Stack

**Status:** Current  
**Scope:** `client/kjvonly-pwa`

---

# Purpose

This document describes how a persisted Pane navigation state becomes rendered Svelte UI inside the Workspace.

The current presentation stack is based on Pane-local navigation rather than the removed runtime Buffer model.

---

# Rendering Flow

```text
Workspace Pane tree
    ↓
derive Workspace layout
    ↓
normalized grid
    ↓
leaf Pane
    ↓
pane.svelte
    ↓
PaneNavigationContainer
    ↓
PaneSurface
    ↓
NavigationEntry
    ↓
registered feature view
    ├── ViewHeader
    └── ViewBody / feature content
```

The Workspace owns structure and geometry.

The Pane owns one navigation runtime and one layout context.

The navigation runtime resolves persisted stable view IDs into runtime components.

---

# Pane State

A rendered leaf Pane persists its navigation stack under:

```text
Pane.state.navigation
```

The persisted representation is:

```text
NavigationState[]
```

Runtime component constructors are resolved from registered view IDs and are not persisted.

---

# Navigation Runtime

`NavigationRuntimeFactory` creates one isolated navigation runtime for one rendered leaf Pane.

The runtime composes:

```text
NavigationService
PaneNavigationService
NavigationStatePersistence
NavigationViewResolver
NavigationStateBuilder
Resource-selection policy
```

The Pane then provides the feature-facing navigation capability through Pane-local Svelte context.

---

# Pane Presentation

The Pane component owns:

```text
paneID
Pane navigation runtime
PaneLayoutContext
rendered Pane dimensions
```

It does not render feature-specific UI directly.

It delegates navigation-stack rendering to `PaneNavigationContainer`.

---

# PaneNavigationContainer

`PaneNavigationContainer` owns:

```text
the mounted flat NavigationView stack
active/hidden entry presentation
keyed NavigationEntry rendering
the single PaneSurface
```

Previous entries remain mounted while hidden.

The `{#each}` must remain keyed by runtime `NavigationView` identity so replacing an entry at the same stack depth destroys the old component and mounts the new one.

---

# PaneSurface

`PaneSurface` is the single shared visual shell for one rendered Pane.

Location:

```text
client/kjvonly-pwa/src/lib/application/runtime/pane/components/paneSurface.svelte
```

It owns Pane-wide presentation policy such as:

```text
background
outline / visual surface
min-size containment
global max-width behavior
```

Feature views do not create additional `PaneSurface` instances.

---

# NavigationEntry

Each `NavigationEntry` renders one resolved feature component and provides the nearest `NavigationEntryContext`.

The context owns entry-scoped operations such as:

```text
navigationState access
isActive()
onResult()
whenActive()
updateState()
updateResourceSelection()
```

The feature does not receive a generic mutable `obj` prop.

---

# ViewHeader and ViewBody

Shared view presentation primitives live under:

```text
client/kjvonly-pwa/src/lib/application/runtime/pane/components/
```

The two important view-region components are:

```text
ViewHeader
ViewBody
```

`ViewHeader` owns the standard header layout and header-height measurement.

`ViewBody` owns the normal remaining-height body region and primary vertical scrolling contract.

Feature views compose these primitives without creating another Pane shell.

---

# Height Flow

The current sizing flow is:

```text
Pane DOM element
    ↓ bind:clientHeight
PaneLayoutContext
    ↓
feature view
    ↓
ViewBody(clientHeight, headerHeight)
```

Pane height is not measured separately by each feature view.

---

# Resource Context

Resource selections belong to the semantic navigation entry:

```text
NavigationState.state.resourceSelections
```

Features consume their own entry state through `NavigationEntryContext` and Resource resolver boundaries.

Resource lookup does not traverse a Pane-owned Buffer.

---

# Push / Back Lifecycle

Push:

```text
current entry remains mounted
new NavigationState created
new NavigationView resolved
new NavigationEntry mounted
previous entry hidden
```

Back:

```text
active entry removed
removed component destroyed
previous mounted entry becomes active again
```

A browser reload reconstructs components from persisted semantic state; exact DOM identity is only preserved within the current runtime session.

---

# Split Presentation

A split creates a new leaf Pane with its own:

```text
Pane state
Pane navigation runtime
PaneLayoutContext
PaneSurface
navigation stack
```

The origin Pane remains independent.

The new Pane begins with the required `modules.root` navigation invariant and, when appropriate, the requested target entry above it.

---

# Presentation Ownership

```text
Workspace
    owns Pane tree and geometry

Pane
    owns Pane identity, layout context, navigation runtime

PaneNavigationContainer
    owns mounted navigation-stack rendering

PaneSurface
    owns Pane-wide visual shell

NavigationEntry
    owns one mounted semantic interaction

ViewHeader
    owns standard header layout

ViewBody
    owns normal body / primary scroll region

feature content
    owns feature-specific presentation
```

---

# Public UI Boundary

Cross-domain feature code should consume browser/Svelte presentation exports through the appropriate UI boundary rather than reaching into another domain's implementation tree.

Within the application runtime itself, Pane presentation components may be imported directly from their owning runtime location when that is the composition boundary.

---

# Anti-Patterns

Avoid:

```text
feature-owned generic NavigationService stacks
nested PaneSurface instances
feature-local Pane height measurement
runtime component constructors in persisted NavigationState
Pane traversal to discover active feature state
generic mutable obj navigation props
feature code mutating another entry's NavigationState
Resource lookup through removed Buffer runtime concepts
```

---

# Architecture Invariants

1. Workspace owns Pane structure and geometry.
2. Every rendered leaf Pane has one isolated navigation runtime.
3. `Pane.state.navigation` is the persisted navigation source of truth.
4. Runtime components are resolved from stable registered view IDs.
5. Previous navigation entries remain mounted while hidden.
6. Every rendered Pane has one `PaneSurface`.
7. Feature views compose `ViewHeader` and `ViewBody` rather than another Pane shell.
8. Pane measurements come from `PaneLayoutContext`.
9. Resource selections belong to navigation-entry state.
10. Domain behavior remains outside presentation/runtime infrastructure.

---

# Big Takeaway

The current presentation stack is:

```text
Workspace
    → Pane
    → PaneNavigationContainer
    → PaneSurface
    → NavigationEntry
    → feature view
    → ViewHeader / ViewBody / feature content
```

There is one Pane surface and one flat navigation history per rendered leaf Pane.
