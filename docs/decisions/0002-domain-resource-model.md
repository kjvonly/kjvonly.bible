# ADR 0002 — Domain, Resource, and Storage Model

**Status**

Accepted

---

# Problem

KJVOnly distributes many different types of application data.

Examples include:

- Bible text
- Overlays
- Reading plans
- Notes
- Annotations
- Search indexes
- Completed readings
- Publisher metadata
- Manifests

These resources may be:

- Published by different publishers
- Stored using different backends
- Installed independently
- Updated independently
- Shared across datasets
- Retrieved at different levels of granularity

Without a clear separation of concerns, concepts such as domains, resources, storage, and protocol details become tightly coupled. This makes the architecture difficult to evolve as new resource types, storage providers, or distribution models are introduced.

The application therefore needs a model that clearly separates:

- What the data represents.
- How the data is identified.
- How the data is transported.
- How the data is stored.
- How the application consumes the data.

---

# Decision

KJVOnly separates the following concepts:

1. Domain
2. Resource
3. Application Version
4. Event Revision
5. Domain Object
6. Protocol Representation
7. Storage Strategy

Each concept has a single responsibility.

No concept should imply another.

For example:

- A domain does not determine storage.
- A storage backend does not determine resource identity.
- A resource identifier does not determine the application object.
- A Nostr event is not the application's domain model.

This separation allows the application to evolve each layer independently while reusing the same installation, synchronization, and discovery pipelines.

---

## Architectural Overview

```mermaid
flowchart TD

    D["Domain"]
    R["Resource"]
    AV["Application Version"]
    ER["Event Revision"]
    DO["Domain Object"]
    EM["Event Model"]
    NE["Nostr Event"]

    D --> R
    R --> AV
    AV --> ER
    ER --> EM
    EM --> NE

    SS["Storage Strategy"]

    SS -. resolves .-> R
```

The application primarily works with **resources** and **domain objects**.

The Event Model translates between application objects and protocol events.

Storage strategies resolve resource content without changing the logical identity of the resource.

---

# Domain

A domain represents a broad category of application data.

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
Manifests
```

Domains organize the application.

They answer the question:

> **What category of data does this belong to?**

A domain does **not** describe:

- where data is stored,
- how it is synchronized,
- who owns it,
- how it is retrieved,
- or how it is represented on the network.

Those concerns belong elsewhere in the architecture.

---

# Domains and Protocol Kinds

A domain is an application concept.

A Nostr kind is a protocol concept.

Although the two are related, they serve different purposes.

KJVOnly intentionally minimizes the number of protocol kinds used by the application.

Kinds distinguish fundamentally different protocol structures rather than application features.

For example:

```ts
export const RESOURCE_KIND = 37770
export const MANIFEST_KIND = 37778
```

Most application resources use the generic `RESOURCE_KIND`.

The specific type of resource is determined by its resource identifier and classification tags rather than by allocating additional kinds.

This approach provides several advantages:

- New resource types can be introduced without allocating new kinds.
- Generic resource discovery becomes simpler.
- Installation and synchronization pipelines can be reused.
- Application concepts remain independent of protocol details.

Protocol kinds answer the question:

> **How should this event be interpreted?**

Domains answer the question:

> **What category of application data does this represent?**

These are intentionally different concerns.

# Resource

A resource is an independently identifiable unit of application data and the primary unit of distribution in KJVOnly.

Everything that can be discovered, installed, synchronized, exported, imported, or shared is represented as a resource.

Examples include:

- A complete Bible
- A single Bible chapter
- A reading plan
- A search index
- A paragraph overlay
- A pericope overlay
- Publisher metadata
- A note collection
- A single note
- A manifest

A resource is a logical concept.

It defines **what** the application distributes, but not **how** that data is represented, stored, or retrieved.

---

## Resource Representation

Resources are represented by Nostr events.

A Nostr event may represent a resource in one of two ways:

1. **Content Representation**
2. **Descriptor Representation**

Both represent the same logical resource.

The remainder of the application is unaware of which representation was used.

---

## Content Representation

A Content Representation stores the resource directly in the event `content`.

For example:

```json
{
  "kind": 37770,
  "tags": [
    ["d", "kjvonly/plans/readings/365-bible/v1"],
    ["t", "kjvonly/plans/readings"],
    ["representation", "content"],
    ["m", "application/json"]
  ],
  "content": "{ ... resource data ... }"
}
```

The resource content is parsed directly from the event.

No additional retrieval step is required.

---

## Descriptor Representation

A Descriptor Representation stores metadata describing how to retrieve the resource content.

For example:

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

The descriptor does not contain the resource itself.

Instead, it describes how the resource content can be retrieved.

Possible descriptor strategies include:

- Blossom
- HTTP
- IPFS
- Local Archive
- Future storage providers

Both Content and Descriptor representations ultimately produce the same resource data.

---

## Resource Resolution

Every resource follows the same installation pipeline.

```mermaid
flowchart TD

    EVENT["Nostr Event"]

    EVENT --> REP{"representation"}

    REP -->|content| CONTENT["Read Event Content"]

    REP -->|descriptor| DESC["Parse Descriptor"]

    DESC --> STRATEGY["Select Descriptor Strategy"]

    STRATEGY --> FETCH["Retrieve Resource Content"]

    FETCH --> VERIFY["Verify Integrity"]

    VERIFY --> CONTENT

    CONTENT --> TYPE["Determine Resource Type"]

    TYPE --> PARSER["Select Resource Parser"]

    PARSER --> DOMAIN["Create Domain Object"]

    DOMAIN --> STORE["Install into Domain Store"]
