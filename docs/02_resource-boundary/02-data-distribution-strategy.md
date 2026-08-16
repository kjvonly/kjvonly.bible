# ADR 0002 — Data Distribution Strategy

**Status**

Accepted

---

# Problem

The Resource Boundary uses Nostr to distribute application Resources.

Resources vary significantly in size and structure. Some Resource content is small enough to be carried directly by a Nostr event. Other content is better stored outside Nostr and referenced by the Nostr representation.

The distribution model must therefore support both approaches without creating different Resource models for different storage mechanisms.

The specification must preserve these properties:

* Nostr provides the protocol for Resource publication and discovery.
* Resource Identity is independent from where Resource content is stored.
* Small and large Resources can use the same Resource lifecycle.
* Publishers can choose appropriate Resource granularity.
* External storage providers can evolve without redefining application Resources.
* Installed Resource information remains usable while offline.

---

# Decision

Resources are published and discovered through Nostr.

A Nostr publication carries a **Resource Representation** describing how the Resource content is obtained.

Conceptually:

```text
Resource
    ↓
Resource Representation
    ↓
Nostr
```

The Resource Representation MAY carry the serialized Resource content directly or MAY reference content stored outside Nostr.

The location of Resource content MUST NOT change the identity or application meaning of the Resource.

---

# Distribution Model

Nostr provides the protocol-level mechanisms required to distribute Resource representations, including:

* publisher identity,
* signed publication,
* Resource addressing metadata,
* relay-based publication,
* and Resource discovery.

Resource content itself may use different distribution forms.

```text
Resource
    ↓
Resource Representation
    │
    ├── Content
    │       Resource content carried by Nostr
    │
    ├── Descriptor
    │       Resource content resolved externally
    │
    └── Descriptors
            collection of externally resolvable Resource references
```

These representation forms are defined by the Resource model and Nostr representation specifications.

This ADR establishes only that they participate in the same distribution model.

---

# Nostr as the Distribution Protocol

Nostr is the authoritative protocol contract for publishing and discovering Resource Representations.

Conceptually:

```text
Publisher
    ↓
Signed Nostr Publication
    ↓
Resource Representation
    ↓
Resource Content
```

A compatible Resource Boundary implementation MUST use the Resource's Nostr representation when publishing or discovering externally distributed Resources.

The application MUST NOT require direct knowledge of the content storage provider in order to identify or discover the Resource.

---

# Representation Determines Content Retrieval

The Resource Representation determines how its serialized content is obtained.

For content carried directly by Nostr:

```text
Nostr Event
    ↓
Resource Representation
    ↓
Serialized Resource Content
```

For externally stored content:

```text
Nostr Event
    ↓
Resource Representation
    ↓
External Content Reference
    ↓
Serialized Resource Content
```

The resulting serialized Resource content participates in the same later Resource lifecycle regardless of which representation form was used.

Representation affects **how content is obtained**.

It does not create a different kind of application Resource.

---

# External Content Storage

External content MAY be stored using Blossom, HTTP-addressable storage, archives, or another storage mechanism supported by Resource Resolution.

Conceptually:

```text
Nostr Resource Representation
        ↓
External Reference
        ↓
Content Storage
        ↓
Serialized Resource Content
```

The storage mechanism answers:

> **Where and how can the referenced content be obtained?**

It does not determine:

* what the Resource means,
* which Domain gives that information meaning,
* the Resource's canonical identity,
* the Resource type,
* or how the resulting Domain information behaves.

A new content storage mechanism therefore MUST NOT require a new Domain or a new Resource model merely because the bytes are retrieved differently.

---

# Storage Independence

Resource Identity MUST remain stable across supported representation and storage mechanisms.

For example, moving Resource content from one external storage provider to another MUST NOT by itself create a different logical Resource.

Likewise, whether content is:

```text
embedded in Nostr

or

referenced externally
```

does not determine the Resource's identity.

The Resource Identity specification defines canonical identity independently from storage location.

This separation allows storage technologies to evolve without redefining the Resource model.

---

# Representation Does Not Define Resource Type

Nostr kinds and Resource metadata identify protocol and Resource semantics.

The storage mechanism does not.

A Resource stored through Blossom MUST NOT require a Blossom-specific Resource type merely because Blossom carries its content.

Likewise, a Resource whose content is embedded directly in a Nostr event does not become a different Resource type because of that representation choice.

Conceptually:

```text
Resource Type
    independent from
Representation
    independent from
Content Storage Provider
```

