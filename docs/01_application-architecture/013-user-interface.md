# User Interface

## Status

Current

---

# Purpose

This document defines how independently developed application interactions participate in one coherent user interface.

Its primary question is:

> **When is a presentation concern shared across the application, and when does it belong to a Module, the Workspace Runtime, or a Domain?**

The User Interface establishes application-wide presentation conventions where consistency has value. It does not take ownership of Domain behavior, Module interaction state, or Workspace composition.

---

# User Interface Model

The visible application is produced by several independently owned responsibilities.

Conceptually:

```text
Domain
    ↓
Domain Behavior
    ↓
Module Instance
    ↓
Workspace Runtime
    ↓
Visible Application
```

Each responsibility contributes something different.

The Domain gives the behavior meaning.

The Module defines an active interaction with that behavior.

The Workspace Runtime determines how active interactions are composed into the Workspace.

Shared User Interface conventions make those independently developed interactions feel like parts of the same application.

---

# Shared Presentation Conventions

Some presentation decisions should be consistent throughout the application.

Examples may include common conventions for:

* navigation,
* toolbars,
* temporary overlays,
* user feedback,
* presentation of application state,
* and other recurring interactions.

These conventions form a shared presentation language.

They allow a user to understand a new Module using interaction patterns already learned elsewhere in the application.

The purpose is consistency where behavior is conceptually shared, not uniformity for its own sake.

---

# Determining UI Ownership

When introducing presentation behavior, begin by asking:

> **What gives this behavior meaning?**

If the behavior expresses Domain meaning, the Domain owns it.

If it describes one active interaction with Domain behavior, it belongs to the Module interaction.

If it changes Workspace composition, Pane structure, Buffer placement, or Module lifecycle, it belongs to the Workspace Runtime.

If it represents a presentation convention intended to behave consistently across otherwise independent interactions, it may belong to the shared User Interface.

Conceptually:

```text
What kind of behavior is this?
        ↓
Domain meaning?
    → Domain

Active interaction?
    → Module

Workspace composition?
    → Workspace Runtime

Shared presentation convention?
    → User Interface
```

The fact that behavior is visible does not automatically make it User Interface-owned.

---

# Domain Meaning vs Presentation

The User Interface presents Domain behavior.

It does not define what that behavior means.

For example:

```text
Highlight Bible text
        ↓
Meaning of annotation
        → Bible Domain

Interaction for selecting text
        → Bible Reader Module

Visual convention for selected state
        → User Interface where shared
```

These responsibilities may participate in the same user action while remaining independently owned.

Presentation should express Domain meaning rather than redefine it.

---

# Module Interaction vs Shared UI

Modules own the interaction state required by their active behavior.

For example, a Bible Reader may have:

* current selection,
* visible controls,
* transient interaction state,
* and interaction-specific commands.

Those concerns belong to the Bible Reader interaction even if they are implemented using shared UI components.

A shared component does not imply shared architectural ownership.

For example:

```text
Shared Toolbar Component
        ↓
used by
        ↓
Bible Reader Module
Notes Module
Reading Plans Module
```

The toolbar implementation may be shared.

The meaning of each toolbar action remains with the Module or Domain that provides it.

---

# Workspace Runtime vs User Interface

The Workspace Runtime owns the composition of active interactions.

This includes concepts such as:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
```

The User Interface may define shared ways to present or invoke those Runtime operations.

For example:

```text
User chooses "Split Pane"
        ↓
Shared UI interaction
        ↓
Workspace Runtime Public API
        ↓
Workspace structure changes
```

The visual control does not own Pane splitting.

The Workspace Runtime does.

This distinction prevents presentation controls from becoming the source of Runtime behavior.

---

# Responsive Presentation

Modules operate within presentation space provided by the Workspace Runtime.

A Module should adapt its presentation to the environment it receives without taking ownership of Workspace layout.

Conceptually:

```text
Workspace Runtime
        ↓
Available presentation environment
        ↓
Module Instance
        ↓
Module presentation adapts
```

A Module may change how its own interaction is presented when space changes.

It should not independently restructure the surrounding Workspace merely to satisfy its local presentation needs.

Workspace composition and Module responsiveness are separate responsibilities.

---

# Preserving User Context

Presentation changes should preserve the user's current working context whenever practical.

Examples of context may include:

* the active Workspace,
* open Module Instances,
* navigation position,
* selections,
* filters,
* and other active interaction state.

The owner of each piece of context remains responsible for its meaning.

For example:

```text
Bible reading location
    → Bible interaction / Domain meaning

Active Buffer
    → Workspace Runtime

Current selection
    → Module interaction
```

The shared User Interface should avoid introducing transitions that unnecessarily discard those independently owned contexts.

---

# Opening Related Interactions

A user interface action may initiate another application interaction.

For example, selecting a Scripture reference in Notes may open a Bible Reader.

Conceptually:

```text
Notes Module
    ↓
