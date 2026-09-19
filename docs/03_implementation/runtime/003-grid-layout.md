# Grid Layout

## Status

Current

---

# Purpose

This document describes the concrete layout-projection implementation used by
KJVOnly.bible to turn the recursive Workspace Pane tree into the CSS Grid
presentation consumed by the root page.

The Pane tree is the logical Workspace structure.

The grid layout is derived presentation state.

The relationship is:

```text
WorkspaceRuntime
    ↓
recursive Pane tree
    ↓
deriveWorkspaceLayout(...)
    ↓
rectangular grid-area matrix
    ├── active Pane IDs
    ├── Pane dimensions
    └── CSS Grid template
    ↓
+page.svelte
    ↓
PaneContainer per active Leaf Pane
```

The most important implementation rule is:

> Layout derivation never becomes a second authoritative Workspace model.

Every grid representation is reconstructed from the current Pane tree. Splits,
deletes, Buffer replacement, Pane identity, and persistence remain owned by the
Workspace Runtime and Pane tree.

Related documents:

```text
docs/01_application-architecture/002-workspace-runtime.md
docs/01_application-architecture/003-runtime-rendering.md
docs/03_implementation/runtime/001-root-runtime.md
docs/03_implementation/runtime/002-pane-tree.md
docs/03_implementation/runtime/004-rendering-engine.md
docs/03_implementation/runtime/005-buffer-contract.md
docs/03_implementation/runtime/006-runtime-services.md
```

---

# Scope

This document covers:

* projecting Branch and Leaf Panes into a rectangular matrix,
* horizontal and vertical split semantics,
* normalization of differently-shaped child matrices,
* the GCD-based repeat calculations used during normalization,
* preserving local split proportions,
* deriving active Pane IDs,
* sorting Pane IDs in runtime identity order,
* deriving per-Pane width and height fractions,
* rendering CSS `grid-template-areas`,
* rendering equal CSS Grid columns,
* publishing derived Pane dimensions,
* consuming Pane dimensions in `pane.svelte`,
* deleted-Pane ID retention at the presentation boundary,
* Workspace change events that trigger layout recalculation,
* and the tests protecting these rules.

This document does not redefine:

* Pane-tree mutation,
* Pane ID allocation,
* Buffer creation,
* module component resolution,
* Resource selection,
* Domain behavior,
* or Workspace persistence.

Those concerns are documented separately.

---

# Important Files

The core layout implementation lives in:

```text
src/lib/application/runtime/workspace/workspace-grid.ts
src/lib/application/runtime/workspace/workspace-layout.ts
src/lib/application/runtime/workspace/workspace-runtime.ts
```

The root presentation consumes the layout in:

```text
src/routes/+page.svelte
```

Per-Pane dimension consumption occurs in:

```text
src/lib/application/runtime/pane/components/pane.svelte
```

Dimension publication is currently delegated through:

```text
src/lib/application/services/pane.service.svelte.ts
```

but that service is intentionally hidden behind `WorkspaceRuntime`.

The primary tests are:

```text
src/lib/application/runtime/workspace/workspace-grid.spec.ts
src/lib/application/runtime/workspace/workspace-layout.spec.ts
src/lib/application/runtime/workspace/workspace-runtime.spec.ts
```

---

# High-Level Layout Flow

The current layout flow is:

```text
Pane tree changes
    ↓
WorkspaceRuntime publishes structural change
    ↓
+page.svelte receives change
    ↓
workspaceRuntime.deriveLayout()
    ↓
deriveWorkspaceLayout(rootPane)
    ↓
renderGridTemplateAreas(rootPane)
    ↓
rectangular string[][] matrix
    ↓
collect active Pane IDs
    ↓
derive Pane dimensions
    ↓
render CSS Grid template
    ↓
+page.svelte updates root grid
    ↓
workspaceRuntime.publishPaneDimensions(...)
    ↓
Pane components update width/height
```

Layout is therefore recalculated after structural changes rather than mutated
incrementally as a separate model.

---

# Source of Truth

The recursive Pane tree is the source of truth.

For example:

```text
Branch V
    ├── Leaf a
    └── Branch H
        ├── Leaf b
        └── Leaf c
```

contains the full logical information needed to derive the visible layout.

The layout implementation does not persist a separate matrix describing that
structure.

Instead, the matrix is reconstructed when needed:

```typescript
const layout =
    deriveWorkspaceLayout(
        rootPane
    );
```

This keeps the dependency direction simple:

```text
Pane tree
    ↓
Layout
```

and prevents:

```text
Pane tree ↔ Layout model
```

from becoming two mutable representations that must remain synchronized.

---

# Split Semantics

The current split enum is:

```typescript
export enum PaneSplit {
    HORIZONTAL = 'h',
    VERTICAL = 'v'
}
```

The names describe the dividing line.

## Vertical split

A vertical divider places children beside one another:

```text
┌─────────┬─────────┐
│  left   │  right  │
└─────────┴─────────┘
```

