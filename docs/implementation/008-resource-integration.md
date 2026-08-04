# Resource Integration

## Status

Current

---

# Purpose

This document defines how the KJVOnly application integrates with the Resource Architecture.

It explains how Published Resources become Domain Objects used by the application and how Domain Objects are transformed back into Published Resources.

This document establishes the boundary between the application architecture and the Resource Architecture.

---

# Scope

This document defines:

* Resource Integration,
* the flow of Published Resources into the application,
* the flow of Domain Objects back into Published Resources,
* integration responsibilities,
* Domain Object construction,
* Resource serialization,
* and the ownership boundaries between the application and the Resource Architecture.

It does not define:

* Resource Identity,
* Resource Resolution,
* relay communication,
* Resource Installation,
* synchronization,
* transport protocols,
* or Published Resource formats.

Those responsibilities are defined by the Resource Architecture.

Likewise, this document does not define:

* Workspace Runtime,
* Domains,
* Application Services,
* Data Access,
* or Technical Infrastructure.

Those responsibilities are defined by the application architecture.

---

# Background

The application and the Resource Architecture serve different purposes.

The Resource Architecture manages Published Resources.

The application operates on Domain Objects.

Resource Integration provides the boundary between these two architectural models.

Conceptually:

```mermaid
flowchart LR

    Resources["Resource Architecture"]

    Integration["Resource Integration"]

    Application["Application"]

    Resources --> Integration

    Integration --> Application
```

The Resource Architecture supplies published representations of data.

The application consumes Domain Objects representing application behavior.

Neither architecture replaces the other.

They collaborate through a well-defined integration boundary.

---

# Resource Integration Definition

Resource Integration is responsible for translating between the Published Resources managed by the Resource Architecture and the Domain Objects used by the application.

It owns the application-facing integration between these two architectural models.

Conceptually:

```mermaid
flowchart LR

    Published["Published Resource"]

    Resolution["Resource Resolution"]

    Factory["Domain Object Factory"]

    Object["Domain Object"]

    Domain["Domain"]

    Published --> Resolution

    Resolution --> Factory

    Factory --> Object

    Object --> Domain
```

Published Resources are never consumed directly by Modules or Domain Services.

Instead, Resource Resolution produces resolved Resource content.

The owning Domain Object Factory constructs the corresponding Domain Object.

From that point forward, the application operates exclusively on the Domain Object.

The Published Resource representation no longer participates in application behavior.

---

# Architectural Boundary

The application and the Resource Architecture intentionally operate at different abstraction levels.

The Resource Architecture owns:

* Published Resources,
* Resource Identity,
* Resource Resolution,
* transport,
* installation,
* synchronization,
* publication,
* and Resource lifecycle management.

The application owns:

* Domain Objects,
* Domain behavior,
* Modules,
* Application Services,
* Data Access,
* and the Workspace Runtime.

Resource Integration forms the boundary between these responsibilities.

Neither side reaches across that boundary to manipulate the internal implementation of the other.

Instead, they exchange only the representations required to construct or serialize Domain Objects.
