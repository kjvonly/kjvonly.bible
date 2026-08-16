# ADR 08 — Resource Installation Lifecycle

**Status**

Accepted

---

# Problem

Resource Discovery finds available Resource Representations.

Resource Resolution turns those representations into verified serialized Resource content.

The application does not operate directly on Nostr events or serialized Resource content. Before externally obtained information can become application state, the owning Domain must interpret and validate it.

The Resource Boundary therefore needs a defined transition between:

```text
verified external Resource information
```

and:

```text
accepted local Domain information
```

That transition is Resource Installation.

---

# Decision

Resource Installation determines whether verified Resource content becomes accepted local application state.

The installation lifecycle is:

```text
Verified Resource Content
        ↓
Domain Interpretation
        ↓
Candidate Domain Object(s)
        ↓
Domain Validation
        ↓
Installation Decision
        ↓
Accepted Local Domain Object(s)
```

Installation is the acceptance boundary between externally represented Resource information and the application's local Domain model.

Installation MUST NOT treat successful Discovery or Resolution as automatic acceptance.

---

# Candidate Domain Objects

Verified Resource content is interpreted according to the Resource Type and owning Domain.

That interpretation produces one or more **candidate Domain Objects**.

Candidate Domain Objects are not yet accepted application state.

The owning Domain determines:

* how the serialized content is interpreted,
* which Domain Objects it represents,
* and whether those objects satisfy Domain invariants.

The Resource Boundary does not require a specific `Domain Object Factory`, parser, service, or other implementation abstraction.

---

# Domain Validation

Domain validation occurs after Resource Resolution.

Resolution establishes that the Resource content is the content represented by the Resource Representation.

Domain validation establishes that the resulting information is valid according to application meaning.

Therefore:

```text
Resource integrity
    ≠
Domain validity
```

Installation MUST NOT accept candidate Domain Objects that fail Domain validation.

---

# Installation Decision

Passing Domain validation does not by itself require installation.

Installation determines whether the valid candidate information should become accepted local state.

The decision may depend on the workflow that requested installation, such as:

* explicit user installation,
* application-provided Resource installation,
* import,
* synchronization,
* or another application policy.

A discovered, resolved, or newer network publication MUST NOT bypass this acceptance decision.

> **The network proposes. The application decides.**

---

# Installed State

A Resource is installed when the candidate Domain Objects accepted from that Resource have become part of the application's accepted local state.

The application installs Domain information.

It does not install:

* Nostr events,
* Resource Representations,
* descriptors,
* or external storage objects.

Those remain Resource Boundary representations or provenance information.

Installation status is therefore a local application concept.

---

# Installation and Persistence

Installation and persistence are separate responsibilities.

Installation answers:

> **Should this external information become accepted local state?**

Persistence answers:

> **How does accepted local state survive application execution?**

Conceptually:

```text
Candidate Domain Objects
        ↓
Accept / Install
        ↓
Accepted Local State
        ↓
Persistence
```

A repository, Store, IndexedDB object store, or another mechanism MAY persist accepted state.

No specific persistence abstraction is required by this ADR.

---

# Atomic Installation

Installation is atomic with respect to the Domain Objects produced by one Resource installation.

Either:

* all Domain Objects required by that installation become accepted together,

or:

* the previously accepted state remains unchanged.

The application MUST NOT expose a partially accepted installation.

If persistence is involved, its implementation MUST preserve this atomic acceptance invariant.

---

# Installation Sources

Installation is independent of how the Resource entered the Resource Boundary.

Verified Resource content may originate through:

* Resource Discovery and Resolution,
* Resource Archives,
* application bootstrap,
* synchronization,
* direct Resource references,
* or another compatible Resource source.

Once verified content reaches Installation, the same Domain validation and acceptance rules apply.

---

# Resource Dependencies

A Resource may require other Resources to be available before its installation can complete.

When such dependencies are part of the Resource contract, Installation coordinates their availability before accepting the dependent Resource.