For Leaf Panes `a` and `b`:

```text
Branch V
    ├── a
    └── b
```

produces:

```typescript
[
    ['a', 'b']
]
```

## Horizontal split

A horizontal divider places the first child above the second:

```text
┌───────────────────┐
│       top         │
├───────────────────┤
│      bottom       │
└───────────────────┘
```

The implementation still stores those children in the generic tree fields:

```text
left
right
```

but for a horizontal split they are interpreted visually as:

```text
left  → top
right → bottom
```

For Leaf Panes `a` and `b`:

```typescript
[
    ['a'],
    ['b']
]
```

is produced.

---

# Grid Matrix Representation

`renderGridTemplateAreas()` produces a two-dimensional array of Pane IDs.

Example:

```typescript
[
    ['a', 'b'],
    ['d', 'c']
]
```

Each array element represents one equal logical grid cell.

Repeated Pane IDs mean that one Pane occupies multiple cells.

For example:

```typescript
[
    ['a', 'b'],
    ['a', 'c']
]
```

means:

```text
Pane a
    occupies both rows of the left half

Pane b
    occupies the upper-right quarter

Pane c
    occupies the lower-right quarter
```

Conceptually:

```text
┌─────────┬─────────┐
│         │    b    │
│    a    ├─────────┤
│         │    c    │
└─────────┴─────────┘
```

The matrix is useful because CSS `grid-template-areas` uses the same conceptual
representation.

---

# Recursive Projection

The projection begins in:

```typescript
renderGridTemplateAreas(
    pane
)
```

The recursion has two cases.

## Leaf case

A Leaf Pane becomes a `1 × 1` matrix:

```typescript
return [[pane.id]];
```

For Pane `a`:

```typescript
[
    ['a']
]
```

## Branch case

A Branch Pane recursively renders both child subtrees:

```text
Branch
    ├── render left subtree
    └── render right subtree
```

and then joins those child matrices according to the Branch split direction.

Conceptually:

```text
left Pane subtree
    ↓
left matrix

right Pane subtree
    ↓
right matrix

left matrix + right matrix + split direction
    ↓
joined matrix
```

Because the two child subtrees can have different numbers of rows and columns,
they must sometimes be normalized before they can be joined into one rectangle.

---

# Why Matrix Normalization Is Necessary

Nested Pane trees do not automatically produce child matrices with compatible
shapes.

For example, one side of a vertical split might be:

```typescript
[
    ['a'],
    ['d']
]
```

while the other side might be:

```typescript
[
    ['b']
]
```

The two sides cannot be concatenated row-by-row until they contain the same
number of rows.

The correct equivalent expansion is:

```typescript
left = [
    ['a'],
    ['d']
]

right = [
    ['b'],
    ['b']
]
```

so the result can become:

```typescript
[
    ['a', 'b'],
    ['d', 'b']
]
```

The repetition does not create another Pane.

It means the same Pane occupies multiple logical grid cells.

---

# Minimal Common Subdivision

The implementation normalizes matrices by repeating cells and rows according to
ratios derived from the greatest common divisor.

For dimensions `a` and `b`, the familiar relationship is:

```text
LCM(a, b) = a × b / GCD(a, b)
```

The code does not calculate an explicit LCM value first. Instead, it calculates
repeat factors such as:

```typescript
rightNumCols /
    gcd(
        rightNumCols,
        leftNumCols
    )
```

and:

```typescript
leftNumCols /
    gcd(
        leftNumCols,
        rightNumCols
    )
```

Those factors expand each child to the smallest compatible common subdivision.

That matters because an unnecessarily large matrix would still describe the
same visual layout but would:

* create more repeated cells,
* make tests harder to understand,
* inflate dimension calculations,
* and obscure the structural proportions represented by the tree.

The current implementation therefore aims for the minimal equivalent
rectangular matrix required to combine the two child layouts.

---

# Vertical Join

Vertical joins are implemented by:

```text
joinVerticalGridTemplateAreas(...)
```

A vertical split must place two child matrices side by side.

That requires both child matrices to have:

```text
the same number of rows
```

before their rows can be concatenated.

The implementation also normalizes each child matrix's column subdivision so
nested internal proportions remain representable after the join.

The broad steps are:

```text
left child matrix
right child matrix
    ↓
calculate row repeat factors
    ↓
calculate column repeat factors
    ↓
expand left matrix
    ↓
expand right matrix
    ↓
concatenate matching rows
```

Example:

```text
left child
    a
    d

right child
    b
```

normalizes to:

```text
left     right
 a         b
 d         b
```

and joins to:

```typescript
[
    ['a', 'b'],
    ['d', 'b']
]
```

The right Pane remains one Pane. Its ID is repeated because it occupies both
rows.

---

# Horizontal Join

Horizontal joins are implemented by:

```text
joinHorizontalGridTemplateAreas(...)
```

A horizontal split stacks one child matrix above the other.

That requires both child matrices to have:

```text
the same number of columns
```

before their rows can be stacked into one matrix.

