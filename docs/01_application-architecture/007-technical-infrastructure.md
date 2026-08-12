# Technical Infrastructure

## Status

Current

---

# Purpose

This document defines the role of Technical Infrastructure within the Application Architecture.

Its primary question is:

> **When is a responsibility a technical capability rather than application behavior?**

Infrastructure isolates the application from technologies and platform-specific mechanisms. It provides the technical capabilities required to realize responsibilities whose meaning is defined elsewhere in the architecture.

---

# Infrastructure in the Architecture

Application responsibilities define what the application means and what it must do.

Infrastructure provides mechanisms that allow those responsibilities to be implemented on the current platform.

Conceptually:

```text
Application Responsibility
        ↓
Technical Capability
        ↓
Technology / Platform
```

For example:

```text
Persist Domain Objects
        ↓
Persistent Storage
        ↓
IndexedDB
```

or:

```text
Communicate with external systems
        ↓
Networking
        ↓
HTTP / WebSocket
```

The architectural responsibility does not become Infrastructure simply because technology is required to implement it.

Infrastructure provides the mechanism.

---

# Technical Capabilities

Infrastructure is organized around technical capabilities rather than application meaning.

Examples include:

```text
Infrastructure

    Persistent storage
    Networking
    Serialization
    Compression
    Cryptography
    Worker execution
    Browser integration
    Timing
```

Specific technologies may implement these capabilities.

For example:

```text
Persistent Storage
    → IndexedDB

Networking
    → HTTP
    → WebSocket

Background Execution
    → Web Worker

Browser Integration
    → Browser APIs
```

The technology is replaceable.

The technical capability describes what the application requires from the platform.

---

# Application Responsibility vs Technical Capability

The most important distinction is between **meaning** and **mechanism**.

Application responsibilities determine:

* what should happen,
* why it should happen,
* what information is meaningful,
* and which owner is responsible for the result.

Infrastructure determines how a technical operation is performed.

For example:

| Application responsibility                                           | Infrastructure capability                                |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| Notes determines what Note information must persist                  | Persistent storage stores bytes or records               |
| Bible determines what Bible search means                             | An indexing engine may provide indexing primitives       |
| Background Processing determines what work should execute            | Worker infrastructure provides another execution context |
| Resource Boundary determines which Resource must be retrieved        | Networking performs communication                        |
| Resource representation determines that content requires compression | Compression performs the encoding and decoding           |

Infrastructure performs the mechanism without taking ownership of the application decision that required it.

---

# Determining Whether Something Is Infrastructure

When introducing a new responsibility, first ask:

> **Does this responsibility derive its meaning from the application, or does it exist because software must interact with a technology or platform?**

If its meaning comes from Bible, Notes, Reading Plans, the Workspace Runtime, the Resource Boundary, or another application responsibility, it belongs there.

If the responsibility is simply the technical mechanism required to realize that behavior, it may belong in Infrastructure.

For example:

```text
Search Bible text
    ↓
Meaning comes from Bible
    ↓
Bible Domain
```

The search implementation may then require:

```text
Indexing primitives
    ↓
Technical mechanism
    ↓
Infrastructure
```

Likewise:

```text
Synchronize Resources
    ↓
Meaning comes from Resource lifecycle
    ↓
Resource Boundary
```

while:

```text
Send WebSocket messages
    ↓
Technical mechanism
    ↓
Infrastructure
```

The implementation technology does not determine ownership of the higher-level responsibility.

---

# A Useful Secondary Test

A useful secondary question is:

> **Would this capability still make sense if the application solved a completely different problem?**

Capabilities such as networking, persistent storage, compression, cryptography, timers, and worker execution generally would.

Behavior such as Bible search, Note persistence rules, Reading Plan progression, Pane splitting, and Resource Resolution would not.

This test helps identify technical mechanisms, but application meaning remains the primary ownership test.

---

# Infrastructure Does Not Make Application Decisions

Infrastructure should perform technical operations without deciding when or why those operations are required.

For example:

```text
Persistent Storage
    stores information

but does not decide
    what information should be persisted
```

```text
Networking
    communicates with another system

but does not decide
    which Resource the application requires
```

```text
Compression
    compresses and decompresses information

but does not decide
    which application representation should be compressed
```

```text
Worker Execution
    provides another execution context

but does not decide
    which application work belongs in the background
```

Those decisions remain with the responsibility that gives the operation meaning.

---

# Infrastructure Is Not a Layer

Technical Infrastructure should not be treated as a mandatory layer through which all application behavior passes.

There is no architectural pipeline such as:

```text
Runtime
    ↓
Services
    ↓
Data Access
    ↓
Infrastructure
```

Different architectural responsibilities may require different technical capabilities.

Conceptually:

```text
Bible Domain ───────────────┐
                            │
Workspace Runtime ──────────┼──→ Technical Capabilities
                            │
Resource Boundary ──────────┤
                            │
Background Processing ──────┘
```

The dependency exists because a responsibility requires a technical mechanism.

Infrastructure does not become the architectural owner of the responsibility using that mechanism.

---