```

Representation determines **how the resource content is obtained**.

Resource type determines **how the resolved content is interpreted**.

This separation allows publishers to choose the most appropriate representation for each resource while keeping the remainder of the application architecture independent of storage implementation.

---

## Resource Identity

Every resource has a stable logical identity.

KJVOnly stores this identity in the Nostr `d` tag.

Resource identifiers follow the convention:

```text
namespace/domain/resource-type/...resource-id
```

The first three path segments classify the resource.

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

which becomes:

```text
namespace      = kjvonly
domain         = bible
resource-type  = chapters
resource-id    = kjv/1_1
```

Additional path segments are part of the logical resource identity.

They are not interpreted as filesystem paths.

> **Resource Type**
>
> The first three path segments (`namespace/domain/resource-type`) also identify
> the strategy responsible for parsing the resolved resource content.
>
> For example:
>
> ```text
> kjvonly/plans/readings/365-bible/v1
> ```
>
> selects the parser registered for:
>
> ```text
> kjvonly/plans/readings
> ```
>
> The remaining path segments identify the specific resource instance and do not
> affect parser selection.

---

## Resource Classification

While the `d` tag uniquely identifies a resource, clients frequently need to discover groups of related resources.

Every resource therefore also includes a classification tag.

The classification tag contains only the namespace, domain, and resource type.

Examples:

```text
t = kjvonly/bible/chapters
```

```text
t = kjvonly/search/bible
```

```text
t = kjvonly/plans/readings
```

The `d` tag answers:

> Which resource is this?

The classification tag answers:

> What class of resource is this?

The classification tag exists solely to support efficient relay filtering and discovery.

The `d` tag remains the authoritative resource identifier.

---

## Resource Identity and Classification

```mermaid
flowchart LR

    D["d tag<br/>kjvonly/bible/chapters/kjv"]

    T["classification tag<br/>kjvonly/bible/chapters"]

    D --> RID["Specific Resource"]

    T --> CLASS["Resource Class"]

    RID --> INSTALL["Install"]
    RID --> UPDATE["Update"]
    RID --> EXPORT["Export"]

    CLASS --> DISCOVER["Discovery"]
    CLASS --> FILTER["Filtering"]