The broad steps are:

```text
top child matrix
bottom child matrix
    ↓
calculate row repeat factors
    ↓
calculate column repeat factors
    ↓
expand top matrix
    ↓
expand bottom matrix
    ↓
append top rows
    ↓
append bottom rows
```

Example:

```typescript
top = [
    ['a', 'b']
]

bottom = [
    ['c']
]
```

must normalize the bottom half to two columns:

```typescript
bottom = [
    ['c', 'c']
]
```

The combined result is:

```typescript
[
    ['a', 'b'],
    ['c', 'c']
]
```

Again, repeated IDs mean occupied area, not duplicated Runtime Objects.

---

# Local Split Semantics

A central layout invariant is:

> Splitting one Pane subdivides only that Pane's existing region.

It must not rebalance unrelated sibling Panes.

Suppose the Workspace begins with:

```text
┌─────────┬─────────┐
│    a    │    b    │
└─────────┴─────────┘
```

Splitting `b` horizontally should produce:

```text
┌─────────┬─────────┐
│         │    b    │
│    a    ├─────────┤
│         │    c    │
└─────────┴─────────┘
```

not three globally equal regions.

The matrix becomes:

```typescript
[
    ['a', 'b'],
    ['a', 'c']
]
```

Pane `a` still owns half the Workspace.

Only the right half has been subdivided.

This rule is why matrix normalization repeats Pane IDs instead of simply
creating one row or column per active Pane.

---

# Deeply Nested Example

The tests include a nested structure equivalent to:

```text
Vertical
├── Horizontal
│   ├── a
│   └── Horizontal
│       ├── d
│       └── e
└── Horizontal
    ├── b
    └── c
```

The resulting minimal grid is:

```typescript
[
    ['a', 'b'],
    ['a', 'b'],
    ['d', 'c'],
    ['e', 'c']
]
```

The proportions represented by that matrix are:

```text
a = width 1/2, height 1/2
b = width 1/2, height 1/2
c = width 1/2, height 1/2
d = width 1/2, height 1/4
e = width 1/2, height 1/4
```

The matrix does not attempt to make all five Panes equal.

It preserves the recursive split history encoded by the Pane tree.

---

# Complex Child Normalization

`workspace-grid.spec.ts` also protects cases where both children already
contain complex nested layouts.

The purpose of those tests is not merely to verify one visual example.

They protect the more general invariant:

> Any two valid rectangular child projections must be expandable into
> compatible dimensions without inventing or dropping Pane IDs.

For a vertical join:

```text
child row counts
    → normalized to a compatible common row count

child internal column subdivisions
    → expanded as required

matching rows
    → concatenated
```

For a horizontal join:

```text
child column counts
    → normalized to a compatible common column count

child internal row subdivisions
    → expanded as required

rows
    → stacked
```

These tests are especially important because simple two-Pane examples will not
exercise the normalization arithmetic.

---

# WorkspaceLayout Contract

`deriveWorkspaceLayout()` returns:

```typescript
export interface WorkspaceLayout {
    activePaneIDs: string[];
    gridTemplateAreas: string[][];
    paneDimensionsByID:
        WorkspacePaneDimensionsByID;
    template: string;
}
```

Each field serves a separate presentation need.

## `gridTemplateAreas`

The normalized logical matrix derived from the Pane tree.

Example:

```typescript
[
    ['a', 'b'],
    ['a', 'c']
]
```

## `activePaneIDs`

The unique active Leaf Pane IDs found in the matrix.

Example:

```typescript
[
    'a',
    'b',
    'c'
]
```

## `paneDimensionsByID`

Fractional width and height for every active Leaf Pane.

Example:

```typescript
{
    a: {
        width: 0.5,
        height: 1
    },
    b: {
        width: 0.5,
        height: 0.5
    },
    c: {
        width: 0.5,
        height: 0.5
    }
}
```

## `template`

The CSS fragment consumed by the root page.

It contains:

```text
display: grid
grid-template-columns
grid-template-areas
```

plus the current max-height rule.

---

# Layout Derivation Is Pure

`deriveWorkspaceLayout()` is intentionally pure with respect to runtime state.

It does not:

* mutate the Pane tree,
* save the Workspace,
* publish Workspace changes,
* publish Pane dimensions,
* retain deleted Pane IDs,
* or manipulate Svelte state.

Conceptually:

```text
Pane
    ↓
deriveWorkspaceLayout
    ↓
WorkspaceLayout
```

This makes the projection independently testable and keeps framework-specific
behavior outside the layout algorithm.

---

# Active Pane IDs

The active Pane IDs are collected directly from the grid matrix.

The implementation uses a `Set`:

```text
matrix cells
    ↓
unique Pane IDs
    ↓
Pane identity sort
```

Repeated cells therefore do not produce duplicate rendered Panes.

For:

```typescript
[
    ['a', 'b'],
    ['a', 'c']
]
```

active IDs are:

```typescript
[
    'a',
    'b',
    'c'
]
```