# Capability Boundaries

When application architecture depends upon a technical capability, the dependency should describe the capability rather than unnecessarily expose the technology behind it.

Conceptually:

```text
Application Responsibility
        ↓
Persistent Storage
        ↓
IndexedDB
```

rather than making IndexedDB itself part of the application's conceptual model.

Likewise:

```text
Resource Boundary
        ↓
Network Communication
        ↓
WebSocket
```

The architecture can therefore remain stable even when the technology used to implement the capability changes.

This does not require an abstraction around every browser API or library. A capability boundary is useful when the technology would otherwise leak into responsibilities that should not depend upon it.

---

# Infrastructure and the Resource Boundary

The Resource Boundary defines how Domain information is represented and communicated outside the application's local model.

Infrastructure may provide technical mechanisms required to realize that boundary.

For example:

```text
Resource Boundary

    Resource Resolution
    Resource Publication
    Resource Synchronization

            ↓

Technical Capabilities

    Networking
    Serialization
    Compression
    Cryptography

            ↓

Current Technologies

    Nostr
    Blossom
    HTTP
    WebSocket
    Browser APIs
```

The Resource Boundary determines the meaning of the Resource operation.

Infrastructure performs the technical mechanisms required by the chosen boundary implementation.

Nostr and Blossom therefore do not define the Application Architecture. They are technologies currently used to realize Resource Boundary responsibilities.

---

# Infrastructure and Persistence

Persistence follows the same distinction.

An architectural owner determines:

* what information needs to persist,
* what that information means,
* and the rules governing its persistence.

Infrastructure provides the mechanism used to store it.

Conceptually:

```text
Owner
    ↓
Persistence Requirement
    ↓
Persistent Storage Capability
    ↓
IndexedDB
```

The fact that several owners use IndexedDB does not make IndexedDB responsible for their persistence semantics.

It only provides the storage mechanism.

---

# Infrastructure and Background Execution

Running work in the background does not determine ownership of that work.

For example:

```text
Bible Search Indexing
        ↓
Bible-owned behavior
        ↓
Background execution
        ↓
Web Worker
```

The Bible Domain still owns the indexing behavior because Bible search gives that work meaning.

Worker infrastructure only determines where or how the work executes.

The same distinction applies to synchronization, maintenance, parsing, or any other work moved into a worker.

---

# Avoid Technology-Defined Architecture

A technology should not become an architectural concept merely because it is important to the implementation.

Avoid reasoning such as:

```text
We use IndexedDB
    ↓
Therefore IndexedDB owns persistence
```

or:

```text
We use Web Workers
    ↓
Therefore workers own background work
```

or:

```text
We use Nostr
    ↓
Therefore Nostr defines resource behavior
```

Instead reason from responsibility:

```text
What must the application accomplish?
        ↓
Who gives that responsibility meaning?
        ↓
What technical capability is required?
        ↓
Which technology should implement it?
```

This keeps architecture ahead of implementation.

---

# Adding a Technical Capability

When new functionality requires a technology or platform feature, work through the decisions in order.

```text
What application responsibility requires the capability?
        ↓
Who owns that responsibility?
        ↓
What technical operation does the owner require?
        ↓
Is that operation application-specific?
        │
        ├── Yes → Keep it with the application owner
        │
        └── No → Consider an Infrastructure capability
        ↓
What capability should the architecture depend upon?
        ↓
Which technology should implement it?
```

Do not begin with:

```text
Where should the WebSocket code live?

Should this use IndexedDB?

Should this run in a worker?
```

Begin with the responsibility requiring those technologies.

---

# Example: Adding Bible Search Indexing

Suppose Bible search requires a new index.

Start with the application responsibility:

```text
Search Bible content
    ↓
Bible Domain
```

The Bible Domain determines:

* what content is searchable,
* how search queries are interpreted,
* what results mean,
* and when an index must be updated.

Implementing that behavior may require generic indexing or background-execution capabilities.

```text
Bible Search
    ↓
Bible indexing behavior
    ↓
Technical capabilities
        Index storage
        Worker execution
```

Those technical capabilities do not become owners of Bible search.

If the current implementation uses IndexedDB and a Web Worker, those technologies sit beneath the technical capabilities:

```text
Bible Domain
    ↓
Bible Search
    ↓
Index / Background Execution Capabilities
    ↓
IndexedDB / Web Worker
```

A future change in storage engine or execution mechanism should not change who owns Bible search.

---

# Big Takeaway

Technical Infrastructure provides mechanisms.

It does not define application meaning.

When deciding whether something belongs in Infrastructure, ask:

> **Is this the application responsibility itself, or is it the technical mechanism required to realize that responsibility?**

Application responsibilities remain with the owner that gives them meaning.

Infrastructure may provide storage, networking, serialization, compression, worker execution, browser integration, or other technical capabilities required to implement those responsibilities.

The reasoning sequence is:

```text
Responsibility
    ↓
Ownership
    ↓
Required Technical Capability
    ↓
Technology
```

Architecture determines what is required and why.

Infrastructure determines how the platform can make it possible.
