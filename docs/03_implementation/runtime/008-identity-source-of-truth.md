# Identity and Source-of-Truth Rules

## Status

**Current Application Standard / Architecture Guidance**

Repository path:

```text
docs/03_implementation/runtime/008-identity-source-of-truth.md
```

Related navigation detail:

```text
docs/03_implementation/runtime/016-navigation-architecture.md
```

---

# 1. Purpose

This document defines how KJVOnly.bible distinguishes:

```text
identity
runtime object identity
authority
projection
snapshot
derived state
presentation label
```

The central rule is:

> **Use stable semantic identity to refer to things, and define exactly one authority for each logical value.**

Many subtle bugs come from using a convenient runtime object or display value as though it were stable identity or authoritative state.

---

# 2. Identity Categories

Important current identities include:

```text
paneID
Module enum
stable navigation view ID
NavigationState object identity
NavigationView runtime object identity
Domain Object ID
Resource Type
PublishedResourceReference
Settings page/row IDs
subscriber IDs
```

These identities solve different problems and should not be substituted for one another.

---

# 3. Pane Identity

`paneID` identifies one logical Pane in the Workspace tree.

It remains the stable lookup identity even when surrounding Workspace structure changes.

Conceptually:

```text
paneID
    ↓
WorkspaceRuntime.findPane(paneID)
    ↓
current Pane object
```

The `Pane` object is a mutable runtime data structure.

The `paneID` is the stable identity used to re-resolve it.

Prefer:

```text
store paneID
re-resolve current Pane when needed
```

over:

```text
cache a Pane object indefinitely across Workspace restructuring
```

---

# 4. Leaf Pane State Is Not Pane Identity

A leaf Pane owns state such as:

```text
Pane.state.navigation
```

That state belongs to the Pane, but it is not the Pane's identity.

Two different Panes may temporarily contain semantically identical navigation stacks while remaining different Panes.

Likewise, one Pane may change its entire active interaction history while retaining the same `paneID`.

---

# 5. Module Identity

`Modules` identifies the policy/feature owner of a navigation entry.

It does not uniquely identify a mounted interaction.

Example:

```text
Pane A
    modules.root
    bible.reader @ Genesis 1
    search.results
    bible.reader @ Romans 8
```

Both Bible entries have:

```text
module = Modules.BIBLE
```

but they are different interactions with different `NavigationState` objects, runtime `NavigationView` objects, component instances, and potentially different Resource snapshots.

Therefore:

> **Module type is not interaction identity.**

---

# 6. Stable Navigation View ID

`NavigationState.view` is a stable semantic view ID.

Examples:

```text
modules.root
bible.reader
search.results
plans.subscription-details
settings.root
```

The view ID is persisted.

The Svelte component constructor is not.

Resolution is:

```text
NavigationState.view
    ↓
NavigationViewRegistry
    ↓
NavigationViewResolver
    ↓
runtime component
```

This keeps persistence independent from framework component identity.

---

# 7. NavigationState Identity

One `NavigationState` object represents one semantic navigation interaction in a Pane stack.

It contains:

```text
module
view
serializable semantic state
optional Resource-selection snapshot
```

During one live session, the runtime `NavigationView` references that same logical state object.

This is intentional because entry-scoped mutation persists the existing interaction rather than reconstructing the whole stack.

Do not confuse:

```text
same view ID
```

with:

```text
same NavigationState interaction
```

Two entries may both be `bible.reader` and still be independent interactions.

---

# 8. NavigationView Runtime Identity

`NavigationView` is runtime-only.

Conceptually:

```ts
interface NavigationView {
    component: NavigationComponent;
    navigationState: NavigationState;
}
```

`PaneNavigationContainer` keys mounted entries by the `NavigationView` object.

That runtime identity matters for Svelte component lifecycle.

When a top entry is popped and another is pushed at the same array depth, a new `NavigationView` identity ensures the old `NavigationEntry` is destroyed and a new one is mounted.

Persisted state does not depend on this runtime object identity.