not:

```typescript
[
    'a',
    'b',
    'a',
    'c'
]
```

---

# Pane ID Ordering

Pane IDs use alphabetic sequence identity:

```text
a
b
...
z
aa
ab
...
```

Plain lexical sorting is therefore incorrect around sequence boundaries.

For example, lexical sorting can place:

```text
aa
```

before:

```text
z
```

although `aa` was allocated after `z`.

The runtime uses:

```typescript
sortPaneIDs(...)
```

which compares IDs through:

```text
alphabeticSequenceToNumber(...)
```

so:

```typescript
sortPaneIDs([
    'aa',
    'b',
    'z',
    'a'
])
```

returns:

```typescript
[
    'a',
    'b',
    'z',
    'aa'
]
```

This ordering is used both for active Pane IDs and for the page-level retained
ID list described later.

---

# Pane Dimension Derivation

The normalized matrix also provides enough information to derive each Pane's
fractional dimensions.

The type is:

```typescript
export interface WorkspacePaneDimensions {
    height: number;
    width: number;
}
```

and the complete mapping is:

```typescript
Record<
    string,
    WorkspacePaneDimensions
>
```

The values are fractions of the full viewport-oriented Workspace dimensions.

---

# Height Calculation

Height is calculated as:

```text
number of matrix rows occupied by Pane
──────────────────────────────────────
        total matrix row count
```

For:

```typescript
[
    ['a', 'b'],
    ['a', 'c']
]
```

Pane `a` occupies two of two rows:

```text
height = 2 / 2 = 1
```

Pane `b` occupies one row:

```text
height = 1 / 2 = 0.5
```

Pane `c` also has:

```text
height = 0.5
```

---

# Width Calculation

Width is calculated from the maximum number of cells occupied by a Pane in any
one row:

```text
maximum matching cells in one row
─────────────────────────────────
        total matrix columns
```

For:

```typescript
[
    ['a', 'a', 'b', 'b'],
    ['c', 'c', 'd', 'd']
]
```

Pane `a` occupies two of four columns:

```text
width = 2 / 4 = 0.5
```

The layout algorithm generated by the recursive Pane tree produces contiguous
rectangular Pane regions, so this calculation corresponds to the Pane's
horizontal span.

---

# Dimension Example

For:

```typescript
[
    ['a', 'b'],
    ['a', 'b'],
    ['d', 'c'],
    ['e', 'c']
]
```

there are:

```text
4 rows
2 columns
```

The dimensions are:

```typescript
{
    a: {
        height: 0.5,
        width: 0.5
    },
    b: {
        height: 0.5,
        width: 0.5
    },
    c: {
        height: 0.5,
        width: 0.5
    },
    d: {
        height: 0.25,
        width: 0.5
    },
    e: {
        height: 0.25,
        width: 0.5
    }
}
```

That expected result is protected directly by
`workspace-layout.spec.ts`.

---

# CSS Grid Template Rendering

The matrix is converted into CSS `grid-template-areas` text.

For:

```typescript
[
    ['a', 'b'],
    ['a', 'c']
]
```

the area rows become:

```css
"a b"
"a c"
```

The current generated template is conceptually:

```css
display: grid;
max-height: 100vh;
grid-template-columns: repeat(2, 1fr);

grid-template-areas:
    "a b"
    "a c";
```

The exact string is generated by:

```text
renderWorkspaceGridTemplate(...)
```

---

# CSS Grid Columns

Columns are generated by:

```typescript
renderGridTemplateColumns(
    gridTemplateAreas
)
```

The result is:

```text
repeat(<column count>, 1fr)
```

For a three-column matrix:

```css
grid-template-columns: repeat(3, 1fr);
```

Every logical matrix column therefore receives equal width.

Pane width differences come from occupying different numbers of those equal
columns.

This matches the recursive split model: normalization creates the required
common subdivision, and repeated IDs span the appropriate number of equal grid
columns.

---

# Row Height Handling

The generated root CSS template currently does not define an explicit
`grid-template-rows` expression analogous to the column expression.

Instead, the layout derives fractional Pane heights and publishes them to the
Pane presentations.

Each rendered Pane consumes those dimensions and applies viewport-relative
height and width styles.

This distinction matters when debugging layout:

```text
CSS grid matrix
    → controls area placement

published Pane dimensions
    → provide explicit Pane width/height presentation values
```

Do not assume all sizing is encoded only in the root CSS Grid template.

---

# WorkspaceRuntime Layout Boundary

Svelte consumers do not call the layout implementation through `PaneService`.

The public application-facing operation is:

```typescript
workspaceRuntime.deriveLayout()
```

which delegates to:

```typescript
deriveWorkspaceLayout(
    rootPane
)
```

This preserves the ownership relationship:

```text
Svelte
    ↓
WorkspaceRuntime
    ↓
layout projection
```

rather than:

```text
Svelte
    ↓
PaneService implementation
```

`PaneService` remains an internal state/persistence/dimension implementation
behind `WorkspaceRuntime`.

