# Workspace Runtime

## Status

Current

---

# Purpose

This document defines the **Workspace Runtime**.

The Workspace Runtime is the persistent execution environment in which application capabilities are active, organized, and coordinated.

It defines the Runtime Objects that make up a Workspace, the relationships between those objects, and the operations that cause the Workspace to evolve over time.

Rendering is intentionally outside the scope of this document.

The visible presentation of the Runtime is described by **003-runtime-rendering.md**.

---

# Scope

This document defines:

* the Workspace Runtime,
* Runtime Objects,
* Workspaces,
* Panes,
* Buffers,
* Module Instances,
* Runtime identity,
* Workspace operations,
* Navigation Context,
* Runtime Public APIs,
* Runtime Events,
* Runtime persistence,
* and future Workspace evolution.

It does not define:

* rendering technology,
* recursive component rendering,
* CSS Grid,
* component lifecycle,
* Domain behavior,
* Domain Objects,
* Resource Boundary behavior,
* storage technology,
* or transport technology.

---

# Principle

The Workspace Runtime owns the active execution state of the application.

It determines:

* which Workspace is active,
* which Panes exist,
* which Buffers occupy those Panes,
* which Module Instances are active,
* and how that Runtime state changes over time.

The Runtime does not own the Domain behavior presented inside those Module Instances.

Domains own application behavior.

The Runtime owns the environment in which that behavior participates.

---

# Runtime Model

The Workspace Runtime is organized around four primary Runtime Objects:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
```

Each object represents a different responsibility.

| Runtime Object  | Responsibility                                              |
| --------------- | ----------------------------------------------------------- |
| Workspace       | Represents one complete active study environment.           |
| Pane            | Represents one structural node within that Workspace.       |
| Buffer          | Represents one active interaction hosted by a leaf Pane.    |
| Module Instance | Wraps one Domain behavior for participation in the Runtime. |

Together these objects define the active state of the application.

---

# Runtime Objects

Runtime Objects represent execution state.

They answer questions such as:

* Which Workspace is active?
* Which Panes exist?
* What interaction occupies each Pane?
* Which Module Instances are active?
* What navigation context belongs to those interactions?

Runtime Objects are distinct from Domain Objects.

A Domain Object represents information meaningful to a Domain.

A Runtime Object represents how application behavior is currently instantiated and organized for interaction.

For example:

```text
Domain Object
    Bible Chapter

Runtime Objects
    Workspace
    Pane
    Buffer
    Bible Reader Module Instance
```

The models have different responsibilities and different lifecycles.

---

# Workspace

A Workspace represents one complete active study environment.

It owns one root Pane.

Every other Runtime Object in the Workspace is reachable through that root.

Conceptually:

```text
Workspace

    Root Pane

        Recursive Pane Tree

            Buffers

                Module Instances
```

The Workspace therefore provides the root of the Runtime Object graph.

---

# Current Workspace Model

The current application maintains one active Workspace.

The Workspace concept is currently represented primarily by:

* the root Pane,
* the Pane tree,
* the Buffers within that tree,
* and the runtime logic coordinating them.

A dedicated `Workspace` object is not required for the architectural concept to exist.

The implementation may introduce a concrete Workspace object later without changing the Runtime model.

---

# Multiple Workspaces

The Runtime model naturally supports more than one Workspace.

For example:

```text
Workspace A
    Root Pane
        Pane Tree

Workspace B
    Root Pane
        Pane Tree
```

Each Workspace owns its own independent Runtime Object graph.

This enables future capabilities such as:

* named Workspaces,
* saved Workspace snapshots,
* switching between study contexts,
* restoring previous study sessions,
* and maintaining several independent study environments.

Multiple Workspaces extend the current model.

They do not require a different Runtime architecture.

---

# Pane

A Pane is one structural node within the Workspace.

Every Workspace contains one root Pane.

Panes form a recursive tree beneath that root.

There are two conceptual Pane forms:

* Branch Pane
* Leaf Pane

---

# Branch Pane

A Branch Pane contains two child Panes.

It defines a structural division within the Workspace.

Conceptually:

```text
Branch Pane

    Child Pane

    Child Pane
```

The current implementation records a split direction that determines how the child regions will eventually be presented.

That rendering behavior belongs to Runtime Rendering.

The Runtime responsibility is only the structural relationship between the Panes.

---

# Leaf Pane

A Leaf Pane represents one terminal region of the Pane tree.

A Leaf Pane hosts one Buffer.

Conceptually:

```text
Leaf Pane

    Buffer
```

The Pane determines where an interaction exists within the logical Workspace structure.

It does not define the Domain behavior associated with that interaction.

---

# Pane Tree

Branch and Leaf Panes form a recursive tree.

For example:

```text
Root Branch

    Leaf Pane A

    Branch Pane

        Leaf Pane B

        Leaf Pane C
