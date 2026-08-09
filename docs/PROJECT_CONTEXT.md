# KJVOnly

# Introduction

Welcome to the KJVOnly project.

This document provides the context required to understand the application before exploring its source code.

The repository contains architecture documents, implementation guides, developer documentation, and source code. Each describes a different aspect of the project. This document connects those pieces together into a single mental model so that the overall design can be understood before individual implementation details are examined.

Whether you are contributing to the project, returning after some time away, or using an AI assistant to assist with development, this document should be your starting point.

Rather than explaining every implementation detail, it explains how the application is organized, why particular architectural decisions were made, and how those decisions relate to one another.

The goal is to understand the architecture first, allowing the source code to become significantly easier to navigate and reason about.

---

## What This Document Is

This document is a guide to the project's architecture.

It does not replace the architecture documentation.

Instead, it explains how the various architectural concepts fit together into a cohesive application.

The architecture documents define individual concepts such as the Workspace Runtime, Domain Resource Model, Resource Boundary, Repository Organization, Public APIs, and Background Processing.

This document explains how those concepts collaborate and why they exist.

Think of it as the guide that teaches you how to think about the project before learning how each individual part is implemented.

---

## What This Document Is Not

This document is not a specification.

It does not attempt to describe every class, function, protocol, or implementation detail.

Those responsibilities belong to the architecture documents, implementation guides, and ultimately the source code itself.

Whenever detailed behavior is required, those documents should be considered the authoritative reference.

This document focuses on the larger architectural picture.

---

## The Goal

The goal of this document is to build a complete mental model of the application before discussing implementation.

By the time you finish reading, you should understand:

* what the application is trying to accomplish,
* how the major architectural concepts fit together,
* why the repository is organized the way it is,
* how different parts of the application collaborate,
* how new functionality should be designed,
* and how the project can continue evolving without compromising its architecture.

The intent is that the architecture becomes understandable before the source code is explored.

---

## How To Read This Repository

The repository is organized into several layers of documentation.

Each layer answers a different set of questions.

### Project Context

This document.

It introduces the application, explains the overall architectural model, and provides the mental framework required to understand the rest of the repository.

### Principles

The Principles establish the design philosophy used throughout the project.

They explain how architectural decisions are made and define the rules that guide future development.

These documents should be understood before evaluating implementation decisions.

### Application Architecture

The Application Architecture describes how the application behaves.

It defines concepts such as:

* Workspace Runtime
* Module Presentation
* Persistence
* Background Processing
* User Interface
* Public APIs
* Repository Organization
* and the relationships between those systems

These documents describe the application's runtime behavior.

### Domain Resource Model

The Domain Resource Model defines the conceptual model used at the application's Resource Boundary.

It explains concepts such as:

* Resources
* Resource Identity
* Resource Representations
* Discovery
* Resolution
* Installation
* Publication
* Synchronization
* Resource Lifecycle
* and Domain Object reconstruction

These documents describe how Domain Objects are represented outside the application and reconstructed back into the application's internal model.

### Implementation

The Implementation documents describe how the current application realizes the documented architecture.

They bridge the gap between architectural concepts and the source code without redefining the architecture itself.

### Developer Guide

The Developer Guide provides implementation guidance, repository conventions, coding standards, migration strategy, and other information useful when contributing to the project.

---

## Reading Order

The recommended reading order is:

1. Project Context
2. Principles
3. Application Architecture
4. Domain Resource Model
5. Implementation
6. Developer Guide
7. Source Code

Each layer builds upon the previous one.

Following this order establishes the architectural reasoning before introducing implementation details.

---

## A Different Way Of Thinking

Many software projects are organized around technologies.

They begin with frameworks, protocols, libraries, or implementation techniques.

This project intentionally takes a different approach.

The architecture begins with meaning.

Meaning establishes ownership.

Ownership establishes responsibility.

Responsibilities define the Public APIs through which architectural owners collaborate.

Only after those concepts are understood does implementation become important.

Throughout this repository the same progression is followed consistently:

```text
Meaning
    ↓
Ownership
    ↓
Responsibility
    ↓
Public API
    ↓
Implementation
```

This progression forms the foundation upon which the rest of the architecture is built.

---

## Why This Matters

Software changes continuously.

Frameworks evolve.

Protocols evolve.

Storage technologies evolve.

Programming languages evolve.

Implementation techniques evolve.

The concepts represented by the application generally change much more slowly.

The purpose of the architecture is to organize software around those enduring concepts rather than around the technologies currently used to implement them.

This makes the application easier to understand, easier to evolve, and easier to maintain over time.

---

## Key Takeaways

* This document explains how to think about the project.
* The architecture documents define the project.
* The implementation documents explain how the architecture is realized.
* The source code implements those ideas.
* The project is organized around meaning, ownership, and architectural responsibility rather than implementation technologies.
* Understanding the architecture first makes every implementation decision easier to reason about.

