# ADR 0002 — Domain and Resource Model

**Status**

Accepted

---

# Problem

KJVOnly works with many categories of application data.

Examples include:

* Bible text
* Overlays
* Reading plans
* Notes
* Annotations
* Search indexes
* Completed readings
* Publisher metadata

These resources may be published by different publishers, represented in different formats, stored through different providers, and distributed at different levels of granularity.

Without a shared conceptual model, concerns such as application behavior, resource identity, protocol representation, storage, and persistence can become tightly coupled.

The architecture therefore needs clear definitions for the concepts used throughout the system.

---

# Decision

KJVOnly separates the following concepts:

1. Domain
2. Resource
3. Resource Representation
4. Resource Identity
5. Resource Classification
6. Resource Version
7. Event Revision
8. Domain Object
9. Domain Store

Each concept has one responsibility.

No concept should implicitly determine another.

For example:

* A domain does not determine storage.
* A storage provider does not determine resource identity.
* A resource identifier does not determine its network representation.
* A Nostr event is not a Domain Object.
* Resource granularity does not determine Domain Object granularity.

---

# Conceptual Model

```mermaid
flowchart TD

    DOMAIN["Domain"]

    DOMAIN --> RESOURCE["Resource"]

    RESOURCE --> IDENTITY["Resource Identity"]
    RESOURCE --> CLASSIFICATION["Resource Classification"]
    RESOURCE --> REPRESENTATION["Resource Representation"]

    REPRESENTATION --> RESOLVED["Resolved Resource Content"]

    RESOLVED --> OBJECTS["Domain Objects"]

    OBJECTS --> STORE["Domain Store"]
    STORE --> APPLICATION["Application"]
```

The application works primarily with Domain Objects stored in Domain Stores.

Resources are the units through which those objects are distributed.

Representations describe how resource content is made available.

---

# Domain

A Domain represents a broad category of application data.

Examples include:

```text
Bible
Overlays
Plans
Notes
Annotations
Search
Completed Readings
Publishers
```

A Domain answers:

> What category of application data does this belong to?

A Domain may own:

* Domain Objects
* Resource parsers
* Domain Stores
* repositories
* application services
* domain-specific validation

A Domain does not define:

* where resource content is stored,
* how resource content is retrieved,
* who publishes a resource,
* how a resource is represented on the network,
* or how synchronization occurs.

---

# Domains and Protocol Kinds

A Domain is an application concept.

A Nostr kind is a protocol concept.

They serve different purposes.

KJVOnly minimizes the number of protocol kinds used by the application.

Most application resources use a generic resource kind:

```ts
export const RESOURCE_KIND = 37770
```

The resource identifier and classification metadata determine the application meaning of a resource.

The kind determines how the protocol event should be validated and interpreted at the event boundary.

```mermaid
flowchart LR

    KIND["Nostr Kind"]

    KIND --> PROTOCOL["Protocol Structure"]

    DOMAIN["Domain"]

    DOMAIN --> APPLICATION["Application Meaning"]
```

Protocol kinds answer:

> What event structure is this?

Domains answer:

> What application category does this belong to?

---

# Resource

A Resource is an independently identifiable unit of application data.

Resources are the primary units of distribution in KJVOnly.

Anything that may be independently discovered, installed, synchronized, exported, imported, or shared is represented as a Resource.

Examples include:

* a complete Bible,
* a Bible chapter,
* a reading plan,
* a search index,
* a paragraph overlay,
* publisher metadata,
* a collection of notes,
* or an individual note.

A Resource is a logical concept.

It defines what is being distributed, but it does not define:

* how the content is transported,
* where the content is stored,
* how the content is serialized,
* or how the application persists the resulting Domain Objects.

---

# Resource Representation

A Resource Representation describes how a resource is represented by a Nostr event.

KJVOnly supports three representations:

1. `content`
2. `descriptor`
3. `descriptors`

```mermaid
flowchart TD

    RESOURCE["Resource"]

    RESOURCE --> CONTENT["content"]
    RESOURCE --> DESCRIPTOR["descriptor"]
    RESOURCE --> DESCRIPTORS["descriptors"]
```

Representation determines how resource content becomes available for resolution.

It does not determine:

* the Domain,
* the resource type,
* the publisher,
* the resource identity,
* or the Domain Objects produced from the content.

---

## Content Representation

A `content` representation stores serialized resource content directly in the event `content`.

```json
{
  "kind": 37770,
  "tags": [
    ["d", "kjvonly/plans/readings/365-bible/v1"],
    ["t", "kjvonly/plans/readings"],
    ["representation", "content"],
    ["m", "application/json"]
  ],
  "content": "{ ... resource content ... }"
}
```

No external storage provider is required to obtain the serialized resource content.

---

## Descriptor Representation

A `descriptor` representation stores metadata describing how resource content may be retrieved.