These dimensions may influence one another operationally, but they remain distinct parts of the specification.

---

# Resource Granularity

The distribution model supports independently identifiable Resources at different levels of granularity.

For example:

```text
Bible collection

Bible chapter

Reading Plan

Note

Collection of Notes
```

A publisher MAY choose coarse-grained Resources where efficient bootstrap or bulk distribution is useful.

A publisher MAY choose fine-grained Resources where selective retrieval, independent publication, or smaller updates are desirable.

Granularity does not change the fundamental distribution model.

Each published Resource remains governed by the same Resource Identity, Representation, Discovery, Resolution, and Installation specifications.

The rules defining Resource granularity itself belong to the Domain Resource Model.

---

# Collections

A Resource MAY describe a collection of other independently resolvable Resources.

Conceptually:

```text
Collection Resource
        ↓
Resource Representations
        ↓
Resource A
Resource B
Resource C
```

The collection does not require all referenced content to be physically bundled into one Nostr event or one external object.

This allows publishers to compose larger distributions from smaller independently identifiable Resources while preserving the Resource lifecycle of each referenced Resource.

The exact representation and resolution rules for such collections are defined by the later representation and Resource Resolution specifications.

---

# Integrity

Externally retrieved Resource content MUST be verified according to the Resource Resolution specification before it is treated as verified Resource content.

A Resource Representation MAY include integrity information required to perform that verification.

The content storage provider is not responsible for defining the Resource's integrity semantics.

Conceptually:

```text
Resource Representation
        ↓
Retrieve Content
        ↓
Verify Content
        ↓
Verified Resource Content
```

The exact verification rules belong to Resource Resolution.

This ADR requires only that using external storage must not weaken the integrity guarantees of the Resource lifecycle.

---

# Offline-First Distribution

Network distribution and local application use are separate concerns.

Nostr and external content storage are used to make Resource information available to the application.

After externally obtained Resource information has completed the later Resolution, validation, and Installation lifecycle, accepted local state remains usable independently of network availability.

Conceptually:

```text
Nostr / External Content
        ↓
Resource Boundary
        ↓
Accepted Local State
        ↓
Application
```

A compatible implementation MUST NOT require an active relay or content-storage connection merely to continue using already accepted local Resource information.

Loss of network connectivity affects distribution.

It does not invalidate accepted local state.

---

# Distribution and the Resource Lifecycle

This ADR defines only the distribution strategy.

The complete inbound lifecycle is specified by later ADRs:

```text
Nostr Publication
        ↓
Resource Discovery
        ↓
Resource Resolution
        ↓
Verified Resource Content
        ↓
Resource Installation
        ↓
Accepted Local State
```

Distribution does not perform those later responsibilities.

In particular, discovering a Resource Representation does not imply that its content has been resolved, validated, or accepted by the application.

---

# Scope

This ADR establishes:

* Nostr as the Resource publication and discovery protocol,
* representation-independent Resource distribution,
* external content-storage independence,
* support for multiple Resource granularities,
* and the offline-first separation between network distribution and accepted local state.

It does not define:

* the Domain Resource Model,
* canonical Resource Identity,
* Nostr event field mappings,
* Resource Representation payload schemas,
* Discovery Roots,
* Resource Discovery queries,
* Resource Resolution behavior,
* Domain validation,
* Resource Installation,
* publication queues,
* synchronization policy,
* or local persistence mechanisms.

Those decisions are defined by the corresponding Resource Boundary specifications.

---

# Specification Invariants

A compatible implementation MUST preserve the following invariants:

```text
Nostr publishes and discovers Resource Representations.

Resource content may be carried directly
or obtained through an external reference.

Storage location does not define Resource Identity.

Storage location does not define Resource meaning.

Representation choice does not create a different Domain model.

External content receives the same integrity guarantees
as directly carried content.

Accepted local state remains usable without network access.
```

These invariants allow the Resource Boundary to use Nostr as a stable distribution protocol while permitting Resource content storage to evolve independently.

---

# Big Takeaway

Nostr is the distribution protocol for Resources.

A Resource Representation determines how the Resource content is obtained:

```text
Resource
    ↓
Nostr Resource Representation
    │
    ├── direct content
    └── external content reference
```

The representation and storage mechanism may vary.

The Resource's identity and application meaning do not.

This separation allows an offline-first application to use Nostr for publication and discovery while distributing Resource content through the mechanism most appropriate for each Resource.