# Project Overview

The KJVOnly project is a collection of systems that together provide a decentralized, offline-first application platform.

Although these systems are developed together, they each have distinct responsibilities and evolve independently.

Understanding the separation between these responsibilities is fundamental to understanding the architecture.

The project is intentionally organized around these architectural boundaries rather than around technologies or deployment models.

---

## The Three Architectures

The project consists of three primary architectural systems:

1. Application Architecture
2. Resource Architecture
3. Service Architecture

Each architecture solves a different problem.

Conceptually:

```mermaid
flowchart LR

    Resource["Resource Architecture"]

    Service["Service Architecture"]

    Application["Application Architecture"]

    Resource --> Application

    Service --> Application
```

The Application consumes capabilities provided by the other two architectures.

Neither the Resource Architecture nor the Service Architecture depends upon the Application.

This separation allows each system to evolve independently while remaining conceptually aligned.

---

## Application Architecture

The Application Architecture describes the application itself.

Its responsibility is to present Domain capabilities to the user while coordinating the interaction between Runtime, Domains, User Interface, Persistence, Background Processing, and Resource Integration.

The Application is responsible for:

* presenting information,
* responding to user interaction,
* managing application state,
* coordinating background work,
* and providing a consistent user experience.

The Application does not define how content exists outside of the application.

Instead, it consumes Domain Objects produced by the Resource Architecture.

---

## Resource Architecture

The Resource Architecture defines how Domain Objects exists independently of the application.

It describes how information is identified, published, discovered, resolved, installed, updated, and transformed into Domain Objects.

The Resource Architecture is intentionally independent of the Application.

Any application capable of understanding the Resource Architecture could consume the same published content.

This separation allows application behavior and published content to evolve independently.

The Application does not own Resources.

It owns the Domain Objects created from those Resources.

---

## Service Architecture

The Service Architecture describes the external systems that support the application.

Examples include:

* Nostr Relays,
* Blossom servers,
* storage providers,
* synchronization services,
* and other supporting infrastructure.

These services provide capabilities to the Resource Architecture.

The Application communicates with these services through Resource Integration rather than directly coupling application behavior to individual service implementations.

The Service Architecture intentionally remains replaceable.

Supporting technologies may evolve without changing the Application Architecture.

---

## How The Architectures Collaborate

Each architecture has a clearly defined responsibility.

Conceptually:

```mermaid
flowchart LR

    Services["Service Architecture"]

    Resources["Resource Architecture"]

    Application["Application Architecture"]

    User["User"]

    Services --> Resources

    Resources --> Application

    Application --> User
```

Service Architecture enables Resource Architecture.

Resource Architecture provides Domain Objects to the Application.

The Application presents those Domain Objects to the user.

Each architecture remains focused on its own responsibilities.

No architecture attempts to absorb the responsibilities of another.

---

## Architectural Independence

Although the three architectures collaborate closely, they should be understood independently.

Changes within one architecture should minimize their impact on the others.

For example:

* introducing a new storage provider should primarily affect the Service Architecture,
* extending Resource Resolution should primarily affect the Resource Architecture,
* redesigning Module Presentation should primarily affect the Application Architecture.

Well-defined boundaries allow each architecture to evolve without unnecessary coupling.

---

## The Documentation

The repository documentation mirrors the architecture.

Each architectural system has its own documentation describing:

* its responsibilities,
* its concepts,
* its boundaries,
* and the decisions that govern its evolution.

Together, these documents form a complete description of the project.

This Project Context document connects those architectural systems into a single mental model.

---

## The Source Code

The repository implementation reflects these architectural boundaries.

The source code should progressively evolve so that repository organization, Public APIs, and implementation responsibilities correspond to the architectural ownership model described throughout the documentation.

Architecture drives repository organization.

Repository organization should not redefine the architecture.

---

## Long-Term Vision

The project is designed so that the three architectures remain useful beyond a single application.

The Resource Architecture should be capable of supporting multiple applications.

The Service Architecture should support different Resource implementations.

The Application Architecture should remain focused on providing the best possible user experience while consuming those capabilities.

This separation encourages reuse, independent evolution, and long-term maintainability.

---

## Key Takeaways

* The project consists of three independent architectural systems.
* The Application consumes Domain Objects produced by the Resource Architecture.
* The Resource Architecture uses capabilities provided by the Service Architecture.
* Each architecture owns a distinct set of responsibilities.
* Architectural boundaries are intentional and should remain visible throughout the repository.
* Repository organization and implementation should reinforce these architectural boundaries rather than obscure them.

# Design Philosophy

Every software project eventually accumulates complexity.

New features are added.

Requirements evolve.

Technologies change.

Over time, the difficulty of maintaining a system rarely comes from implementing new functionality. More often, it comes from understanding how existing functionality fits together.