```

The `d` tag identifies one logical resource.

The classification tag identifies a class of related resources.

Together they provide a consistent mechanism for discovery, synchronization, installation, and filtering while allowing the application to use a minimal number of protocol kinds.

# Resource Versioning

A resource may evolve at two independent levels:

1. **Resource Version**
2. **Event Revision**

These represent different concerns and should not be confused.

This ADR defines how these concepts relate to resource identity.

The complete versioning model, including compatibility, migration, and lifecycle management, is defined in ADR 0006.

---

## Resource Version

A Resource Version identifies a distinct version of a logical resource.

The version forms part of the resource's logical identity and is therefore included in the resource identifier.

For example:

```text
kjvonly/plans/readings/365-bible/v1
kjvonly/plans/readings/365-bible/v2
```

These represent two distinct resources.

Each Resource Version may:

- exist simultaneously
- be installed independently
- be updated independently
- be referenced independently

Resource Versions are not limited to publisher-provided content.

They may also represent application-generated or user-created resources.

For example:

```text
kjvonly/notes/default/v1
kjvonly/notes/default/v2

kjvonly/highlights/default/v1
kjvonly/highlights/default/v2
```

The rules governing when a new Resource Version should be created are defined by ADR 0006.

---

## Event Revision

Nostr addressable events are identified by:

```text
(kind, pubkey, d)
```

Publishing another event using the same values creates a new event with a different event identifier.

The Resource Version remains unchanged.

The newly published event replaces the previously published event for that Resource Version.

For example:

```text
kind   = RESOURCE_KIND
pubkey = publisher
d      = kjvonly/plans/readings/365-bible/v1
```

Publishing another event using the same address replaces the previous event while preserving the Resource Version.

Although previous revisions may continue to exist on some relays temporarily, clients treat the most recent event as the authoritative representation of the Resource Version.

This mechanism allows resources to be corrected, updated, or republished without changing their logical identity.

---

## Resource Version and Event Revision

Resource Versions and Event Revisions exist independently.

```mermaid
flowchart TD

    RV1["Resource Version<br/>365-bible/v1"]

    RV2["Resource Version<br/>365-bible/v2"]

    RV1 --> E1["Current Addressable Event"]

    RV2 --> E2["Current Addressable Event"]
```

Each Resource Version has its own addressable event.

Publishing a newer event using the same `(kind, pubkey, d)` replaces the current event for that Resource Version without creating a new Resource Version.

Creating a new Resource Version creates a new logical resource with its own independent addressable event.

---

## Summary

Resource Versioning and Event Revision solve different problems.

- **Resource Version** identifies a distinct version of a logical resource.
- **Event Revision** identifies successive publications of the same Resource Version.

A new Event Revision updates the current representation of an existing Resource Version.

A new Resource Version creates a new logical resource with its own independent identity.

Keeping these concepts separate allows resources to evolve over time while preserving stable logical identities and predictable update behavior.

# Resource Granularity

Resources should be sized according to how they are expected to evolve.

A resource should represent a logical unit that can be independently discovered, installed, synchronized, and updated.

Choosing an appropriate level of granularity improves synchronization efficiency while minimizing unnecessary data transfer.

---

## Coarse-Grained Resources

Coarse-grained resources group related data into a single resource.

Examples include:

- Complete Bibles
- Reading plans
- Search indexes
- Publisher metadata
- Large collections

Advantages include:

- Fewer resources to manage
- Simpler installation
- Lower protocol overhead

Disadvantages include:

- Larger updates
- Less selective synchronization

---

## Fine-Grained Resources

Fine-grained resources divide content into smaller independently addressable units.

Examples include:

- Individual Bible chapters
- Single notes
- Individual annotations
- Paragraph overlays
- Pericope overlays

Advantages include:

- Smaller updates
- Efficient synchronization
- Independent caching
- Selective installation

Disadvantages include:

- Increased resource count
- Additional discovery overhead

---

## Choosing Resource Granularity

Granularity should reflect how content changes over time rather than how it is displayed.

For example:

A Bible may be published as:

```text
kjvonly/bible/chapters/kjv
```

or as individual chapter resources:

```text
kjvonly/bible/chapters/kjv/1_1
kjvonly/bible/chapters/kjv/1_2
...
```

Both approaches are valid.

The choice depends on the desired synchronization and distribution characteristics.

Applications should not assume a particular level of granularity.

Instead, clients should treat each discovered resource as an independent unit.

---

## Granularity Independence

The application architecture is intentionally independent of resource granularity.

Regardless of whether a publisher distributes:

- one resource
- one hundred resources
- one thousand resources

the installation and synchronization pipeline remains unchanged.

```mermaid
flowchart LR

    DISCOVER["Discover Resources"]

    DISCOVER --> INSTALL["Install Resource"]

    INSTALL --> DOMAIN["Create Domain Object"]

    DOMAIN --> STORE["Store in Domain"]
