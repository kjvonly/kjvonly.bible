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

The KJVOnly project is an offline-first application built around a single Application Architecture.

The Application Architecture defines the application's runtime behavior, user experience, and Domain model.

Applications operate exclusively on Domain Objects.

Whenever Domain Objects need to exist outside the application, they cross the application's Resource Boundary where they become portable Resources suitable for communication, publication, synchronization, storage, and reconstruction.

This separation allows the application to evolve independently from the technologies used to communicate with external systems while preserving a consistent application model.

---

## A Single Application Architecture

The project intentionally organizes the application around a single architecture.

That architecture defines:

* the Runtime,
* Domains,
* User Interface,
* Background Processing,
* Persistence,
* Public APIs,
* Repository Organization,
* and every other concept required to build and operate the application.

The Application Architecture owns the application's behavior.

Everything inside the application works with Domain Objects.

Those Domain Objects represent the application's internal understanding of the world and remain independent of any particular communication protocol, storage technology, or external service.

---

## Crossing The Resource Boundary

Applications rarely exist in isolation.

Information must eventually be stored, synchronized, shared, imported, exported, or published.

Rather than exposing Domain Objects directly, the application represents them as portable Resources when they cross the Resource Boundary.

This boundary separates the application's internal model from the external representations used to communicate with other systems.

Conceptually:

```mermaid
flowchart LR

    Application["Application"]

    Domain["Domain Objects"]

    Boundary["Resource Boundary"]

    Resource["Resources"]

    External["External Systems"]

    Application --> Domain

    Domain --> Boundary

    Boundary --> Resource

    Resource --> External

    External --> Resource

    Resource --> Boundary

    Boundary --> Domain

    Domain --> Application
```

The Application continues to operate exclusively on Domain Objects.

Only Resources cross the Resource Boundary.

This separation allows the application's internal design to remain stable while external communication mechanisms evolve independently.

---

## The Domain Resource Model

The Domain Resource Model defines the conceptual model used at the Resource Boundary.

It describes how Domain Objects become Resources and how Resources are reconstructed back into Domain Objects.

The model establishes concepts including:

* Resource Identity,
* Resource Representations,
* Discovery,
* Resolution,
* Installation,
* Publication,
* Synchronization,
* Persistence,
* and Resource Lifecycle.

Together these concepts provide a consistent way for applications to communicate Domain Objects without exposing their internal implementation.

The Domain Resource Model defines the boundary.

Individual communication technologies implement it.

---

## Boundary Implementations

The Resource Boundary intentionally remains independent of any particular protocol.

This application primarily implements the boundary using the Nostr protocol together with compatible decentralized services such as Blossom.

Nostr provides decentralized identities, replaceable events, relay infrastructure, and decentralized discovery.

The Domain Resource Model defines how those capabilities are used to represent portable Resources.

Alternative implementations could communicate using technologies such as REST, RPC, GraphQL, local files, or other communication mechanisms while preserving the same Application Architecture and Domain Resource Model.

Changing the communication technology should not require changes to the application's internal Domain model.

---

## Independent Evolution

Separating the Application Architecture from the Resource Boundary allows each to evolve independently.

The Application may introduce new runtime capabilities, presentation models, and user experiences without affecting external communication.

Likewise, boundary implementations may adopt new protocols, storage technologies, or synchronization mechanisms without requiring changes to the application's internal architecture.

This separation reduces coupling while allowing both sides of the boundary to evolve at their own pace.

---

## Repository Organization

The repository mirrors these responsibilities.

The Application Architecture documents describe how the application behaves.

The Domain Resource Model documents describe the concepts used at the Resource Boundary.

Implementation documents describe how this application realizes those concepts using Nostr and compatible decentralized services.

Together these documents describe the complete system while keeping architectural responsibilities clearly separated.

---

## Long-Term Vision

The architecture is designed so that application behavior remains independent of communication technology.

Future versions of the application may introduce additional Resource Boundary implementations without changing the application's internal architecture.

Likewise, the Domain Resource Model may evolve independently while preserving compatibility with existing applications.

The goal is to ensure that Domain Objects remain the central concept of the application while allowing communication technologies to evolve naturally over time.

---

## Key Takeaways

* The project is built around a single Application Architecture.
* Applications operate exclusively on Domain Objects.
* Domain Objects cross the Resource Boundary as portable Resources.
* The Domain Resource Model defines the concepts used at the Resource Boundary.
* The Resource Boundary can be implemented using different communication technologies.
* This application primarily implements the boundary using Nostr together with compatible decentralized services.
* Separating the Application Architecture from the Resource Boundary allows both to evolve independently.

