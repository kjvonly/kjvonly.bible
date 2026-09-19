# Pane Tree

## Status

Current

---

# Purpose

This document describes the concrete recursive Pane-tree implementation used by
KJVOnly.bible to model the visible Workspace structure.

The Pane tree answers one question:

> Which visible regions exist, and how are they structurally divided?

It does not decide which Domain behavior exists inside those regions. A Leaf
Pane hosts a Buffer; the Buffer identifies the Module Instance displayed there.

The runtime relationship is:

```text
WorkspaceRuntime
    ↓
recursive Pane tree
    ↓
Branch Pane / Leaf Pane
    ↓
Leaf Pane.buffer
    ↓
Buffer
    ↓
Module Instance
```

The key implementation rule is:

> Pane identity belongs to visible Leaf Panes, while Branch Panes exist only to
> describe relationships between children.

This distinction drives split behavior, delete behavior, persistence, layout
projection, and rendering.

Related documents:

```text
docs/01_application-architecture/002-workspace-runtime.md
docs/01_application-architecture/003-runtime-rendering.md
docs/03_implementation/runtime/001-root-runtime.md
docs/03_implementation/runtime/003-grid-layout.md
docs/03_implementation/runtime/004-rendering-engine.md
docs/03_implementation/runtime/005-buffer-contract.md
docs/03_implementation/runtime/006-runtime-services.md
```

---

# Scope

This document covers:

* the runtime `Pane` shape,
* Branch and Leaf Pane invariants,
* Pane split orientation,
* recursive Pane lookup,
* Pane splitting,
* Pane deletion and parent collapse,
* root Pane close behavior,
* stable Pane IDs,
* Pane ID allocation,
* non-reuse of deleted Pane IDs during one runtime,
* Pane persistence and restoration,
* transient render state,
* Workspace change notifications related to Pane operations,
* and the tests protecting those rules.

This document does not redefine:

* Buffer semantics,
* module component rendering,
* CSS Grid derivation,
* Pane dimensions,
* Domain behavior,
* Resource selection,
* or application persistence outside the Pane/Buffer Workspace snapshot.

Those concerns are documented separately.

---

# Important Files

The current Pane-tree implementation is concentrated in:

```text
src/lib/application/runtime/pane/models/pane.model.ts
src/lib/application/runtime/pane/models/pane-split.ts
src/lib/application/runtime/pane/persistence/pane-persistence.ts
src/lib/application/runtime/workspace/workspace-pane-tree.ts
src/lib/application/runtime/workspace/workspace-runtime.ts
```

Rendering uses:

```text
src/lib/application/runtime/pane/components/pane.svelte
```

The primary tests are:

```text
src/lib/application/runtime/workspace/workspace-pane-tree.spec.ts
src/lib/application/runtime/workspace/workspace-runtime.spec.ts
src/lib/application/runtime/pane/persistence/pane-persistence.spec.ts
```

---

# Current Pane Model

The runtime Pane interface is:

```typescript
export interface Pane {
    id: string | undefined;
    left: Pane | undefined;
    right: Pane | undefined;
    split: PaneSplit | undefined;
    buffer: Buffer | undefined;
    toggle?: boolean;
}
```

The same runtime object shape represents both Branch and Leaf Panes.

This is intentional for the current implementation because Pane-tree operations
mutate nodes in place between those two roles.

For example, splitting a Leaf Pane mutates that same object into a Branch Pane.
Deleting one child can then mutate the parent Branch back into a Leaf Pane.

A discriminated immutable hierarchy would require a materially different tree
update model and is not part of the current runtime.

---

# Pane Types

There are two conceptual Pane types.

```text
Pane
    ├── Branch Pane
    └── Leaf Pane
```

## Leaf Pane

A Leaf Pane is a visible Workspace region.

Its required runtime state is:

```text
id
buffer
```

and structurally:

```text
left  = undefined
right = undefined
split = undefined
```

Conceptually:

```text
Leaf Pane "a"
    ↓
Buffer
    ↓
Module Instance
```

Only Leaf Panes have stable Pane IDs and directly participate in visible
Workspace rendering.

## Branch Pane

A Branch Pane describes a split between two child Panes.

Its required runtime state is:

```text
split
left
right
```

and conceptually:

```text
id     = undefined
buffer = undefined
```

Conceptually:

```text
Branch Pane
    ├── Left Pane
    └── Right Pane
```

The child labels `left` and `right` identify tree positions. Their final visual
arrangement depends on `split`.

---

# Structural Invariants

The runtime expects these invariants:

```text
Leaf Pane
    id     = string
    buffer = Buffer
    left   = undefined
    right  = undefined
    split  = undefined

Branch Pane
    id     = undefined
    buffer = undefined
    left   = Pane
    right  = Pane
    split  = PaneSplit
```

Some transient runtime objects may temporarily contain stale values during
in-place mutation, but persistence and layout logic operate on the structural
shape above.

Persistence is stricter than the loose TypeScript interface. Invalid branches
and invalid leaves are rejected when serialized or restored.

---

# Split Orientation

Split direction is represented by:

```typescript
export enum PaneSplit {
    HORIZONTAL = 'h',
    VERTICAL = 'v'
}
```

The short persisted values are part of the current Workspace persistence
format:

```text
h = horizontal split
v = vertical split
```

The Pane tree stores the logical split direction. The Grid/layout layer decides
how that split becomes rows, columns, areas, and dimensions.

---

# Recursive Pane Lookup

Low-level lookup lives in:

```text
workspace-pane-tree.ts
```

with:

```typescript
findPane(
    pane: Pane,
    paneID: string
): Pane | undefined
```

The search is recursive:

```text
current Pane
    ↓
id matches?
    ├── yes → return Pane
    └── no
         ↓
       search left
         ↓
       search right
```

Only Leaf Panes normally have IDs, so Branch Panes are traversal nodes rather
than normal lookup targets.

`WorkspaceRuntime.findPane()` is the application-facing runtime operation and
delegates to this tree function.

---

# Pane Identity Is Stable; Pane Object References Are Not

A critical learned behavior is:

> `paneID` is stable rendering identity; a particular `Pane` object reference is
> not guaranteed to remain the object representing that identity after tree
> mutation.

This matters because split mutates the target leaf object into a Branch Pane.
The original Leaf Pane state is copied into a new left child that retains the
same Pane ID.

Before split:

```text
root object
    id = a
    buffer = Buffer A
```

After split:

```text
same root object
    id = undefined
    split = v

    left child
        id = a
        buffer = Buffer A

    right child
        id = b
        buffer = Buffer B
```

The visible Pane identity `a` survived, but the JavaScript object carrying that
identity changed.

This is why `pane.svelte` re-resolves the Pane through:

```typescript
workspaceRuntime.findPane(paneID)
```

rather than assuming a previously captured Pane reference is permanently
current.

---

# Splitting a Pane

The public operation is:

```typescript
WorkspaceRuntime.splitPane(
    paneID,
    split,
    module,
    bag
)
```

At a high level:

```text
find target Leaf Pane
    ↓
allocate new Pane ID
    ↓
create related Buffer for new Pane
    ↓
split Pane tree
    ↓
persist Workspace
    ↓
publish PANE_SPLIT
```

The low-level tree mutation is performed by:

```typescript
splitPane(...)
```

in `workspace-pane-tree.ts`.

---

# Split Mutation Algorithm

Given:

```text
Leaf Pane a
    Buffer A
```

and a new Pane ID `b`, splitting performs these mutations:

```text
1. Find Pane a.
2. Set the target object's split direction.
3. Move the old Leaf state into target.left.
4. Create target.right with Pane ID b and the new Buffer.
5. Clear target.id.
```

Conceptually:

```text
Before

Pane a
    Buffer A
```