```

Each resource is processed independently.

This allows publishers to optimize resource organization without affecting client behavior.

# Domain Objects

A Domain Object is the application-facing representation created from resolved resource content.

Domain Objects encapsulate application behavior and are the primary data structures used throughout the application.

Unlike resources, Domain Objects are independent of transport protocols, storage providers, and serialization formats.

---

## Resource Data and Domain Objects

Resources are the unit of distribution.

Domain Objects are the unit of application behavior.

A resource is parsed into one or more Domain Objects according to its resource type.

```mermaid
flowchart LR

    RESOURCE["Resolved Resource"]

    RESOURCE --> PARSER["Resource Parser"]

    PARSER --> OBJECTS["Domain Objects"]
```

The Resource Parser is selected using the resource type defined by the resource identifier.

For example:

```text
kjvonly/plans/readings
    → ReadingPlanParser

kjvonly/bible/chapters
    → BibleChapterParser

kjvonly/overlays/pericopes
    → PericopeParser
```

The resulting Domain Objects are independent of how the resource was represented or retrieved.

---

## Domain Object Identity

Every Domain Object retains the identity of the resource from which it was created.

A Domain Object is identified by:

```text
publisher + resource identifier
```

where:

```text
publisher
    The publisher's public key.

resource identifier
    The resource's logical identifier (d tag).
```

For example:

```text
publisher = npub1...
resource = kjvonly/plans/readings/365-bible/v1
```

Together these uniquely identify the origin of the Domain Object.

Event identifiers are operational metadata and do not define Domain Object identity.

---

## Resource and Object Granularity

Resource granularity and Domain Object granularity are independent.

A single resource may produce one or many Domain Objects.

For example:

```text
Reading Plan Resource
        │
        ▼
ReadingPlan
        │
        ├── ReadingPlanDay
        ├── ReadingPlanDay
        └── ReadingPlanDay
```

Likewise:

```text
Complete Bible Resource
        │
        ▼
BibleChapter
BibleChapter
BibleChapter
...
```

Resources define how data is distributed.

Domain Objects define how data is represented within the application.

Applications should not assume any fixed relationship between the two.

---

## Installation

For application resources, successful resolution and parsing results in installation.

```mermaid
flowchart LR

    EVENT["Nostr Event"]

    EVENT --> RESOLVE["Resolve Resource"]

    RESOLVE --> PARSE["Parse Resource"]

    PARSE --> DOMAIN["Create Domain Objects"]

    DOMAIN --> STORE["Store in IndexedDB"]
```

From the user's perspective, downloading a resource installs it.

Installation is therefore an inherent part of the resource resolution pipeline.

Individual domains may define different installation policies where appropriate.

---

## Authored Domain Objects

Domain Objects are also used when creating new application data.

The publication pipeline is the inverse of the installation pipeline.

```mermaid
flowchart LR

    USER["User"]

    USER --> DOMAIN["Domain Object"]

    DOMAIN --> STORE["Store in IndexedDB"]

    STORE --> OUTBOX["Outbox"]

    OUTBOX --> SERIALIZE["Serialize Resource"]

    SERIALIZE --> EVENT["Publish Nostr Event"]
```

This architecture allows the application to use the same Domain Objects regardless of whether data originated locally or from another publisher.

---

## Validation

Creating Domain Objects consists of three independent stages.

```text
1. Event Validation

    Validate the Nostr event.

2. Resource Resolution

    Resolve and verify the resource representation.

3. Resource Parsing

    Validate the resource schema and create Domain Objects.
```

Only after these stages succeed are Domain Objects installed into the application.

Each Domain Object may then enforce additional domain-specific invariants.

---

## Storage Independence

Domain Objects are independent of both transport and storage implementation.

The Resource Resolution Strategy determines how resource content is obtained.

The Resource Parser determines how resolved content is interpreted.

The Domain Storage Strategy determines how Domain Objects are stored locally.

```mermaid
flowchart TD

    EVENT["Nostr Event"]

    EVENT --> RESOLUTION["Resource Resolution Strategy"]

    RESOLUTION --> PARSER["Resource Parser"]

    PARSER --> DOMAIN["Domain Objects"]

    DOMAIN --> STORAGE["Domain Storage Strategy"]

    STORAGE --> INDEXEDDB["IndexedDB"]