# Design Philosophy

Every software project eventually accumulates complexity.

New features are added.

Requirements evolve.

Technologies change.

Over time, maintaining a system becomes less about implementing new functionality and more about understanding how existing functionality fits together.

The architecture of this project was designed with that observation in mind.

Rather than organizing the application around frameworks, libraries, protocols, or implementation techniques, the architecture is organized around stable application concepts that are expected to remain meaningful throughout the lifetime of the project.

The goal is not simply to produce working software.

The goal is to produce software whose structure continues to make sense as it evolves.

---

## Architecture Before Implementation

Implementation changes continuously.

Architecture should change much more slowly.

Programming languages evolve.

Frameworks are replaced.

Communication protocols evolve.

Storage technologies improve.

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

* Workspace Runtime
* Domains
* User Interface
* Background Processing
* Persistence
* Public APIs
* Repository Organization

These concepts describe responsibilities that exist regardless of how they are implemented.

Implementation details such as Components, Services, Stores, Workers, Events, Factories, Repositories, or communication protocols exist within those architectural owners.

They support the architecture.

They do not define it.

This distinction allows implementation to evolve without requiring the conceptual architecture to be rediscovered.

---

## Ownership Creates Clarity

Every responsibility should have a clearly identifiable owner.

Ownership establishes:

* where behavior belongs,
* where implementation should reside,
* where changes should be made,
* and how other parts of the application collaborate.

When ownership is clear, repository organization becomes straightforward.

Architectural boundaries become obvious.

Implementation naturally follows the structure established by those boundaries.

Many implementation decisions become self-evident simply because ownership has already been established.

---

## Public APIs Enable Collaboration

Architectural owners collaborate through explicit Public APIs.

Public APIs expose behavior rather than implementation.

Each architectural owner remains responsible for its own concepts while exposing only the capabilities required by other owners.

This allows independently evolving parts of the application to collaborate without creating unnecessary implementation dependencies.

Clear Public APIs preserve architectural boundaries while making collaboration intentional.

---

## Stable Concepts

Technology changes faster than application concepts.

The project therefore builds its architecture around ideas expected to remain stable over time.

For example:

* Bible Chapters remain Bible Chapters regardless of storage technology.
* Notes remain Notes regardless of presentation framework.
* Workspaces remain Workspaces regardless of layout implementation.
* Domain Objects remain Domain Objects regardless of how they cross the application's Resource Boundary.
* Resources remain Resources regardless of the communication protocol used to exchange them.

By organizing around these enduring concepts, implementation can evolve without requiring the architecture to be rediscovered.

---

## Boundaries Protect The Architecture

Architectural boundaries exist to separate responsibilities rather than technologies.

The Application Architecture defines how the application behaves.

The Resource Boundary defines how Domain Objects are represented outside the application.

Communication technologies such as Nostr, REST, RPC, GraphQL, or local file systems are implementations of that boundary rather than architectural owners themselves.

Keeping these responsibilities separate allows application behavior and external communication to evolve independently.

---

## Incremental Evolution

The architecture is designed to support continuous evolution rather than periodic rewrites.

Existing implementation is not discarded simply because a better organizational model has been developed.

Instead, architectural ownership is established first.

Implementation then gradually migrates toward that ownership over time.

This approach minimizes disruption while allowing the repository to steadily converge toward the documented architecture.

Evolution is preferred over replacement whenever practical.

---

## Simplicity Through Separation

Complexity is reduced by allowing each architectural owner to focus on a single area of responsibility.

The Workspace Runtime manages runtime behavior.

Domains own application meaning.

The User Interface presents information.

The Resource Boundary represents Domain Objects outside the application.

Background Processing performs deferred work.

Technical Infrastructure provides implementation capabilities.

Each owner has a limited and well-defined set of responsibilities.

Together they form a cohesive application.

Separating responsibilities in this way allows individual parts of the system to remain understandable without requiring knowledge of the entire application.

---

## Architecture As A Communication Tool

Architecture exists to communicate.

A well-designed architecture should allow someone unfamiliar with the repository to understand:

* the major responsibilities,
* how those responsibilities collaborate,
* where new functionality belongs,
* and how changes should be introduced.

Repository organization, documentation, Public APIs, and source code should reinforce the same architectural model.

When these representations remain aligned, understanding the system becomes significantly easier.

---

## Designing For The Future

Every architectural decision should consider the long-term evolution of the project.

