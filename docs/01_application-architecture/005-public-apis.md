# Public APIs

## Status

Current

---

# Purpose

This document defines how independently owned parts of the application expose capabilities to one another.

Its primary question is:

> **When another owner needs something from this owner, what should be made public?**

A Public API makes an ownership boundary explicit. It exposes the concepts and behavior that other parts of the application are allowed to depend upon while keeping implementation details private.

---

# Public API Model

An owner consists conceptually of a public boundary and an internal implementation.

```text id="s0bb4p"
Consumer
    ↓
Public API
    ↓
Owner
    ↓
Internal Implementation
```

The consumer depends upon the Public API rather than the implementation behind it.

For example:

```text id="ralwpu"
Bible Domain

    Public API
        Bible Chapter
        Bible Location Reference
        chapter retrieval
        Bible search

    Internal
        storage
        parsers
        indexes
        factories
        other implementation
```

The same model applies outside Domains. The Workspace Runtime may expose operations for opening Modules, splitting Panes, or changing the active Workspace without exposing its internal Pane-tree implementation.

---

# What a Public API Represents

A Public API exposes the part of an owner's responsibility that is intentionally available to other owners.

Depending on the owner, this may include:

* Domain Objects,
* identifiers,
* queries,
* operations,
* events,
* or other enduring application concepts.

The Public API should describe **what the owner provides**, not how the capability happens to be implemented.

Services, stores, repositories, factories, workers, components, and similar mechanisms may implement that behavior internally. They do not become the architectural boundary merely because callers could technically import them.

---

# Designing a Public API

When another owner needs access to a capability, begin with the responsibility rather than the implementation.

Ask:

> **What does the consumer actually need from this owner?**

Then:

> **What is the smallest enduring concept or behavior that satisfies that need?**

For example, if Notes needs Bible information, the requirement may be:

```text id="m0vpso"
Retrieve a Bible Chapter
```

The public contract should express that capability.

It should not expose:

```text id="1v3j6l"
Bible IndexedDB store
Bible parser
relay query
chapter cache
```

Those are possible implementations of the capability rather than the capability itself.

---

# What Should Become Public?

A capability should become public because another owner genuinely needs to depend upon it.

Ask:

> **Does another owner need this concept or behavior?**

If not, keep it internal.

If yes, ask:

> **Is this something the owner can meaningfully support as part of its architectural contract?**

A useful internal helper should not become public merely because exporting it is convenient.

Every public concept creates a dependency that the owner may need to preserve as the application evolves.

---

# Public API Cohesion

A Public API should reflect the meaning of its owner.

For example:

```text id="96jhrq"
Bible Domain

    Bible Chapters
    Bible Locations
    Bible search
    Bible navigation
```

and:

```text id="ktjr0c"
Workspace Runtime

    open Module
    split Pane
    close Pane
    select Buffer
```

A consumer should be able to understand what an owner provides by examining its Public API.

Unrelated capabilities should not accumulate within one public surface simply because exposing them there is convenient.

---

# Public and Internal Boundaries

Anything not intentionally exposed remains internal to the owner.

Conceptually:

```text id="d0n7td"
Owner

    Public
        concepts and behavior
        used by other owners

    Internal
        implementation required
        to fulfill those responsibilities
```

Internal implementation may change freely as long as the owner's public contract remains satisfied.

This is what allows architecture to remain stable while implementation evolves.

---

# Cross-Owner Dependencies

A dependency should point toward the owner of the concept being used.

For example:

```text id="6hkm8f"
Notes Domain
      ↓
Bible Public API
      ↓
Bible Domain
```

Notes may use Bible behavior.

That dependency does not make the behavior Notes-owned.

Likewise:

```text id="g331ll"
Bible Reader Module
      ↓
Workspace Runtime Public API
      ↓
Workspace Runtime
```

A Bible interaction may request that another Pane be opened without owning Pane behavior.

Usage creates a dependency.

It does not transfer ownership.

---

# Choosing the Right Collaboration Mechanism

Not every interaction between owners requires a Public API operation.

Use the collaboration mechanism that matches the relationship.

```text id="zjsrrz"
Need behavior?
    → Public API

Need to reference information?
    → Shared Identifier

Need to announce that something happened?
    → Application Event

Need to initialize another Runtime interaction?
    → Navigation Context
```

A Public API is appropriate when one owner must deliberately request behavior or obtain information from another owner.

The other mechanisms allow collaboration without turning every relationship into a direct behavioral dependency.

---

# Avoid Leaking Implementation

Public APIs should expose architectural concepts rather than implementation structures.

Prefer:

```text id="fr3xuv"
getChapter(location)

searchBible(query)

openModule(module, context)
```

over contracts centered around implementation details such as:

