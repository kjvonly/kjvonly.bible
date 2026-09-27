# Live State and Snapshot Semantics

## Status

**Current Application Standard / Architecture Guidance**

Repository path:

```text
docs/03_implementation/runtime/013-live-vs-snapshot-state.md
```

---

# 1. Purpose

This document defines how KJVOnly.bible distinguishes:

```text
live state
snapshot state
authoritative state
derived state
draft state
cached state
```

The central rule is:

> **Every important runtime value should have explicit freshness semantics.**

A value can be correctly owned but still behave incorrectly if the code assumes the wrong live/snapshot model.

---

# 2. Vocabulary

## Live

A live value is expected to reflect later changes from its authority.

## Snapshot

A snapshot captures a value/context at a specific interaction boundary and does not automatically follow later source changes.

## Authoritative

The authoritative owner defines the logical current value.

## Derived

A derived value can be recomputed from authority and is not independently authoritative.

## Draft

A draft is intentionally uncommitted user work separate from committed authority.

## Cache

A cache is a performance/offline copy with explicit invalidation/rebuild rules.

---

# 3. Current Examples

```text
SettingsService Settings
    authoritative + live

mounted SettingsContext.settings
    live projection

NavigationState.state.resourceSelections
    snapshot

NavigationState semantic fields
    persisted interaction state; explicitly mutable through entry APIs

Domain Object store
    authoritative Domain state

search results
    derived

editor unsaved content
    draft

search index in memory
    cache / derived runtime projection
```

---

# 4. Application Settings Are Live

Application Settings are shared application values.

If one Settings instance changes a value:

```text
SettingsService
    persists/applies authoritative change
    ↓
subscribers receive new snapshot
    ↓
other mounted Settings instances update
    ↓
other application consumers react
```

A mounted Settings instance should not intentionally remain on an old committed Settings value unless it is editing a separate draft.

---

# 5. Local Settings Projection Is Not Authority

`SettingsContext` may hold a reactive local projection so the mounted Settings UI updates naturally.

That projection is not an independent persistence owner.

Mutation path:

```text
user action
    ↓
SettingsContext update capability
    ↓
SettingsService
    ↓
authoritative persistence/application
    ↓
subscriber projection update
```

Do not mutate the local projection and separately persist it through another path.

---

# 6. Entry Resource Selections Are Snapshots

The primary snapshot example in the current navigation architecture is:

```text
NavigationState.state.resourceSelections
```

A navigation interaction captures the Resource selections that define that interaction.

Later application default/current selection changes do not silently rewrite existing entries.

This enables independent interactions such as:

```text
Pane A Bible entry → KJV
Pane B Bible entry → ASV
```

or even multiple Bible entries in one Pane stack with different snapshots.

---

# 7. Snapshot Creation for New Navigation

`NavigationStateBuilder` creates a new entry Resource snapshot through `ModuleResourceSelectionBuilder`.

If there is no originating snapshot:

```text
independent(targetModule)
```

If there is an originating snapshot:

```text
related(targetModule, copiedOriginatingSelections)
```

The destination receives its own snapshot.

It does not share the same mutable selection map object with the origin.

---

# 8. Explicit Snapshot Update

Snapshots are not immutable forever.

They change through an explicit operation when the user changes the interaction's selected Resource.

Current flow:

```text
NavigationEntryContext.updateResourceSelection(...)
    ↓
PaneNavigationService
    ↓
ModuleResourceSelectionBuilder.update(...)
    ↓
normalized new ResourceSelections snapshot
    ↓
current NavigationState.state.resourceSelections
    ↓
persist Pane state
```

The important rule is:

> Snapshot change is explicit and scoped to the owning interaction.

---

# 9. Navigation Semantic State

`NavigationState.state` contains persisted semantic interaction state.

Some fields are stable initialization values; others may be explicitly updated during the interaction.

Examples:

```text
Bible location
selected note ID
Plan detail ID
feature semantic options
```

