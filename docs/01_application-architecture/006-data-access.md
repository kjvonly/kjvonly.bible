# Data Access

## Status

Current

---

# Purpose

This document defines how Domain Objects are obtained within the KJVOnly application.

It explains how Modules and Domain Services request data without depending upon storage technologies, transport protocols, or persistence implementations.

This document establishes the abstraction that allows the application to operate consistently regardless of where Domain Objects originate.

---

# Scope

This document defines:

* Data Access,
* Domain Object retrieval,
* local-first access,
* local-store-first behavior,
* interaction with Domain Stores,
* interaction with the Resource Architecture,
* and the responsibilities of the Data Access abstraction.

It does not define:

* Domain behavior,
* persistence technologies,
* relay communication,
* background synchronization,
* startup,
* or transport protocols.

Those responsibilities are described by separate implementation and architecture documents.

---

# Background

The application is built around Domain Objects.

Modules and Domain Services operate exclusively on Domain Objects.

They should not know:

* where those Domain Objects are stored,
* how they are retrieved,
* whether they originated locally,
* or whether they were obtained from the network.

Conceptually:

```mermaid
flowchart TD

    Module["Module"]

    Service["Domain Service"]

    DataAccess["Data Access"]

    Object["Domain Object"]

    Module --> Service

    Service --> DataAccess

    DataAccess --> Object
```

The purpose of Data Access is to separate the request for data from the mechanism used to obtain it.

The caller requests a Domain Object.

Data Access determines how that request is satisfied.

---

# Data Access Definition

Data Access is responsible for obtaining Domain Objects on behalf of the application.

It owns the decision of where those objects should be retrieved from.

Possible sources include:

* Domain Stores,
* the Resource Architecture,
* cached application state,
* or future data providers.

The caller does not select the source.

The caller simply requests the required Domain Object.

This allows Modules and Domain Services to remain independent from storage technologies and transport implementations.

---

# Local-First Retrieval

The application follows a local-first retrieval strategy.

Whenever a Domain Object is requested, Data Access first attempts to satisfy that request using locally available data.

Only when the requested Domain Object cannot be obtained locally does Data Access request it from the Resource Architecture.

The caller does not choose the retrieval source.

The caller simply requests the required Domain Object.

This separation allows application behavior to remain independent from storage technologies and transport implementations.

One of the fundamental principles of the application is:

> **Request data, not location.**

Modules and Domain Services request the Domain Object they require.

They do not request:

* IndexedDB,
* Nostr,
* Blossom,
* HTTP,
* memory,
* or any other storage or transport technology.

Conceptually:

```mermaid
flowchart TD

    Request["Request Domain Object"]

    Store["Domain Store"]

    Found{"Available?"}

    Resource["Resource Architecture"]

    Object["Domain Object"]

    Request --> Store

    Store --> Found

    Found -->|"Yes"| Object

    Found -->|"No"| Resource

    Resource --> Object
```

If the requested Domain Object already exists locally, it is returned immediately.

If it is unavailable locally, Data Access retrieves it through the Resource Architecture.

The caller receives the resulting Domain Object without knowing which retrieval path was taken.

The source of the data is therefore an implementation detail of Data Access rather than a concern of the caller.

This allows storage technologies, transport protocols, and retrieval strategies to evolve without affecting Modules or Domain Services.

Regardless of how a request is satisfied, Data Access always returns the same conceptual result:

a Domain Object.

Conceptually:

```mermaid
flowchart LR

    Store["Domain Store"]

    Resource["Resource Architecture"]

    Future["Future Source"]

    Object["Domain Object"]

    Store --> Object

    Resource --> Object

    Future --> Object
```

The source may differ.

The Domain Object returned to the application remains the same.

This consistency greatly simplifies the rest of the application because Modules and Domain Services operate on one stable representation rather than multiple storage-specific formats.

---

# Data Access Responsibilities

Data Access owns:

* selecting the appropriate source,
* retrieving Domain Objects,
* coordinating local-first behavior,
* requesting Resource retrieval when necessary,
* and returning Domain Objects to the caller.

It does not own:

* Domain behavior,
* persistence technologies,
* transport protocols,
* background synchronization,
* or presentation.

Its responsibility is limited to obtaining Domain Objects for the application through a consistent interface.

# Transparent Retrieval

The purpose of Data Access is to make Domain Object retrieval transparent to the rest of the application.

Modules and Domain Services request Domain Objects.

They do not determine where those objects originate.

Conceptually:

```mermaid id="4z3n8p"
flowchart LR

    Module["Module"]

    Service["Domain Service"]

    Data["Data Access"]

    Object["Domain Object"]

    Module --> Service

    Service --> Data

    Data --> Object
```

Whether the Domain Object was obtained from:

* a Domain Store,
* the Resource Architecture,
* previously cached application state,
* or another future source,

the caller receives the same result.

Data retrieval is therefore defined by the requested Domain Object rather than by its location.

---

# Request Data, Not Location

One of the fundamental principles of the application is:

> **Request data, not location.**

Callers request the Domain Object they require.

They do not request:

* IndexedDB,
* Nostr,
* Blossom,
* HTTP,
* memory,
* or any other storage or transport technology.

For example, a Module requests:

```text id="ngyjlwm"
Chapter

John 3
```

rather than:

```text id="bhx8b3"
Read John 3 from IndexedDB.

or

Read John 3 from Relay X.
```

The responsibility of locating the requested Domain Object belongs entirely to Data Access.

---

# Stable Application Behavior

Because callers never choose a retrieval source, application behavior remains stable as storage technologies evolve.

For example, replacing:

* IndexedDB,
* relay implementations,
* caching strategies,
* or transport mechanisms

should not require changes to Modules or Domain Services.

Those implementation decisions remain behind the Data Access abstraction.

This allows the application's behavior to remain independent from the technologies used to satisfy each request.

---

# Consistent Domain Objects

Regardless of how a request is satisfied, Data Access always returns the same conceptual result:

a Domain Object.

Conceptually:

```mermaid id="sqn5g7"
flowchart LR

    Store["Domain Store"]

    Resource["Resource Architecture"]

    Future["Future Source"]

    Object["Domain Object"]

    Store --> Object

    Resource --> Object

    Future --> Object
```

The source may differ.

The object returned to the application remains the same.

This consistency greatly simplifies Module and Domain implementations because they operate on one stable representation rather than multiple storage-specific formats.

# Domain Stores

The primary responsibility of Data Access is to obtain Domain Objects.

The first source consulted is the owning Domain Store.

A Domain Store provides the local representation of one Domain's data.

It is responsible for storing and retrieving Domain Objects for that Domain.

Conceptually:

```mermaid id="d3wrp8"
flowchart LR

    Module["Module"]

    Service["Domain Service"]

    Data["Data Access"]

    Store["Domain Store"]

    Object["Domain Object"]

    Module --> Service

    Service --> Data

    Data --> Store

    Store --> Object
```

A Domain Store does not own:

* Domain behavior,
* retrieval strategy,
* transport,
* synchronization,
* or persistence technologies.

Its responsibility is limited to the local management of Domain Objects owned by its Domain.

---

# Domain Store Independence

A Domain Store defines the persistence boundary for a Domain.

The application interacts with the Domain Store through a Domain-owned interface.

The physical storage technology remains an implementation detail.

Conceptually:

```mermaid id="fj5q0d"
flowchart TD

    Store["Domain Store"]

    Persistence["Persistence Implementation"]

    IndexedDB["IndexedDB"]

    Future["Future Storage"]

    Store --> Persistence

    Persistence --> IndexedDB

    Persistence --> Future
```

The Domain Store should remain stable even if the persistence implementation changes.

For example, replacing IndexedDB with another local storage technology should not require changes to Modules, Domain Services, or Data Access.

