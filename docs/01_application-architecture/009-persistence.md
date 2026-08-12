# Persistence

## Status

Current

---

# Purpose

This document defines how application state survives beyond the current execution of KJVOnly.

Its primary question is:

> **When application state must survive, who determines what is persisted and what makes that persisted state meaningful?**

Persistence provides durability. It does not take ownership of the state being persisted.

The owner of the state determines its meaning and persistence requirements. Technical Infrastructure provides the storage mechanisms used to satisfy those requirements.

---

# Persistence Model

KJVOnly is offline-first.

Application state that must survive a refresh, restart, suspension, or loss of network connectivity is persisted locally.

Conceptually:

```text
Architectural Owner
        ↓
Owned State
        ↓
Persistence Requirement
        ↓
Persistent Storage Capability
        ↓
Storage Technology
```

For example:

```text
Notes Domain
    ↓
Notes
    ↓
Must survive application restart
    ↓
Persistent Storage
    ↓
IndexedDB
```

The Notes Domain owns the Notes and determines what their persisted state means.

Persistence makes that state durable.

IndexedDB is the current technical mechanism used to store it.

---

# What Is Persisted?

Several kinds of application state may require persistence.

```text
Application

    Domain State
        Bible data
        annotations
        Notes
        Reading Plans
        completed readings

    Runtime State
        Workspace structure
        Buffers
        Module context

    Settings
        application preferences

    Derived State
        search indexes
        cached projections

    Operational Metadata
        installation state
        synchronization state
        other bookkeeping
```

These categories may all use persistent storage, but they do not therefore share architectural ownership.

The meaning of each piece of persisted state remains with the responsibility that owns it.

---

# Persistence Does Not Determine Ownership

Physical storage location does not determine architectural ownership.

A Note does not become persistence-owned because it is stored in IndexedDB. Workspace state does not become persistence-owned because it is stored alongside Notes.

Instead:

```text
Note
    → Notes Domain

Workspace structure
    → Workspace Runtime

Application preference
    → Settings Domain

Bible search index
    → derived from Bible-owned information
```

Persistence preserves these states without becoming their conceptual owner.

When adding persisted state, determine ownership before choosing how or where it will be stored.

---

# Persisting Domain State

Domains determine the persistence semantics of their Domain Objects.

For example, the Notes Domain determines what constitutes a Note, how Notes are identified, and which changes affect Note state. The persistence mechanism does not define those rules.

Conceptually:

```text
Notes Domain
    ↓
Note Domain Object
    ↓
Persistence
    ↓
Durable Local State
```

The same relationship applies to Bible annotations, Reading Plan progress, completed readings, and other Domain-owned information.

Application behavior continues to operate on Domain Objects rather than persistence-specific representations.

---

# Persisting Runtime State

The Workspace Runtime may persist enough Runtime state to reconstruct the user's working environment.

This may include:

* Workspace structure,
* Pane and Buffer relationships,
* active Module types,
* Navigation Context,
* and other state required to restore the Runtime.

The Workspace Runtime owns the meaning of that state.

Persistence only ensures that the state remains available for reconstruction during a later application execution.

A persisted Runtime representation should therefore describe Runtime state rather than depend upon live presentation components or framework instances.

---

# Persisting Settings

Application preferences belong to the Settings Domain.

Examples may include:

* appearance preferences,
* selected Bible version,
* and other user-configurable application settings.

Persistence makes those preferences durable.

Their proximity to Runtime or Domain data in physical storage does not change their ownership.

---

# Local Authority

Persistence preserves the application's accepted local state.

Once a Domain Object or other owned state has been accepted locally, application behavior should not depend upon successful publication or current network availability before operating on that state.

Conceptually:

```text
Application Change
        ↓
Accept Local State
        ↓
Persist Local State
        ↓
Application Continues
```

The durable local model therefore remains usable while offline.

External systems may later receive or provide representations of that information through the Resource Boundary, but they do not become the authority for the application's current local state merely because they hold a copy.

---

# Persistence and Publication

Local persistence and external publication are different responsibilities.

When application behavior creates or changes Domain information, the locally accepted state is persisted independently from whether that change has been published.

Conceptually:

```text
Domain Change
      ↓
Accepted Local Domain Object
      ↓
Local Persistence

      and separately

Accepted Local Domain Object
      ↓
Resource Boundary
      ↓
Publication
```

Publication is therefore not "remote persistence" from the application's perspective.

Persistence preserves local application state.

Publication represents that information externally as part of the Resource lifecycle.

The outbox and publication model are defined by the Resource Boundary decisions responsible for publishing and synchronization.

---

# Local Changes

A local change should become usable without waiting for external publication.

For example:

```text
Edit Note
    ↓
Notes Domain accepts change
    ↓
Persist updated Note
    ↓
Updated Note is local state
```

Publication may follow independently:

```text
Updated Note
    ↓
Resource Boundary
    ↓
Outbox
    ↓
Published Resource
```

A relay being unavailable does not prevent the application from continuing to operate on the locally accepted Note.

This separation is fundamental to offline-first behavior.

---

# Deletion

Deletion follows the same ownership model as other state changes.

The owner determines that an object has been deleted, and persistence records the resulting local state.

Conceptually:

```text
Domain
    ↓
Delete Domain Object
    ↓
Persist resulting local state
```

If that deletion must also be represented externally, publication is handled separately through the Resource Boundary.

Persistence does not decide whether deletion is allowed or what deletion means for the Domain.

---

# Authoritative and Derived State

Not everything stored locally has the same architectural significance.

The application distinguishes between **authoritative local state** and **derived state**.

```text
Authoritative Local State
        ↓
    Derived State
```

Authoritative state represents information accepted by the application.

Derived state can be reconstructed from authoritative state.

For example:

```text
Notes
    ↓
Notes Search Index
```

The Notes are authoritative Domain information.

The search index is a derived representation used to make Notes search efficient.

---

# Persisting Derived State

Derived state may be persisted when reconstructing it is expensive or would unnecessarily delay application startup.

Examples may include:

* search indexes,
* lookup structures,
* cached projections,
* and other generated data.

Persisting derived state is an optimization.

It does not make that data authoritative.

A useful test is:

> **If this persisted data disappeared, could the application reconstruct it from its authoritative local state?**

If yes, it is likely derived state.

If losing it changes the application's actual accepted information, it is not merely derived.

---

# Derived State Follows Its Source

Derived data should remain associated with the responsibility whose information gives it meaning.

For example:

```text
Bible Domain
    ↓
Bible content
    ↓
Bible search index
```

and:

```text
Notes Domain
    ↓
Notes
    ↓
Notes search index
```

Both indexes may use the same indexing technology.

That shared implementation does not create a separate owner for the meaning of those indexes.

Persistence merely allows the derived structures to survive between executions.

---

# Operational Metadata

Some persistent information exists to coordinate application behavior rather than represent user-facing Domain Objects.

Examples may include:

* installation metadata,
* synchronization state,
* index state,
* or other local bookkeeping.

This information should not automatically be grouped under a generic "Persistence" owner.

Its ownership follows the responsibility that gives the metadata meaning.

For example:

```text
Resource installation metadata
    → Resource Boundary responsibility

Search index metadata
    → owning search responsibility

Workspace restoration metadata
    → Workspace Runtime
```

Storage is shared.

Meaning is not.

---

# Persistence and Data Access

Persistence makes accepted local state durable.

Data Access determines how a current request for a Domain Object is satisfied.

Conceptually:

```text
Data Access
    ↓
Accepted Local Model
    ↓
Persisted Local State
```

A request may benefit from persisted information, but the caller still requests the Domain Object rather than the persistence mechanism.

Data Access and Persistence therefore answer different questions:

```text
Data Access
    How do I obtain the requested Domain Object?

Persistence
    What state must survive beyond this execution?
```

---

# Persistence and Infrastructure

Persistence requirements belong to application responsibilities.

Storage technology belongs to Technical Infrastructure.

Conceptually:

```text
Owner
    ↓
Persistence Requirement
    ↓
Persistent Storage Capability
    ↓
Technology
```

The current browser implementation may use IndexedDB.

That implementation may change without changing which owner defines the persisted information or what that information means.

Do not design application behavior around IndexedDB records, object stores, keys, transactions, or another storage technology unless those details are genuinely part of an implementation document.

---

# Deciding Whether State Should Be Persisted

When introducing new state, work through the architectural decisions in order.

```text
What state is being introduced?
        ↓
Who gives that state meaning?
        ↓
Does it need to survive the current execution?
        │
        ├── No → Keep it transient
        │
        └── Yes
             ↓
Is it authoritative or derived?
        ↓
What persistence semantics does its owner require?
        ↓
Does a change also need external representation?
        │
        ├── No → Local persistence only
        │
        └── Yes → Resource Boundary separately
        ↓
What technical storage capability is required?
        ↓
Choose implementation
```

Do not begin with:

```text
Which IndexedDB store should this use?

Should this go in localStorage?

Should this be cached?
```

Those questions come after the state, ownership, authority, and durability requirements are understood.

---

# Example: Persisting a New Bible Feature

Suppose the Bible Domain gains a new user-created type of Bible metadata.

First determine ownership:

```text
New Bible Metadata
        ↓
Meaning comes from Bible content
        ↓
Bible Domain
```

Next determine whether the information must survive application restarts.

If it represents durable user state, the Bible Domain defines its persistence semantics.

```text
Bible Domain
    ↓
New Domain Object
    ↓
Local Persistence
```

If the information also needs to synchronize between devices or be published externally, that is a separate decision:

```text
New Domain Object
    ↓
Resource Boundary
    ↓
Resource
```

Only after these architectural decisions are made should the implementation choose a storage structure, IndexedDB schema, Resource representation, or synchronization mechanism.

---

# Big Takeaway

Persistence preserves application state across executions.

It does not own the meaning of that state.

The architectural relationship is:

```text
Owner
    ↓
Owned State
    ↓
Persistence Requirement
    ↓
Durable Local State
```

Some durable state is authoritative.

Some is derived and can be rebuilt.

Local persistence is separate from external publication, and application behavior does not wait for publication before operating on locally accepted state.

When adding new state, ask:

> **Who owns this state, does it need to survive, and is it authoritative or derived?**

Only after those questions are answered should storage technology be chosen.
