# Resource Boundary Glossary

This glossary defines terminology used throughout the KJVOnly Resource Boundary specification.

Terms are defined in their authoritative ADRs and summarized here for reference.

---

# Domain

A logical area of the application that owns related application meaning and behavior.

Examples include:

* Bible,
* Notes,
* Reading Plans,
* and Settings.

A Domain owns the interpretation and validation of its Domain information.

Crossing the Resource Boundary does not transfer ownership of Domain meaning.

---

# Domain Object

An application-facing representation of information according to Domain meaning.

The application operates internally on Domain Objects rather than Nostr events or Resource Representations.

Not every Domain Object requires a Resource representation.

---

# Resource

An independently identifiable unit of Domain information intended to participate in an external lifecycle such as:

* publication,
* discovery,
* distribution,
* installation,
* synchronization,
* sharing,
* or archival.

A Resource is distinct from both the Domain Object it represents and the Nostr event that publishes it.

---

# Published Resource

A Resource associated with a Nostr publisher and represented through one or more Nostr publications.

Multiple Nostr events may represent publications of the same Published Resource over time.

---

# Published Resource Identity

The stable Nostr address of a Published Resource.

It consists of:

```text
kind + publisher public key + d tag
```

Different values for any of these identity components identify a different Published Resource.

---

# Publication Identity

The identity of one specific signed Nostr publication.

For the Nostr Resource model, publication identity is the Nostr event `id`.

Publication Identity is distinct from Published Resource Identity.

---

# Resource Identifier

The application-defined logical identifier stored in the Nostr `d` tag.

Example:

```text
kjvonly/bible/chapters/kjv
```

The Resource Identifier participates in Published Resource Identity together with Nostr kind and publisher public key.

---

# Resource Type

The logical class of Resource identified by the leading Resource Identifier path segments.

For example:

```text
kjvonly/bible/chapters
```

Resource Type identifies what kind of Domain information the Resource represents without determining its storage provider or Resource Representation.

---

# Resource Classification

Coarse Resource metadata used for Nostr discovery.

Resource Classification may be represented through the Nostr `t` tag.

It allows related Resources to be queried without requiring their complete Resource Identifiers.

---

# Resource Granularity

The amount of Domain information represented by one Resource.

Resource Granularity is independent of Domain Object granularity.

One Resource may produce one or many Domain Objects.

---

# Resource Representation

The external representation describing how serialized Resource content is carried or obtained.

KJVOnly defines three representation forms:

```text
content
descriptor
descriptors
```

Representation does not determine Resource Identity or Domain meaning.

---

# Content Representation

A Resource Representation in which serialized Resource content is carried directly by the Nostr event payload.

No external content retrieval is required.

---

# Descriptor Representation

A Resource Representation that identifies externally stored serialized Resource content and the information required to retrieve and verify it.

A descriptor may include:

* storage mechanism,
* location,
* SHA-256,
* optional size,
* and media type.

---

# Descriptors Representation

A Resource Representation describing a collection of independently identifiable Resources.

Each member is resolved independently.

Descriptor order does not inherently define Domain dependency or Installation order.

---

# Serialized Resource Content

The serialized bytes or text representing Resource information before Domain interpretation.

Examples include:

```text
application/json
application/json+gzip
application/octet-stream
```

Serialized Resource Content is not yet a Domain Object.

---

# Verified Resource Content

Serialized Resource Content that has successfully completed the integrity requirements of Resource Resolution.

Verification establishes Resource-content integrity.

It does not establish Domain validity or local acceptance.

---

# Nostr Event

A signed Nostr protocol object used to publish a Resource Representation.

A Nostr event is not:

* a Domain Object,
* accepted local state,
* or the Published Resource Identity itself.

Its event `id` identifies one publication.

---

# Publisher

The Nostr public key that signs a Resource publication.

The publisher public key participates in Published Resource Identity.

A different publisher therefore publishes a different Published Resource even when `kind` and Resource Identifier are otherwise equal.

---

# Discovery Root