```

The Pane tree is the logical Workspace structure.

Rendering derives presentation from that structure.

The Pane tree itself does not depend on CSS Grid, Svelte components, or another rendering mechanism.

---

# Pane Responsibility

A Pane has one structural responsibility:

> **A Pane defines one node within the Workspace hierarchy.**

A Pane does not own:

* Domain behavior,
* Domain Objects,
* Buffer behavior,
* resource retrieval,
* persistence,
* synchronization,
* publication,
* or rendering technology.

Branch Panes organize child Panes.

Leaf Panes host Buffers.

---

# Pane Identity

Leaf Panes have stable identities.

Stable identity allows the Runtime to:

* find a Pane,
* split it,
* replace its Buffer,
* delete it,
* track it across Workspace changes,
* and preserve unrelated Runtime state while the tree evolves.

Pane identity is independent from visual position.

A Pane may move or change size while remaining the same Runtime Object.

---

# Current Pane Representation

The current implementation uses a recursive interface similar to:

```typescript
export interface Pane {
  id: string | any;
  left: Pane | any;
  right: Pane | any;
  split: string | any;
  buffer: any;
  updateBuffer: Function | any;
  toggle: boolean | any;
}
```

The same representation currently supports both Branch and Leaf Panes.

Conceptually:

| Property | Branch Pane | Leaf Pane |
| -------- | ----------: | --------: |
| `id`     |          No |       Yes |
| `left`   |         Yes |        No |
| `right`  |         Yes |        No |
| `split`  |         Yes |        No |
| `buffer` |          No |       Yes |

Some properties exist because of the current implementation rather than the enduring Pane model.

Future refactoring may introduce more precise Pane types without changing the Runtime responsibility.

---

# Buffer

A Buffer represents one active interaction within the Workspace.

Every Leaf Pane hosts exactly one Buffer.

The Buffer preserves the Runtime state required for one Module Instance.

Conceptually:

```text
Leaf Pane
    ↓
Buffer
    ↓
Module Instance
```

The Pane represents Workspace structure.

The Buffer represents the active interaction occupying that structure.

---

# Buffer Responsibility

A Buffer owns the Runtime context associated with one Module Instance.

This may include:

* stable Buffer identity,
* Module type,
* initialization context,
* Navigation Context,
* focus state,
* selection state,
* keyboard interaction state,
* and other transient state required to preserve the interaction.

The Buffer does not own Domain behavior.

It preserves the context required for the Module Instance to participate in the Workspace.

---

# Buffer Identity

Buffer identity is independent from Pane identity.

This allows multiple instances of the same Module type to coexist.

For example:

```text
Buffer A
    Bible Reader
    Genesis 1

Buffer B
    Bible Reader
    Romans 8
```

Both Buffers represent the same kind of Module.

They are different active interactions.

---

# Current Buffer Representation

The current implementation uses a class similar to:

```typescript
export class Buffer {
  key: string = uuid4();
  name: string = '';
  component: any;
  componentName: Modules = Modules.NULL;
  keyboardBindings: Map<string, Function> = new Map<string, Function>();
  selected: boolean = false;
  bag: any = {};
  onFocus: Function = () => {};
}
```

Some properties reflect the current rendering implementation.

The enduring Buffer responsibility is:

> **A Buffer identifies and preserves one active Module Instance and its Runtime context.**

---

# Module Instance

A Module Instance is a conceptual wrapper around a Domain behavior.

It allows that behavior to participate as one independently active interaction within the Workspace Runtime.

For example:

```text
Bible Reading behavior
    ↓
Bible Reader Module Instance
```

```text
Bible Search behavior
    ↓
Bible Search Module Instance
```

```text
Notes behavior
    ↓
Notes Module Instance
```

The Domain owns the behavior.

The Module Instance wraps that behavior for participation in the Runtime.

---

# Module Types and Instances

A Module defines a reusable kind of Runtime interaction.

A Module Instance represents one active occurrence of that Module.

For example:

```text
Bible Reader Module

    Instance A
        Genesis 1

    Instance B
        Romans 8

    Instance C
        Psalms 23
```

Each instance maintains its own Runtime context.

This allows multiple independent interactions with the same Domain behavior to exist simultaneously.

---

# Modules and Domains

A Module Instance wraps behavior owned by a Domain.

A Domain may expose behavior through multiple Module types.

Conceptually:

```text
Bible Domain

    Bible Reading behavior
        → Bible Reader Module

    Bible Search behavior
        → Bible Search Module


Notes Domain

    Notes behavior
        → Notes Module

    Notes Search behavior
        → Notes Search Module
