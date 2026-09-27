# UI Shell and Layout Ownership

## Status

**Application Standard / Architecture Guidance**

Save in the repository as:

```text
docs/03_implementation/runtime/011-ui-shell-layout-ownership.md
```

---

# 1. Purpose

This document defines ownership of the Pane presentation shell, view headers, view bodies, sizing, scrolling, outlines, and layout measurements.

The current presentation hierarchy is:

```text
Workspace
    ↓
Pane
    ↓
PaneNavigationContainer
    ↓
PaneSurface
    ↓
NavigationEntry
    ↓
feature view
    ├── ViewHeader
    └── ViewBody
```

The central rule is:

> **Pane-level shell concerns are owned once by the Pane runtime. Individual navigation views compose their own header/body regions without creating another Pane surface.**

---

# 2. Workspace Ownership

`WorkspaceRuntime` owns structural Pane layout:

```text
Pane tree
split geometry
Pane creation/deletion
persisted Workspace structure
```

The Workspace does not own feature scrolling, view headers, or feature-specific body layout.

---

# 3. Pane Ownership

The rendered Pane component owns one concrete Pane presentation instance.

It owns:

```text
paneID
Pane-local navigation runtime
PaneLayoutContext
rendered Pane dimensions
```

The Pane measures its rendered height and exposes that value reactively through `PaneLayoutContext`.

Conceptually:

```text
Pane DOM element
    ↓ bind:clientHeight
Pane-owned reactive layout state
    ↓ PaneLayoutContext
mounted navigation entries
```

Descendants that need Pane height should consume the context instead of introducing another measuring shell or threading `clientHeight` through generic navigation props.

---

# 4. PaneSurface Ownership

`PaneSurface` is the single shared visual surface for a rendered Pane.

Current source location:

```text
client/kjvonly-pwa/src/lib/application/runtime/pane/components/paneSurface.svelte
```

`PaneNavigationContainer` owns the one `PaneSurface` instance for its Pane.

`PaneSurface` owns Pane-wide presentation policy such as:

```text
full available Pane surface
background
outline / visual boundary
global max-width policy
minimum-size containment
```

It does **not** own feature navigation semantics, feature headers, feature body state, or Resource state.

There should normally be exactly one `PaneSurface` per rendered leaf Pane.

Feature views must not create nested `PaneSurface` instances merely because they need a header/body layout.

---

# 5. PaneNavigationContainer Ownership

`PaneNavigationContainer` owns rendering of the Pane's flat navigation stack.

It:

```text
renders NavigationView entries
keeps previous entries mounted while hidden
shows only the active top entry
keys entries by NavigationView identity
hosts the single PaneSurface
```

It does not render feature-specific headers or bodies.

The shell and stack are therefore composed as:

```text
PaneNavigationContainer
    ↓
PaneSurface
    ↓
NavigationEntry[]
```

---

# 6. NavigationEntry Ownership

Each `NavigationEntry` owns one mounted navigation interaction.

It provides:

```text
NavigationEntryContext
entry activity
entry-scoped result handling
entry-scoped semantic state mutation
entry-scoped Resource selection mutation
```

The feature component rendered by the entry decides whether it needs a `ViewHeader`, `ViewBody`, or a more specialized internal layout.

`NavigationEntry` itself does not create a second surface shell.

---

# 7. ViewHeader Ownership

`ViewHeader` is the shared header layout primitive for a navigation view.

Current source location:

```text
client/kjvonly-pwa/src/lib/application/runtime/pane/components/viewHeader.svelte
```

It owns normal header-region presentation such as:

```text
header height measurement
header alignment
leading action slot
title area
trailing action area
standard header spacing / boundary presentation
```

A feature-specific header such as Bible, Notes, Settings, Plans, or Profile may compose `ViewHeader` and place its own controls inside it.

Feature-specific header components own semantic actions.

`ViewHeader` owns only the shared header layout contract.

---

# 8. ViewBody Ownership

`ViewBody` is the shared body/scroll-region primitive for a navigation view.

Current source location:

```text
client/kjvonly-pwa/src/lib/application/runtime/pane/components/viewBody.svelte
```

It consumes:

```text
Pane height
ViewHeader height
```

and represents the remaining view body region.

It may own:

```text
remaining-height calculation
primary vertical scrolling
standard body padding
body overflow behavior
```

Feature content owns layout inside that region.

A feature should not create another primary vertical scroll container unless it has a genuine nested scrolling requirement.

---

# 9. Height Ownership

Height has three distinct owners:

```text
Workspace
    owns Pane geometry

Pane
    measures rendered Pane height

ViewHeader
    measures current view header height

ViewBody
    consumes Pane height + header height
    owns remaining body region
```

Do not measure Pane height independently inside feature views.

Do not make `PaneSurface` responsible for a second height authority.

---

# 10. PaneLayoutContext

Pane layout measurements are exposed through Pane-local Svelte context.

Conceptually:

```ts
interface PaneLayoutContext {
    readonly clientHeight: number;
}
```

A consumer that needs a reactive local value may use:

```ts
const paneLayout = usePaneLayoutContext();

let clientHeight = $derived(
    paneLayout.clientHeight
);
```

or read `paneLayout.clientHeight` directly in reactive markup.

Avoid destructuring the numeric value once when future resize updates are required.

---

# 11. One Primary Vertical Scroll Owner

A normal navigation view should have one intentional primary vertical scroll owner.

Preferred structure:

```text
ViewHeader
    fixed header region

ViewBody
    remaining height
    vertical scrolling

feature content
    normal flow
```

Avoid:

```text
ViewBody
    overflow-y-auto

child wrapper
    h-full
    overflow-y-auto
```

unless the child represents an intentionally independent nested scrolling region.

---

# 12. Outline and Visual Boundary Ownership

Visual boundaries should have one semantic owner.

Current normal ownership is:

```text
PaneSurface
    Pane-wide visual surface / outline

ViewHeader
    header-region boundary when required

feature content
    only feature-specific boundaries
```

Avoid recreating the Pane outline in each feature view.

Use `outline` instead of `border` when the visual boundary must not change box dimensions.

---

# 13. Max-Width Ownership

The global Pane content-width policy belongs to `PaneSurface`.

A feature should not add another global `max-w-*` constraint merely to reproduce application-wide width behavior.

A feature may still use a narrower width when the content itself has an independent semantic reason, such as:

```text
login form
small settings control
confirmation dialog content
specialized editor column
```

The distinction is:

```text
application-wide Pane width policy
    → PaneSurface

feature-specific width requirement
    → feature
```

---

# 14. Padding Ownership

Padding should belong to the layer that defines the spacing contract.

Examples:

```text
ViewHeader
    standard header spacing

ViewBody
    standard body padding when enabled

feature section
    semantic spacing between feature groups
```

Avoid accidental stacking such as:

```text
ViewBody px-4
child page px-4
section px-4
row px-4
```

unless each level intentionally represents a separate visual hierarchy.

---

# 15. Persistent Navigation and Hidden Entries

Previous navigation entries remain mounted while hidden.

This means every mounted feature may still have its own:

```text
ViewHeader
ViewBody
component-local state
subscriptions that are valid while inactive
```

Only the active entry is visible.

Hidden entries must not create additional Pane surfaces and must not become an alternate source of Pane dimensions.

---

# 16. SettingsScreen and Other Feature Shells

Feature-level shell components such as `SettingsScreen` may compose:

```text
ViewHeader
ViewBody
feature title/actions
feature-specific body classes
```

They do not own `PaneSurface`.

This lets features reuse the standard view-region layout without creating a competing Pane shell.

---

# 17. Notes Editor / Quill

The Notes editor is a useful sizing example.

Notes may use Pane height from `PaneLayoutContext` and subtract its `ViewHeader` height to size the editor region.

The Quill editor should remain constrained to that view body region.

It should not create or measure another Pane surface.

---

# 18. Book / Chapter / Verse Views

Bible book/chapter/verse navigation views use the same rule:

```text
ViewHeader
ViewBody
```

They consume Pane layout height rather than wrapping themselves in another `PaneSurface`.

This keeps the navigation shell singular regardless of how many feature views are pushed in the Pane stack.

---

# 19. Component Location

The shared Pane/view presentation primitives live together under:

```text
client/kjvonly-pwa/src/lib/application/runtime/pane/components/
```

Current important components include:

```text
pane.svelte
paneSurface.svelte
viewHeader.svelte
viewBody.svelte
```

`PaneNavigationContainer` remains under navigation runtime because it owns navigation-stack rendering, not the generic Pane visual primitives.

---

# 20. Anti-Patterns

Avoid:

```text
feature view creates PaneSurface
multiple PaneSurface instances in one rendered Pane
feature measures Pane clientHeight independently
clientHeight threaded through generic navigation props
nested primary vertical scroll containers without a real nested-scroll requirement
feature duplicates Pane max-width policy
feature root redraws Pane outline
ViewBody and child both claim the same scrolling region
PaneSurface given feature-specific semantic state
```

---

# 21. Review Questions

Before changing layout ownership, ask:

```text
Is this concern Pane-wide or only view-local?
Who owns the measured dimension?
Is there already a PaneSurface above this component?
Is this the primary scrolling region or a truly nested one?
Am I adding width/outline/padding that another layer already owns?
Does this feature really need custom shell behavior?
Can PaneLayoutContext provide the measurement instead of another wrapper?
```

---

# 22. Architecture Invariants

1. Workspace owns Pane geometry.
2. Each rendered leaf Pane owns one Pane-local layout context.
3. `PaneNavigationContainer` owns the flat mounted navigation stack.
4. Each rendered Pane has one `PaneSurface`.
5. `PaneSurface` owns Pane-wide visual shell and max-width policy.
6. `ViewHeader` owns the standard view-header layout contract.
7. `ViewBody` owns the normal view body/scroll-region contract.
8. Feature views compose `ViewHeader`/`ViewBody`; they do not create another Pane surface.
9. Pane height comes from `PaneLayoutContext`, not feature-local measurement.
10. One primary vertical scrolling owner is preferred per active view.
11. Visual boundaries and padding have one clear semantic owner.
12. Hidden navigation entries remain mounted without becoming alternate Pane shell/layout authorities.

---

# 23. Big Takeaway

The current shell hierarchy is:

```text
Workspace
    owns Pane geometry

Pane
    owns Pane identity + Pane layout measurement

PaneNavigationContainer
    owns navigation stack rendering

PaneSurface
    owns the one Pane-wide visual surface

NavigationEntry / feature view
    owns one mounted interaction

ViewHeader
    owns view header layout

ViewBody
    owns the normal view body / primary scroll region

feature content
    owns feature-specific presentation
```

Keep those ownership boundaries singular.