A publisher from which the application permits open-ended Resource Discovery.

Discovery Root status determines where general discovery may begin.

It does not imply:

* installation,
* local authority,
* endorsement of every Resource,
* or permission for unrelated Domain behavior.

---

# Discovery Input

Information used to perform a particular Resource Discovery operation.

Examples include:

* publisher public key,
* Published Resource Identity,
* Resource Classification,
* Resource reference,
* or Nostr event ID.

A Discovery Input does not automatically establish a new Discovery Root.

---

# Resource Discovery

The process of locating Nostr Resource Representations from known discovery information.

Resource Discovery may query by:

* publisher,
* Resource Identity,
* Resource Classification,
* or exact Nostr event.

Discovery determines what representations are available.

It does not resolve external content, interpret Domain meaning, or install local state.

---

# Resource Resolution

The process of converting a known Resource Representation into verified serialized Resource content.

Resolution includes:

* representation dispatch,
* external content retrieval where required,
* descriptor validation,
* and integrity verification.

Resolution does not interpret Domain meaning or install application state.

---

# Candidate Domain Object

A Domain Object constructed from external Resource content before local acceptance.

Candidate Domain Objects are validated by the owning Domain.

They are not accepted local application state merely because they were successfully constructed.

---

# Domain Validation

Validation performed by the owning Domain to determine whether candidate information satisfies Domain meaning and invariants.

Domain Validation is distinct from Resource-integrity verification.

---

# Resource Installation

The Resource Boundary process that determines whether verified external Resource information becomes accepted local application state.

Conceptually:

```text
Verified Resource Content
        ↓
Candidate Domain Object
        ↓
Domain Validation
        ↓
Installation Decision
        ↓
Accepted Local State
```

Installation is distinct from persistence.

---

# Accepted Local State

Domain information the application has accepted as its current local state.

External Resource information does not become accepted local state merely because it exists or is newer on the network.

---

# Local Authority

The principle that the application decides what becomes accepted local state.

Summarized as:

> **The network proposes. The application decides.**

A valid, discovered, resolved, or newer network publication is still external information until the applicable acceptance process succeeds.

---

# Persistence

The implementation responsibility that makes accepted local state durable.

Persistence may use:

* repositories,
* Stores,
* IndexedDB,
* adapters,
* or another storage mechanism.

Persistence is not a Resource Boundary lifecycle stage and does not determine whether external information should be installed.

---

# Outbox

The persistent mechanism responsible for durable asynchronous Resource publication.

The Outbox preserves publication work across:

* network failure,
* application restart,
* and temporary relay unavailability.

The Outbox does not perform synchronization conflict resolution.

---

# Publication Intent

Durable application work recording that accepted local information must still be published externally.

Publication Intent eventually produces:

```text
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

---

# Multi-Device Synchronization

The process of reconciling writes to the same Published Resource from independently operating devices.

KJVOnly uses Last Write Wins for this reconciliation.

Incoming state still follows the normal Resource acceptance lifecycle.

---

# Last Write Wins

The synchronization policy used to order writes to the same Published Resource.

For synchronizable Domain information:

```text
Domain modifiedAt
    =
Nostr created_at
```

The later valid write wins reconciliation.

LWW does not make a newer relay publication automatically authoritative local state.

---

# Resource Archive

A portable collection of serialized Resources.

Resource Archives use the `.kjva` format and preserve Resource boundaries and applicable identity/provenance.

An archive is not automatically a complete backup of arbitrary local application state.

---

# Offline-First

The principle that normal local application behavior does not depend on current network availability.

For the Resource Boundary this means:

* local changes may be accepted offline,
* publication may occur later,
* installed Resources remain usable offline,
* synchronization may occur after connectivity returns,
* and network failure does not invalidate accepted local state.

---

# Resource Provenance

Information describing the external origin of Resource-derived Domain information.

Provenance may include:

* publisher public key,
* Resource Identifier,
* Published Resource Identity,
* and source event ID.

Provenance describes origin.

It does not create another Resource identity system.