```

Separating these responsibilities allows the application to evolve each layer independently.

Changes to resource representation, transport protocols, or storage providers do not require changes to the application's domain model.

# Domain Storage

Once a resource has been resolved, parsed, and validated, the resulting Domain Objects are persisted by the application.

The application stores Domain Objects rather than Nostr events, resource descriptors, or serialized resource data.

This allows the application to operate independently of transport protocols and storage providers.

---

## Domain Stores

Each domain owns its own persistent storage.

For example:

```text
Bible Store
Reading Plan Store
Notes Store
Highlights Store
Publisher Store
```

The internal storage structure of each domain is an implementation detail.

Domains are responsible for storing and retrieving their own Domain Objects.

---

## Installation

Installing a resource consists of creating or updating the corresponding Domain Objects within their respective Domain Stores.

```mermaid
flowchart LR

    RESOURCE["Resolved Resource"]

    RESOURCE --> PARSER["Resource Parser"]

    PARSER --> OBJECTS["Domain Objects"]

    OBJECTS --> STORE["Domain Store"]
```

Once installed, the application interacts exclusively with Domain Objects.

The original resource representation is no longer required for normal application behavior.

---

## Resource Updates

When a newer version of a resource is installed, the corresponding Domain Objects are updated within the Domain Store.

```mermaid
flowchart LR

    OLD["Installed Domain Objects"]

    UPDATE["Updated Resource"]

    UPDATE --> PARSER["Resource Parser"]

    PARSER --> NEW["Updated Domain Objects"]

    NEW --> STORE["Replace Installed Objects"]
```

The installation process is responsible for applying additions, updates, or removals required by the new resource.

The exact update behavior is domain-specific and is outside the scope of this ADR.

---

## Local Application Data

User-created application data follows the same architecture.

```mermaid
flowchart LR

    USER["User"]

    USER --> DOMAIN["Domain Objects"]

    DOMAIN --> STORE["Domain Store"]

    STORE --> OUTBOX["Outbox"]

    OUTBOX --> SERIALIZE["Serialize Resource"]

    SERIALIZE --> EVENT["Publish Nostr Event"]
```

Changes made by the user are immediately reflected in the local Domain Store.

Publication is performed asynchronously through the Outbox.

This allows the application to remain responsive while synchronizing changes with publishers.

---

## Storage Independence

Applications interact only with Domain Objects.

The persistence mechanism is hidden behind each Domain Store.

```mermaid
flowchart TD

    UI["Application"]

    UI --> DOMAIN["Domain Objects"]

    DOMAIN --> STORE["Domain Store"]

    STORE --> INDEXEDDB["IndexedDB"]
```

This separation allows storage implementations to evolve without affecting the remainder of the application.

For example, future implementations may replace or supplement IndexedDB with alternative persistence technologies while preserving the same domain model.

---

# Big Takeaway

The architecture separates application behavior from transport and persistence concerns.

```mermaid
flowchart TD

    DOMAIN["Domain"]

    DOMAIN --> RESOURCE["Resource"]

    RESOURCE --> REPRESENTATION["Representation"]

    REPRESENTATION --> RESOLUTION["Resource Resolution Strategy"]

    RESOLUTION --> PARSER["Resource Parser"]

    PARSER --> OBJECTS["Domain Objects"]

    OBJECTS --> STORAGE["Domain Store"]

    STORAGE --> APP["Application"]
```

Each layer has a single responsibility:

- **Domain** defines the application's logical organization.
- **Resource** defines the unit of distribution.
- **Representation** defines how a resource is represented.
- **Resource Resolution Strategy** obtains the resource content.
- **Resource Parser** creates Domain Objects.
- **Domain Objects** provide the application's working model.
- **Domain Store** persists Domain Objects for application use.

By separating these responsibilities, the application remains independent of transport protocols, storage providers, and serialization formats while maintaining a consistent and extensible programming model.