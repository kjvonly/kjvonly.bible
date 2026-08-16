# ADR 00 — Resource Boundary Overview

**Status**

Accepted

---

# Purpose

KJVOnly is an offline-first application whose internal behavior is expressed through Domains and Domain Objects.

Some Domain information must also participate in an external lifecycle so that it can be:

* published,
* discovered,
* distributed,
* installed,
* synchronized,
* shared,
* and archived.

The **Resource Boundary** defines how that Domain information participates in that lifecycle using Nostr.

This document provides the high-level model for the Resource Boundary and the reading order for the specifications that define it.

---

# One Application Architecture

KJVOnly has one Application Architecture.

The Resource Boundary is not a separate Resource Architecture.

It is the boundary between:

```text
Application
    Domain
        ↓
    Domain Object

========== Resource Boundary ==========

    Resource
        ↓
    Nostr Representation
        ↓
    Nostr Protocol / Relays
```

Domains continue to own application meaning when information crosses this boundary.

The Resource Boundary defines how that information is externally represented and moved through the Resource lifecycle.

---

# Domain Objects and Resources

A **Domain Object** represents information according to application meaning.

A **Resource** represents Domain information that must participate in the external Resource lifecycle.

They are related but distinct.

```text
Domain Object
    ≠
Resource
```

Not every Domain Object must become a Resource.

Local-only preferences, Runtime state, transient interaction state, derived information, and other purely local data may remain entirely inside the application.

A Resource is required when Domain information needs an external lifecycle such as publication, synchronization, sharing, or archival.

---

# Core Principles

The Resource Boundary is governed by these principles:

**Offline-first**

Local application behavior does not depend on Nostr availability.

**Domain ownership**

Domains define application meaning and validation.

**Resources as distribution units**

Resources define independently identifiable units of externally distributable information.

**Nostr as the protocol**

Nostr is the protocol used to publish, identify, discover, and synchronize Resource representations.

**Local Authority**

External information does not become application state merely because it exists on the network.

> **The network proposes. The application decides.**

**Separation of lifecycle responsibilities**

Discovery, Resolution, Installation, publication, synchronization, and persistence answer different questions and MUST remain conceptually distinct.

---

# Nostr Resource Model

Resources are represented using Nostr without making Nostr events themselves part of the Domain model.

Conceptually:

```text
Resource
    ↓
Resource Representation
    ↓
Nostr Event
```

A Nostr event is one signed publication of a Resource representation.

It is not:

* a Domain Object,
* accepted local state,
* or the Resource itself.

Resource content may also reside outside Nostr when a representation contains a descriptor referencing external storage such as Blossom or HTTP.

---

# Resource Identity

KJVOnly adopts Nostr addressable-event identity directly.

A Published Resource is identified by:

```text
kind + publisher public key + d tag
```

The Nostr event `id` identifies one specific signed publication of that Resource.

Therefore:

```text
Published Resource Identity
    ≠
Publication Event ID
```

The Resource Boundary does not introduce a separate Resource revision identity system.

---

# Resource Representations

A Resource may use one of three representation forms:

```text
content
descriptor
descriptors
```

`content` carries serialized Resource content directly.

`descriptor` identifies externally stored serialized Resource content.

`descriptors` describes a collection of independently identifiable Resources.

Representation determines how Resource content is obtained.

It does not change Resource identity or Domain meaning.

---

# Inbound Resource Lifecycle

External Resource information enters the application through a defined sequence:

```text
Discovery Root / Resource Reference
        ↓
Resource Discovery
        ↓
Resource Representation
        ↓
Resource Resolution
        ↓
Verified Serialized Resource Content
        ↓
Domain Interpretation
        ↓
Candidate Domain Object
        ↓
Domain Validation
        ↓
Installation Decision
        ↓
Accepted Local State
```

Each stage has a distinct responsibility.

**Discovery** determines which Resource Representations are available.

**Resolution** obtains and verifies serialized Resource content.

**Domain interpretation and validation** determine what that content means to the application.

**Installation** determines whether that external information becomes accepted local state.

Successful Discovery or Resolution MUST NOT automatically modify accepted application state.

---

# Discovery Roots

Open-ended Resource Discovery begins from configured **Discovery Roots**.

A Discovery Root is a publisher from which the application permits open-ended discovery.

Explicit Resource references are narrower.

They may identify a Resource from another publisher without automatically promoting that publisher to a Discovery Root.

This allows bounded cross-publisher Resource composition without silently expanding general discovery scope.

---

# Local Authority

Accepted local state belongs to the application.

A Resource MUST NOT become locally authoritative solely because it:

* was returned by a relay,
* has a newer Nostr publication,
* successfully resolves,
* or comes from a known publisher.

External information becomes local state only after the applicable validation and Installation decisions succeed.

Persistence follows acceptance and is an application implementation concern rather than a Resource Boundary lifecycle stage.