```

Modules do not become Domains.

They provide Runtime wrappers around Domain behavior.

---

# Runtime and Domain Boundary

The Workspace Runtime and Domains own different responsibilities.

The Runtime understands:

* Workspaces,
* Panes,
* Buffers,
* Module Instances,
* focus,
* selection,
* Navigation Context,
* and Workspace operations.

Domains understand:

* Domain Objects,
* Domain rules,
* Domain operations,
* and Domain behavior.

Conceptually:

```text
Workspace Runtime
        │
        ▼
Module Instance
        │
        ▼
Domain Public API
        │
        ▼
Domain Behavior
```

The Runtime does not need to understand the internal implementation of the Domain.

The Domain does not need to understand the Pane tree.

---

# Navigation Context

A Buffer may carry context needed to initialize or continue a Module Instance.

The current implementation stores this context in the Buffer's `bag`.

Examples include:

* a Bible location reference,
* a Bible version,
* selected verses,
* Reading Plan navigation context,
* search context,
* Note context,
* or other initialization information.

For example:

```typescript
{
  bibleLocationRef: '1_1',
  bibleVersion: 'kjv'
}
```

The Runtime carries this context.

It does not interpret the Domain-specific meaning of the values.

---

# Navigation Between Modules

One Module Instance may request another Module Instance with Navigation Context.

For example:

```text
Reading Plans Module Instance
        │
        │ Bible reading context
        ▼
Workspace Runtime
        │
        ▼
Bible Reader Module Instance
```

The source Module provides context.

The Runtime introduces the requested interaction into the Workspace.

The target Module and its Domain determine the meaning of that context.

The source Module does not control the target Module's implementation.

---

# Workspace Operations

The Workspace evolves through operations on Runtime Objects.

Primary operations include:

* finding a Pane,
* splitting a Pane,
* replacing a Buffer,
* deleting a Pane,
* opening a Module Instance,
* selecting or focusing a Buffer,
* restoring a Workspace,
* and updating Runtime state.

These operations belong to the Workspace Runtime.

---

# Find Pane

A Pane can be located recursively from the root using its stable identity.

Conceptually:

```text
Root Pane
    ↓
Traverse Pane Tree
    ↓
Target Pane
```

This operation depends only on Workspace structure.

It does not depend on the Domain behavior presented within the Pane.

---

# Split Pane

Splitting a Leaf Pane introduces another region into the Workspace.

Conceptually:

```text
Before

Leaf Pane A
    Buffer A
```

becomes:

```text
After

Branch Pane

    Leaf Pane A
        Buffer A

    Leaf Pane B
        Buffer B
```

The existing Buffer is preserved.

Only the minimum Runtime structure required for the split is introduced.

---

# Replace Buffer

Replacing a Buffer changes the active interaction within a Leaf Pane.

For example:

```text
Before

Leaf Pane A
    Bible Reader Buffer
```

```text
After

Leaf Pane A
    Notes Buffer
```

The Pane remains part of the same Workspace structure.

The interaction occupying it changes.

---

# Delete Pane

Deleting a Leaf Pane removes that Pane and its Buffer from the active Workspace.

Its sibling replaces the surrounding Branch Pane.

Conceptually:

```text
Before

Branch Pane
    Leaf Pane A
    Leaf Pane B
```

```text
Delete Pane B
```

```text
After

Leaf Pane A
```

Unrelated Runtime Objects remain unchanged.

---

# Open Module Instance

Opening a Module Instance is a Workspace operation.

The request may result in:

* splitting an existing Pane,
* replacing an existing Buffer,
* or another supported Runtime operation.

Conceptually:

```text
Module Request
      │
      ▼
Workspace Runtime
      │
      ├── Split Pane
      │
      └── Replace Buffer
      │
      ▼
New Module Instance
```

The Runtime owns how the Workspace changes.

---

# Focus and Selection

The Workspace Runtime may track active focus and selection.

This supports behavior such as:

* keyboard command targeting,
* active Buffer tracking,
* focus changes,
* and switching attention between Workspace regions.

Focus and selection belong to the Runtime.

They do not transfer ownership of Domain behavior.

---

# Runtime Public API

Workspace operations should be exposed through the Workspace Runtime's Public API.

A Module Instance may request Runtime behavior such as:

* opening another Module,
* splitting a Pane,
* closing a Pane,
* replacing a Buffer,
* or changing selection.

The Module should not directly manipulate Runtime internals.

Conceptually:

```text
Module Instance
      │
      ▼
Workspace Runtime Public API
      │
      ▼
Runtime Operation
```

This preserves the ownership boundary around Runtime behavior.

---

# Current Runtime Services

The current implementation may expose Runtime capabilities through services such as the Pane service.

Those services are implementation mechanisms.

They do not own Pane behavior.

Conceptually:

```text
Workspace Runtime
    │
    └── Public API
            │
            └── Current implementation
                    Pane Service
