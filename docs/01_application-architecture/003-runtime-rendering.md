# Runtime Rendering

## Status

Current

---

# Purpose

This document defines how the Workspace Runtime is presented as the visible application.

The Runtime Object model is defined by **002-workspace-runtime.md**.

This document does not redefine that model.

Instead, it describes how:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
```

is projected into a visible and interactive user interface.

---

# Scope

This document defines:

* the rendering responsibility,
* Pane-tree projection into visible Leaf Pane regions,
* Module presentation resolution,
* layout derivation,
* Runtime identity during rendering,
* incremental rendering,
* and presentation independence from any particular rendering technology.

It does not define:

* Runtime Objects,
* Workspace operations,
* Buffer ownership,
* Navigation Context,
* Domain behavior,
* Domain Objects,
* Resource Boundary behavior,
* persistence,
* or synchronization.

Those responsibilities are defined elsewhere.

---

# Principle

Rendering is a projection of Runtime state.

Conceptually:

```text
Workspace Runtime
        │
        ▼
Runtime Objects
        │
        ▼
Rendering
        │
        ▼
Visible Application
```

The Runtime determines what exists.

Rendering determines how it becomes visible.

---

# Rendering Responsibility

Rendering owns presentation.

Its responsibilities include:

* projecting the Pane tree into visible Leaf Pane regions,
* deriving visible layout,
* rendering Leaf Pane contents,
* resolving Module presentation components,
* preserving presentation identity for stable Runtime Objects,
* and reflecting Runtime changes in the visible application.

Rendering does not own:

* Workspace structure,
* Pane-tree modification,
* Buffer assignment,
* Module Instance placement,
* Domain behavior,
* Domain Objects,
* persistence,
* synchronization,
* or publication.

---

# Rendering Boundary

The Workspace Runtime provides the logical model.

Rendering consumes that model.

Conceptually:

```mermaid
flowchart LR

    Runtime["Workspace Runtime"]

    Rendering["Runtime Rendering"]

    UI["Visible Application"]

    Runtime --> Rendering
    Rendering --> UI
```

Rendering should not introduce another authoritative model of the Workspace.

It presents the Runtime model that already exists.

---

# Rendering Pipeline

At a high level:

```mermaid
flowchart TD

    Runtime["Runtime Objects"]

    Layout["Layout Derivation"]

    Components["Component Rendering"]

    UI["Visible Application"]

    Runtime --> Layout
    Layout --> Components
    Components --> UI
```

Runtime Objects define the logical structure.

Layout derives visible regions from that structure.

Components present the active Module Instances within those regions.

---

# Pane Tree Projection

The Runtime defines the Workspace as a recursive Pane tree.

Rendering derives the visible Leaf Pane regions from that structure.

Conceptually:

```text
Recursive Pane Tree
        ↓
Layout Derivation
        ↓
Visible Leaf Pane Regions
        ↓
Module Presentations
```

The Pane tree remains the source of truth.

Any presentation projection is derived state.

---

# Branch Pane Rendering

A Branch Pane contributes structural information to layout derivation.

Conceptually:

```text
Branch Pane
    │
    ├── split relationship
    ├── first subtree
    └── second subtree
            ↓
    derived visible regions
```

A Branch Pane does not require an independently visible presentation merely because it exists in the Runtime model.

Rendering uses its structure to determine the regions occupied by descendant Leaf Panes.

---

# Leaf Pane Rendering

A Leaf Pane represents one terminal presentation region.

Its Buffer identifies the active Module Instance to present.

Conceptually:

```text
Leaf Pane
    ↓
Buffer
    ↓
Module Instance
    ↓
Presentation Component
```

Rendering does not need to understand the Domain behavior wrapped by the Module Instance.

It only needs to resolve and present the appropriate Module presentation.

---

# Module Presentation Resolution

A Buffer identifies the Module Instance occupying a Leaf Pane.

Rendering resolves that Module to its presentation implementation.

Conceptually:

```mermaid
flowchart TD

    Buffer["Buffer"]

    Module["Module"]

    Resolver["Module Resolver"]

    Component["Presentation Component"]

    Buffer --> Module
    Module --> Resolver
    Resolver --> Component
```

The architectural responsibility is:

> **Resolve the presentation associated with the active Module Instance.**

The concrete presentation mechanism is an implementation concern.

---

# Dynamic Module Composition

The visible application is composed dynamically from the Module Instances currently active in the Workspace.

For example:

```text
Workspace

    Bible Reader

    Notes

    Bible Search
```

may later become:

```text
Workspace

    Bible Reader

    Bible Reader

    Reading Plans

    Notes