This state is not automatically live from another application service merely because a similar value exists elsewhere.

Define which owner is authoritative for each field.

---

# 10. Domain Objects Are Authoritative Domain State

A Domain Object stored through its Domain service/store is normally authoritative for Domain truth.

Navigation should carry an ID/reference to that object rather than duplicating a second live copy as authority.

Example:

```text
NavigationState.state.noteID
    ↓
NotesService
    ↓
current Note Domain Object
```

The navigation state identifies the interaction target; the Domain store owns the Note.

---

# 11. Draft State

A draft is intentionally separate from committed authority.

Examples:

```text
unsaved Note editor content
future encrypted draft content
temporary form edits
```

A draft may live in:

```text
component state
feature context
draft store
```

depending on required lifecycle.

Its semantics must answer:

```text
Does it survive Back?
Does it survive reload?
Is it encrypted?
When does it become authoritative?
```

Do not call a draft “current Domain state” until commit succeeds.

---

# 12. Derived State

Derived state should normally be recomputed from authority.

Examples:

```text
search results
formatted Settings labels
active-entry boolean
breadcrumb labels
progress percentages
filtered/sorted lists
```

Do not persist a derived value merely because it is convenient to render.

Persist it only when it is actually a cache with explicit lifecycle/invalidation semantics.

---

# 13. Cached State

A cache is allowed to be stale temporarily under an explicit policy.

Examples may include:

```text
in-memory search index
worker projection
precomputed Resource-derived index
```

A cache must define:

```text
authoritative input
creation/rebuild boundary
invalidation signal
staleness tolerance
owner/lifecycle
```

Archive import is a good example of why cache invalidation must be explicit: imported accepted state may require worker/runtime projections to refresh.

---

# 14. Live Does Not Mean Global

Live state may still be scoped.

Examples:

```text
PaneLayoutContext.clientHeight
    live + Pane-local

SettingsContext.settings
    live projection + feature-instance-local

component $derived values
    live + view-local
```

Freshness semantics and ownership scope are orthogonal.

---

# 15. Snapshot Does Not Mean Stale Bug

A snapshot intentionally preserves interaction meaning.

If global/default Resource selection changes while an existing Bible entry remains mounted, the existing entry retaining its prior Resource selection is correct snapshot behavior.

Calling that value “stale” would be incorrect unless the product contract says existing entries must follow global changes.

---

# 16. Same Value, Different Semantics

The same conceptual information may appear in different forms with different freshness rules.

Example: Bible selection.

```text
ResourceSelectionService
    current/default selection policy for new context

NavigationState.state.resourceSelections
    captured selection for one interaction

component-derived Bible version label
    presentation derived from entry snapshot
```

Do not synchronize all copies merely because they refer to the same Bible version concept.

---

# 17. Copy Snapshots at Boundaries

When creating a new interaction snapshot, avoid accidental mutable aliasing.

`NavigationStateBuilder` copies Resource selections when constructing destination state.

The intended relationship is:

```text
origin snapshot
    source context

new snapshot
    related but independently owned
```

not:

```text
origin and destination share one mutable map
```

---

# 18. Persisted Snapshot Semantics

Snapshots that define restored interaction meaning belong in persisted semantic state.

For navigation Resource context:

```text
Pane.state.navigation[].state.resourceSelections
```

This means a reload can reconstruct the same semantic Resource context even though runtime component identity is new.

---

# 19. Runtime-Only Live State

Not all live state should be persisted.

Examples:

```text
entry active status
runtime result handlers
whenActive subscriptions
DOM focus
hover state
service/worker handles
NavigationView runtime objects
```

These values are recreated from runtime ownership.

---

# 20. Subscriber Synchronization

For live shared state, subscriber updates synchronize projections.

They should not become another mutation source.

Bad loop:

```text
user mutation
    ↓
service persists
    ↓
subscriber receives
    ↓
subscriber writes service again
```

Preferred:

```text
user mutation path writes authority
subscriber path only updates projection
```

