# ADR 01 — Domain Resource Model

**Status**

Accepted

---

# Problem

The application works internally with Domain information while the Resource Boundary distributes selected Domain information through Nostr.

Those two models serve different purposes.

Domain Objects express information according to application meaning.

Resources express information as independently identifiable units that can participate in an external lifecycle such as publication, discovery, resolution, installation, synchronization, sharing, or archival.

Without a common conceptual model, Domain behavior can become coupled to:

* Nostr event structures,
* Resource storage mechanisms,
* distribution granularity,
* protocol identity,
* or local persistence.

The Resource Boundary therefore requires a stable vocabulary defining what a Resource is and how it relates to the application's Domain model.

---

# Decision

The Resource Boundary separates these concepts:

1. **Domain**
2. **Domain Object**
3. **Resource**
4. **Resource Identifier**
5. **Published Resource Identity**
6. **Resource Type**
7. **Resource Classification**
8. **Resource Granularity**
9. **Resource Representation**
10. **Serialized Resource Content**

Each concept answers a different question.

No one concept implicitly determines all of the others.

In particular:

```text
Domain Object
    ≠ Resource

Resource
    ≠ Nostr event

Resource Identifier
    ≠ Nostr event ID

Resource Type
    ≠ storage mechanism

Resource Representation
    ≠ Domain Object

Resource Granularity
    ≠ Domain Object granularity
```

These distinctions form the conceptual foundation for the remaining Resource Boundary specifications.

---

# Conceptual Model

The application and Resource Boundary meet at the Domain Object / Resource transition.

```text
Application

    Domain
        ↓
    Domain Object

========== Resource Boundary ==========

    Resource
        ↓
    Resource Representation
        ↓
    Serialized Resource Content
        ↓
    Nostr / External Content
```

The outbound direction represents Domain information as Resources.

The inbound direction resolves Resource representations back toward Domain information.

The later Resource Installation specification determines when externally obtained information becomes accepted local application state.

---

# Domain

A Domain is an enduring area of application meaning and behavior.

Examples include:

```text
Bible
Notes
Reading Plans
Settings
```

A Domain determines:

> **What does this information mean to the application?**

For example, Bible annotations belong to the Bible Domain because their meaning comes from Bible content.

Bible Search likewise belongs to the Bible Domain.

Notes Search belongs to the Notes Domain.

A separate Resource type, Module, search index, Nostr kind, storage mechanism, or Resource Representation does not create a new Domain.

---

# Domain Objects

A Domain Object represents information according to its Domain meaning.

Examples include:

```text
Chapter
Annotation
Strong's Entry

Note

Reading Plan
Completed Reading
```

Domain Objects are the representations upon which application behavior operates.

They are independent from:

* Nostr events,
* Resource Representations,
* relay responses,
* external content providers,
* serialization formats,
* and local persistence technologies.

Conceptually:

```text
Domain
    ↓
Domain Object
    ↓
Application Behavior
```

A Nostr event MUST NOT be treated as the application's Domain Object merely because it contains equivalent information.

---

# Not Every Domain Object Is a Resource

A Domain Object does not automatically require a Resource representation.

A Resource is introduced when Domain information needs to participate in the external Resource lifecycle.

For example:

```text
Domain Information
        ↓
Does it need publication, discovery,
distribution, synchronization,
sharing, archival, or external retrieval?
        │
        ├── No → Remains local Domain information
        │
        └── Yes → Represent as a Resource
```

Runtime state, transient interaction state, local-only settings, derived data, or deliberately private Domain information MAY remain entirely local.

The existence of a Domain Object therefore MUST NOT imply the existence of a Resource.

---

# Resource

A Resource is an **independently identifiable unit of Domain information intended to participate in the external Resource lifecycle**.

Resources are the primary units distributed through the Resource Boundary.

Examples may include:

```text
a Bible version
a Bible chapter
a Reading Plan
an individual Note
a collection of Notes
```

A Resource defines **what unit of information is being externally distributed**.

It does not by itself define:

* how the information is represented by Nostr,
* where external content is stored,
* how that content is retrieved,
* how many Domain Objects the content produces,
* or how accepted local state is persisted.

---

# Domain Meaning and Resource Meaning

A Resource derives its application meaning from the Domain whose information it represents.

For example:

```text
Bible Domain
    ↓
Chapter Domain Object
    ↓
Chapter Resource
```

The Resource Boundary does not redefine what a Chapter means.

It defines how Chapter information participates in the Resource lifecycle.

The representation may change.

The Domain meaning MUST remain recoverable.

---

# Resource Identifier

Every Resource has a logical Resource Identifier.

The canonical Resource Identifier follows the path-like form:

```text
namespace/domain/resource-type/...resource-id
```

For example:

```text
kjvonly/bible/chapters/kjv
```

may be interpreted as:

```text
namespace      = kjvonly
domain         = bible
resource-type  = chapters
resource-id    = kjv
```

A more granular Resource may contain additional identity segments:

```text
kjvonly/bible/chapters/kjv/1_1
```

where:

```text
namespace      = kjvonly
domain         = bible
resource-type  = chapters
resource-id    = kjv/1_1
```

Additional segments are part of Resource Identity.

They MUST NOT be interpreted as filesystem paths merely because the identifier uses `/` separators.

---

# Published Resource Identity

A Resource Identifier alone does not identify a publication globally.

Resources are published within a publisher's Nostr address space.

Conceptually:

```text
Resource Identifier
        +
Publisher
        +
Nostr Resource Kind
        ↓
Published Resource Identity
```

The exact Nostr identity contract is defined by the Nostr Resource Identity specification.

That specification maps Published Resource Identity to:

```text
kind + publisher public key + d
```

A Nostr event ID identifies one specific publication.

It does not replace Published Resource Identity.

This ADR establishes the conceptual distinction; the protocol mapping belongs to the Nostr Resource Identity specification.

---

# Resource Type

A Resource Type identifies the semantic class of a Resource.

It is expressed by the first three Resource Identifier segments:

```text
namespace/domain/resource-type
```

For example:

```text
kjvonly/bible/chapters
kjvonly/plans/readings
kjvonly/notes/notes
```

The Resource Type answers:

> **What kind of Domain information does this Resource contain?**

The remaining identifier segments identify the particular Resource within that type.

For example:

```text
kjvonly/plans/readings/365-bible
```

contains:

```text
resource type = kjvonly/plans/readings
resource id   = 365-bible
```

Resource Type is independent from:

* Resource Representation,
* storage provider,
* Resource Granularity,
* and individual Nostr publication identity.

---

# Resource Classification

Resource Identity identifies a specific Resource.

Resource Classification allows clients to discover groups of related Resources.

The primary classification is derived from Resource Type:

```text
namespace/domain/resource-type
```

For example:

```text
kjvonly/bible/chapters
```

Conceptually:

```text
Resource Identifier
    kjvonly/bible/chapters/kjv/1_1

        ↓ specific identity

Resource Classification
    kjvonly/bible/chapters

        ↓ discovery class
```

Identity and classification MUST remain distinct.

Classification MUST NOT replace Resource Identity.

The Nostr Event Model defines how Resource Classification is represented in Nostr tags for relay discovery.

---

# Resource Representation

A Resource Representation defines how serialized Resource content is made available through the Nostr Resource model.

The Resource Boundary supports three representation forms:

```text
content

descriptor

descriptors
```

Representation answers:

> **How can the serialized content represented by this Nostr publication be obtained?**

Representation does not determine:

* Domain meaning,
* Resource Identity,
* Resource Type,
* publisher identity,
* or local persistence.

---

# `content` Representation

A `content` representation carries serialized Resource content directly in the Nostr publication.

Conceptually:

```text
Resource
    ↓
content representation
    ↓
Nostr event content
    ↓
Serialized Resource Content
```

No external content provider is required to obtain the serialized Resource content.

The Nostr Event Model defines the exact protocol representation.

---

# `descriptor` Representation

A `descriptor` representation carries metadata describing how serialized Resource content can be obtained externally.

Conceptually:

```text
Resource
    ↓
descriptor representation
    ↓
External Content Reference
    ↓
Serialized Resource Content
```

The descriptor is not itself the Resource content.

It identifies how the serialized content can be retrieved and may provide information required to verify that content.

The Data Distribution and Resource Resolution specifications define the external-content lifecycle.

---

# `descriptors` Representation

A `descriptors` representation describes a collection of independently identifiable Resources.

Conceptually:

```text
Collection Resource
        ↓
descriptors representation
        ↓
Descriptor A → Resource A
Descriptor B → Resource B
Descriptor C → Resource C
```

Each descriptor refers to an independently resolvable Resource.

A descriptors collection MAY reference Resources that themselves use descriptor-based representations, allowing Resource collections to be composed recursively.

The later Resource Resolution specification defines how such representations are traversed and resolved.

---

# Serialized Resource Content

Serialized Resource Content is the representation-independent payload obtained after the Resource Representation has been resolved.

Conceptually:

```text
content representation ───────┐
                              │
descriptor representation ────┼──→ Serialized Resource Content
                              │
descriptors representation ───┘
```

Serialized Resource Content is still Resource-boundary information.

It has not yet become a Domain Object merely because the bytes or serialized payload were obtained successfully.

Resource integrity and Domain validity are separate concerns.

---

# From Resource Content to Domain Objects

Resolved Resource content must be interpreted according to the owning Domain.

Conceptually:

```text
Verified Resource Content
        ↓
Owning Domain
        ↓
Domain validation
        ↓
Candidate Domain Object(s)
```

The owning Domain determines:

* the expected Domain schema,
* Domain invariants,
* how many Domain Objects are produced,
* and whether the content represents valid Domain information.

The Resource Boundary MUST NOT require a particular implementation abstraction such as a `Domain Object Factory`.

An implementation MAY use:

```text
factory
parser
serializer
schema validator
service
repository
```

or another mechanism.

The architectural requirement is that Resource content is interpreted according to the rules of the Domain that gives the information meaning.

---

# Resource Type and Domain Interpretation

Resource Type determines which Domain interpretation rules apply to resolved content.

For example:

```text
kjvonly/bible/chapters
        ↓
Bible Domain interpretation
```

or:

```text
kjvonly/plans/readings
        ↓
Reading Plans Domain interpretation
```

Resource Type therefore identifies the semantic contract of the serialized Resource content.

It MUST NOT require the specification to expose the implementation object that performs the interpretation.

---

# Resource Granularity

Resource Granularity describes how much Domain information is distributed as one Resource.

For example, Bible content might be distributed as:

```text
one Resource containing a Bible version
```

or:

```text
many Resources containing individual chapters
```

Both approaches use the same Resource concepts.

Conceptually:

```text
Bible Information
    │
    ├── Coarse Resource
    │       kjvonly/bible/chapters/kjv
    │
    └── Fine Resources
            kjvonly/bible/chapters/kjv/1_1
            kjvonly/bible/chapters/kjv/1_2
            kjvonly/bible/chapters/kjv/1_3
```

Granularity SHOULD be chosen according to Resource lifecycle needs such as:

* distribution efficiency,
* selective retrieval,
* installation boundaries,
* update size,
* synchronization behavior,
* and archival requirements.

Presentation structure MUST NOT determine Resource Granularity by itself.

---

# Resource Granularity and Domain Object Granularity

Resource Granularity and Domain Object granularity are independent.

One Resource MAY produce one Domain Object.

One Resource MAY also produce multiple Domain Objects.

Likewise, several Resources MAY contribute information used by the same Domain behavior.

For example:

```text
Reading Plan Resource
        ↓
Reading Plan Domain information
        ↓
Reading Plan
Reading Plan Days
```

The Resource determines the external distribution boundary.

The Domain determines the application's internal object model.

The two MUST NOT be forced into a one-to-one relationship.

---

# Resource Provenance

A Domain Object created from an external Resource SHOULD retain enough provenance to identify the Resource from which it originated.

At minimum, where applicable, that provenance includes:

```text
publisher public key
Resource Identifier
```