becomes:

```text
After

Branch
    split = requested direction

    left
        Pane a
        Buffer A

    right
        Pane b
        Buffer B
```

The existing Pane remains on the left side of the split.

This preserves:

```text
original Pane ID
original Buffer
original toggle state
```

for the existing interaction.

---

# Why the Existing Pane Is Copied to the Left Child

The split operation intentionally preserves the existing interaction rather
than replacing it.

The target Pane's Buffer is copied into the new left child:

```text
original Pane a
    Buffer A
```

becomes:

```text
left child Pane a
    same Buffer A
```

The right child receives a new related Buffer.

This gives split the semantic meaning:

> Keep what the user is currently viewing and create another related region
> beside or below it.

Unrelated Pane and Buffer identities are not recreated.

---

# Related Buffer Creation During Split

`WorkspaceRuntime.splitPane()` requires the target Pane to contain a Buffer.

It creates the new Pane's Buffer through:

```typescript
this.buffers.related(
    module,
    pane.buffer,
    bag
)
```

This is significant because a split normally creates a related Module Instance
that should inherit the originating Buffer's Resource-selection context.

It does **not** reuse the originating Buffer identity.

The relationship is:

```text
Pane a
    Buffer A
        Resource selections A

split
    ↓

Pane a
    Buffer A

Pane b
    Buffer B
        new Buffer identity
        related Resource context
```

Buffer rules are documented in `005-buffer-contract.md`.

---

# Split Failure Behavior

Splitting returns `undefined` when the operation cannot be performed.

Current failure cases include:

```text
target Pane does not exist
target Pane has no Buffer
low-level split cannot locate the Pane
```

On failure, the Workspace is not persisted and no Workspace change is
published.

The runtime therefore does not partially announce a split that did not occur.

---

# Pane ID Allocation

Pane ID allocation is owned by `WorkspaceRuntime`.

Current Pane IDs are lowercase alphabetic sequences:

```text
a
b
c
...
z
aa
ab
...
```

The runtime first collects all current Pane IDs into an allocation set.

It then finds the highest ID and increments it.

The ordering rule is:

```text
shorter IDs first
then lexical order among equal-length IDs
```

So:

```text
z → aa
```

rather than wrapping back to `a`.

---

# Pane IDs Are Not Reused During One Runtime

`WorkspaceRuntime` keeps:

```typescript
private readonly allocatedPaneIDs =
    new Set<string>();
```

Before split or delete operations, the runtime records the currently active Pane
IDs in that set.

Deleted Pane IDs remain in the set.

Therefore:

```text
create c
    ↓
delete c
    ↓
next allocation = d
```

not:

```text
next allocation = c
```

This is deliberate.

Reusing a recently deleted Pane ID can cause Svelte to associate a newly created
Pane with DOM/runtime state belonging to the old Pane.

The high-water allocation strategy preserves stable page-lifetime identity.

---

# Pane Deletion

Structural deletion is implemented by:

```typescript
deletePane(
    rootPane,
    paneID
)
```

in `workspace-pane-tree.ts`.

The deletion rule is:

> Remove the targeted Leaf Pane and collapse only the immediate parent by
> promoting the sibling into the parent's position.

This preserves the smallest possible mutation around the deleted Pane.

---

# Delete Mutation Algorithm

Consider:

```text
Branch
    left  = Pane a
    right = Pane b
```

Deleting `a` does not leave an empty child.

Instead the right sibling is promoted into the parent object:

```text
Before

Branch
    Pane a
    Pane b
```

```text
Delete a
```

```text
After

Pane b
```

The same works symmetrically when deleting the right child.

---

# `collapseInto()`

The low-level helper is:

```typescript
collapseInto(
    target,
    sibling
)
```

There are two cases.

## Sibling is a Leaf

The parent Branch becomes that Leaf:

```text
target.id     = sibling.id
target.buffer = sibling.buffer
target.toggle = sibling.toggle
target.split  = undefined
target.left   = undefined
target.right  = undefined
```