Installation does not define how dependencies are:

* represented,
* discovered,
* or resolved.

Those responsibilities remain with the specifications that own them.

A dependent Resource MUST NOT be exposed as successfully installed when required dependencies have failed to reach the state required by its installation contract.

---

# Installing Another Publication

A Published Resource may have multiple Nostr publications over time.

Receiving or resolving another publication of the same Published Resource does not automatically replace the currently accepted local state.

Conceptually:

```text
New Publication
        ↓
Discovery / Synchronization
        ↓
Resolution
        ↓
Candidate Domain Information
        ↓
Installation Decision
```

The synchronization or update-selection policy determines which publication is presented for installation.

Installation then applies the same validation and acceptance rules as any other external Resource information.

Published Resource Identity alone does not determine local replacement.

---

# Different Published Resources

Installing a different Published Resource creates a separate Resource-origin relationship unless Domain policy explicitly defines another behavior.

Whether two publications belong to the same Published Resource is determined by ADR 04 — Nostr Resource Identity.

Installation MUST NOT invent additional version, revision, or fork identity rules.

---

# Local Creation

Locally created Domain Objects originate inside application authority.

For example:

```text
User creates Note
        ↓
Notes Domain
        ↓
Accepted Local Note
```

Such objects do not need to arrive through Nostr or pass through inbound Resource Installation before becoming valid local state.

If that information later participates in the Resource lifecycle, publication is handled independently by the outbound Resource specifications.

---

# Uninstallation

Uninstallation removes the locally accepted state associated with an installed Resource according to the owning Domain's rules.

Uninstallation does not alter:

* the Published Resource,
* its Nostr identity,
* publisher identity,
* or the existence of the external publication.

It changes local application state only.

Removing local state also does not prevent that Resource from being discovered or installed again later.

---

# Installation Failure

Installation fails when required candidate information cannot be validly and atomically accepted.

Examples include:

* Domain validation failure,
* unsupported Resource Type,
* required dependency failure,
* or inability to preserve atomic acceptance.

Failure MUST leave the previously accepted installation unchanged.

The exact error model is an implementation detail.

---

# Offline-First Behavior

Installation operates on verified Resource content that may already be locally available.

It MUST NOT require an active relay connection merely to accept content that has already completed the required Resource Resolution process.

Once installed, loss of network connectivity does not invalidate accepted local state.

Future discovery or synchronization may occur independently.

---

# Specification Invariants

A compatible implementation MUST preserve these rules:

```text
Installation is the transition from verified
external Resource information to accepted local state.

Resolved content is not automatically installed.

Domain validation occurs before acceptance.

Candidate Domain Objects are not accepted state.

Installation is atomic.

Persistence is separate from Installation.

Newer publications do not automatically replace
accepted local state.

Locally created Domain Objects do not require
inbound Resource Installation.

Uninstallation changes local state,
not external Resource identity.
```

---

# Scope

This ADR defines:

* candidate Domain Objects,
* Domain validation within the inbound Resource lifecycle,
* the Installation decision,
* installed local state,
* atomic installation,
* Resource dependency coordination,
* installation of later publications,
* uninstallation,
* and the separation between Installation and persistence.

It does not define:

* Resource Discovery,
* Resource Resolution,
* Resource Identity,
* Resource serialization,
* Domain-specific validation rules,
* persistence mechanisms,
* synchronization conflict selection,
* publication,
* or local storage implementation.

Those concerns belong to the corresponding Resource Boundary or Application Architecture specifications.

---

# Big Takeaway

Resource Installation answers one question:

> **Should this verified external Resource information become accepted local application state?**

The transition is:

```text
Verified Resource Content
        ↓
Candidate Domain Object
        ↓
Domain Validation
        ↓
Accept / Install
        ↓
Accepted Local State
```

Resolution proves what content was obtained.

The Domain determines what that content means.

Installation determines whether it becomes local application state.

Persistence determines how that accepted state survives.