```

Rendering does not require a fixed page composition.

It presents whatever Module Instances are currently represented by the Runtime.

---

# Multiple Module Instances

Several instances of the same Module type may be active simultaneously.

For example:

```text
Bible Reader
    Genesis 1
```

and:

```text
Bible Reader
    Romans 8
```

are different Module Instances.

Rendering must preserve their independent identities and presentation state.

Module type alone does not identify an active instance.

---

# Module Registration

The rendering implementation requires a way to associate Module types with their presentation components.

Conceptually:

```text
Module Type
    ↓
Module Registration
    ↓
Presentation Component
```

Adding a new Module should not require changes to:

* Pane recursion,
* Workspace operations,
* Buffer behavior,
* or layout generation.

Only the Module presentation registration should need to understand the new rendering component.

---

# Layout Derivation

The Pane tree defines logical Workspace structure.

Rendering derives visible layout from that tree.

Conceptually:

```mermaid
flowchart TD

    Tree["Pane Tree"]

    Derivation["Layout Derivation"]

    Layout["Visible Layout"]

    Tree --> Derivation
    Derivation --> Layout
```

The Pane tree remains the source of Workspace structure.

Rendered layout is derived from it.

---

# Recursive Layout

Every Branch Pane divides one logical region into two child regions.

Those children may then divide their own regions recursively.

For example:

```text
Root Pane

    Horizontal Split

        Left Pane

        Right Branch

            Vertical Split

                Top Pane

                Bottom Pane
```

Rendering traverses this recursive structure to derive the final two-dimensional layout.

---

# Layout Is Derived State

Visible layout should not become another source of truth.

Workspace operations change Runtime Objects first.

Rendering derives the new presentation afterward.

Conceptually:

```text
Workspace Operation
        ↓
Pane Tree Changes
        ↓
Layout Derivation
        ↓
Rendered Workspace
```

This avoids maintaining independent Runtime and layout models that must later be synchronized.

---

# Layout Realization

Visible layout is derived from the Pane tree.

Conceptually:

```text
Pane Tree
    ↓
Layout Derivation
    ↓
Visible Workspace
```

The Workspace Runtime does not depend on rows, columns, template primitives, or another presentation-specific layout model.

Those concepts belong to rendering implementation.

---

# Layout Algorithm

Nested Pane splits must be projected into a visible arrangement that preserves the structural relationships represented by the Runtime.

The exact layout algorithm is implementation-specific.

The enduring architectural requirement is:

> **The visible layout is derived from the Pane tree rather than maintained as an independent Workspace model.**

---

# Runtime Identity During Rendering

Runtime Objects have stable identities.

Rendering must respect those identities.

Relevant identities include:

* Pane identity,
* Buffer identity,
* and Module Instance identity.

Visual position does not define identity.

A Pane may move or resize while remaining the same Pane.

A Buffer may move with that Pane while remaining the same active interaction.

---

# Identity Before Position

For example:

```text
Before

Pane A
    Buffer A
        Bible Reader
```

may become:

```text
After Split

Branch Pane

    Pane A
        Buffer A
            Bible Reader

    Pane B
        Buffer B
            Notes
```

`Pane A` and `Buffer A` are still the same Runtime Objects.

The Bible Reader Module Instance should therefore remain active.

Only the surrounding layout changed.

---

# Stable Component Identity

Preserving Runtime identity allows rendering to preserve presentation state such as:

* scroll position,
* focus,
* selection,
* transient component state,
* keyboard interaction state,
* and other presentation-specific state.

A Workspace change affecting one Pane should not unnecessarily recreate unrelated Module presentations elsewhere.

---

# Incremental Rendering

Most Runtime operations affect only part of the Workspace.

Examples include:

* splitting one Pane,
* deleting one Pane,
* replacing one Buffer,
* opening one Module Instance,
* or changing active selection.

Rendering should preserve unaffected presentation instances whenever their Runtime Objects remain unchanged.

The architectural requirement is stable presentation for stable Runtime identity.

The exact framework optimization strategy is implementation.

---

# Rendering Updates

Rendering follows Runtime changes.

Conceptually:

```mermaid
sequenceDiagram

    participant User
    participant Module as Module Instance
    participant Runtime as Workspace Runtime
    participant Renderer as Runtime Rendering

    User->>Module: Perform interaction
    Module->>Runtime: Request Runtime operation
    Runtime->>Runtime: Update Runtime Objects
    Runtime-->>Renderer: Runtime state changed
    Renderer->>Renderer: Derive layout and presentation
    Renderer-->>User: Present updated Workspace