## Sibling is a Branch

The sibling Branch is promoted into the target:

```text
target.split = sibling.split
target.left  = sibling.left
target.right = sibling.right
```

This avoids rebuilding unrelated descendants.

---

# Nested Delete Behavior

Deletion recursively searches Branch Panes.

If the target is nested, only the target's immediate parent collapses.

Example:

```text
root
    left = a
    right = branch
        left = b
        right = c
```

Deleting `b` becomes:

```text
root
    left = a
    right = c
```

The root split and unrelated Pane `a` remain intact.

This minimum-mutation behavior is protected by unit tests.

---

# Deleting a Pane Through `WorkspaceRuntime`

The public runtime operation performs more than the structural tree mutation.

Current flow:

```text
track current Pane IDs
    ↓
delete Pane from tree
    ↓
unsubscribe deleted Pane from dimension notifications
    ↓
persist Workspace
    ↓
publish PANE_DELETED
```

The published change is:

```typescript
{
    type: WorkspaceChangeType.PANE_DELETED,
    deletedPaneID
}
```

Consumers can then update presentation state such as retained deleted Pane IDs
or other rendering bookkeeping.

---

# The Sole Root Pane Is Not Structurally Deleted

A Workspace must continue to have a root Pane.

Therefore low-level `deletePane()` refuses to structurally remove the sole root
Leaf Pane.

`WorkspaceRuntime.closePane()` handles this case specially.

If the target is the only root Leaf Pane:

```text
close Pane
    ↓
replace its Buffer with Modules.MODULES
```

instead of deleting the Pane itself.

This preserves:

```text
root Pane identity
Workspace structure
Pane dimension subscription
```

while returning the visible region to the Modules view.

---

# Closing vs Deleting

The distinction is:

```text
closePane(paneID)
    = user-facing close behavior

    sole root Pane
        → replace Buffer with Modules.MODULES

    non-root / multi-Pane Workspace
        → structurally delete Pane
```

Whereas:

```text
deletePane(paneID)
    = structural Pane-tree operation
```

Normal UI code should prefer the user-facing runtime operation appropriate to
its intent rather than manipulating the Pane tree directly.

---

# Buffer Replacement Does Not Change Pane Identity

Changing the Module shown in one visible region is not a Pane-tree mutation.

`WorkspaceRuntime.replaceBuffer()`:

```text
find existing Pane by paneID
    ↓
create related or independent Buffer
    ↓
assign pane.buffer
    ↓
flip pane.toggle
    ↓
persist Workspace
    ↓
publish PANE_BUFFER_REPLACED
```

The Pane ID remains unchanged.

Conceptually:

```text
Pane a
    Buffer A
```

becomes:

```text
Pane a
    Buffer B
```

This distinction is fundamental:

```text
Pane identity
    = visible Workspace region

Buffer identity
    = active Module interaction in that region
```

---

# `toggle` Is Transient Rendering State

`Pane.toggle` is not part of the conceptual Pane tree and is not persisted.

It exists because changing only the underlying Buffer has historically not
always caused Svelte to recreate the module component correctly.

The observed failure included stale module-local UI after Bible chapter
navigation and text-markup/annotation changes.

Current behavior:

```text
replace Buffer
    ↓
pane.toggle = !pane.toggle
    ↓
pane.svelte renders through the opposite branch
    ↓
module component is recreated
```

The two rendering branches intentionally look redundant.

They are a compatibility workaround and should not be casually simplified.

The rule is:

> Keep `toggle` until the underlying Svelte component-recreation behavior is
> understood and a replacement is proven by browser behavior.

---

# `toggle` Is Preserved Through Structural Mutation

Although `toggle` is transient and not persisted, split/delete operations must
preserve it for a surviving Leaf Pane during the current runtime.

When splitting:

```text
old leaf toggle
    ↓
left child toggle
```

