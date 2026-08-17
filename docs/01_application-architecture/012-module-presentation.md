# Module Presentation

## Status

Current

---

# Purpose

This document defines how Domain behavior participates as an active interaction within the Workspace Runtime.

Its primary question is:

> **When Domain behavior needs to become an interactive Workspace experience, how should it be represented as a Module?**

A Module Instance is a conceptual wrapper around a Domain behavior. It allows the Workspace Runtime to host that behavior without understanding the Domain that gives it meaning.

---

# Module Model

The Workspace Runtime operates on Runtime Objects:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
```

The Module Instance connects that Runtime structure to Domain behavior:

```text
Workspace Runtime
        ↓
Buffer
        ↓
Module Instance
        ↓
Domain Behavior
        ↓
Domain Objects
```

The Runtime understands that a Buffer contains a Module Instance.

It does not need to understand whether that Module represents Bible reading, Bible search, Notes, Reading Plans, or some future capability.

---

# What a Module Represents

A Module represents one independently useful interaction with application behavior.

For example:

```text
Bible Domain

    Bible reading
        ↓
    Bible Reader Module

    Bible search
        ↓
    Bible Search Module
```

Both Modules belong to the same Domain because the Bible gives both behaviors meaning.

The separate Modules exist because reading and searching are useful as separate Workspace interactions.

A Module therefore does not define architectural ownership.

It defines how owned behavior participates in the Runtime.

---

# Domain Behavior Comes First

Do not begin a feature by deciding to create a Module.

Begin with the Domain responsibility.

```text
New Behavior
    ↓
Determine Domain Ownership
    ↓
Define Domain Behavior
    ↓
Does it require an independent Workspace interaction?
```

Only after the behavior and its owner are understood should a Module be considered.

This prevents presentation structure from defining the Domain model.

---

# Deciding Whether Behavior Needs a Module

When adding Domain behavior, ask:

> **Does this behavior need to participate as an independently active interaction within the Workspace?**

If yes, a separate Module may be appropriate.

For example:

```text
Bible reading
    → independent interaction
    → Bible Reader Module

Bible search
    → independent interaction
    → Bible Search Module
```

Other behavior may remain part of an existing Module.

For example:

```text
Bible Domain

    Bible reading
    Bible annotations
        ↓
    Bible Reader Module
```

Annotations remain Bible-owned behavior, but they do not necessarily require their own independent Workspace interaction.

---

# Module Boundaries

A Module should represent a focused interaction rather than accumulate every capability owned by its Domain.

For example, the Bible Domain may support:

```text
Bible Domain

    Reading
    Search
    Strong's
    Annotations
    References
```

Those capabilities do not automatically become either one Module or five Modules.

The decision depends on how the behavior participates in the Workspace.

Ask:

> **Should the user be able to open, replace, position, or interact with this capability independently from the others?**

If so, a separate Module is a strong candidate.

If the behavior primarily supports another interaction, it may belong within that Module instead.

---

# Module Instances Are Runtime State

A Module Instance exists within a Buffer as part of the active Workspace.

Multiple Module Instances may therefore exist at the same time.

For example:

```text
Workspace

    Pane
        Bible Reader Instance

    Pane
        Bible Reader Instance

    Pane
        Bible Search Instance

    Pane
        Notes Instance
```

The two Bible Reader instances participate in the same Bible Domain behavior but represent different active Runtime interactions.

Creating another Module Instance does not create another Domain.

---

# Module State and Domain State

A Module Instance may require transient state describing its current interaction.

That state is different from Domain state.

For example:

```text
Bible Reader Module Instance

    current interaction context
    presentation state
    selection state

        ↓

Bible Domain

    Chapter
    Annotation
    other Bible-owned state
```

State that describes the user's current interaction with one Module Instance belongs with that Runtime interaction.

State whose meaning survives the Module and remains meaningful to the application belongs to the appropriate Domain or other architectural owner.

A useful question is:

> **If this Module Instance disappeared, should this information still exist?**

If yes, the information probably does not belong exclusively to the Module Instance.

---

# Module Lifecycle

Module Instances are created and removed as the Workspace changes.

Conceptually:

```text
Open behavior
    ↓
Create Buffer
    ↓
Create Module Instance
    ↓
Active interaction
    ↓
Replace or close
    ↓
Module Instance removed
```

Removing a Module Instance does not remove the Domain behavior or Domain Objects it was presenting.

The presentation is transient.

The underlying application meaning remains with its owner.

---

# Runtime Operations

A Module does not own Workspace composition.

When an interaction requires a Runtime operation, it requests that behavior through the Workspace Runtime's Public API.

For example:

```text
Bible Reader Module
        ↓
User opens verse reference
        ↓
Workspace Runtime Public API
        ↓
Open another Module
```

The Module expresses the desired interaction.

The Workspace Runtime decides how that interaction affects Panes, Buffers, and Workspace structure.

A Module should therefore not manipulate the Pane tree directly.

---

# Navigation Context

When one interaction opens another, the target Module may require information describing where or how to begin.

Navigation Context carries that information through the Runtime.

For example:

```text
Reading Plans Module
        ↓
Bible location
        ↓
Navigation Context
        ↓
Workspace Runtime
        ↓