---

# 9. Component / DOM Identity

Mounted-state preservation intentionally gives component and DOM identity semantic value within one live session.

Example:

```text
Plans details mounted
Bible pushed above it
Bible popped
same Plans details component revealed
```

The contract is same-instance preservation while the entry remains mounted.

That identity does not survive browser reload.

After reload:

```text
semantic NavigationState survives
runtime NavigationView is rebuilt
Svelte component is rebuilt
DOM identity is new
```

This distinction should be explicit in tests.

---

# 10. Resource Identity

A `PublishedResourceReference` identifies a selected published Resource source.

It is not a Domain Object ID.

Resource state belongs to the Resource layer and entry Resource-selection snapshot.

Domain Objects belong to their Domain.

A Domain service may use a selected Resource reference to load/resolve/install/interpret data, but the identities remain distinct.

Do not use a display label such as Bible version text as a substitute for a Resource reference when the Resource reference is the actual identity.

---

# 11. Resource Selection Snapshot Identity

An entry's Resource selection map lives at:

```text
NavigationState.state.resourceSelections
```

The map is a snapshot for that interaction.

The application-wide `ResourceSelectionService` represents current/default selection policy used when constructing new context.

These are different authorities:

```text
ResourceSelectionService
    current/default application selection

NavigationState.state.resourceSelections
    captured interaction selection
```

Changing one does not silently rewrite the other.

---

# 12. Domain Object Identity

Domain Objects use Domain-owned IDs.

Examples include IDs for:

```text
Notes
Plan subscriptions
Plan progress
Text Markup
other installed Domain Objects
```

Navigation should carry a Domain Object ID when it needs to identify a target.

The Domain store/service remains authoritative for the object's contents.

---

# 13. Settings Identities

Settings uses stable semantic IDs for declarative UI structure.

Examples:

```text
Settings page ID
section ID
row ID
option ID
custom view ID
formatter ID
```

Presentation labels are not identity.

Good:

```text
rowID = color-theme
```

Avoid:

```text
lookup by visible title "Color Theme"
```

Stable IDs allow labels and presentation to change without breaking search/navigation/resolution.

---

# 14. Authority Versus Projection

A value may appear in several places without every copy becoming authoritative.

Example: Settings.

```text
SettingsService
    authority

mounted SettingsContext.settings
    reactive projection

rendered control label
    presentation
```

The projection is updated from the authority.

It must not become an independent persistence owner.

---

# 15. Authority Versus Snapshot

A snapshot intentionally diverges from a later live value.

Example:

```text
application current Bible Resource selection changes
```

An already-mounted Bible navigation entry may continue using its captured entry Resource selection until explicitly changed.

That is not stale state; it is intended snapshot semantics.

See:

```text
runtime/013-live-vs-snapshot-state.md
```

---

# 16. Authority Versus Derived State

Derived values should normally be recomputed from their authority rather than persisted as a competing source of truth.

Examples:

```text
search results
formatted Settings value text
navigation active/top boolean
computed Bible version label from Resource reference
```

Persist a derived value only when there is a separate performance/offline requirement and the cache has explicit invalidation semantics.

---

# 17. Navigation Source of Truth

The persisted navigation source of truth for one leaf Pane is:

```text
Pane.state.navigation
```

The runtime projection is:

```text
NavigationService views
    = NavigationView[]
```

The two stay aligned through `PaneNavigationService` and `NavigationStatePersistence`.

Feature code does not independently rebuild or persist the runtime stack.

---

# 18. Active Entry Is Runtime State

Which entry is active is derived from the runtime stack:

```text
last NavigationView
```

Do not persist a second `activeNavigationIndex` unless the architecture explicitly changes to require it.

With the current stack model, the top entry is active by definition.

---

# 19. Stable IDs Across Mutable Structures

When a mutable structure may change, keep semantic identity outside the structure.

Examples:

```text
paneID survives Pane-tree collapse/restructure
Domain Object ID survives projection rebuild
Settings row ID survives display-label changes
navigation view ID survives component implementation changes
Resource reference survives local presentation changes
```