When collapsing a sibling Leaf during delete:

```text
sibling toggle
    ↓
parent-now-leaf toggle
```

This prevents a structural Workspace operation from accidentally changing the
render-recreation state of a surviving Pane.

---

# Workspace Change Notifications

Pane-related Workspace changes are represented by:

```typescript
export enum WorkspaceChangeType {
    PANE_SPLIT = 'pane-split',
    PANE_DELETED = 'pane-deleted',
    PANE_BUFFER_REPLACED = 'pane-buffer-replaced'
}
```

The payloads are intentionally small:

```text
PANE_SPLIT
    newPaneID

PANE_DELETED
    deletedPaneID

PANE_BUFFER_REPLACED
    paneID
```

Subscribers use stable IDs rather than receiving mutable Pane objects.

This reinforces the identity rule that runtime consumers should re-resolve Pane
state when needed.

---

# Pane Persistence

Workspace persistence stores the recursive logical Pane structure plus
persistable Buffer state.

It does **not** persist framework-specific/transient rendering state.

Persisted Pane types are:

```typescript
export interface PersistedLeafPane {
    id: string;
    buffer: PersistedBuffer;
}

export interface PersistedBranchPane {
    split: PaneSplit;
    left: PersistedPane;
    right: PersistedPane;
}
```

This is stricter than the runtime interface.

A persisted Pane is explicitly either:

```text
Leaf
    id
    buffer
```

or:

```text
Branch
    split
    left
    right
```

---

# Persistence Excludes Transient State

Serialization intentionally excludes:

```text
toggle
Pane dimension subscriptions
Workspace change subscribers
rendered components
CSS Grid state
```

Only the logical Workspace structure and Buffer restoration state are stored.

For example, even if a runtime Branch object contains stale `buffer` or
`toggle` values, branch serialization writes only:

```text
split
left
right
```

This keeps the persisted format aligned with the conceptual tree rather than
with incidental in-memory fields.

---

# Pane Restore

Restoration recursively rebuilds runtime Pane objects.

A persisted Branch restores as:

```text
id     = undefined
split  = persisted split
left   = restored left
right  = restored right
buffer = undefined
toggle = undefined
```

A persisted Leaf restores as:

```text
id     = persisted id
split  = undefined
left   = undefined
right  = undefined
buffer = restored Buffer
toggle = undefined
```

`toggle` starts unset because it is render-lifecycle state rather than saved
Workspace state.

---

# Persistence Validation

The persistence boundary rejects malformed Pane structures.

Examples include:

```text
Branch with only one child
Branch with unsupported split value
Leaf with missing/empty id
Leaf with missing Buffer
```

This matters because the runtime `Pane` interface permits optional fields for
in-place mutation, while persisted Workspace state must describe a complete
valid tree.

Persistence therefore acts as a structural validation boundary.

---

# Legacy Buffer Compatibility

Pane restoration delegates Buffer restoration to the Buffer persistence
boundary.

That layer intentionally accepts older persisted Buffer fields that are no
longer part of the current runtime contract, including historical fields such
as:

```text
name
selected
```

Unknown legacy fields do not become active Pane state again.

This permits existing Workspace data to restore while keeping the current
runtime model clean.

See `005-buffer-contract.md` for Buffer compatibility rules.

---

# Pane Tree and Layout Are Separate Responsibilities

The Pane tree is the logical Workspace structure.

It does not itself generate CSS Grid values.

The boundary is:

```text
recursive Pane tree
    ↓
deriveWorkspaceLayout()
    ↓
flattened active Pane IDs
CSS grid-template-areas
CSS grid-template-columns
Pane dimensions
```

This separation allows tree algorithms to be tested independently from layout
projection.

Grid behavior is documented in `003-grid-layout.md`.

---

# Pane Tree and Rendering Are Separate Responsibilities

The Pane tree also does not directly render Svelte components.

Current rendering uses:

```text
Pane tree
    ↓
layout projection
    ↓
active Leaf Pane IDs
    ↓
PaneContainer(paneID)
    ↓
WorkspaceRuntime.findPane(paneID)
```

The renderer is therefore identity-driven rather than recursively mirroring
runtime Pane objects into nested Svelte Pane components.

That behavior is documented in `004-rendering-engine.md`.

---

# Mutation Ownership

Low-level pure-ish tree mechanics live in:

```text
workspace-pane-tree.ts
```

They know how to:

```text
find
split
delete/collapse
```

They do not own:

```text
Buffer creation
Pane ID allocation
persistence
Workspace notifications
dimension subscriptions
user-facing close policy
```

Those responsibilities belong to `WorkspaceRuntime`.

This boundary is important.

The intended dependency flow is:

```text
UI / Module intent
    ↓
WorkspaceRuntime
    ↓
workspace-pane-tree helpers
    ↓
mutated Pane tree
```

UI code should not call tree helpers directly.

---

# Why Tree Helpers Remain Separate

Keeping tree mutation separate from runtime orchestration gives two useful test
levels.

## Tree algorithm tests

`workspace-pane-tree.spec.ts` verifies:

```text
recursive find
split shape
original Buffer preservation
toggle preservation
left/right delete collapse
nested delete behavior
branch promotion
sole-root structural delete refusal
```

These tests do not need application persistence or Buffer factories.

## Runtime orchestration tests

`workspace-runtime.spec.ts` verifies:

```text
related Buffer creation
Pane ID allocation
non-reuse of deleted IDs
z → aa allocation
Workspace persistence
Workspace change publication
dimension unsubscribe on delete
sole-root close behavior
Buffer replacement/toggle behavior
```

Separating these levels makes failures easier to localize.

---

# Stable-ID Invariants

The current implementation depends on these identity invariants:

```text
1. Every active Leaf Pane has one non-empty Pane ID.
2. Branch Panes do not use Pane IDs as visible identities.
3. A split preserves the existing Pane ID for the existing interaction.
4. A split creates exactly one new Pane ID.
5. Deleting a Pane removes that identity from the active tree.
6. Deleted Pane IDs are not reused during the current runtime.
7. Replacing a Buffer does not change the Pane ID.
8. Rendering consumers should resolve by paneID instead of retaining stale Pane objects.
```

Violating these rules risks incorrect DOM reuse, stale rendering state, or
incorrect module/resource context.

---

# Structural Invariants

The tree must also preserve:

```text
1. Every Branch has exactly two children.
2. Every Branch has a valid PaneSplit.
3. Every persisted Leaf has one Buffer.
4. Deleting one child promotes its sibling rather than leaving an empty Branch.
5. Nested deletion mutates only the minimum surrounding structure.
6. The Workspace always retains a root Pane.
```

These rules are enforced across runtime behavior and persistence validation.

---

# Anti-Patterns

Do not reintroduce the following patterns.

## Do not treat Pane object reference as identity

Incorrect:

```text
capture Pane object once
    ↓
assume it still represents paneID after split/delete
```

Prefer:

```typescript
workspaceRuntime.findPane(paneID)
```

when current Pane state is required.

## Do not allocate Pane IDs in Svelte components

ID allocation belongs to `WorkspaceRuntime` because it must account for current
and previously allocated IDs.

## Do not mutate the Pane tree directly from modules

Modules should request Workspace behavior through runtime/application
capabilities.

## Do not reuse deleted Pane IDs during the current page lifetime

The current allocator deliberately retains them.

## Do not persist `toggle`

It is transient rendering state.

## Do not remove the duplicate `pane.svelte` toggle branches as cosmetic cleanup

They currently force module component recreation after Buffer replacement.

## Do not rebuild the entire tree for a local delete

Current delete semantics collapse only the immediate parent and preserve
unrelated identities/state.

## Do not turn the sole root Pane into `undefined`

Closing the only Pane replaces its Buffer instead.