Questions such as:

* Will this responsibility still exist in five years?
* Does this concept represent application meaning?
* Does this responsibility have a clear owner?
* Can this implementation evolve independently?
* Does this change preserve architectural boundaries?

are often more valuable than questions about immediate implementation.

Architectural decisions should optimize for long-term clarity rather than short-term convenience.

The architecture should make future change easier rather than merely accommodating present requirements.

---

## Key Takeaways

* The architecture is organized around enduring application concepts rather than implementation technologies.
* Implementation fulfills architectural responsibilities rather than defining them.
* Clear ownership produces clear architectural boundaries.
* Public APIs provide intentional collaboration between independently owned parts of the application.
* Stable concepts should outlive the technologies used to implement them.
* The Resource Boundary separates application behavior from external communication.
* The project is intended to evolve incrementally rather than through periodic rewrites.
* Good architecture makes the application easier to understand, easier to extend, and easier to maintain over time.

# System Overview

The KJVOnly project is built around a single Application Architecture.

The Application Architecture defines the application's runtime behavior, user experience, and Domain model.

Applications operate exclusively on Domain Objects.

When Domain Objects must exist outside the application, they cross the application's **Resource Boundary**.

The Resource Boundary defines how Domain Objects are represented as portable Resources suitable for storage, publication, discovery, synchronization, and reconstruction.

This application primarily implements its Resource Boundary using the Nostr protocol together with compatible decentralized services such as Blossom.

The boundary model is intentionally independent of the underlying protocol, allowing alternative implementations using technologies such as REST, RPC, or other communication mechanisms without affecting the internal Application Architecture.

---

## Application Architecture

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

## The Resource Boundary

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

## Boundary Implementations

The Resource Boundary is independent of any particular communication protocol.

This application primarily implements the boundary using Nostr together with compatible decentralized services such as Blossom.

Nostr provides decentralized identities, replaceable events, relay infrastructure, and decentralized discovery.

The Resource Boundary defines how these capabilities are used to represent Domain Objects as portable Resources.

Alternative implementations could communicate using REST, RPC, GraphQL, local files, or other protocols while preserving the same Domain Resource Model.

Changing the boundary implementation does not require changes to the internal Application Architecture.

---

## Information Flow

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

## Domain Participation

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

## Independent Evolution

The separation between the Application Architecture and the Resource Boundary allows each to evolve independently.

The Application Architecture may introduce new runtime behavior, presentation models, and user experiences without affecting the boundary.

Likewise, the Resource Boundary may adopt new communication protocols or storage technologies without changing the application's internal Domain model.

This separation keeps application behavior independent from external communication while preserving a consistent model for portable Resources.

---

## Repository Alignment

The repository mirrors these responsibilities.

Application documentation describes the runtime architecture and application behavior.

The Domain Resource Model defines the concepts used at the Resource Boundary.

Implementation documentation describes how this application realizes the Resource Boundary using Nostr and compatible decentralized services.

Together these documents describe the complete platform while keeping responsibilities clearly separated.

---

## Key Takeaways

* The project consists of a single Application Architecture.
* Applications operate exclusively on Domain Objects.
* Domain Objects cross the Resource Boundary as portable Resources.
* The Domain Resource Model defines the mapping between Domain Objects and Resources.
* This application primarily implements the Resource Boundary using Nostr and compatible decentralized services.
* Alternative boundary implementations may use different communication protocols without affecting the internal Application Architecture.
* Separating the Application Architecture from the Resource Boundary allows both to evolve independently.

# Application Architecture

The Application Architecture defines how the application behaves.

It describes the runtime structure of the application, the responsibilities owned by each architectural concept, and how those concepts collaborate to provide a cohesive user experience.

The Application Architecture is responsible for application behavior.

It is intentionally independent of how information is communicated outside the application.

Whenever Domain Objects need to interact with external systems, they cross the application's Resource Boundary.

---

## Purpose

The purpose of the Application Architecture is to organize the application around stable concepts that represent application meaning rather than implementation.

Applications evolve continuously.

Features are added.

User interfaces improve.

Implementation technologies change.

The underlying concepts represented by the application generally change much more slowly.

The Application Architecture is designed to organize software around those enduring concepts so the application remains understandable as it evolves.

---

## Architectural Owners

The Application Architecture is composed of a number of architectural owners.

Each owner is responsible for a specific area of the application.

Examples include:

* Workspace Runtime
* Domains
* User Interface
* Background Processing
* Persistence
* Public APIs
* Repository Organization

