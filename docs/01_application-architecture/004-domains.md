# Domains

## Status

Current

---

# Purpose

This document defines how application behavior and data are organized into Domains.

A Domain represents a cohesive area of application meaning and behavior.

This document also provides a decision process for determining where new application capabilities belong.

The goal is not only to describe the current Domain model, but to help future development extend that model without creating unnecessary Domains, moving behavior to the wrong owner, or allowing implementation mechanisms to define the architecture.

---

# Domain Model

The application is currently organized around the following Domains:

```text id="xlbpqy"
Application

    Bible Domain
        Bible content
        Bible navigation
        Bible references
        Bible search
        Strong's information
        Bible annotations

    Notes Domain
        Notes
        Notes search
        Scripture associations

    Reading Plans Domain
        Reading Plans
        Reading progress
        Completed readings

    Settings Domain
        Application preferences
```

Each Domain groups concepts and behavior that derive their meaning from the same area of the application.

For example, Bible search belongs to the Bible Domain because the Bible gives that search behavior meaning. Annotations also belong to the Bible Domain because they describe selections within Bible content.

A capability does not become a separate Domain merely because it has its own implementation, Module, storage requirements, or user interface.

---

# Adding New Behavior

When introducing new application behavior, begin by asking:

> **What gives this behavior meaning?**

If the behavior only makes sense in relation to an existing Domain, that Domain should own it.

For example:

```text id="zjxo4r"
Search Scripture
    ↓
Meaning comes from Bible content
    ↓
Bible Domain
```

```text id="k28kox"
Highlight a Bible verse
    ↓
Meaning comes from Bible content
    ↓
Bible Domain
```

```text id="4qnqsm"
Track completion of a Reading Plan
    ↓
Meaning comes from Reading Plans
    ↓
Reading Plans Domain
```

The first question is therefore not:

> Should this be a service?

or:

> Should this be a Module?

or:

> Where should this file live?

The first question is:

> **Which Domain gives this responsibility meaning?**

---

# Extending an Existing Domain

Most new capabilities should extend an existing Domain rather than introduce a new one.

A capability belongs within an existing Domain when its meaning, rules, and data are already grounded in that Domain.

For example:

```text id="s2t8rl"
Bible Domain

    Reading
    Search
    References
    Strong's
    Annotations
```

These capabilities are different behaviors, but they all operate on concepts whose meaning comes from the Bible.

They therefore remain one Domain.

Separate implementations do not imply separate ownership.

---

# Introducing a New Domain

A new Domain should represent a genuinely new area of application meaning.

Before creating one, ask:

> **Would this concept still make sense independently from the existing Domains?**

and:

> **Does it introduce its own enduring data, rules, and behavior?**

If the answer is no, it probably belongs within an existing Domain.

For example, Bible Search does not require a Search Domain because its results, rules, and meaning all depend upon Bible content.

Likewise, Bible annotations do not require an Annotations Domain because their meaning exists only in relation to Scripture.

A new Domain should therefore represent a new conceptual area of the application rather than a new technical capability or presentation feature.

---

# Domain Objects

Domains express their information through Domain Objects.

A Domain Object represents information according to its application meaning rather than according to how that information is stored or transported.

Examples include:

```text id="5dwrkb"
Bible Domain
    Chapter
    Annotation
    Strong's Entry

Notes Domain
    Note

Reading Plans Domain
    Reading Plan
    Completed Reading
```

A Nostr event, IndexedDB record, serialized JSON object, or other external representation is not itself a Domain Object.

Those representations may contain the information required to reconstruct one.

Inside the application, Domain behavior operates on Domain Objects.

---

# Deciding Where a Domain Object Belongs

When introducing a new Domain Object, ask:

> **Which Domain defines what this information means?**

That Domain owns the object.

For example:

```text id="7l4n2x"
Annotation
    ↓
Describes Bible content
    ↓
Bible Domain
```

```text id="r0szt7"
Completed Reading
    ↓
Describes Reading Plan progress
    ↓
Reading Plans Domain
```

A Domain Object may reference information owned elsewhere without changing ownership.

For example:

```text id="9rzz4t"
Note
    └── Bible Location Reference
```

The Note remains owned by the Notes Domain.

The Bible reference expresses a relationship to Bible information.

---

# Domain Behavior and Modules

A Domain may expose several different behaviors to the user.

Those behaviors may participate in the Workspace Runtime through Modules.

As defined by the Workspace Runtime:

> **A Module Instance is a conceptual wrapper around a Domain behavior.**

For example:

```text id="jzwamu"
Bible Domain

    Bible reading behavior
        ↓
    Bible Reader Module

    Bible search behavior
        ↓
    Bible Search Module
```

The existence of multiple Modules does not divide the Domain.

Modules represent independently useful Runtime interactions.

Domains represent ownership of behavior.

---

# Deciding Whether a Behavior Needs a Module

When adding a Domain capability, ask:

> **Does this behavior need to exist as an independently active interaction in the Workspace?**

If yes, it may warrant its own Module.

Bible Search is independently useful and can occupy its own Buffer, so it can be represented by a Bible Search Module.

Other behavior may remain part of an existing Module.

For example, Bible annotations belong to the Bible Domain but can be presented within the Bible Reader interaction.

Conceptually:

```text id="1ix39k"
Bible Domain

    Bible Reading
        ↓
    Bible Reader Module
        ├── Scripture presentation
        └── Annotation interaction
```

Domain ownership and Module composition are separate decisions.

---

# Domain Boundary

A Domain exposes the behavior required by the rest of the application through its Public API.

Consumers should depend upon that boundary rather than the Domain's internal implementation.