```json
{
  "kind": 37770,
  "tags": [
    ["d", "kjvonly/bible/chapters/kjv"],
    ["t", "kjvonly/bible/chapters"],
    ["representation", "descriptor"],
    ["m", "application/json"]
  ],
  "content": "{
    \"strategy\":\"blossom\",
    \"url\":\"https://...\",
    \"sha256\":\"...\",
    \"mediaType\":\"application/json+gzip\"
  }"
}
```

The descriptor is not the resource content.

It describes where the serialized resource content is located and how it may be verified.

Possible strategies include:

```text
Blossom
HTTP
IPFS
Local Archive
Future Providers
```

---

## Descriptors Representation

A `descriptors` representation contains a collection of descriptors.

Each descriptor identifies an independently resolvable resource.

```json
{
  "kind": 37770,
  "tags": [
    ["d", "kjvonly/notes/shared-sermon-series-notes"],
    ["t", "kjvonly/notes"],
    ["representation", "descriptors"],
    ["m", "application/json"]
  ],
  "content": "[
    {
      \"resource\":\"kjvonly/notes/shared-sermon-series-notes/sermon-1\",
      \"strategy\":\"blossom\",
      \"url\":\"https://...\",
      \"sha256\":\"...\",
      \"mediaType\":\"application/json+gzip\"
    },
    {
      \"resource\":\"kjvonly/notes/shared-sermon-series-notes/sermon-2\",
      \"strategy\":\"blossom\",
      \"url\":\"https://...\",
      \"sha256\":\"...\",
      \"mediaType\":\"application/json+gzip\"
    }
  ]"
}
```

The collection contains descriptors only.

It does not mix descriptors with inline resource content.

Descriptor collections may reference resources that are themselves represented as `descriptors`, allowing collections to be composed recursively.

The behavior for resolving singular and collection representations is defined in ADR 0004.

---

# Resource Identity

Every Resource has a stable logical identity.

KJVOnly stores this identity in the Nostr `d` tag.

Resource identifiers follow this convention:

```text
namespace/domain/resource-type/...resource-id
```

The first three segments classify the resource.

Everything after `resource-type` identifies the specific resource.

For example:

```text
kjvonly/bible/chapters/kjv
```

represents:

```text
namespace      = kjvonly
domain         = bible
resource-type  = chapters
resource-id    = kjv
```

A more granular resource may contain additional identity segments:

```text
kjvonly/bible/chapters/kjv/1_1
```

which represents:

```text
namespace      = kjvonly
domain         = bible
resource-type  = chapters
resource-id    = kjv/1_1
```

Additional segments are part of the logical identity.

They are not interpreted as filesystem paths.

---

## Publisher and Resource Identity

A `d` tag is unique only within a publisher's address space.

The complete identity of a published resource is therefore:

```text
publisher public key + resource identifier
```

In Nostr addressable-event terms:

```text
kind + publisher public key + d tag
```

Within the application model, the publisher and resource identifier identify the origin of the resource.

```mermaid
flowchart LR

    PUBLISHER["Publisher Public Key"]

    RESOURCE_ID["Resource Identifier"]

    PUBLISHER --> IDENTITY["Published Resource Identity"]
    RESOURCE_ID --> IDENTITY
```

The same resource identifier published by two publishers represents two independently owned resources.

---

# Resource Classification

The `d` tag identifies one specific Resource.

Clients also need to discover classes of related Resources.

Every Resource therefore includes a classification tag containing:

```text
namespace/domain/resource-type
```

Examples include:

```text
kjvonly/bible/chapters
kjvonly/search/bible
kjvonly/plans/readings
```

For example:

```json
["t", "kjvonly/bible/chapters"]
```

The `d` tag answers:

> Which Resource is this?

The classification tag answers:

> What class of Resource is this?

```mermaid
flowchart LR

    D["d tag<br/>kjvonly/bible/chapters/kjv"]

    T["t tag<br/>kjvonly/bible/chapters"]

    D --> SPECIFIC["Specific Resource"]
    T --> CLASS["Resource Class"]
```

The `d` tag remains the authoritative logical resource identifier.

The classification tag supports relay filtering and discovery.

It does not replace or redefine Resource Identity.

---

# Resource Type

The first three segments of a Resource Identifier define the Resource Type:

```text
namespace/domain/resource-type
```

For example:

```text
kjvonly/plans/readings
kjvonly/bible/chapters
kjvonly/overlays/pericopes
```

The Resource Type identifies the application component responsible for interpreting resolved resource content.

The remaining identifier segments select the specific Resource instance.

For example:

```text
kjvonly/plans/readings/365-bible/v1
```

contains:

```text
resource type = kjvonly/plans/readings
resource id   = 365-bible/v1
```

Resource Type is an application-level classification.

It is independent of representation and storage strategy.

---

# Resource Version and Event Revision

Resources may evolve at two separate levels:

1. Resource Version
2. Event Revision

These concepts address different kinds of change.

---

## Resource Version and Event Revision

Resources evolve through Event Revisions and explicit Resource Versions. These concepts are defined in ADR 0006.

---

# Resource Granularity

Resource Granularity describes how much application data is distributed as one Resource.

A Resource may be coarse-grained or fine-grained.

---

## Coarse-Grained Resources