User selects Bible reference
    ↓
Navigation Context
    ↓
Workspace Runtime
    ↓
Bible Reader Module
```

The User Interface presents the action.

The Notes interaction supplies the reference.

The Workspace Runtime manages the new Runtime interaction.

The Bible Reader and Bible Domain interpret the Bible-specific meaning.

One user action therefore may cross several ownership boundaries without requiring a single owner to absorb all of them.

---

# Shared Feedback

Some feedback patterns may be useful throughout the application.

Examples include temporary messages, progress indications, warnings, or confirmation presentation.

The shared User Interface may define a common presentation convention for such feedback.

The owner that caused the feedback still determines its meaning.

For example:

```text
Notes Domain
    ↓
Note saved
    ↓
Shared feedback presentation
```

The shared feedback mechanism does not decide whether the Note was successfully saved.

It only presents that result consistently.

---

# Shared Components Are Implementation

A recurring visual component does not automatically become an architectural concept.

Examples might include:

```text
Button
Toolbar
Menu
Dialog
Toast
Panel
```

These may be valuable implementation abstractions.

Architecture should describe the shared presentation behavior or convention that requires them, not elevate every reusable component into an architectural owner.

The reasoning order is:

```text
What presentation behavior is required?
        ↓
Is it shared or interaction-specific?
        ↓
Who owns its meaning?
        ↓
Define the presentation contract
        ↓
Choose components and implementation
```

---

# Avoid Domain-Specific Shared UI

Shared User Interface behavior should remain meaningful across the application.

For example, a generic presentation convention for temporary feedback can be shared.

A control whose meaning is specifically "Go to next Bible chapter" is not application-wide merely because several Bible Modules use it.

Conceptually:

```text
Next Bible Chapter
    ↓
Bible meaning
    ↓
Bible Domain / Bible interaction
```

Shared use within one Domain does not create an application-wide UI responsibility.

This follows the same ownership rule used throughout the architecture: meaning determines ownership.

---

# Avoid Independent Module Conventions Without Reason

The opposite problem is allowing every Module to invent its own version of behavior that is genuinely application-wide.

Suppose several Modules require the same kind of temporary feedback.

If each invents unrelated behavior for:

```text
success
warning
failure
progress
```

the application begins to expose multiple interaction languages for the same conceptual presentation problem.

When the presentation meaning is genuinely shared, establish a common convention and allow Modules to participate in it.

Shared presentation should emerge from shared meaning, not merely from visual similarity.

---

# Adding a UI Capability

When new presentation behavior is introduced, reason through it in order:

```text
What user interaction is required?
        ↓
What gives that interaction meaning?
        ↓
Is it Domain behavior?
        → Domain
        ↓
Is it state for one active interaction?
        → Module
        ↓
Does it change Workspace composition?
        → Workspace Runtime
        ↓
Is the presentation behavior genuinely shared?
        │
        ├── No → Keep it with its owner
        │
        └── Yes
             ↓
Define the shared presentation convention
        ↓
Choose implementation
```

Do not begin with:

```text
Should this be a shared component?

Should this go in the UI folder?

Should every Module use this widget?
```

Those are implementation questions.

First determine whether the behavior itself is actually shared.

---

# Example: Verse Selection

Suppose Bible reading gains a new verse-selection interaction.

Begin with meaning.

```text
Verse Selection
    ↓
Bible content gives the selection meaning
    ↓
Bible Domain
```

The active interaction occurs within the Bible Reader Module:

```text
Bible Reader Module
    ↓
User selects verse
    ↓
Bible selection behavior
```

The selected-state appearance may use shared application conventions for selection if such a convention exists.

The architecture therefore does not create a generic "Selection Domain" or move Bible selection behavior into the shared User Interface merely because it has a visual representation.

---

# Example: Application Feedback

Suppose several Modules need to notify the user when an operation completes.

The operation remains owned by the responsibility that performed it.

For example:

```text
Notes Domain
    ↓
Create Note
    ↓
Success
```

Presentation of that success may use a shared feedback convention:

```text
Operation Result
    ↓
Shared Feedback Convention
    ↓
Visible Feedback
```

The User Interface owns the consistency of the presentation convention.

It does not own the operation or determine whether it succeeded.

---

# Big Takeaway

The User Interface provides a shared presentation language for independently owned application behavior.

It should not become a catch-all owner for everything visible on screen.

When adding presentation behavior, ask:

> **What gives this interaction meaning?**

Then distinguish:

```text
Domain
    owns application meaning

Module
    owns the active interaction

Workspace Runtime
    owns interaction composition

User Interface
    establishes genuinely shared presentation conventions
```

Use shared UI behavior when the presentation concept itself is shared.

Keep Domain-specific and Module-specific behavior with the responsibility that gives it meaning.

Architecture determines those boundaries first.

Components, styling, framework choices, and other presentation implementation follow afterward.