This keeps lookup resilient to refactoring and runtime mutation.

---

# 20. Re-Resolve Instead of Caching

Re-resolve mutable runtime structures from stable identity when appropriate.

Particularly important for:

```text
Workspace Pane lookup
Resource/domain lookup
registered view component lookup
Settings definition lookup
```

A cached object is safe only when its lifetime is explicitly guaranteed by its owner.

---

# 21. Identity and Persistence

Persist semantic/serializable identity.

Good persisted values:

```text
pane IDs as part of Workspace structure
Modules enum values
stable navigation view IDs
semantic navigation state
Domain Object IDs
PublishedResourceReference values
Settings semantic IDs when needed
```

Do not persist:

```text
Svelte components
DOM nodes
service instances
NavigationView runtime objects
callback functions
subscriptions
worker handles
```

---

# 22. Source-of-Truth Table

| Concept | Current source of truth |
| --- | --- |
| Workspace structure | `WorkspaceRuntime` / persisted Workspace tree |
| Pane identity | `paneID` |
| Pane navigation persistence | `Pane.state.navigation` |
| One interaction | `NavigationState` |
| Runtime mounted entry | `NavigationView` |
| Stable navigable destination | registered view ID |
| Entry Resource selection | `NavigationState.state.resourceSelections` |
| Application current/default Resource selection | `ResourceSelectionService` |
| Settings values | `SettingsService` |
| Settings structure | Settings definition |
| Domain Objects | owning Domain store/service |
| Active entry | top runtime `NavigationView` |

---

# 23. Common Identity Mistakes

Avoid:

```text
Module type as mounted interaction identity
view ID as unique stack-entry identity
Pane object as stable Pane identity
current active entry as identity of a hidden entry
display label as semantic identifier
Resource ID/reference as Domain Object ID
runtime NavigationView persisted as semantic state
component constructor persisted as view identity
local projection treated as authoritative service state
```

---

# 24. Review Questions

Before choosing an identifier, ask:

```text
What exactly is being identified?
Is the thing semantic or runtime-only?
Can multiple instances of this type coexist?
Can the runtime object be replaced?
Must the identity survive reload?
Who owns lookup from identity to current object?
Am I using a label because it is convenient rather than stable?
Am I confusing a selected Resource with the Domain Object produced from it?
```

---

# 25. Architecture Invariants

1. `paneID` is Pane identity; a mutable Pane object is not.
2. Module identity does not uniquely identify a mounted interaction.
3. Stable navigation view IDs identify destination types, not individual entries.
4. `NavigationState` identifies one semantic interaction in a Pane stack.
5. `NavigationView` is runtime-only mounted-entry identity.
6. Component/DOM identity is preserved only within a live mounted session.
7. Resource references and Domain Object IDs remain distinct.
8. Settings labels do not replace stable Settings IDs.
9. One authority exists for each logical value.
10. Projections and snapshots are explicitly named as such.
11. Persisted identity is semantic and serializable.
12. Mutable runtime structures are re-resolved from stable identity where appropriate.

---

# 26. Testing Guidance

High-value identity tests include:

```text
same paneID resolves after split/collapse changes
same view type can exist twice with independent NavigationState objects
pop + push at same depth mounts a new NavigationEntry
Back reveals the same previously mounted component instance
reload restores semantic state but creates new runtime component identity
Resource update affects only the intended entry
Settings row/page lookup uses stable IDs rather than labels
Domain lookup uses Domain Object IDs rather than presentation values
```

---

# 27. Summary

The current hierarchy is:

```text
paneID
    stable Pane identity

NavigationState
    one semantic interaction

NavigationView
    one runtime mounted entry

view ID
    stable destination identity

Module enum
    feature/policy owner

PublishedResourceReference
    Resource identity

Domain Object ID
    Domain identity
```

Use the identity that matches the thing being referenced, and keep authority separate from projections, snapshots, and presentation.
