# ADR 03 — Nostr Event Model

**Status**

Accepted

---

# Problem

The Resource Boundary uses Nostr to publish and discover Resources.

The Domain Resource Model defines a Resource independently from Nostr, while the Data Distribution Strategy establishes Nostr as the protocol through which Resource Representations are published and discovered.

The specification therefore needs a precise mapping between:

```text
Resource
    ↓
Resource Representation
    ↓
Nostr Event
```

without allowing Nostr protocol structures to become the application's Domain model.

A Nostr event must carry enough information to:

* identify the publisher,
* identify and classify the Resource,
* identify its representation form,
* carry or describe its serialized content,
* participate in Nostr publication and replacement semantics,
* and support later discovery and resolution.

At the same time, receiving a valid Nostr event MUST NOT automatically create, install, or replace a Domain Object.

---

# Decision

Externally published Resources are represented through signed Nostr events.

A Nostr Resource event is the **protocol representation of a Resource publication**.

It is not:

* a Domain Object,
* accepted local application state,
* a persistence model,
* or the Resource itself.

Conceptually:

```text
Domain Information
        ↓
Resource
        ↓
Resource Representation
        ↓
Nostr Event
        ↓
Nostr Relays
```

and inbound:

```text
Nostr Relay
        ↓
Nostr Event
        ↓
Resource Representation
        ↓
Resource Resolution
        ↓
Verified Resource Content
        ↓
Domain Interpretation
        ↓
Candidate Domain Object
```

The Resource Boundary understands the Nostr event structure.

Application Domains operate on Domain information rather than raw Nostr events.

---

# Nostr Resource Event

A Nostr Resource event is a valid signed Nostr event whose protocol fields and tags describe a Resource publication.

Conceptually:

```text
Nostr Event

    kind
    pubkey
    created_at
    tags
    content
    id
    sig
```

Standard Nostr event validity remains a prerequisite.

A Resource Boundary implementation MUST validate the Nostr event before interpreting Resource-specific metadata.

A cryptographically valid Nostr event is not necessarily a valid Resource Representation.

Those are separate validation steps.

---

# Event Fields

Each Nostr event field retains its Nostr protocol meaning.

The Resource Boundary assigns additional Resource meaning only where explicitly specified.

Conceptually:

```text
kind
    protocol event structure

pubkey
    publisher identity

created_at
    publication timestamp

tags
    Resource addressing and metadata

content
    representation payload

id
    identity of this specific event publication

sig
    publisher signature
```

These meanings MUST remain distinct.

In particular:

```text
event id
    ≠ Resource Identity

created_at
    ≠ Resource Identity

content
    ≠ Domain Object
```

---

# Publisher

The Nostr event `pubkey` identifies the publisher of the Resource publication.

Conceptually:

```text
Nostr Event
    ↓
pubkey
    ↓
Resource Publisher
```

The publisher is part of Published Resource Identity as defined by the Nostr Resource Identity specification.

Publisher identity does not determine the Domain meaning of the Resource.

Two publishers MAY publish Resources having the same logical Resource Identifier while producing distinct Published Resources.

---

# Resource Addressing

A Resource event MUST contain the Resource addressing metadata required by the Nostr Resource Identity specification.

The Domain Resource Model defines the logical Resource Identifier.

For an addressable Resource publication, that identifier is represented through the Nostr `d` tag.

Conceptually:

```text
Resource Identifier
    ↓
d tag
```

For example:

```text
kjvonly/bible/chapters/kjv
```

may be carried as:

```json
["d", "kjvonly/bible/chapters/kjv"]
```

The exact canonical identity of the published Resource is defined by ADR 04 — Nostr Resource Identity.

This ADR does not redefine those replacement or identity rules.

---

# Resource Classification

A Resource event SHOULD expose the Resource Classification required for relay discovery.

The Domain Resource Model defines classification using:

```text
namespace/domain/resource-type
```

That classification is represented through a Nostr `t` tag.

For example:

```json
["t", "kjvonly/bible/chapters"]
```

Conceptually:

```text
d tag
    ↓
specific Resource

t tag
    ↓
class of Resources
```

Classification supports discovery.

It MUST NOT replace Resource Identity.

---

# Representation Metadata

Every Resource event MUST identify which Resource Representation it carries.

The supported representation forms are defined by the Domain Resource Model:

```text
content
descriptor
descriptors
```

The representation is carried as Resource metadata on the Nostr event.

Conceptually:

```json
["representation", "content"]
```

or:

```json
["representation", "descriptor"]
```

or:

```json
["representation", "descriptors"]
```

The representation value determines how the event `content` is interpreted by Resource Resolution.

It does not determine Domain meaning or Resource Identity.

---

# Media Type