---

# Root Page Integration

`+page.svelte` owns the current presentation projection.

Its grid update flow is conceptually:

```typescript
const layout =
    workspaceRuntime.deriveLayout();

paneIds = sortPaneIDs(
    layout.activePaneIDs.concat(
        Object.keys(
            deletedPaneIds
        )
    )
);

template = layout.template;

workspaceRuntime.publishPaneDimensions(
    layout.paneDimensionsByID
);
```

That code performs three presentation actions:

```text
1. choose rendered Pane iteration order
2. apply the current root CSS Grid template
3. publish dimensions to Pane components
```

The page does not mutate the Pane tree while deriving layout.

---

# Workspace Changes That Recalculate Layout

The root page currently recalculates layout for structural changes:

```text
PANE_SPLIT
PANE_DELETED
```

These operations change the set or arrangement of visible Pane regions.

`PANE_BUFFER_REPLACED` does not require a grid recalculation because replacing a
Buffer changes what a Pane displays, not where the Pane exists.

The distinction is:

```text
Pane structure changes
    → recalculate grid

Pane Buffer changes
    → preserve grid
```

This separation is important for avoiding unnecessary layout work and for
keeping Module navigation independent from Workspace geometry.

---

# Split Layout Update

A split flow is:

```text
Module / UI requests split
    ↓
WorkspaceRuntime.splitPane(...)
    ↓
Pane tree mutates
    ↓
WorkspaceRuntime publishes PANE_SPLIT
    ↓
+page.svelte calls onGridUpdate()
    ↓
new matrix derived from updated tree
    ↓
CSS Grid and dimensions updated
```

The layout algorithm does not need to know which Pane changed.

It simply projects the current authoritative tree.

---

# Delete Layout Update

A delete flow is:

```text
Module / UI requests delete
    ↓
WorkspaceRuntime.deletePane(...)
    ↓
Pane tree collapses targeted parent
    ↓
WorkspaceRuntime publishes PANE_DELETED
    ↓
root page records deleted Pane ID
    ↓
onGridUpdate()
    ↓
new layout derived from surviving tree
```

The deleted Pane no longer appears in:

```text
activePaneIDs
gridTemplateAreas
paneDimensionsByID
```

but its ID can still remain in the page's presentation iteration list for the
DOM-retention behavior described below.

---

# Deleted Pane ID Retention

The root page maintains:

```typescript
let deletedPaneIds = ...;
```

When a Pane is deleted, its ID is retained for the lifetime of the page.

The visible Pane list is then built from:

```text
active Pane IDs
    +
retained deleted Pane IDs
```

and sorted in Pane identity order.

The template still comes only from active Panes.

Deleted Panes are not rendered because the template uses:

```svelte
{#if !deletedPaneIds[paneID]}
    ...PaneContainer...
{/if}
```

Why retain their IDs at all?

The `{#each}` block is position-sensitive. If a deleted earlier Pane simply
vanished from the iteration list, later entries could shift positions and cause
Svelte to reuse or recreate DOM/component state in undesirable ways.

Keeping the deleted identity as a non-rendered slot stabilizes the relative
iteration positions of later Pane IDs.

This behavior exists to preserve unaffected Pane presentation state such as
scroll position.

It is a presentation workaround, not part of the logical Workspace model.

Therefore:

```text
deletedPaneIds
```

must not be moved into:

```text
Pane persistence
Workspace tree
Buffer state
```

without a separate architectural reason.

---

# Pane Dimension Publication

After layout derivation, the root page publishes:

```typescript
workspaceRuntime.publishPaneDimensions(
    layout.paneDimensionsByID
);
```

`WorkspaceRuntime` stores the current dimension map through its internal Pane
state dependency and broadcasts it to registered Pane subscribers.

The public flow is:

```text
+page.svelte
    ↓
WorkspaceRuntime.publishPaneDimensions(...)
    ↓
internal Pane state
    ↓
Pane dimension subscribers
```

The root page therefore remains the place where derived presentation geometry
is turned into a presentation notification.

---

# Pane Dimension Subscription

Each rendered Pane presentation subscribes by stable `paneID`:

```typescript
workspaceRuntime.subscribeToPaneDimensions(
    paneID,
    updatePaneDimensions
)
```

It also reads the current dimensions immediately on mount:

```typescript
updatePaneDimensions(
    workspaceRuntime.getPaneDimensions()
);
```

This handles both:

```text
future dimension publications
```

and:

```text
layout already published before Pane mounted
```

The returned unsubscribe function must be called during component cleanup.

---

# Stable Pane Identity During Dimension Updates

`pane.svelte` does not trust a previously-held Pane object reference as the
long-term identity of the rendered region.

Instead, whenever dimensions are published it re-resolves:

```typescript
pane = workspaceRuntime.findPane(
    paneID
);
```

This is necessary because split/delete operations mutate the recursive tree and
can move the logical Leaf state into another object while preserving the same
Leaf Pane ID.