---

# Adding a New Pane Operation

When introducing a new Workspace operation involving Panes, use this decision
path.

```text
Is this only a tree-shape transformation?
    ↓ yes
add/test a low-level helper in workspace-pane-tree.ts

Does it also require Buffer creation, persistence, IDs, notifications,
or UI policy?
    ↓ yes
orchestrate it in WorkspaceRuntime
```

Then verify:

```text
stable Pane IDs
Buffer preservation or intentional replacement
Resource-selection semantics
minimum tree mutation
persistence behavior
Workspace change notification
Pane dimension subscription cleanup
rendering/toggle behavior
```

Do not add tree behavior directly to `+page.svelte` or module components.

---

# Debugging Pane-Tree Problems

When a Pane operation behaves incorrectly, debug in this order.

## 1. Inspect the logical tree

Check:

```text
id
split
left
right
buffer
```

Determine whether the target is currently a Leaf or Branch.

## 2. Verify stable Pane ID

Confirm the rendered `paneID` still exists through:

```typescript
workspaceRuntime.findPane(paneID)
```

Do not infer this from an old Pane object reference.

## 3. Verify the low-level tree mutation

For split:

```text
existing state moved to left child?
new Pane created on right?
old ID preserved?
```

For delete:

```text
correct immediate parent collapsed?
correct sibling promoted?
unrelated subtree untouched?
```

## 4. Verify WorkspaceRuntime orchestration

Check:

```text
Buffer factory call
Pane ID allocation
persistence call
Workspace change publication
dimension unsubscribe
```

## 5. Verify rendering refresh

If the logical tree is correct but UI is stale, inspect:

```text
Workspace change subscription
layout derivation
active Pane IDs
Pane dimension publication
pane.toggle behavior
```

The rendering issue may be outside the Pane-tree algorithm itself.

---

# Test Coverage

The current tests intentionally protect the Pane-tree contract.

Important coverage includes:

```text
finds root and nested Panes by stable ID
splits a Leaf while preserving its Buffer and toggle
refuses unknown split targets
collapses left deletion into right sibling
collapses right deletion into left sibling
promotes sibling Branches
collapses only the immediate parent for nested delete
refuses structural deletion of sole root Leaf
creates related Buffers during split
persists successful operations
does not persist missing-target operations
does not reuse deleted Pane IDs
allocates z → aa correctly
unsubscribes deleted Pane dimensions
replaces sole root Buffer rather than deleting root
serializes only logical Pane/Buffer state
restores recursive Pane structure
rejects malformed persisted branches and splits
```

Changes to split/delete/identity behavior should update or extend these tests
before changing the documented invariants.

---

# High-Level Flow Summary

The current Pane-tree lifecycle is:

```text
Application startup
    ↓
WorkspaceRuntime.initialize()
    ↓
restore Pane tree OR create default root Buffer
    ↓
Pane tree becomes logical Workspace structure
    ↓
user requests split / close / module transition
    ↓
WorkspaceRuntime coordinates operation
    ↓
workspace-pane-tree mutates structural state when needed
    ↓
Workspace is persisted
    ↓
Workspace change is published
    ↓
layout/rendering re-resolves active Pane IDs
    ↓
PaneContainer resolves current Pane by stable paneID
```

---

# Big Takeaway

The Pane tree is a small mutable recursive model with strict identity semantics.

Its design can be summarized as:

```text
Branch Pane
    = structural relationship

Leaf Pane
    = stable visible region

Pane ID
    = stable Leaf identity

Buffer
    = Module interaction displayed in that Leaf

WorkspaceRuntime
    = owner of Pane operations and policy

workspace-pane-tree
    = low-level structural mutation
```

The most important practical rule is:

> Preserve Pane IDs and re-resolve Pane objects after tree mutation.

That rule is what allows the runtime to split and collapse a mutable tree while
keeping visible interactions, Buffer state, Resource context, and Svelte
rendering stable.