A Resource event MAY carry media-type metadata describing the serialized representation payload.

For example:

```json
["m", "application/json"]
```

or another media type required by the Resource representation.

Media type describes serialization.

It does not identify the Resource Type.

Conceptually:

```text
Resource Type
    → what the information means

Media Type
    → how the representation payload is encoded
```

These MUST remain separate.

---

# `content` Representation

For a `content` representation, the Nostr event `content` directly contains the serialized Resource content.

Conceptually:

```text
Nostr Event
    ↓
representation = content
    ↓
event.content
    ↓
Serialized Resource Content
```

For example:

```json
{
  "tags": [
    ["d", "kjvonly/plans/readings/365-bible"],
    ["t", "kjvonly/plans/readings"],
    ["representation", "content"],
    ["m", "application/json"]
  ],
  "content": "{ ... serialized Resource content ... }"
}
```

Resource Resolution does not need an external content provider to obtain the serialized Resource content.

The resulting payload still requires the later Resource and Domain validation lifecycle.

---

# `descriptor` Representation

For a `descriptor` representation, the Nostr event `content` contains a descriptor rather than the Resource content itself.

Conceptually:

```text
Nostr Event
    ↓
representation = descriptor
    ↓
event.content
    ↓
Descriptor
    ↓
External Resource Content
```

A descriptor identifies how the serialized Resource content can be obtained externally and may include integrity metadata required to verify the retrieved content.

For example:

```json
{
  "tags": [
    ["d", "kjvonly/bible/chapters/kjv"],
    ["t", "kjvonly/bible/chapters"],
    ["representation", "descriptor"],
    ["m", "application/json"]
  ],
  "content": "{ ... descriptor ... }"
}
```

The descriptor is part of the Resource Representation.

It MUST NOT be treated as the resolved Resource content.

The Data Distribution Strategy and Resource Resolution specifications define how externally referenced content is obtained and verified.

---

# `descriptors` Representation

For a `descriptors` representation, the Nostr event `content` contains a collection of Resource descriptors.

Conceptually:

```text
Nostr Event
    ↓
representation = descriptors
    ↓
event.content
    ↓
Descriptor Collection
    ├── Resource A
    ├── Resource B
    └── Resource C
```

Each descriptor refers to an independently identifiable Resource.

The descriptor collection MUST remain distinct from the serialized contents of the Resources it references.

Resource Resolution defines how descriptor collections are traversed and resolved.

---

# Event Kind

Nostr `kind` identifies the protocol-level structure and replacement class of the event.

It does not identify the Domain by itself.

Conceptually:

```text
Nostr Kind
    ↓
Protocol Structure

Resource Type
    ↓
Application / Domain Meaning
```

Multiple Resource Types MAY use the same Nostr kind where they share the same protocol structure.

Conversely, a new Resource Type MUST NOT require a new Nostr kind merely because the application introduces new Domain information.

Kind assignments are protocol decisions.

Resource Type remains an application Resource concept.

The exact kind used by a Resource also participates in Published Resource Identity and is therefore constrained by ADR 04 — Nostr Resource Identity.

---

# Nostr Event Identity

Every signed Nostr event has an immutable Nostr event ID.

That ID identifies one specific publication.

Conceptually:

```text
Resource
    ↓
Publication A → event id A

Resource
    ↓
Publication B → event id B
```

The event ID MUST NOT be used as the stable logical identity of an addressable Resource.

A later publication of the same Resource may have a different event ID while retaining the same Published Resource Identity.

ADR 04 defines this distinction in detail.

---

# Publication Timestamp

The event `created_at` field is the Nostr publication timestamp.

It participates in Nostr event ordering and may also participate in the synchronization rules defined by the Multi-Device Synchronization specification.

It does not identify the Resource.

Conceptually:

```text
created_at
    ↓
publication ordering / synchronization input
```

The exact relationship between Domain modification time and `created_at` belongs to the synchronization specification rather than this Event Model.

---

# Signing

A Resource event MUST be validly signed according to the Nostr protocol before publication.

Conceptually:

```text
Resource Representation
        ↓
Construct Nostr Event
        ↓
Sign
        ↓
Signed Nostr Event
        ↓
Publish
```

The signature establishes that the event was published by the private key corresponding to its `pubkey`.

Signing does not establish that the Resource should be accepted by the local application.

Cryptographic validity and local acceptance are distinct decisions.

---

# Replaceable Resource Events

Resource publications may use Nostr addressable-event replacement semantics.

Conceptually:

```text
Published Resource Identity
        ↓
Publication A
        ↓
Publication B
        ↓
Publication C
```

Each publication has its own event ID.

The logical Published Resource Identity remains stable according to the Resource Identity rules.