---

# Local Store Misses

If the requested Domain Object is not available within the Domain Store, Data Access requests the object through the Resource Architecture.

Once obtained, the Domain Object is stored within the Domain Store before being returned to the caller.

Conceptually:

```mermaid id="5ptgkg"
flowchart TD

    Request["Request Domain Object"]

    Store["Domain Store"]

    Found{"Available?"}

    Resource["Resource Architecture"]

    Save["Store Domain Object"]

    Object["Domain Object"]

    Request --> Store

    Store --> Found

    Found -->|"Yes"| Object

    Found -->|"No"| Resource

    Resource --> Save

    Save --> Store

    Store --> Object
```

The caller receives the same Domain Object regardless of whether it originated locally or from the Resource Architecture.

The retrieval path remains an implementation detail of Data Access.

---

# Consistent Application Behavior

Because every request follows the same retrieval process, application behavior remains consistent.

Modules and Domain Services never need to determine:

* whether data is already available,
* whether it must be retrieved,
* where it was retrieved from,
* or whether it has recently been synchronized.

They simply request the required Domain Object.

Data Access coordinates the remainder of the retrieval process.

This separation greatly simplifies application logic while allowing persistence and synchronization strategies to evolve independently of the application's behavior.

# Data Freshness

Data Access is responsible for obtaining the best available Domain Object for the current request.

It is not responsible for continuously keeping that Domain Object up to date.

That responsibility belongs to Background Processing.

Conceptually:

```mermaid id="m7g4hf"
flowchart TD

    Module["Module"]

    Data["Data Access"]

    Store["Domain Store"]

    Background["Background Processing"]

    Resource["Resource Architecture"]

    Module --> Data

    Data --> Store

    Background --> Resource

    Resource --> Store
```

When a request is made, Data Access retrieves the currently available Domain Object.

If the object is unavailable locally, Data Access retrieves it through the Resource Architecture.

Background Processing independently refreshes Domain Objects over time and stores newer versions within the Domain Store.

The next request automatically benefits from those updates.

Data Access therefore remains focused on satisfying the current request while Background Processing maintains the quality and freshness of locally available data.

This separation keeps request handling simple while allowing synchronization strategies to evolve independently.

# Future Evolution

The Data Access architecture has been intentionally designed around Domain Objects rather than storage technologies.

As the application evolves, new persistence implementations, transport protocols, and retrieval strategies should integrate behind the existing Data Access abstraction.

Conceptually:

```mermaid id="j6vznq"
flowchart TD

    Data["Data Access"]

    Store["Domain Store"]

    Resource["Resource Architecture"]

    Future["Future Data Sources"]

    Object["Domain Object"]

    Data --> Store

    Data --> Resource

    Data --> Future

    Store --> Object

    Resource --> Object

    Future --> Object
```

The application should continue requesting Domain Objects rather than specific storage locations.

As long as this abstraction remains stable, new data sources may be introduced without affecting Modules or Domain Services.

---

# Big Takeaway

Data Access owns the responsibility of obtaining Domain Objects.

It determines how requests are satisfied while hiding storage technologies, transport protocols, and retrieval strategies from the rest of the application.

Conceptually:

```mermaid id="4qp2mo"
flowchart LR

    Module["Module"]

    Service["Domain Service"]

    Data["Data Access"]

    Store["Domain Store"]

    Resource["Resource Architecture"]

    Object["Domain Object"]

    Module --> Service

    Service --> Data

    Data --> Store

    Data --> Resource

    Store --> Object

    Resource --> Object
```

Modules and Domain Services request Domain Objects.

They do not request IndexedDB, relays, Blossom, HTTP, or any other storage or transport technology.

Data Access determines how each request is satisfied and always returns the same conceptual result:

a Domain Object.

By separating application behavior from retrieval strategy, the application remains local-first, transport-independent, and capable of evolving its persistence and synchronization technologies without changing the behavior of Modules or Domains.