```

If the service implementation changes, Runtime ownership remains the same.

---

# Runtime Events

The Workspace Runtime may use Application Events where event-driven communication is appropriate.

Examples include:

* Pane opened,
* Pane closed,
* Buffer selected,
* Module opened,
* Workspace restored,
* or Workspace changed.

Events communicate that something occurred.

They do not transfer ownership of the underlying operation.

---

# Module Independence

Module Instances should remain loosely coupled.

A Module Instance should not:

* directly manipulate another Module Instance,
* depend on another Module's component implementation,
* mutate another Buffer's internal state,
* or reach into another Domain's internals.

Cross-boundary collaboration should occur through:

* Public APIs,
* Application Events,
* shared identifiers,
* or Navigation Context.

Ownership creates boundaries.

Loose coupling preserves them.

---

# Runtime Identity

Stable identity is fundamental to the Workspace Runtime.

The Runtime distinguishes between:

```text
Workspace Identity
    Which study environment?

Pane Identity
    Which structural node?

Buffer Identity
    Which active interaction?

Module Instance Identity
    Which occurrence of that Module?
```

These identities are separate.

Changing the Workspace structure should not unnecessarily change unrelated Runtime identities.

How rendering preserves corresponding component identity is described by **003-runtime-rendering.md**.

---

# Runtime Persistence

Runtime state may be persisted so a Workspace can be reconstructed after the current execution ends.

Persisted Runtime state may include:

* Pane-tree structure,
* Buffer assignments,
* Module types,
* Navigation Context,
* active selection,
* and other state required to restore the Workspace.

The persisted representation should describe Runtime state.

It should not depend upon live UI component instances.

---

# Runtime State and Domain State

Runtime persistence and Domain persistence are separate responsibilities.

Runtime state answers:

> **What was active in the user's Workspace?**

Domain state answers questions such as:

> **What Notes exist?**

> **What Reading Plan progress exists?**

> **What Bible annotations exist?**

A restored Module Instance may request Domain Objects again after the Workspace is reconstructed.

The Runtime does not need to become the owner of those Domain Objects merely because they were previously visible.

---

# Persisted Preferences

Some values may currently be persisted near Workspace state even though they are owned elsewhere.

Examples may include:

* theme,
* dark mode,
* Bible version,
* or other preferences.

Physical storage location does not determine ownership.

The Runtime should persist only the state it owns or requires to reconstruct its Runtime environment.

---

# Current Implementation

The current implementation primarily realizes Workspace Runtime behavior through:

* `+page.svelte`,
* Pane-related services,
* Buffer implementation code,
* event handlers,
* local persistence,
* and supporting Runtime components.

This physical organization reflects implementation history.

It does not redefine ownership.

Future refactoring should move implementation toward the Runtime architecture rather than redefining the Runtime according to existing file locations.

---

# Future Evolution

Expected evolution may include:

* extracting Runtime coordination from `+page.svelte`,
* introducing a concrete Workspace object,
* introducing stronger Branch and Leaf Pane types,
* formalizing the Runtime Public API,
* supporting named Workspaces,
* supporting multiple active or saved Workspaces,
* refining Buffer types,
* refining Navigation Context,
* and moving technical implementation beneath its architectural owner.

These changes should refine implementation without changing the Runtime model.

---

# Design Rules

## Runtime Owns Runtime State

Workspace structure, Pane relationships, Buffer placement, Module Instance placement, focus, and selection belong to the Runtime.

---

## Domains Own Domain Behavior

The Runtime may host a Module Instance.

It does not own the Domain behavior wrapped by that Module Instance.

---

## Module Instances Wrap Domain Behavior

A Module Instance is the Runtime representation of one active interaction with Domain behavior.

It is not the owner of that behavior.

---

## Panes Remain Structural

Panes organize the Workspace.

They do not understand the Domain behavior displayed within them.

---

## Buffers Preserve Interaction Context

Buffers preserve Runtime and Navigation Context.

They do not interpret Domain meaning unnecessarily.

---

## Runtime Collaboration Uses Public APIs

Other responsibilities should request Runtime behavior through the Workspace Runtime's Public API.

They should not manipulate Runtime internals directly.

---

## Preserve Identity

Workspace operations should preserve unaffected Runtime Object identity whenever possible.

---

# Big Takeaway

The Workspace Runtime defines the active execution environment of KJVOnly.

Its primary Runtime Objects are:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
```

A Workspace defines one study environment.

Panes define its logical structure.

Buffers preserve independent active interactions.

Module Instances are conceptual wrappers around Domain behavior.

Domains own that behavior.

The Workspace Runtime owns how these Runtime Objects are created, organized, preserved, and changed over time.

Rendering is a separate responsibility.

It takes this Runtime model and presents it to the user.