```text id="0kxb0v"
readChapterRecordFromIndexedDB()

queryChapterRelayEvent()

callPaneServiceInternalMethod()
```

The first group describes capabilities owned by the application architecture.

The second group exposes how those capabilities happen to be implemented today.

If consumers require implementation knowledge to use the API correctly, the boundary is probably too low.

---

# Adding a Public Capability

When a new consumer requires behavior from another owner, work through the decision in order.

```text id="cub8fc"
What does the consumer need?
        ↓
Who owns that responsibility?
        ↓
Does the owner already expose it?
        │
        ├── Yes → Use the existing Public API
        │
        └── No
             ↓
Does this capability need to be public?
        ↓
Define the smallest enduring contract
        ↓
Keep implementation behind the boundary
```

Do not begin by exporting an existing service or helper.

First determine what the architectural contract should be.

The implementation can then be adapted to fulfill that contract.

---

# Example: Notes Requires Bible Content

Suppose the Notes Domain needs Bible text associated with a Note.

The first question is ownership.

Bible content belongs to the Bible Domain.

```text id="dmgzvn"
Notes Domain
    needs
Bible Chapter
```

Notes should therefore depend upon the Bible Domain's Public API rather than retrieving Bible data from storage itself.

```text id="waf81c"
Notes Domain
      ↓
Bible Public API
      ↓
Bible Domain
      ↓
Bible Chapter
```

The Bible Domain remains free to change how the chapter is retrieved.

Notes depends only upon the capability and the Domain Object it receives.

---

# Example: Opening Another Module

Suppose a Bible interaction needs to open Bible References in another Pane.

The Bible Domain owns the reference behavior.

The Workspace Runtime owns how active Module Instances are arranged.

The interaction therefore requests the Runtime operation through the Workspace Runtime's Public API.

```text id="yl0l69"
Bible interaction
      ↓
Workspace Runtime Public API
      ↓
open Module
      ↓
Workspace Runtime
```

The caller expresses the desired Runtime behavior.

It does not manipulate the Pane tree directly.

---

# Changing a Public API

Public APIs should evolve deliberately because other owners may depend upon them.

Before changing an existing contract, ask:

> **Can the new requirement be added without changing the meaning of the existing contract?**

If yes, prefer a compatible extension.

Examples may include:

* adding a new operation,
* exposing a new concept,
* or adding optional information.

Avoid silently changing what an existing operation or object means.

A public contract should remain predictable for its consumers.

---

# Versioning

When a Public API must change incompatibly, the owner may introduce a new version rather than requiring every consumer to migrate simultaneously.

Conceptually:

```text id="n6lzt8"
Owner

    Public API v1
        ↓
    Existing Consumers

    Public API v2
        ↓
    New / Migrated Consumers
```

The older and newer contracts may coexist while consumers migrate.

Versioning separates three different actions:

```text id="sc6f31"
Introduce new contract
        ↓
Migrate consumers
        ↓
Retire old contract
```

They do not need to occur as one coordinated change.

---

# Deciding When to Version

Do not version every API change.

Versioning is useful when the meaning or shape of an existing public contract must change in a way that would break current consumers.

Ask:

> **Can the existing contract continue to mean what it means today?**

If yes, extend it compatibly where practical.

If no, introduce a new contract and allow consumers to migrate deliberately.

The purpose of versioning is not to preserve old implementation.

It is to prevent an architectural boundary from causing cascading change throughout the application.

---

# Version Ownership

The owner of a Public API owns the lifecycle of that API.

The owner determines:

* what each version means,
* which versions remain available,
* what compatibility each version provides,
* and when an obsolete version can be retired.

Consumers choose among the contracts the owner exposes.

They should not independently redefine another owner's API to satisfy their own implementation needs.

If a new capability is required, the change should be made at the owning boundary.

---

# Adding or Changing an API

When designing or evolving a Public API, use the following sequence:

```text id="evr7gc"
What responsibility is needed?
        ↓
Who owns it?
        ↓
Who needs to consume it?
        ↓
What enduring concept or behavior should be public?
        ↓
What should remain internal?
        ↓
Can the existing contract support the requirement?
        │
        ├── Yes → Extend compatibly
        │
        └── No → Introduce a new version
        ↓
Choose implementation
```

The Public API is designed before choosing how it will be exposed in code.

---

# Big Takeaway

Public APIs make ownership boundaries usable.

When another owner needs a capability, expose the smallest enduring contract that represents the behavior or concept being requested.

Consumers depend upon that contract rather than the implementation behind it.

When designing a boundary, ask:

> **What does the consumer actually need from the owner?**

Then expose that capability intentionally, keep everything else internal, and evolve the contract without unnecessarily disrupting existing consumers.

Ownership defines the boundary.

The Public API makes collaboration across that boundary explicit.