Replacement semantics therefore belong to the Resource protocol model rather than the Domain model.

Application Domains do not need to use event IDs as Domain Object identity or interpret raw replaceable-event mechanics.

The exact identity and replacement rules are defined by ADR 04 — Nostr Resource Identity.

---

# Inbound Event Processing

Receiving a Nostr Resource event begins a Resource Boundary workflow.

A compatible implementation MUST preserve the conceptual stages:

```text
Nostr Event
    ↓
Validate Nostr Event
    ↓
Validate Resource Event Structure
    ↓
Interpret Resource Representation
    ↓
Resource Resolution
    ↓
Verified Resource Content
```

Later stages then cross toward the Domain model:

```text
Verified Resource Content
    ↓
Domain Interpretation
    ↓
Candidate Domain Object
    ↓
Domain Validation
    ↓
Installation / Acceptance
```

A valid Nostr event MUST NOT bypass these later stages.

---

# Protocol Validation

Validation occurs at distinct boundaries.

## Nostr Validation

The implementation first verifies the requirements of a valid Nostr event.

This includes protocol-level validity such as event identity and signature validity.

## Resource Event Validation

The Resource Boundary then verifies that the event satisfies the Resource-event contract.

This may include required:

* identity metadata,
* classification metadata,
* representation metadata,
* and representation structure.

## Resource Resolution

The representation is then resolved and any required integrity checks are performed.

## Domain Validation

Only after verified Resource content exists does the owning Domain interpret and validate its application meaning.

Conceptually:

```text
Nostr validity
    ↓
Resource-event validity
    ↓
Resource-content validity
    ↓
Domain validity
```

Each stage MUST validate only the responsibility it owns.

---

# Outbound Event Construction

Locally created Domain information follows the opposite conceptual direction, but it does not require a literal reversal of the inbound implementation pipeline.

Conceptually:

```text
Accepted Local Domain Information
        ↓
Resource
        ↓
Resource Representation
        ↓
Nostr Event
        ↓
Sign
        ↓
Publication
```

The Resource Boundary is responsible for producing a Nostr event that conforms to the Resource-event contract.

The implementation MAY use factories, serializers, registries, strategies, builders, or other internal mechanisms.

None of those mechanisms are required architectural concepts.

The Outbox and Publishing specification defines when publication intent becomes durable and how publication proceeds offline-first.

---

# Event Model Is Not an Application Layer

This specification does not introduce a permanent architectural layer named `Event Model`.

Instead:

```text
Application
    ↓
Domain Information

========== Resource Boundary ==========

Resource
    ↓
Resource Representation
    ↓
Nostr Event
```

Nostr event handling is one responsibility of the Resource Boundary.

An implementation MAY organize that responsibility behind services, parsers, adapters, strategies, or other code structures.

Those structures do not become additional architectural owners.

---

# Nostr Events and Local Authority

Receiving a Nostr event does not establish local application authority.

Conceptually:

```text
Relay
    ↓
Nostr Event
    ↓
Valid Resource Representation
    ↓
Resolved Resource Content
    ↓
Candidate Domain Information
    ↓
Acceptance Decision
```

The network supplies Resource representations.

The application determines whether resulting information becomes accepted local state.

Therefore:

> **A valid Nostr event is evidence of a valid publication, not automatic authority over local application state.**

---

# Raw Event Storage

The application MUST NOT require raw Nostr events to serve as its accepted Domain model.

An implementation MAY retain raw Nostr events for purposes such as:

* protocol caching,
* diagnostics,
* publication history,
* replay,
* or other Resource Boundary needs.

Such storage does not convert the raw event into authoritative Domain state.

Conceptually:

```text
Raw Nostr Event
    → optional protocol data

Accepted Domain Object
    → application state
```

These concerns remain distinct.

---

# Not Every Domain Object Produces a Nostr Event

The Event Model applies only when Domain information has a Resource representation.

Conceptually:

```text
Domain Object
        ↓
Needs external Resource lifecycle?
        │
        ├── No → Remains local
        │
        └── Yes
             ↓
           Resource
             ↓
        Nostr Event
```

A compatible implementation MUST NOT assume that every Domain Object is serialized into a Nostr event.

Runtime state, local-only information, derived data, or deliberately unpublished Domain information may never cross the Resource Boundary.

---

# Encoding and Encryption

This ADR does not define a universal encoding or encryption pipeline for Resource events.

Serialization is described by Resource Representation and media-type metadata.

If a Resource Type requires encryption, specialized encoding, or another protocol transformation, that behavior requires an explicit Resource protocol contract.

Implementations MUST NOT assume that every Resource publication requires:

```text
hex encoding
encryption
decryption
```

merely because those mechanisms are possible with Nostr.