The architecture of this project was designed with that observation in mind.

Rather than organizing the application around implementation techniques, frameworks, or programming patterns, the architecture is organized around stable application concepts that are expected to remain meaningful throughout the lifetime of the project.

The goal is not simply to produce working software.

The goal is to produce software whose structure continues to make sense as it evolves.

---

## Architecture Before Implementation

Implementation changes continuously.

Architecture should change much more slowly.

Programming languages evolve.

Frameworks are replaced.

Storage technologies improve.

Networking protocols mature.

User interface libraries come and go.

These changes are expected.

The architecture intentionally separates these implementation concerns from the responsibilities they fulfill.

For this reason, architectural discussions should begin without reference to specific technologies whenever practical.

The implementation exists to realize the architecture.

The architecture should not emerge from the implementation.

---

## Organizing Around Meaning

The project is organized around concepts that represent application meaning rather than technical implementation.

Examples include:

* Workspace Runtime,
* Domains,
* User Interface,
* Resource Integration,
* Background Processing,
* and Technical Infrastructure.

These concepts describe responsibilities that exist regardless of how they are implemented.

Implementation techniques such as Services, Stores, Components, Workers, Events, Factories, and Repositories exist within those architectural owners.

They support the architecture.

They do not define it.

This distinction keeps the architecture stable even when implementation evolves.

---

## Ownership Creates Clarity

Every responsibility should have a clearly identifiable owner.

Ownership establishes:

* where behavior belongs,
* where implementation should reside,
* where changes should be made,
* and how other parts of the application should collaborate.

When ownership is clear, repository organization becomes straightforward.

Architectural boundaries become easier to understand.

Implementation naturally follows the structure established by the architecture.

Many implementation decisions become obvious simply because ownership has already been established.

---

## Explicit Collaboration

Architectural owners should collaborate deliberately.

Responsibilities are shared through explicit Public APIs rather than through unrestricted implementation dependencies.

Each owner remains responsible for its own concepts while exposing only the capabilities required by other architectural owners.

This allows independently evolving parts of the application to collaborate without becoming tightly coupled.

Well-defined boundaries make both the architecture and the repository easier to understand.

---

## Stable Concepts

Technology changes faster than application concepts.

The project therefore attempts to build its architecture around ideas that are expected to remain stable over time.

For example:

* Bible chapters remain Bible chapters regardless of storage technology.
* Notes remain Notes regardless of presentation framework.
* Workspaces remain Workspaces regardless of layout implementation.
* Domain Objects remain Domain Objects regardless of how Resources are published or transported.

By organizing around these enduring concepts, implementation can evolve without requiring the conceptual architecture to be rediscovered.

---

## Incremental Evolution

The architecture is designed to support continuous evolution rather than periodic rewrites.

Existing implementation is not discarded simply because a better organizational model has been developed.

Instead, improvements are introduced incrementally.

Architectural ownership is established first.

Implementation then migrates toward that ownership over time.

This approach minimizes disruption while allowing the repository to steadily converge toward the documented architecture.

Evolution is preferred over replacement whenever practical.

---

## Simplicity Through Separation

Complexity is reduced by allowing each architectural owner to focus on a single area of responsibility.

The Workspace Runtime manages runtime behavior.

Domains own application meaning.

The User Interface presents information.

Resource Integration bridges the Application and the Resource Architecture.

Background Processing performs deferred application work.

Technical Infrastructure provides implementation capabilities.

Each owner has a limited set of responsibilities.

Together they form a cohesive application.

Separating responsibilities in this way allows individual parts of the system to remain understandable without requiring knowledge of the entire application.

---

## Architecture As A Communication Tool

Architecture exists to communicate.

A well-designed architecture should allow someone unfamiliar with the codebase to understand:

* the major responsibilities,
* how those responsibilities collaborate,
* where new functionality belongs,
* and how changes should be introduced.

Repository organization, documentation, and source code should reinforce the same architectural model.

When these representations remain aligned, understanding the system becomes significantly easier.

---

## Designing For The Future

Every architectural decision should consider the long-term evolution of the project.

Questions such as:

* Will this responsibility still exist in five years?
* Is this concept tied to a particular technology?
* Does this abstraction represent application meaning?
* Can this implementation evolve independently?

are often more valuable than questions about immediate implementation.

Architectural decisions should optimize for long-term clarity rather than short-term convenience.

The architecture should make future change easier rather than merely accommodating present requirements.

---

## Key Takeaways

* The architecture is organized around enduring application concepts rather than implementation technologies.
* Implementation fulfills architectural responsibilities rather than defining them.
* Clear ownership produces clear boundaries.
* Public APIs provide explicit collaboration between independently owned parts of the application.
* Stable concepts should outlive the technologies used to implement them.
* The project is intended to evolve incrementally rather than through periodic rewrites.
* Architecture should make the application easier to understand, easier to extend, and easier to maintain over time.