Each owner defines its own responsibilities and exposes behavior through its Public API.

Implementation details remain private to the owner whenever possible.

---

## Domain Objects

Applications operate exclusively on Domain Objects.

A Domain Object represents the application's internal understanding of information.

Examples include:

* Bible Chapters
* Notes
* Reading Plans
* Annotations
* Search Results
* User Settings

Every runtime interaction operates on Domain Objects.

The Application Architecture intentionally avoids exposing protocol-specific concepts throughout the runtime.

Communication technologies remain outside the application boundary.

---

## Runtime Collaboration

Architectural owners collaborate through Public APIs.

Public APIs expose capabilities rather than implementation.

This allows independently owned parts of the application to evolve without creating unnecessary implementation dependencies.

Communication between architectural owners should always occur through their published contracts.

Implementation remains private.

Behavior remains public.

---

## The Resource Boundary

Applications rarely exist in isolation.

Domain Objects must eventually be stored, synchronized, published, imported, exported, or shared.

Whenever this occurs, Domain Objects cross the application's Resource Boundary.

The Resource Boundary represents the point where the application's internal model becomes an external representation suitable for communication with other systems.

The Application Architecture owns Domain Objects.

The Resource Boundary owns Resources.

This separation allows the application to remain independent of any particular communication protocol or storage technology.

---

## Communication Independence

The Application Architecture does not depend on Nostr.

It does not depend on REST.

It does not depend on RPC.

It does not depend on any specific communication technology.

Instead, the application depends only upon the Resource Boundary.

The Resource Boundary defines how Domain Objects become portable Resources.

Individual boundary implementations determine how those Resources are communicated with external systems.

Changing the communication mechanism should not require changes to the internal Application Architecture.

---

## Stable Responsibilities

Architectural owners should remain stable over time.

Implementation evolves.

Responsibilities generally do not.

For example, the application will always require:

* a runtime,
* domains,
* presentation,
* persistence,
* background processing,
* and communication with external systems.

How those responsibilities are implemented may change significantly.

The responsibilities themselves remain relatively constant.

The architecture therefore organizes the repository around responsibilities rather than technologies.

---

## Evolution

The architecture is intended to support continuous evolution.

Architectural ownership should be established before implementation changes occur.

Implementation then gradually migrates toward the documented ownership model.

This approach minimizes disruption while steadily improving the overall organization of the application.

The architecture should guide implementation rather than continually reacting to it.

---

## High-Level View

Conceptually, the application operates as follows:

```mermaid
flowchart LR

    Runtime["Workspace Runtime"]

    Domain["Domain Objects"]

    API["Public APIs"]

    Boundary["Resource Boundary"]

    External["Boundary Implementation"]

    Runtime --> Domain

    Domain --> API

    API --> Boundary

    Boundary --> External

    External --> Boundary

    Boundary --> Domain
```

Everything inside the Application Architecture operates on Domain Objects.

Only Resources cross the Resource Boundary.

External communication occurs beyond the boundary and remains independent of the application's internal behavior.

---

## Relationship To The Domain Resource Model

The Application Architecture defines how the application behaves.

The Domain Resource Model defines how Domain Objects are represented outside the application.

The Application Architecture does not define Resource Identity, Discovery, Resolution, Installation, Publication, or Synchronization.

Those concepts belong to the Domain Resource Model because they describe behavior at the Resource Boundary rather than application behavior.

Together these documents define both sides of the application's communication boundary while keeping their responsibilities clearly separated.

---

## Key Principles

The Application Architecture follows several fundamental principles:

* Organize around application meaning.
* Establish clear architectural ownership.
* Expose behavior through Public APIs.
* Keep implementation private.
* Operate exclusively on Domain Objects.
* Cross the Resource Boundary only when communicating with external systems.
* Allow implementation technologies to evolve independently from application behavior.

---

## Key Takeaways

* The Application Architecture defines how the application behaves.
* Applications operate exclusively on Domain Objects.
* Architectural owners collaborate through Public APIs.
* Responsibilities should remain stable while implementation evolves.
* Domain Objects cross the Resource Boundary as portable Resources.
* Communication technologies remain outside the Application Architecture.
* Separating application behavior from external communication allows both to evolve independently.
* The Application Architecture and Resource Boundary evolve independently while collaborating through a stable communication model.

# Resource Boundary

The Resource Boundary defines how Domain Objects leave and re-enter the application.

Applications operate exclusively on Domain Objects.

External systems operate on Resources.