Such behavior belongs in the specification only when a Resource contract actually requires it.

---

# Deletion

This ADR does not define Resource deletion semantics.

Nostr supports protocol mechanisms related to event deletion, but Resource deletion must be reconciled with:

* addressable Resource identity,
* replacement semantics,
* local authority,
* offline state,
* and synchronization.

Those semantics require an explicit Resource lifecycle decision.

A generic event-deletion mechanism MUST NOT automatically be treated as deletion of accepted local Domain information.

---

# Adding a Resource Event Mapping

When a new Resource Type must be represented through Nostr, reason in this order:

```text
What Resource Type is being published?
        ↓
What Domain information must survive publication?
        ↓
What Resource Representation is appropriate?
        ↓
Which Resource metadata must be carried?
        ↓
Can an existing Nostr Resource kind express it?
        │
        ├── Yes → use existing protocol structure
        │
        └── No → justify a new protocol contract
        ↓
How will Resource Resolution interpret the representation?
        ↓
How will the owning Domain validate the resolved content?
        ↓
Choose implementation
```

Do not begin with:

```text
Create an Event Strategy

Create an Event Factory

Add a parser registry

Add a new kind because the feature is new
```

Those are implementation choices or conclusions that require prior architectural justification.

---

# Specification Invariants

A compatible implementation MUST preserve these invariants:

```text
Resources are represented through valid signed Nostr events.

A Nostr event is a protocol representation,
not a Domain Object.

Resource metadata is interpreted independently
from Domain behavior.

Resource Identity is distinct from event ID.

Resource Classification is distinct from Resource Identity.

Representation determines how serialized content is obtained.

Protocol validation occurs before Resource interpretation.

Resource Resolution occurs before Domain interpretation.

A valid Nostr event does not automatically become accepted local state.

Raw Nostr events are not required as the application's
accepted Domain model.

Not every Domain Object requires a Nostr event.

Factories, strategies, registries, parsers, and builders
are implementation choices rather than architectural layers.
```

---

# Relationship to Other Specifications

This ADR depends on:

* **ADR 01 — Domain Resource Model**, which defines Resource, Resource Type, Resource Representation, Classification, Granularity, and the relationship to Domain Objects.
* **ADR 02 — Data Distribution Strategy**, which establishes Nostr as the Resource publication/discovery protocol and permits direct or externally stored content.

Later specifications define:

* **ADR 04 — Nostr Resource Identity**, which defines canonical identity and replacement semantics.
* **ADR 05 — Discovery Roots**, which defines where Nostr Resource discovery begins.
* **ADR 06 — Resource Discovery**, which defines how Resource events are located on relays.
* **ADR 07 — Resource Resolution**, which defines how Resource Representations produce verified Resource content.
* **ADR 08 — Resource Installation Lifecycle**, which defines how external information becomes accepted local state.
* later publication and synchronization ADRs, which define offline publication and multi-device reconciliation.

This ADR defines only the mapping between the Resource Representation and the Nostr event protocol envelope.

---

# Scope

This ADR defines:

* Nostr events as Resource protocol representations,
* the responsibilities of core event fields,
* Resource addressing metadata,
* Resource classification metadata,
* Resource representation metadata,
* the mapping of `content`, `descriptor`, and `descriptors` representations,
* protocol and Resource-event validation boundaries,
* outbound Resource-event construction,
* and the separation between Nostr events and Domain Objects.

It does not define:

* canonical Published Resource Identity,
* exact replacement conflict rules,
* Discovery Roots,
* relay query behavior,
* Resource Resolution algorithms,
* integrity algorithms,
* Domain validation rules,
* Resource Installation policy,
* persistence,
* Outbox durability,
* synchronization reconciliation,
* Resource deletion semantics,
* or implementation classes and registries.

---

# Big Takeaway

A Nostr event is the protocol representation through which a Resource participates in Nostr.

```text
Domain
    ↓
Domain Object
    ↓
Resource

========== Nostr Representation ==========

Nostr Event
    ↓
Relay
```

The event carries the publisher, Resource addressing metadata, classification, representation metadata, payload, publication timestamp, event identity, and signature required by the Nostr protocol.

It does not become the application's Domain model.

Inbound:

```text
Nostr Event
    ↓
Resource Representation
    ↓
Resource Resolution
    ↓
Domain Interpretation
    ↓
Candidate Domain Object
```

Outbound:

```text
Accepted Domain Information
    ↓
Resource
    ↓
Resource Representation
    ↓
Signed Nostr Event
```

The central rule is:

> **Nostr defines how the Resource is published. The Domain defines what the information means.**

Keeping those responsibilities separate allows the application to use Nostr deeply as its Resource protocol without coupling application behavior to raw Nostr events.