---

# Outbound Resource Lifecycle

Locally created or modified Domain information originates inside application authority.

It becomes usable locally before publication succeeds.

When that information must be published:

```text
Local Domain Change
        ↓
Accepted Local State
        ↓
Durable Publication Intent
        ↓
Resource
        ↓
Resource Representation
        ↓
Nostr Event
        ↓
Signing
        ↓
Relay Publication
```

The persistent Outbox separates local application behavior from network availability.

> **Accept locally first. Publish externally independently.**

Publication failure MUST NOT invalidate an already accepted local change.

---

# Multi-Device Synchronization

Multiple offline devices may modify the same Published Resource independently.

KJVOnly uses **Last Write Wins** for reconciliation.

For synchronizable information:

```text
Domain modifiedAt
    =
Nostr created_at
```

The later valid write wins reconciliation for the same Published Resource Identity.

LWW does not make the newest relay event automatically authoritative.

A winning remote publication must still complete the normal Resolution, Domain validation, and Installation process before replacing accepted local state.

The synchronization model intentionally does not introduce locking, automatic merging, conflict copies, or a separate revision system.

---

# Resource Archives

Resources may also be transported without live Nostr or external-storage access through a **Resource Archive**.

A Resource Archive:

* preserves Resource boundaries,
* contains serialized Resource content,
* preserves applicable identity and provenance,
* and imports Resources through the normal validation and Installation lifecycle.

Resource Archives are portable Resource containers.

They are not automatically whole-application backups containing arbitrary Runtime state, settings, caches, or other local-only information.

---

# Offline-First Behavior

A compatible Resource Boundary MUST preserve these properties:

```text
Local operations do not require relay availability.

Local changes become usable before publication succeeds.

Publication intent survives connectivity loss.

Installed Resources remain usable offline.

Discovery and synchronization may occur later.

Network failures do not invalidate accepted local state.

External updates can be reconciled when connectivity returns.

Portable Resources can be imported without live relay access.
```

These properties are fundamental constraints on every Resource Boundary specification.

---

# Specification Organization

The Resource Boundary specifications are intended to be read in order.

| ADR | Specification                   | Question                                                   |
| --- | ------------------------------- | ---------------------------------------------------------- |
| 00  | Resource Boundary Overview      | What is the Resource Boundary?                             |
| 01  | Domain Resource Model           | What is a Resource?                                        |
| 02  | Data Distribution Strategy      | How is Resource content distributed?                       |
| 03  | Nostr Event Model               | How does Nostr represent Resources?                        |
| 04  | Nostr Resource Identity         | How is a Resource addressed?                               |
| 05  | Discovery Roots                 | Where does open-ended discovery begin?                     |
| 06  | Resource Discovery              | How are Resource Representations found?                    |
| 07  | Resource Resolution             | How does a representation become verified content?         |
| 08  | Resource Installation Lifecycle | How does external information become accepted local state? |
| 09  | Outbox and Publishing           | How are offline local changes reliably published?          |
| 10  | Multi-Device Synchronization    | How do offline clients reconcile Resource state?           |
| 11  | Resource Archives               | How are Resources made portable?                           |

Each specification owns one Resource lifecycle responsibility.

Later specifications rely on concepts defined earlier rather than redefining them.

---

# Outside the Resource Boundary

Several application responsibilities interact with Resources but are not Resource Boundary specifications.

These include:

* application persistence,
* Domain-specific search indexes,
* application startup,
* background execution,
* Workspace Runtime behavior,
* presentation,
* and other local application concerns.

For example, Resource synchronization may execute in the background, but Background Processing does not own synchronization.

Likewise, Resource Installation may persist accepted state, but persistence does not define whether external information should be accepted.

---

# Specification Invariants

The complete Resource Boundary preserves these relationships:

```text
Domain meaning
    belongs to the application.

Resource representation
    belongs to the Resource Boundary.

Nostr
    carries Resource publications.

Discovery
    finds representations.

Resolution
    verifies serialized content.

Installation
    decides whether external information
    becomes accepted local state.

Persistence
    makes accepted state durable.

Outbox
    makes publication intent durable.

Synchronization
    reconciles independent offline writes.

Archives
    make Resources portable.
```

No later implementation should collapse these responsibilities merely for code convenience.

---

# Big Takeaway

The Resource Boundary defines how KJVOnly uses Nostr to give application Resources a coherent external lifecycle.

```text
Application Domain Information
        ⇅
Resource Boundary
        ⇅
Resources
        ⇅
Nostr / External Content / Archives
```

The application continues to operate on accepted Domain information.

Resources provide the externally identifiable and portable representation needed for distribution.

Nostr provides the protocol for publication, discovery, identity, and synchronization.

> **The Resource Boundary connects an offline-first application to Nostr without allowing the network representation to become the application model.**