Conceptually:

```text id="0vhkj5"
Consumer
    ↓
Domain Public API
    ↓
Domain Behavior
    ↓
Domain Objects
```

The Domain may internally use services, stores, parsers, factories, indexes, workers, or other mechanisms.

Those are implementation details beneath the Domain boundary.

---

# Deciding What Belongs in the Public API

When adding behavior to a Domain, ask:

> **Does another owner need to request this behavior?**

If not, the behavior may remain internal.

If another owner needs it, the Domain should expose an appropriate capability through its Public API rather than exposing the implementation that performs it.

For example, a consumer should request Bible chapter behavior rather than reach directly into:

* Bible storage,
* Bible indexes,
* parsers,
* or transport representations.

The Public API exposes the responsibility.

The implementation remains private.

---

# Domain Collaboration

Some application workflows involve more than one Domain.

Collaboration should preserve the ownership of each Domain.

The appropriate mechanism depends on what is being communicated.

A Domain may:

* request another Domain's behavior through its Public API,
* refer to another Domain's information using a shared identifier,
* communicate that something occurred through an Application Event,
* or initiate another Runtime interaction using Navigation Context.

These mechanisms solve different collaboration problems without merging ownership.

---

# Choosing a Collaboration Mechanism

When one responsibility needs something from another, ask what kind of relationship exists.

## Behavior Is Required

Use the owner's Public API.

```text id="2qs80f"
Consumer
    ↓
Bible Public API
    ↓
Bible behavior
```

---

## Information Must Be Referenced

Use an identifier.

```text id="tthn0f"
Note
    └── Bible Location Reference
```

The consumer can express the relationship without depending on Bible storage.

---

## Something Happened

Use an Application Event when other responsibilities may need to react.

```text id="5g01y6"
Notes Domain
    ↓
Note Created Event
    ↓
Interested Consumers
```

---

## Another Runtime Interaction Should Begin

Use Navigation Context.

```text id="b9f1nm"
Reading Plans Module
    ↓
Bible Navigation Context
    ↓
Workspace Runtime
    ↓
Bible Reader Module
```

The source provides context.

The target remains responsible for interpreting its own Domain meaning.

---

# Domain Information and the Resource Boundary

Inside the application, Domains operate on Domain Objects.

When Domain information must be represented outside the application's local model, it crosses the Resource Boundary as a Resource.

Conceptually:

```text id="o5wmy0"
Domain
    ↓
Domain Object

========== Resource Boundary ==========

Resource
```

The Resource Boundary defines the external representation and lifecycle of that information.

The Domain continues to define what the information means.

---

# Crossing Into the Application

Information arriving from outside the application does not immediately become a Domain Object.

Conceptually:

```text id="d2a8rx"
Resource
    ↓
Resource Boundary
    ↓
Validation
    ↓
Domain Object
    ↓
Domain
```

The Resource Boundary handles the process required to bring external information into the application.

The Domain defines whether the resulting information is valid according to its Domain meaning.

Only accepted information becomes part of the application's local Domain model.

---

# Crossing Out of the Application

When Domain information must be published or otherwise communicated externally, the Domain Object is represented as a Resource.

Conceptually:

```text id="bsxc3h"
Domain
    ↓
Domain Object
    ↓
Resource Boundary
    ↓
Resource
```

The Domain should not need to know whether the resulting Resource is ultimately transported through Nostr, Blossom, another protocol, or some future mechanism.

Those mechanisms exist beneath the Resource Boundary.

---

# Adding a New Domain Capability

When introducing new application functionality, work through the following questions in order.

```text id="u5kl6x"
What behavior or information is being introduced?
        ↓
Which Domain gives it meaning?
        ↓
Does it extend an existing Domain?
        │
        ├── Yes → Add it to that Domain
        │
        └── No → Does it represent a new enduring area of meaning?
                         │
                         └── Consider a new Domain
        ↓
What Domain Objects are involved?
        ↓
Does the behavior require an independent Module?
        ↓
What must the Domain expose publicly?
        ↓
Does it need to collaborate with another owner?
        ↓
Does its information cross the Resource Boundary?
        ↓
Choose implementation
```

This order keeps architectural decisions ahead of implementation decisions.

---

# Example: Adding Cross References

Suppose the application gains support for Bible cross references.

Begin with meaning.

Cross references describe relationships between Bible passages.

Therefore:

```text id="2gb256"
Cross References
    ↓
Bible meaning
    ↓
Bible Domain
```

Next determine the Domain information and behavior involved.

The Bible Domain may gain:

```text id="4jaoiu"
Bible Domain

    Cross-reference information

    Cross-reference lookup behavior
```

Then determine presentation.

If cross references need an independently active Workspace interaction, they may be exposed through a Module.

```text id="3wm25y"
Bible Domain
    ↓
Cross-reference behavior
    ↓
Bible References Module
```

Finally determine what implementation is required.

Only after the ownership, behavior, objects, boundaries, and presentation model are understood should implementation questions such as storage, indexing, transport, or component structure be answered.

---

# Big Takeaway

Domains organize the application around enduring areas of meaning and behavior.

When adding functionality, begin by asking:

> **Which Domain gives this responsibility meaning?**

Extend an existing Domain when the new capability belongs to concepts that Domain already owns.

Create a new Domain only when the application gains a genuinely distinct area of meaning, data, rules, and behavior.

Then determine:

* the Domain Objects involved,
* whether the behavior needs a Module,
* what must be exposed through the Domain's Public API,
* how collaboration should occur,
* and whether Domain information must cross the Resource Boundary.

Only after those architectural questions are answered should implementation be chosen.