The important identity rule is:

```text
paneID
    = stable presentation identity

Pane object reference
    = mutable tree implementation reference
```

The grid layout and dimension maps are therefore keyed by `paneID`, not by Pane
object identity.

---

# Applying Pane Dimensions

The Pane presentation converts fractional dimensions into viewport-relative CSS
values:

```typescript
containerHeight =
    `height: ${height * 100}vh;`;

containerWidth =
    `width: ${width * 100}vw;`;
```

For:

```typescript
{
    width: 0.5,
    height: 0.25
}
```

that becomes conceptually:

```css
width: 50vw;
height: 25vh;
```

This sizing is derived from the Workspace matrix, not from Module content.

A Module should not calculate or publish its own Workspace Pane dimensions.

---

# Rendering Active Leaf Panes

The root page renders one Pane presentation for each active Pane ID:

```svelte
<div style="grid-area: {paneID};">
    <PaneContainer {paneID} />
</div>
```

The `grid-area` value matches the same Pane ID used in the generated matrix.

That gives a direct identity relationship:

```text
Leaf Pane ID
    ↓
grid matrix token
    ↓
CSS grid-area name
    ↓
PaneContainer paneID
```

No separate presentation ID mapping is required.

---

# Branch Panes Are Not Rendered

Branch Panes do not produce `PaneContainer` components.

Their only contribution to this stage is structural:

```text
split direction
left subtree
right subtree
```

which affects the derived grid matrix.

Conceptually:

```text
Branch Pane
    ↓
layout math only

Leaf Pane
    ↓
visible PaneContainer
```

This is why `activePaneIDs` are collected from matrix cell values: only Leaf
Pane IDs appear there.

---

# Single-Pane Layout

A Workspace containing only one Leaf Pane:

```text
Leaf a
```

projects to:

```typescript
[
    ['a']
]
```

with dimensions:

```typescript
{
    a: {
        width: 1,
        height: 1
    }
}
```

and CSS conceptually equivalent to:

```css
display: grid;
grid-template-columns: repeat(1, 1fr);
grid-template-areas:
    "a";
```

The layout engine therefore does not require a Branch root.

A restored or newly-created single-Pane Workspace uses exactly the same
projection pipeline as a deeply nested Workspace.

---

# Layout and Persistence

The derived layout is not persisted.

Persisted Workspace state contains the Pane tree and serializable Buffer state.

After restoration:

```text
persisted Pane tree
    ↓
restore
    ↓
deriveWorkspaceLayout(...)
    ↓
new presentation layout
```

This is intentional.

Persisting both the Pane tree and the grid matrix would duplicate the same
structural information and introduce consistency questions such as:

```text
What if restored Pane tree and restored matrix disagree?
```

The current design avoids that class of problem entirely.

---

# Layout and Buffer Replacement

A Buffer replacement does not change:

```text
Pane ID
Pane position
Pane split relationships
Pane dimensions
CSS grid areas
```

Therefore:

```text
WorkspaceChangeType.PANE_BUFFER_REPLACED
```

is handled by the Pane presentation for component refresh, not by the root grid
projection.

This reinforces the architectural separation:

```text
Workspace geometry
    = Pane tree concern

Module shown in region
    = Buffer concern
```

---

# Layout and Resource Selection

Grid derivation knows nothing about Resource selections.

`Buffer.resourceSelections` does not affect:

```text
grid rows
grid columns
Pane dimensions
Pane ordering
```

Similarly, layout derivation does not resolve:

```text
Bible version
Notes source
Strong's source
Reading Plan source
```

Those values belong to Module/Domain runtime context.

The only data the grid needs from the Workspace model is Pane structure and
Leaf Pane identity.

---

# Layout and Module Type

The layout engine is also independent of `Modules` values.

A Leaf Pane containing:

```text
Bible
```

and a Leaf Pane containing:

```text
Notes
```

participate in grid projection exactly the same way.

The projection only sees:

```text
Pane tree
Pane IDs
split directions
```

This means adding a new Module type requires no grid-layout change.

---

# Invalid Runtime Assumptions

The layout implementation assumes it receives a valid runtime Pane tree.

A valid Leaf Pane has:

```text
split = undefined
id    = defined
```

A valid Branch Pane has:

```text
split = defined
left  = defined
right = defined
```

The tree validation and mutation layers are responsible for preserving those
invariants.

The grid implementation is not intended to become another structural validator.

If invalid Pane data reaches `renderGridTemplateAreas()`, failures should be
traced back to Pane restoration or tree mutation rather than patched by making
the layout silently invent missing structure.

---

# Rectangular Matrix Invariant

Every completed grid projection must be rectangular:

```text
all rows have the same number of columns
```

This invariant is required by:

* CSS `grid-template-areas`,
* dimension calculation,
* row concatenation during vertical joins,
* and predictable Pane spans.

The normalization helpers exist specifically to preserve this property as
arbitrarily-shaped child subtrees are combined.

---

# Contiguous Pane Area Invariant