Examples include:

* a complete Bible,
* a complete search index,
* publisher metadata,
* or a large note collection.

Advantages may include:

* fewer resources,
* simpler distribution,
* and lower protocol overhead.

---

## Fine-Grained Resources

Examples include:

* an individual Bible chapter,
* a single note,
* one annotation,
* or one overlay segment.

Advantages may include:

* selective installation,
* smaller updates,
* and independent synchronization.

---

## Granularity Independence

The architecture does not require one granularity.

For example, Bible chapters may be represented as one resource:

```text
kjvonly/bible/chapters/kjv
```

or as many resources:

```text
kjvonly/bible/chapters/kjv/1_1
kjvonly/bible/chapters/kjv/1_2
kjvonly/bible/chapters/kjv/1_3
```

Both models use the same identity and representation concepts.

```mermaid
flowchart TD

    DATASET["Bible Dataset"]

    DATASET --> BUNDLE["One Bundle Resource"]
    DATASET --> ITEMS["Many Chapter Resources"]
```

Granularity should reflect distribution, installation, and update needs rather than presentation structure.

---

# Domain Object

A Domain Object is the application-facing representation created from resolved Resource content.

Domain Objects are the primary data structures used by application features.

Examples include:

```text
BibleChapter
ReadingPlan
ReadingPlanDay
Note
Annotation
Publisher
CompletedReading
```

A Domain Object is independent of:

* Nostr events,
* Resource Representations,
* storage providers,
* network serialization,
* and transport protocols.

```mermaid
flowchart LR

    RESOURCE["Resolved Resource Content"]

    RESOURCE --> PARSER["Resource Parser"]

    PARSER --> OBJECTS["Domain Objects"]
```

The Resource Type identifies the parser responsible for creating the Domain Objects.

---

## Domain Object Identity

A Domain Object retains the origin of the Resource from which it was created.

Its resource origin includes:

```text
publisher public key
resource identifier
```

Event identifiers are revision metadata.

They do not define Domain Object identity.

A Resource may produce one or many Domain Objects.

```mermaid
flowchart TD

    RESOURCE["Reading Plan Resource"]

    RESOURCE --> PLAN["ReadingPlan"]
    RESOURCE --> DAY1["ReadingPlanDay"]
    RESOURCE --> DAY2["ReadingPlanDay"]
    RESOURCE --> DAY3["ReadingPlanDay"]
```

Resource Granularity and Domain Object Granularity are independent.

Resources define distribution boundaries.

Domain Objects define application behavior.

---

# Domain Store

A Domain Store persists Domain Objects for application use.

Each Domain owns the storage interface for its Domain Objects.

Examples include:

```text
Bible Store
Reading Plan Store
Notes Store
Annotation Store
Publisher Store
```

The application reads Domain Objects from Domain Stores rather than reading Nostr events or descriptor payloads directly.

```mermaid
flowchart LR

    UI["Application"]

    UI --> OBJECTS["Domain Objects"]

    OBJECTS --> STORE["Domain Store"]
```

A Domain Store is a conceptual boundary.

Its physical persistence model is defined separately in ADR 0007.

---

# Concept Boundaries

```mermaid
flowchart TD

    EVENT["Nostr Event"]

    EVENT --> REPRESENTATION["Resource Representation"]

    REPRESENTATION --> CONTENT["Resolved Resource Content"]

    CONTENT --> OBJECTS["Domain Objects"]

    OBJECTS --> STORE["Domain Store"]

    STORE --> APP["Application"]
```

Each concept answers a different question:

* **Domain:** What category of application data is this?
* **Resource:** What independently identifiable data is distributed?
* **Representation:** How is the Resource represented for resolution?
* **Resource Identity:** Which logical Resource is this?
* **Classification:** What class of Resources does it belong to?
* **Resource Version:** Is this a separately identifiable version?
* **Event Revision:** Is this a newer publication of the same Resource?
* **Domain Object:** What application-facing object does the content produce?
* **Domain Store:** Where does the application access those objects?

Behavior such as discovery, resolution, installation, persistence, updates, and synchronization is defined by later ADRs.

---

# Scope

This ADR defines the conceptual vocabulary used throughout the architecture.

It does not define:

* how Resources are discovered,
* how representations are resolved,
* how integrity is verified,
* how Domain Objects are installed,
* how Domain Stores are implemented,
* how Resource updates are selected,
* or how changes are synchronized.

Those behaviors are defined in later ADRs.

---

# Big Takeaway

KJVOnly separates the unit of distribution from the application's working model.

```mermaid
flowchart LR

    DOMAIN["Domain"]

    DOMAIN --> RESOURCE["Resource"]

    RESOURCE --> REPRESENTATION["Representation"]

    REPRESENTATION --> CONTENT["Resolved Content"]

    CONTENT --> OBJECTS["Domain Objects"]

    OBJECTS --> STORE["Domain Store"]
```

Resources define what is distributed.

Representations define how serialized content is made available.

Domain Objects define how the application works with that content.

Domain Stores make those objects available to the application.
