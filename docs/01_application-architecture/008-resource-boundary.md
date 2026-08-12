# Resource Boundary

## Status

Current

---

# Purpose

This document defines the boundary between the application's internal Domain model and Resources used to represent Domain information outside that model.

Its primary question is:

> **When Domain information crosses the Resource Boundary, what changes representation and what remains owned by the application?**

Inside the application, behavior operates on Domain Objects. At the Resource Boundary, that information may be represented as Resources for publication, discovery, distribution, synchronization, or other external use.

---

# Boundary Model

The Resource Boundary is part of the Application Architecture.

It is not a separate architecture and does not introduce a separate "Resource Integration" layer between two architectural models.

Conceptually:

```text
Application

    Domain
        ↓
    Domain Object

========== Resource Boundary ==========

    Resource
```

The Domain Object and Resource may represent the same underlying information, but they serve different purposes.

The Domain Object expresses application meaning.

The Resource expresses that information in a form suitable for the Resource lifecycle.

---

# Domain Objects and Resources

A Domain Object is the application's internal representation of Domain information.

A Resource is an external representation of that information.

For example:

```text
Bible Domain
    ↓
Chapter Domain Object
    ↓
========== Resource Boundary ==========
    ↓
Chapter Resource
```

The application does not replace its Domain model with the Resource model.

Likewise, the Resource representation does not become the model on which Domain behavior operates.

The boundary exists specifically to keep those representations distinct.

---

# What Crosses the Boundary

Domain information crosses the Resource Boundary when it needs to participate in the Resource lifecycle.

This may include information that must be:

* published,
* discovered,
* distributed,
* synchronized,
* archived,
* or obtained from another publisher.

Not every Domain Object must have a Resource representation.

A Domain Object that exists only as local application state may remain entirely within the Domain model.

The need for external representation should therefore be an explicit architectural decision.

---

# Crossing Out of the Application

When Domain information must be published or otherwise represented externally, the Domain Object is transformed into a Resource representation.

Conceptually:

```text
Domain
    ↓
Domain Object
    ↓
========== Resource Boundary ==========
    ↓
Resource
    ↓
External Resource Lifecycle
```

The Domain continues to define what the information means and which invariants make it valid.

The Resource representation expresses that meaning according to the requirements of the Resource Boundary.

Once represented as a Resource, responsibilities such as Resource identity, publication, discovery, synchronization, and transport belong to the Resource lifecycle rather than Domain behavior.

---

# Preserving Domain Meaning

Crossing the Resource Boundary must not discard or redefine Domain meaning.

The owning Domain determines the structure and rules that make its information valid. The Resource representation must preserve enough of that meaning for the corresponding Domain Object to be reconstructed correctly.

Conceptually:

```text
Domain Meaning
      ↓
Domain Object
      ↓
Resource Representation
      ↓
Domain Object
      ↓
Same Domain Meaning
```

The representation may change.

The application meaning should not.

---

# Crossing Into the Application

Information arriving from outside the application's local Domain model arrives as a Resource.

It does not immediately become authoritative application state.

Conceptually:

```text
Resource
    ↓
Resolve Representation
    ↓
Construct Candidate Domain Object
    ↓
Validate Domain Meaning
    ↓
Acceptance Decision
    ↓
Installed Domain Object
```

The Resource Boundary handles the external Resource representation and resolution process.

The owning Domain determines whether the resolved information constitutes valid Domain information.

The application then determines whether that valid candidate should become part of its accepted local state.

---

# Candidate and Installed Domain Objects

An externally derived Domain Object is initially a candidate for installation.

Construction proves that the Resource can be interpreted as valid Domain information. It does not by itself make that candidate authoritative application state.

Conceptually:

```text
External Resource
        ↓
Candidate Domain Object
        ↓
Accept?
   ┌────┴────┐
   │         │
  Yes        No
   │         │
   ↓         ↓
Installed   Ignore
Domain
Object
```

Only accepted candidates become installed Domain Objects.

Application behavior operates on the accepted local model rather than directly on whatever Resources happen to be available externally.

---

# Local Authority at the Boundary

The Resource Boundary is where the Local Authority principle becomes especially important.

Receiving, discovering, or successfully resolving a Resource does not require the application to replace its current local state.

The network may provide a candidate.

The application decides whether to accept it.

For example, the application may already possess an installed Domain Object that should remain authoritative according to the applicable installation or synchronization rules.

Those detailed rules are defined by the Resource Boundary decisions responsible for installation and synchronization.

---

# Locally Created Domain Objects

Domain Objects created inside the application follow a different path.

For example:

```text
User Action
    ↓
Domain Behavior
    ↓
Local Domain Object
```

The object originates inside the application's local authority and therefore does not need to pass through the same external acceptance boundary merely to become local Domain state.

If that information later needs to be published, it crosses outward through the Resource Boundary:

```text
Local Domain Object
        ↓
Resource Boundary
        ↓
Resource
```

External acceptance and local creation are therefore different flows.

---

# Boundary Ownership

Crossing the Resource Boundary does not transfer ownership of Domain meaning.

For example:

```text
Bible Domain
    owns
Chapter meaning and rules

Resource Boundary
    represents
Chapter information externally
```

The Bible Domain continues to determine what constitutes a valid Chapter.

The Resource Boundary determines how that information participates in the Resource lifecycle.

This distinction prevents transport or publication concerns from becoming Domain behavior.

---

# Resource Boundary Responsibilities

The detailed Resource Boundary architecture defines responsibilities such as:

```text
Resource Boundary

    Resource Identity
    Resource Representation
    Resource Discovery
    Resource Resolution
    Resource Installation
    Resource Publication
    Resource Synchronization
    Resource Archives
    Resource Lifecycle
```

Those decisions are documented in `02_resource-boundary`.

This document defines their relationship to the Application's Domain model rather than repeating their detailed behavior.

---

# Resource Boundary and Data Access

Data Access may use the Resource Boundary when a requested Domain Object cannot be satisfied from the accepted local model.

Conceptually:

```text
Domain Object Request
        ↓
Data Access
        ↓
Local Model
   ┌────┴────┐
   │         │
 Found     Missing
   │         │
   ↓         ↓
 Return   Resource Boundary
               ↓
         Accepted Domain Object
               ↓
             Return
```

The caller still requests a Domain Object.

It does not request a Resource, relay event, Blossom object, or transport operation.

The Resource Boundary is one way the application may make the requested Domain Object available.

---

# Resource Boundary and Infrastructure

The Resource Boundary defines Resource meaning and lifecycle.

Infrastructure provides technical mechanisms used to implement those responsibilities.

For example:

```text
Resource Publication
        ↓
Resource Boundary responsibility
        ↓
Networking / Signing
        ↓
Technical capabilities
        ↓
Nostr / WebSocket / Browser APIs
```

Likewise:

```text
External Resource Content
        ↓
Resource Boundary
        ↓
Blob Retrieval / Networking
        ↓
Blossom / HTTP
```

Nostr and Blossom are therefore current implementation technologies used beneath Resource Boundary responsibilities.

They do not define the Resource Boundary itself.

---

# Deciding Whether Information Needs a Resource

When adding new Domain information, first determine whether it needs to cross the Resource Boundary.

Ask:

> **Does this information need to exist outside the application's local Domain model?**

If the answer is no, no Resource representation is required merely because other Domain Objects have one.

If the answer is yes, determine what must be preserved when that information crosses the boundary.

Questions include:

> **Which Domain owns the information?**

> **What Domain meaning and invariants must survive representation?**

> **Does the information need publication, discovery, synchronization, or another Resource lifecycle capability?**

> **What acceptance rules apply when the information returns from outside the application?**

Only after those architectural questions are answered should the specific representation or transport implementation be chosen.

---

# Adding a Resource Representation

The architectural reasoning should proceed in this order:

```text
What Domain information is involved?
        ↓
Which Domain gives it meaning?
        ↓
Does it need to leave the local Domain model?
        │
        ├── No → Keep it internal
        │
        └── Yes
             ↓
What Domain meaning must survive the boundary?
        ↓
What Resource lifecycle capabilities are required?
        ↓
What makes an inbound candidate valid?
        ↓
What determines whether it becomes installed?
        ↓
Define the Resource representation
        ↓
Choose implementation
```

This keeps representation and transport decisions subordinate to application meaning.

---

# Example: Publishing a Note

Suppose a Note must be shared outside the local application.

The Note already belongs to the Notes Domain:

```text
Notes Domain
    ↓
Note Domain Object
```

The first architectural decision is not which Nostr event to create.

The decision is that Note information must cross the Resource Boundary.

```text
Notes Domain
    ↓
Note Domain Object
    ↓
========== Resource Boundary ==========
    ↓
Note Resource
```

The Notes Domain continues to define what a valid Note means.

The Resource Boundary defines how that information is represented and participates in publication, identity, discovery, and synchronization.

A particular Nostr event representation is chosen only after those responsibilities are established.

---

# Example: Receiving Domain Information

The inbound direction follows the reverse relationship but adds local acceptance.

```text
External Resource
        ↓
Resource Boundary
        ↓
Candidate Domain Object
        ↓
Domain Validation
        ↓
Application Acceptance
        ↓
Installed Domain Object
```

The important architectural distinction is that **valid external information and accepted local state are not the same thing**.

A Resource can be valid without replacing the Domain Object the application currently considers authoritative.

---

# Big Takeaway

The Resource Boundary separates the application's internal Domain model from external Resource representations.

Inside the application:

```text
Domain
    ↓
Domain Object
```

Across the boundary:

```text
Domain Object
    ↕
========== Resource Boundary ==========
    ↕
Resource
```

When information crosses outward, Domain meaning is represented as a Resource.

When information crosses inward, a Resource must be resolved, interpreted as valid Domain information, and accepted before becoming installed local state.

When adding new functionality, ask:

> **Does this Domain information actually need to cross the Resource Boundary?**

If it does, preserve the owning Domain's meaning while allowing the Resource Boundary to handle the external representation and lifecycle.

The Domain owns the meaning.

The application owns its accepted local state.

The Resource Boundary connects that local model to the outside world.