Because the matrix is produced from recursive rectangular subdivision, every
Pane ID represents one contiguous rectangular region.

The layout should never generate a shape like:

```typescript
[
    ['a', 'b'],
    ['c', 'a']
]
```

where `a` occupies disconnected diagonal cells.

That would not correspond to a valid Pane-tree subdivision and would also be
invalid for CSS named grid areas.

The recursive split construction naturally prevents such layouts.

---

# No Invented Pane IDs

Normalization may repeat IDs, but it must never invent new IDs.

For any layout:

```text
unique IDs in matrix
    =
active Leaf Pane IDs in Pane tree
```

A repeat operation may transform:

```typescript
['b']
```

into:

```typescript
['b', 'b']
```

but may not create a synthetic identity such as:

```text
b-2
```

or:

```text
__grid_filler__
```

Repeated Pane identity is the filler mechanism.

---

# No Global Rebalancing

The renderer must not derive dimensions from only the number of active Panes.

This would be incorrect:

```text
3 active Panes
    → each gets 1/3
```

because the Pane tree may represent:

```text
a = 1/2
b = 1/4
c = 1/4
```

The recursive split history determines the proportions.

The grid matrix preserves that history through repeated cells.

---

# Why Equal Grid Cells Work

The layout can use equal logical cells because normalization converts recursive
split ratios into occupancy counts.

For example:

```text
left half = one Pane a
right half = b over c
```

becomes:

```typescript
[
    ['a', 'b'],
    ['a', 'c']
]
```

All four logical cells are equal.

Pane `a` occupies two cells, giving it half the Workspace.

Panes `b` and `c` each occupy one cell, giving them one quarter each.

The recursive fractional relationships have therefore been encoded into integer
cell occupancy.

---

# Test Coverage

## Simple vertical split

`workspace-grid.spec.ts` verifies:

```text
vertical(a, b)
```

produces:

```typescript
[
    ['a', 'b']
]
```

This protects side-by-side semantics.

## Simple horizontal split

It verifies:

```text
horizontal(a, b)
```

produces:

```typescript
[
    ['a'],
    ['b']
]
```

This protects stacked semantics.

## Local subdivision

It verifies nested splits subdivide only the targeted subtree rather than
rebalancing every active Pane.

Expected example:

```typescript
[
    ['a', 'b'],
    ['a', 'b'],
    ['d', 'c'],
    ['e', 'c']
]
```

## Balanced nested splits

It verifies balanced child structures remain compact and no unnecessary Pane
IDs or cells are introduced.

## Complex vertical normalization

It verifies two already-complex child matrices can be normalized and joined
side-by-side while preserving every nested proportion.

## Complex horizontal normalization

It verifies the analogous stacked case.

## Dynamic CSS columns

It verifies a matrix with three columns produces:

```text
repeat(3, 1fr)
```

rather than relying on an old fixed column count.

---

# Workspace Layout Tests

`workspace-layout.spec.ts` verifies the next projection layer above raw matrix
generation.

It protects:

* active Pane ID collection,
* numeric Pane identity sorting,
* CSS template generation,
* simple dimensions,
* and nested proportional dimensions.

A representative nested expected dimension map is:

```typescript
{
    a: {
        height: 0.5,
        width: 0.5
    },
    b: {
        height: 0.5,
        width: 0.5
    },
    c: {
        height: 0.5,
        width: 0.5
    },
    d: {
        height: 0.25,
        width: 0.5
    },
    e: {
        height: 0.25,
        width: 0.5
    }
}
```

That test connects matrix correctness to the sizing values consumed by the
rendered Pane components.

---

# WorkspaceRuntime Tests

`workspace-runtime.spec.ts` protects the application-facing boundary around
layout and dimension publication.

The important behavior is:

```text
WorkspaceRuntime.deriveLayout()
    → delegates layout derivation from current root Pane

WorkspaceRuntime.publishPaneDimensions(...)
    → stores and publishes current dimensions

WorkspaceRuntime.getPaneDimensions()
    → exposes current published dimensions

WorkspaceRuntime.subscribeToPaneDimensions(...)
    → provides lifecycle-managed Pane subscription
```

These tests ensure Svelte consumers do not need to reach through the runtime
into `PaneService`.

---

# Debugging: Wrong Pane Proportions

If a nested split produces incorrect proportions, inspect in this order:

```text
1. Pane tree
2. PaneSplit values
3. renderGridTemplateAreas() matrix
4. normalization repeat factors
5. derivePaneDimensions()
6. generated CSS template
7. Pane-published width/height
```

Do not begin by adjusting CSS in the Module component.

If the matrix is wrong, the defect is in tree projection or normalization.

If the matrix is correct but the Pane dimensions are wrong, inspect dimension
derivation.

If both are correct but presentation is wrong, then inspect the root CSS or Pane
component styling.

---

# Debugging: Pane Missing From Layout

If a Pane exists logically but is not visible:

```text
WorkspaceRuntime.findPane(paneID)
    ↓
Does Pane exist?

renderGridTemplateAreas(rootPane)
    ↓
Does matrix contain paneID?

layout.activePaneIDs
    ↓
Does active list contain paneID?

+page.svelte paneIds
    ↓
Is paneID present and not marked deleted?

CSS grid-area
    ↓
Does rendered wrapper use matching paneID?
```

This flow distinguishes logical tree problems from presentation-state problems.

---

# Debugging: Existing Pane Recreated After Delete

If deleting one Pane unexpectedly resets another Pane's component or scroll
state, inspect:

```text
deletedPaneIds
sortPaneIDs(...)
{#each paneIds ...}
```

The deleted ID retention exists specifically to prevent later Pane iteration
positions from shifting unnecessarily.

Do not remove that behavior merely because deleted IDs are absent from the
active layout matrix.

The active matrix and retained presentation iteration IDs solve different
problems.

---

# Debugging: Stale Pane Size

If a Pane renders with an old size after a structural change, inspect:

```text
PANE_SPLIT / PANE_DELETED notification
    ↓
onGridUpdate()
    ↓
workspaceRuntime.deriveLayout()
    ↓
layout.paneDimensionsByID
    ↓
workspaceRuntime.publishPaneDimensions(...)
    ↓
Pane subscription
    ↓
updatePaneDimensions(...)
```

Also verify the Pane component remains subscribed using the stable Pane ID and
unsubscribes on destruction.

---

# Anti-Patterns

## Do not store the grid matrix as Workspace state

Incorrect:

```text
Pane tree
+
mutable persisted grid matrix
```

Correct:

```text
Pane tree
    ↓
derived grid matrix
```

## Do not globally equalize active Panes

Incorrect:

```text
N Panes
    → each receives 1/N
```

Correct:

```text
recursive split structure
    → occupancy matrix
    → dimensions
```

## Do not use Pane array index as identity

Correct identity is:

```text
paneID
```

Iteration position is presentation mechanics only.

## Do not make Modules participate in layout calculation

Grid projection must not branch on:

```text
Modules.BIBLE
Modules.NOTES
Modules.PLANS
...
```

All Module types occupy Pane regions through the same generic layout path.

## Do not make Domain services depend on Pane dimensions

Domain code should never need:

```text
vh
vw
grid-area
Pane width
Pane height
```

Those are presentation concerns.

## Do not use synthetic filler identities

Repeat the real Pane ID to represent span.

Do not create fake grid cells with fake Pane identities.

## Do not publish dimensions from inside the pure layout function

Keep:

```text
derive layout
```

separate from:

```text
publish presentation change
```

## Do not persist deletedPaneIds

They are transient presentation-retention state, not Workspace model state.

---

# Grid Layout Invariants

The implementation should preserve all of the following:

```text
The Pane tree is the authoritative Workspace layout model.

Layout is derived from the Pane tree.

A Leaf Pane projects to one Pane ID.

A Branch Pane projects through its child matrices and split direction.

Vertical split means side-by-side children.

Horizontal split means stacked children.

Every resulting grid matrix is rectangular.

Every grid Pane ID corresponds to one active Leaf Pane.

Normalization repeats real Pane IDs rather than inventing filler identities.

Repeated IDs represent occupied area, not duplicate Panes.

Nested split proportions are preserved.

Splitting one Pane subdivides only that Pane's region.

Unrelated Pane proportions do not change merely because another Pane splits.

Active Pane IDs are unique.

Pane IDs are sorted in alphabetic-sequence allocation order, not lexical order.

Pane dimensions are derived from normalized matrix occupancy.

The root page publishes derived dimensions after structural layout updates.

Pane components consume dimensions by stable paneID.

Branch Panes are not rendered as PaneContainer components.

Buffer replacement does not trigger grid recalculation.

Derived grid state is not persisted.

Deleted Pane ID retention is transient presentation behavior.
```

---

# Current Boundary Summary

The current implementation can be summarized as:

```text
Pane Tree
    = authoritative recursive Workspace structure

workspace-grid.ts
    = recursively converts Pane structure into a minimal rectangular matrix

workspace-layout.ts
    = derives active IDs, Pane dimensions, and root CSS template

WorkspaceRuntime
    = public application boundary for layout and dimension coordination

+page.svelte
    = applies derived layout and maintains transient rendering retention state

pane.svelte
    = consumes dimensions for one stable Pane identity
```

No layer needs to duplicate another layer's responsibility.

---

# Big Takeaway

The grid layout is a projection, not a model.

The Pane tree says:

```text
what regions exist
and
how they were recursively divided
```

The grid code translates that structure into:

```text
rectangular equal-cell occupancy
```

which then becomes:

```text
CSS grid areas
+
Pane width/height fractions
```

The normalization algorithm preserves local split proportions by repeating Pane
IDs only as much as necessary to form a compatible rectangular matrix.

That gives the renderer a flat, CSS-friendly representation while keeping the
recursive Pane tree as the single source of truth.