A Nostr event ID MAY also be retained as publication metadata.

The event ID MUST NOT become the Domain Object's application identity merely because that event supplied the content.

This preserves the distinction between:

```text
Resource origin
publication instance
Domain Object identity
```

---

# Resource Representation Independence

A Resource's application meaning and logical identity MUST remain independent from its representation.

For example:

```text
Resource
    ↓
may use content today
    ↓
may use descriptor later
```

Changing the representation alone does not create a new Domain concept.

Likewise, moving externally stored content between supported providers does not by itself create a new Resource Type.

The later Data Distribution Strategy specifies this storage independence in detail.

---

# Resource Lifecycle

The concepts defined here participate in the broader Resource Boundary lifecycle.

Conceptually:

```text
Domain Information
        ↓
Resource
        ↓
Resource Representation
        ↓
Nostr Publication
        ↓
Discovery
        ↓
Resolution
        ↓
Verified Resource Content
        ↓
Domain Interpretation
        ↓
Candidate Domain Object
        ↓
Installation / Acceptance
        ↓
Accepted Local State
```

Each later specification owns one part of that lifecycle.

This ADR defines the vocabulary they share.

---

# Adding a New Resource Type

When new Domain information may need external distribution, reason through the model in this order:

```text
What Domain gives the information meaning?
        ↓
Does the information need an external Resource lifecycle?
        │
        ├── No → Keep it as local Domain information
        │
        └── Yes
             ↓
What independently identifiable unit should be distributed?
        ↓
What is its Resource Type?
        ↓
What Resource Identifier identifies each instance?
        ↓
What granularity best fits distribution and synchronization?
        ↓
What serialized Domain information must the Resource preserve?
        ↓
Which representation can distribute that content?
        ↓
Apply the later Nostr protocol specifications
```

Do not begin with:

```text
Which Nostr kind should I create?

Which IndexedDB store should hold it?

Which parser class should handle it?

Should it use Blossom?
```

Those questions follow the Resource model.

---

# Specification Invariants

Compatible Resource Boundary implementations MUST preserve these invariants:

```text
Domains define application meaning.

Domain Objects are the application's internal model.

Not every Domain Object is a Resource.

Resources are independently identifiable units
of externally distributed Domain information.

Resource Identity is independent from storage location.

Resource Type is independent from representation.

Classification does not replace identity.

Resource Granularity does not determine Domain Object granularity.

A Resource Representation does not become a Domain Object.

A Nostr event does not become a Domain Object.

Resolved Resource content requires Domain interpretation
before it can become Domain information.

Local persistence is not part of the Resource model.
```

---

# Scope

This ADR defines:

* the relationship between Domains, Domain Objects, and Resources,
* Resource Identifier,
* Published Resource Identity as a conceptual distinction,
* Resource Type,
* Resource Classification,
* Resource Granularity,
* Resource Representation,
* Serialized Resource Content,
* Domain interpretation of Resource content,
* and the distinction between Resources and local-only Domain information.

It does not define:

* exact Nostr event schemas,
* Nostr tag mappings,
* signing,
* replaceable-event behavior,
* Resource Discovery queries,
* Discovery Roots,
* Resource Resolution algorithms,
* integrity verification rules,
* Resource Installation policy,
* local persistence,
* publication queues,
* synchronization,
* or archives.

Those decisions belong to later Resource Boundary specifications.

---

# Big Takeaway

The Domain Resource Model separates the application's internal meaning from the units distributed through Nostr.

```text
Domain
    ↓
Domain Object

========== Resource Boundary ==========

Resource
    ↓
Resource Representation
    ↓
Nostr
```

A Domain defines what information means.

A Resource defines what independently identifiable information participates in the external Resource lifecycle.

A Resource Representation defines how its serialized content is made available.

The Resource model does not dictate local persistence, implementation classes, or a one-to-one relationship with Domain Objects.

Most importantly:

> **A Domain Object becomes relevant to the Resource Boundary only when its information needs an external Resource lifecycle.**

Everything else in the Resource Boundary specification builds upon that distinction.
