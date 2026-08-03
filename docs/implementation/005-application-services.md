# Application Services

## Status

Current

---

# Purpose

This document defines the role of Application Services within the KJVOnly application.

Application Services provide capabilities shared across multiple Domains and the Workspace Runtime.

They encapsulate application-wide concepts that do not naturally belong to a single Domain while remaining independent from Technical Infrastructure.

This document establishes the ownership boundaries for shared application behavior.

---

# Scope

This document defines:

* Application Services,
* shared application capabilities,
* ownership boundaries,
* communication with Domains,
* communication with the Workspace Runtime,
* and the relationship between Application Services, Technical Infrastructure, and the Resource Architecture.

It does not define:

* Domain-specific behavior,
* Workspace Runtime implementation,
* rendering,
* persistence,
* transport protocols,
* Resource Resolution,
* or Technical Infrastructure.

Those responsibilities are described by separate implementation and architecture documents.

---

# Background

The Workspace Runtime owns the presentation and composition of the application.

Domains own application behavior.

Application Services provide shared capabilities that allow Modules, Domains, and the Workspace Runtime to collaborate through stable boundaries without directly depending on one another’s implementations.

Conceptually:

```mermaid
flowchart TD

    Runtime["Workspace Runtime"]

    Modules["Module Instances"]

    Domains["Domains"]

    Services["Application Services"]

    Runtime --> Modules

    Modules --> Domains

    Modules --> Services

    Services --> Runtime

    Domains --> Services

    Services --> Domains
```

Application Services provide two forms of coordination.

They expose runtime capabilities to Modules without requiring Modules to manipulate Runtime Objects directly.

They also provide shared application capabilities through which Domains may collaborate without depending directly on one another.

The Workspace Runtime remains independent from Domain behavior.

It manages Runtime Objects and presents Module Instances but does not communicate directly with Domains.

---

# Application Service Definition

An Application Service provides a capability shared across multiple Domains or Runtime components.

An Application Service is defined by the application concept it represents rather than by the technology used to implement it.

Examples include:

* Bible location references,
* pane management,
* workspace management,
* navigation,
* application settings,
* theme management,
* and other shared application concepts.

An Application Service is not:

* a Domain,
* Technical Infrastructure,
* a transport protocol,
* a persistence technology,
* or a rendering component.

Those responsibilities may support an Application Service but do not define it.

---
# Application Service Responsibilities

Application Services own responsibilities that are meaningful across the application rather than within a single Domain.

They provide stable collaboration boundaries between:

- the Workspace Runtime,
- Module Instances,
- Domains,
- and other shared application capabilities.

Application Services do not own application behavior.

They coordinate shared concepts while allowing each owner to remain independent.

Conceptually:

```mermaid
flowchart TD

    Runtime["Workspace Runtime"]

    Modules["Module Instances"]

    Services["Application Services"]

    Domains["Domains"]

    Runtime --> Modules

    Modules --> Services

    Domains --> Services

    Services --> Runtime

    Services --> Domains
```

Application Services expose application behavior rather than implementation details.

Modules use Application Services to request shared capabilities such as workspace operations.

Domains use Application Services to collaborate through shared application concepts without depending directly upon one another.

This allows the Workspace Runtime, Modules, and Domains to evolve independently while preserving stable collaboration boundaries throughout the application.

---

# Why Application Services Exist

Without Application Services, Domains would gradually accumulate knowledge of one another.

For example:

* Reading Plans would understand Bible navigation.
* Notes would understand Workspace management.
* Bible Modules would manipulate Pane trees.
* Multiple Domains would independently implement the same shared concepts.

Over time, these direct dependencies would increase coupling throughout the application.

Application Services prevent this by owning shared concepts once and exposing them through stable interfaces.

This preserves the independence of both the Workspace Runtime and individual Domains while allowing them to collaborate through well-defined application behavior.

# Application Service Ownership

Application Services own responsibilities that represent shared application concepts rather than domain-specific behavior.