Bible Reader Module
```

The Workspace Runtime transports the context without interpreting its Domain meaning.

The receiving Module and its Domain understand the information.

This preserves the Runtime's independence from Domain-specific navigation.

---

# Module Collaboration

Modules should not create their own application-level coordination model.

When one interaction requires behavior owned elsewhere, use the collaboration mechanism appropriate to that relationship.

```text
Need another owner's behavior?
    → Public API

Need to react to something that happened?
    → Application Event

Need to reference another owner's information?
    → Shared Identifier

Need to start another Runtime interaction?
    → Navigation Context
```

For example, a Notes interaction may contain a Bible Location Reference.

Opening that reference may result in:

```text
Notes Module
    ↓
Bible Location Reference
    ↓
Workspace Runtime
    ↓
Bible Reader Module
```

The Notes Module does not take ownership of Bible navigation.

It supplies the information required to begin the Bible interaction.

---

# Responding to Domain Changes

A Module presents current application state.

If the underlying Domain state changes, the Module should obtain the updated state through the owning Domain's normal boundary.

Conceptually:

```text
Domain State Changes
        ↓
Application Event
        ↓
Interested Module
        ↓
Domain Public API
        ↓
Updated Domain Object
```

The exact implementation may vary.

The architectural rule is that Modules do not need direct knowledge of the mechanism that produced the change.

A background refresh, another Module, synchronization, or some future workflow may all result in the same Domain state change.

---

# Presentation Without Domain Ownership

A Module may contain substantial interaction behavior without becoming the owner of the underlying application capability.

For example, a Bible Reader may handle:

* selection,
* scrolling,
* user gestures,
* presentation of annotations,
* navigation commands,
* and opening related interactions.

Those responsibilities describe the interaction.

The Bible Domain still owns:

* Bible content,
* annotation meaning,
* Bible navigation semantics,
* and other enduring Bible behavior.

The distinction is between **interaction state** and **application meaning**.

---

# Runtime Independence

The Runtime should not require changes merely because a new Domain capability gains a Module.

For example:

```text
Workspace Runtime

    hosts Module Instance
        ↓
    Bible Reader

    hosts Module Instance
        ↓
    Notes Search

    hosts Module Instance
        ↓
    Future Capability
```

The Runtime provides the generic Workspace structure.

Each Module determines how its particular Domain behavior participates within that structure.

This is what allows new application capabilities to be added without teaching the Runtime about each Domain.

---

# Module Presentation and User Interface

Module Presentation defines the architectural relationship between Runtime interaction and Domain behavior.

It does not define the visual design of the resulting interface.

Conceptually:

```text
Domain Behavior
    ↓
Module Instance
    ↓
User Interface
```

The Module identifies the active interaction and connects it to Domain behavior.

The User Interface determines the concrete controls, visual hierarchy, styling, accessibility, and interaction presentation used to expose that behavior.

Those concerns are addressed by the User Interface architecture.

---

# Adding a Module

When considering a new Module, work through the decisions in order:

```text
What behavior is being introduced?
        ↓
Which Domain owns it?
        ↓
What Domain behavior already exists?
        ↓
Does it need an independent Workspace interaction?
        │
        ├── No → Present through an existing Module
        │
        └── Yes
             ↓
What interaction state does the Module require?
        ↓
What Domain behavior does it request?
        ↓
What Navigation Context can initialize it?
        ↓
What Runtime operations can it request?
        ↓
What other owners must it collaborate with?
        ↓
Choose presentation implementation
```

Do not begin with:

```text
Which Svelte component should I create?

Where should the Module file live?

Should this have its own Pane?
```

Those decisions follow the architectural determination that the behavior actually requires an independent Module.

---

# Example: Bible Cross References

Suppose the Bible Domain gains cross-reference behavior.

Ownership is already clear:

```text
Cross References
    ↓
Bible Domain
```

The next question is presentation.

If cross references only appear alongside Bible reading:

```text
Bible Domain

    Reading
    Cross References
        ↓
    Bible Reader Module
```

No new Module is required.

If the user should be able to open and explore cross references independently:

```text
Bible Domain
    ↓
Cross-reference behavior
    ↓
Bible References Module
```

A new Module becomes appropriate because the behavior has gained an independent Workspace interaction.

The Domain ownership did not change.

Only its presentation composition changed.

---

# Example: Opening Multiple Bible Readers

Suppose the user opens several passages simultaneously.

The application may contain:

```text
Workspace

    Pane
        Bible Reader
        John 3

    Pane
        Bible Reader
        Romans 8

    Pane
        Bible Reader
        Genesis 1
```

These are separate Module Instances with separate Runtime contexts.

They all use the same Bible Domain.

This distinction is central to the model:

```text
One Domain
    ↓
Many possible Domain behaviors
    ↓
Many possible Module Instances
```

Runtime multiplicity does not imply duplicated Domain ownership.

---

# Big Takeaway

A Module Instance is the point where Domain behavior participates in the Workspace Runtime as an active interaction.

The architecture is:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
    ↓
Domain Behavior
```

When adding functionality, first determine its Domain ownership and behavior.

Then ask:

> **Does this behavior need an independently active Workspace interaction?**

If yes, represent that interaction through a Module.

If no, keep the behavior with its Domain and present it through an existing Module where appropriate.

The Runtime owns Workspace composition.

Domains own application meaning and behavior.

Module Instances connect the two without transferring ownership between them.