```

Rendering does not own the Workspace operation.

It presents the resulting state.

---

# Rendering and Domain Behavior

Rendering presents interactions with Domain behavior.

It does not own that behavior.

For example, a Bible Reader presentation may:

* display Scripture,
* collect user input,
* invoke Bible Domain behavior,
* and present the result.

The Bible Domain remains responsible for:

* Scripture behavior,
* text markup,
* navigation rules,
* search behavior,
* and Bible Domain Objects.

The fact that the behavior is visible inside a component does not transfer ownership to rendering.

---

# Rendering and Runtime Behavior

The same rule applies to Runtime behavior.

A UI control may allow the user to:

* split a Pane,
* close a Pane,
* open a Module,
* or select another Buffer.

The control requests behavior through the Workspace Runtime's Public API.

The component does not become the owner of the Workspace operation merely because the user activated it there.

---

# Rendering and Public APIs

Presentation crosses ownership boundaries through Public APIs.

Conceptually:

```text
Presentation
    │
    ├── Workspace Runtime Public API
    │       ↓
    │   Runtime behavior
    │
    └── Domain Public API
            ↓
        Domain behavior
```

Rendering remains focused on presentation.

It does not need access to the owner's internal implementation.

---

# Presentation Realization

Runtime Rendering may use presentation components, layout engines, or other UI mechanisms to realize the visible Workspace.

Those mechanisms must preserve the architectural rules established here:

* Runtime state remains authoritative,
* visible layout remains derived,
* stable Runtime identity should preserve unaffected presentation state,
* Module presentation remains distinct from Domain behavior,
* and presentation mechanisms remain replaceable.

The concrete component model and layout technology belong to Implementation documentation.

---

# Rendering Performance

Rendering performance is important because several Module Instances may remain active simultaneously.

Stable Runtime identity and incremental updates help reduce unnecessary component recreation.

Architecturally, the important requirements are:

* Runtime identity remains stable,
* unaffected interactions remain intact,
* layout is derived from Runtime structure,
* and rendering does not maintain an independent authoritative Workspace model.

Specific optimization techniques may change over time.

---

# Rendering Independence

Rendering technology should remain replaceable.

The Workspace Runtime must not depend on a particular component framework, layout system, rendering engine, or presentation mechanism.

Likewise, Domains must not depend upon rendering technology.

The responsibility is architectural.

The technology is implementation.

---

# Future Evolution

Rendering may evolve to support capabilities such as virtualization, detached presentation surfaces, multiple simultaneous Workspace views, or improved incremental presentation.

Such changes should remain beneath the same rendering responsibility.

They should not require the Workspace Runtime or Domains to be redesigned merely because presentation mechanisms change.

---

# Design Rules

## Rendering Presents Runtime State

The Workspace Runtime defines what exists.

Rendering presents it.

---

## Runtime Objects Are Defined Elsewhere

Workspace, Pane, Buffer, and Module Instance are defined by **002-workspace-runtime.md**.

This document consumes those concepts rather than redefining them.

---

## Layout Is Derived

Visible layout is derived from the Pane tree.

It is not an independent Workspace model.

---

## Identity Is Stable

Rendering should preserve existing presentation state when the corresponding Runtime Objects remain unchanged.

---

## Rendering Does Not Own Behavior

Rendering may invoke Runtime or Domain behavior through Public APIs.

It does not assume ownership of those responsibilities.

---

## Rendering Technologies Are Implementation

Component frameworks, layout systems, and rendering engines do not define the architecture.

---

# Conceptual Model

The complete rendering relationship can be summarized as:

```mermaid
flowchart TD

    Runtime["Workspace Runtime"]

    Panes["Pane Tree"]

    Buffers["Buffers"]

    Modules["Module Instances"]

    Rendering["Runtime Rendering"]

    UI["Visible Application"]

    Runtime --> Panes
    Panes --> Buffers
    Buffers --> Modules

    Panes --> Rendering
    Buffers --> Rendering
    Modules --> Rendering

    Rendering --> UI
```

The Workspace Runtime defines the active structure.

Rendering projects that structure into the visible application.

---

# Big Takeaway

Runtime Rendering has one responsibility:

> **Present the Workspace Runtime.**

The Runtime defines:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
```

Rendering does not redefine those concepts.

It:

* derives visible Leaf Pane regions from the Pane tree,
* derives visible layout,
* resolves Module presentation,
* preserves presentation identity,
* and reflects Runtime changes in the visible application.

The Pane tree defines logical structure.

Rendering derives presentation from it.

Presentation mechanisms may change.

The Runtime model should not need to.