Ownership is determined by meaning rather than implementation.

A responsibility belongs to an Application Service when it exists to support multiple Domains or multiple parts of the Workspace Runtime without naturally belonging to any one owner.

Application Services should become the single owner of these shared concepts.

Examples include:

* Bible location references,
* pane management,
* workspace management,
* navigation,
* application settings,
* theme management,
* and other shared application capabilities.

Conceptually:

```mermaid
flowchart TD

    Runtime["Workspace Runtime"]

    Modules["Module Instances"]

    Bible["Bible Domain"]

    Notes["Notes Domain"]

    Plans["Reading Plans Domain"]

    Services["Application Services"]

    Modules --> Services

    Bible --> Services

    Notes --> Services

    Plans --> Services

    Services --> Runtime
```

Application Services become the shared owner of concepts that would otherwise be duplicated throughout the application.

---

# Ownership Heuristic

When introducing a new responsibility, determine whether it represents a shared application concept before assigning it to a Domain.

A useful heuristic is:

> **Would multiple Domains or Runtime components naturally depend upon this responsibility?**

If the answer is **yes**, it likely belongs to an Application Service.

If the answer is **no**, it should generally remain within its owning Domain or another existing owner.

Ownership should reflect the meaning of the responsibility rather than the technology used to implement it.

---

# Shared Application Concepts

A shared application concept is meaningful regardless of which Domain is currently using it.

For example, a Bible location reference is used by:

* the Bible Domain,
* the Notes Domain,
* the Reading Plans Domain,
* search,
* navigation,
* and other application features.

Although the concept originated from Bible data, it has become a shared application identifier.

Its ownership therefore belongs to an Application Service rather than exclusively to the Bible Domain.

Likewise, workspace operations such as opening, replacing, or closing Module Instances are shared application behaviors.

Individual Domains may request these operations, but they do not own how the Workspace Runtime performs them.

Application Services provide the stable boundary between these responsibilities.

---

# Application Services as Stable Boundaries

Application Services intentionally separate application behavior from implementation details.

Domains request shared capabilities.

Modules request runtime operations.

The Workspace Runtime performs runtime operations.

Each owner remains responsible only for the behavior it owns.

Application Services coordinate these interactions without taking ownership of Domain behavior or Runtime behavior.

This separation allows each part of the application to evolve independently while preserving a consistent collaboration model.

# Application Services and Domains

Application Services and Domains have different ownership responsibilities.

Domains own application behavior.

Application Services own shared application concepts.

A Domain may depend upon an Application Service when it requires a capability shared across multiple Domains.

An Application Service should never own Domain behavior.

Conceptually:

```mermaid id="t7x2mk"
flowchart LR

    Service["Application Service"]

    Bible["Bible Domain"]

    Notes["Notes Domain"]

    Plans["Reading Plans Domain"]

    Service --> Bible

    Service --> Notes

    Service --> Plans
```

Application Services expose shared capabilities.

Each Domain remains responsible for interpreting and applying those capabilities within its own area of application behavior.

For example:

* the Bible Domain interprets Bible location references,
* the Notes Domain associates Notes with Bible locations,
* the Reading Plans Domain schedules Bible locations,

while the Bible location reference itself remains a shared application concept.

Application Services therefore enable collaboration without transferring ownership.

---

# Application Services and the Workspace Runtime

Application Services also provide the boundary between Module Instances and the Workspace Runtime.

Modules and their nested presentation components express application intent.

The Workspace Runtime performs runtime operations.

Application Services translate between the two.

Conceptually:

```mermaid id="9m7q2x"
sequenceDiagram

    participant Module
    participant Service as Pane Service
    participant Runtime as Workspace Runtime

    Module->>Service: Open Bible Module

    Service->>Runtime: Create Pane and Buffer

    Runtime-->>Service: Runtime updated

    Service-->>Module: Operation complete
```

Application Services may be imported directly, passed through component properties, provided through context, or supplied through dependency injection.

The delivery mechanism is an implementation choice.