The Resource Boundary separates these two models by defining how Domain Objects are represented outside the application and reconstructed when they return.

It provides a stable communication boundary between the Application Architecture and external systems while allowing each to evolve independently.

---

## Purpose

Applications rarely exist in isolation.

Information must eventually be:

* published,
* synchronized,
* discovered,
* installed,
* imported,
* exported,
* archived,
* or shared.

These activities require information to leave the application's internal runtime.

Rather than exposing Domain Objects directly, the application represents them as portable Resources at the Resource Boundary.

The Resource Boundary defines this transformation.

---

## Domain Objects And Resources

A Domain Object is the application's internal representation of information.

It contains behavior, relationships, and application semantics.

A Resource is the external representation of that Domain Object.

Resources are designed for communication rather than execution.

They provide a stable representation suitable for storage, synchronization, transport, publication, and reconstruction.

Applications operate on Domain Objects.

External systems operate on Resources.

The Resource Boundary connects these two worlds.

---

## Responsibilities

The Resource Boundary is responsible for concepts that exist outside the application's runtime.

These include:

* Resource Identity
* Resource Representations
* Discovery
* Resolution
* Installation
* Publication
* Synchronization
* Resource Lifecycle
* Resource Persistence

These responsibilities define how Resources behave independently of the application's internal implementation.

---

## The Domain Resource Model

The Domain Resource Model defines the conceptual model used by the Resource Boundary.

It establishes the relationship between:

* Domains,
* Resources,
* Resource Representations,
* Domain Object Factories,
* Domain Objects,
* and Domain Stores.

Every Resource crossing the boundary follows this model.

The remaining Resource Boundary documents build upon these concepts.

---

## Boundary Independence

The Resource Boundary intentionally separates application behavior from communication technology.

The Application Architecture owns Domain Objects.

The Resource Boundary owns Resources.

Communication technologies implement the boundary.

This separation allows the application to remain independent of any particular protocol or storage technology.

---

## Boundary Implementations

The Resource Boundary may be implemented using different communication technologies.

This application primarily implements the boundary using the Nostr protocol together with compatible decentralized services such as Blossom.

Other implementations could communicate using:

* REST
* RPC
* GraphQL
* Local Files
* Cloud Storage
* or other communication mechanisms

The Application Architecture remains unchanged.

Only the boundary implementation changes.

---

## Information Flow

Conceptually, information crosses the Resource Boundary as follows:

```mermaid
flowchart LR

    Domain["Domain Object"]

    Boundary["Resource Boundary"]

    Resource["Resource"]

    Implementation["Boundary Implementation"]

    Domain --> Boundary

    Boundary --> Resource

    Resource --> Implementation

    Implementation --> Resource

    Resource --> Boundary

    Boundary --> Domain
```

The application never communicates directly with external systems using Domain Objects.

Every interaction occurs through Resources defined by the Resource Boundary.

---

## Why A Boundary Exists

Separating Domain Objects from Resources provides several important benefits.

The application's internal model remains focused on application behavior.

External representations remain focused on communication.

Communication technologies can evolve without affecting application behavior.

Different boundary implementations can coexist while preserving the same Application Architecture.

This separation reduces coupling and simplifies long-term evolution.

---

## Relationship To The Application Architecture

The Application Architecture defines how the application behaves.

The Resource Boundary defines how the application communicates beyond its own runtime.

Neither replaces the other.

Together they define the complete system.

The Application owns behavior.

The Resource Boundary owns communication.

---

## Relationship To Implementation

The Resource Boundary does not require any particular implementation.

Individual applications may implement the boundary using technologies appropriate for their environment.

This application chooses Nostr because it naturally supports decentralized identity, replaceable resources, offline-first synchronization, and portable ownership.

Those technologies implement the boundary.

They do not define it.

---

## Key Principles

The Resource Boundary follows several fundamental principles:

* Applications operate exclusively on Domain Objects.
* External communication occurs exclusively through Resources.
* Domain Objects are never exposed directly outside the application.
* Boundary implementations remain independent of the Application Architecture.
* Communication technologies should be replaceable.
* The Domain Resource Model provides the conceptual foundation for every Resource crossing the boundary.

---

## Key Takeaways

* The Resource Boundary separates application behavior from external communication.
* Domain Objects remain internal to the application.
* Resources represent Domain Objects outside the application.
* The Domain Resource Model defines the concepts used by the boundary.
* Communication technologies implement the boundary rather than define it.
* The Application Architecture and Resource Boundary evolve independently while collaborating through a stable communication model.