# System Overview

The KJVOnly project is built around a single Application Architecture.

The Application Architecture defines the application's runtime behavior, user experience, and Domain model.

Applications operate exclusively on Domain Objects.

When Domain Objects must exist outside the application, they cross the application's **Resource Boundary**.

The Resource Boundary defines how Domain Objects are represented as portable Resources suitable for storage, publication, discovery, synchronization, and reconstruction.

This application primarily implements its Resource Boundary using the Nostr protocol together with compatible decentralized services such as Blossom.

The boundary model is intentionally independent of the underlying protocol, allowing alternative implementations using technologies such as REST, RPC, or other communication mechanisms without affecting the internal Application Architecture.

---

# Application Architecture

The Application Architecture defines how the application behaves.

It includes concepts such as:

* Workspace Runtime
* Domains
* Module Presentation
* User Interface
* Background Processing
* Persistence
* Application Events
* Public APIs
* Repository Organization

Applications own Domain Objects.

Domain Objects represent the application's internal model and are the only objects used throughout runtime.

The Application Architecture is intentionally independent of how Domain Objects are communicated beyond the application boundary.

---

# The Resource Boundary

The Resource Boundary is the point where Domain Objects leave the application.

Rather than exposing Domain Objects directly, applications represent them as portable Resources.

Resources provide a protocol-independent representation suitable for communication with external systems.

The Domain Resource Model defines this mapping between internal Domain Objects and external Resources.

The Resource Boundary is responsible for concepts including:

* Resource Identity
* Resource Representations
* Discovery
* Resolution
* Installation
* Publication
* Synchronization
* Persistence
* Resource Lifecycle

Together these concepts define how portable Resources behave independently of the application's internal implementation.

---

# Boundary Implementations

The Resource Boundary is independent of any particular communication protocol.

This application primarily implements the boundary using Nostr together with compatible decentralized services such as Blossom.

Nostr provides decentralized identities, replaceable events, relay infrastructure, and decentralized discovery.

The Resource Boundary defines how these capabilities are used to represent Domain Objects as portable Resources.

Alternative implementations could communicate using REST, RPC, GraphQL, local files, or other protocols while preserving the same Domain Resource Model.

Changing the boundary implementation does not require changes to the internal Application Architecture.

---

# Information Flow

Information moves through the system by crossing the Resource Boundary.

Conceptually:

```mermaid
flowchart LR

    Application

    DomainObject["Domain Objects"]

    Boundary["Resource Boundary"]

    Resource["Resources"]

    Service["Nostr / Blossom"]

    Application --> DomainObject
    DomainObject --> Boundary
    Boundary --> Resource
    Resource --> Service

    Service --> Resource
    Resource --> Boundary
    Boundary --> DomainObject
    DomainObject --> Application
```

Within the application, all behavior operates on Domain Objects.

Only Resources cross the Resource Boundary.

External systems never interact directly with the application's internal Domain Objects.

---

# Domain Participation

Every Domain participates in the Resource Boundary.

Each Domain defines:

* its Domain Objects,
* how those Domain Objects become Resources,
* how Resources are reconstructed into Domain Objects,
* and how published Resources relate to local application behavior.

For example, the Bible Domain defines how Bible Chapters cross the Resource Boundary.

The Notes Domain defines how Notes cross the Resource Boundary.

The Reading Plans Domain defines how Reading Plans cross the Resource Boundary.

The Domain Resource Model provides the common structure.

Each Domain provides its own application semantics.

---

# Independent Evolution

The separation between the Application Architecture and the Resource Boundary allows each to evolve independently.

The Application Architecture may introduce new runtime behavior, presentation models, and user experiences without affecting the boundary.

Likewise, the Resource Boundary may adopt new communication protocols or storage technologies without changing the application's internal Domain model.

This separation keeps application behavior independent from external communication while preserving a consistent model for portable Resources.

---

# Repository Alignment

The repository mirrors these responsibilities.

Application documentation describes the runtime architecture and application behavior.

The Domain Resource Model defines the concepts used at the Resource Boundary.

Implementation documentation describes how this application realizes the Resource Boundary using Nostr and compatible decentralized services.

Together these documents describe the complete platform while keeping responsibilities clearly separated.

---

# Key Takeaways

* The project consists of a single Application Architecture.
* Applications operate exclusively on Domain Objects.
* Domain Objects cross the Resource Boundary as portable Resources.
* The Domain Resource Model defines the mapping between Domain Objects and Resources.
* This application primarily implements the Resource Boundary using Nostr and compatible decentralized services.
* Alternative boundary implementations may use different communication protocols without affecting the internal Application Architecture.
* Separating the Application Architecture from the Resource Boundary allows both to evolve independently.