---

# 21. Multi-Instance Semantics

Two mounted instances may intentionally observe live values while retaining independent snapshots/local state.

Example: two Settings Panes.

Live/shared:

```text
SettingsService values
```

Independent:

```text
navigation stack
search query
scroll position
entry Resource snapshots
DOM identity
```

This is not inconsistency; it is correct mixed semantics.

---

# 22. Choosing Live Versus Snapshot

Ask:

```text
Should later source changes alter the meaning of this existing interaction?
```

If yes, likely live.

If no, likely snapshot.

Then ask:

```text
Who owns the source?
When is the snapshot captured?
How can it be explicitly refreshed/updated?
Must it survive reload?
```

---

# 23. Choosing Draft Versus Authority

Ask:

```text
Has the user committed this value?
Can it be discarded independently?
Can committed data change elsewhere while this edit exists?
```

If the value is independently discardable/uncommitted, model it as draft rather than silently replacing authority.

---

# 24. Choosing Cache Versus Derived

Use pure derived state when recomputation is cheap and deterministic.

Use a cache when recomputation/IO is expensive enough to justify retained state.

A cache requires explicit invalidation ownership.

Do not persist derived state without defining why the persisted copy is needed.

---

# 25. Freshness Table

| Value | Scope | Semantics |
| --- | --- | --- |
| Application Settings | Application | authoritative + live |
| Mounted Settings projection | feature instance | live projection |
| Pane layout measurement | Pane | live |
| Navigation stack | Pane | authoritative persisted semantic state |
| NavigationState semantic fields | entry | persisted interaction state |
| Entry Resource selections | entry | snapshot, explicitly updateable |
| Domain Object | Domain | authoritative |
| Search results | view/runtime | derived |
| Search index | runtime/worker | cache/derived projection |
| Unsaved editor content | view/feature | draft |
| Navigation result handler | entry runtime | ephemeral |

---

# 26. Anti-Patterns

Avoid:

```text
existing entry rereads application default Resource selection on every render
two navigation entries share one mutable ResourceSelections object
subscriber callback republishes authoritative mutation
local Settings projection becomes separate persistence owner
Domain Object contents duplicated into navigation as competing authority
search results persisted as truth without cache policy
draft silently treated as committed Domain state
snapshot called stale merely because a newer global default exists
runtime active state persisted redundantly
```

---

# 27. Architecture Invariants

1. Every important value has explicit freshness semantics.
2. Application Settings are live shared authority.
3. Entry Resource selections are interaction snapshots.
4. New Resource snapshots are derived through Module policy.
5. Existing snapshots change only through explicit interaction mutation.
6. Domain Objects remain authoritative in Domain-owned stores/services.
7. Derived state is not independently authoritative.
8. Draft state is separate from committed state.
9. Caches define rebuild/invalidation ownership.
10. Live/snapshot semantics do not imply global/local ownership by themselves.
11. Runtime-only state is not persisted merely because it is live.
12. Snapshot copies avoid accidental mutable aliasing.

---

# 28. Testing Guidance

High-value tests include:

```text
existing Bible entry keeps Resource selection after global default changes
new entry follows current/default or related policy
updating one entry Resource selection does not mutate origin/other entry
copied destination Resource map is independently owned
Settings update propagates to two mounted Settings instances
subscriber update does not trigger duplicate persistence mutation
reload restores persisted interaction Resource snapshot
search/worker cache refreshes after explicit invalidation event
unsaved draft does not overwrite committed Domain state until commit
```

---

# 29. Summary

Use these words precisely:

```text
live
    follows authority changes

snapshot
    captures interaction context until explicitly changed

authoritative
    defines logical truth

derived
    recomputed from authority

draft
    uncommitted user work

cache
    retained optimization/projection with invalidation rules
```

Correct freshness semantics are as important as correct ownership. A value should not become live merely because a service can provide a newer value, and it should not become a snapshot merely because copying it is convenient.