The architectural requirement is that callers depend on the Application Service's public capability rather than the implementation details of the Workspace Runtime.

The Module does not manipulate Runtime Objects directly.

Instead, it requests application behavior through an Application Service.

The Workspace Runtime remains responsible for:

* Pane creation,
* Buffer management,
* Workspace composition,
* and layout evolution.

Application Services preserve this separation by preventing Modules from becoming coupled to runtime implementation details.

---

# Application Services and Technical Infrastructure

Application Services should remain independent from implementation technologies.

An Application Service owns the application concept.

Technical Infrastructure provides the implementation technologies required to support it.

Conceptually:

```mermaid id="6s1mvh"
flowchart TD

    Service["Application Service"]

    Infrastructure["Technical Infrastructure"]

    Technology["Implementation Technology"]

    Service --> Infrastructure

    Infrastructure --> Technology
```

For example, an Application Service may depend upon persistence, networking, or browser APIs to fulfill its responsibilities.

Those technologies remain implementation details.

The meaning of the Application Service should remain unchanged if those technologies are replaced.

This separation allows Application Services to present stable application behavior while Technical Infrastructure continues to evolve independently.

# Shared Application Concepts

Application Services exist to own concepts that are meaningful across multiple Domains and Runtime components.

These concepts are not defined by a single Domain.

Instead, they become part of the application's shared language.

Examples include:

* Bible location references,
* workspace management,
* pane management,
* navigation,
* application settings,
* theme management,
* and other concepts shared throughout the application.

Conceptually:

```mermaid
flowchart TD

    Runtime["Workspace Runtime"]

    Modules["Module Instances"]

    Services["Application Services"]

    Bible["Bible Domain"]

    Notes["Notes Domain"]

    Plans["Reading Plans Domain"]

    Runtime --> Modules

    Modules --> Services

    Bible --> Services

    Notes --> Services

    Plans --> Services
```

These shared concepts provide stable integration points throughout the application.

Each participating owner understands the shared concept while remaining independent from the internal implementation of every other owner.

---

# Examples

## Bible Location References

Bible location references represent a shared application concept rather than Bible-specific behavior.

They are used by multiple Domains including:

* Bible,
* Notes,
* Reading Plans,
* Search,
* and other application features.

Each Domain interprets the reference according to its own behavior while sharing a common representation.

The ownership of the reference therefore belongs to an Application Service rather than exclusively to the Bible Domain.

---

## Pane Management

Pane management is a Workspace capability.

Modules may request operations such as:

* opening a Module,
* replacing the current Buffer,
* splitting a Pane,
* or closing a Pane.

Those operations modify Runtime Objects owned by the Workspace Runtime.

Application Services expose these operations without allowing Modules to manipulate the Pane tree directly.

Conceptually:

```mermaid
sequenceDiagram

    participant Module

    participant PaneService

    participant Runtime as Workspace Runtime

    Module->>PaneService: Open Notes Module

    PaneService->>Runtime: Modify Pane tree

    Runtime-->>PaneService: Workspace updated

    PaneService-->>Module: Complete
```

The Module expresses application intent.

The Pane Service coordinates the request.

The Workspace Runtime performs the operation.

Each responsibility remains independently owned.

---

## Theme Management

Theme management represents another shared application capability.

Multiple Modules may:

* toggle dark mode,
* read the current theme,
* or react to theme changes.

The theme itself is not owned by any individual Domain.

It represents an application-wide concept shared throughout the Workspace.

Application Services provide the stable interface through which this shared capability is accessed.

---

# Shared Concepts, Not Shared Behavior

Application Services own the shared concepts used throughout the application.

They do not own the behavior performed by individual Domains.

For example:

* Bible location references belong to an Application Service.
* Understanding Bible text belongs to the Bible Domain.
* Pane operations belong to the Workspace Runtime.
* Theme preferences belong to an Application Service.

Application Services provide the common language that allows these responsibilities to collaborate while preserving clear ownership boundaries.
