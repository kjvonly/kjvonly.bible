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

# The Application

KJVOnly is an offline-first Bible study application designed to provide a fast, distraction-free reading and study experience while allowing users to own their data independently of any particular service or platform.

The application is built around the idea that studying Scripture should remain available regardless of network connectivity while still allowing study material to be synchronized, shared, published, and preserved when connectivity becomes available.

Rather than centering the application around cloud services, the application centers around the user's local experience.

Everything else builds upon that foundation.

---

## Purpose

The primary purpose of the application is to provide a complete Bible study environment.

Reading Scripture is only one part of that experience.

Users should be able to:

* Read the Bible.
* Study original language references.
* Create notes.
* Highlight passages.
* Follow reading plans.
* Search Scripture.
* Search personal study material.
* Organize multiple study sessions.
* Continue working without an Internet connection.

These capabilities work together to support long-term Bible study rather than isolated reading sessions.

---

## Offline First

The application is designed to function without requiring continuous network connectivity.

Bible content, indexes, notes, reading plans, annotations, and other application data are stored locally so that normal application behavior does not depend upon external services.

Network communication enhances the application.

It does not define the application.

This approach provides a consistent user experience regardless of connectivity while allowing synchronization to occur whenever communication becomes available.

---

## A Workspace-Based Experience

The application is designed around workspaces rather than pages.

A workspace represents a study session.

Within a workspace, users can open multiple panes, compare passages, follow references, consult notes, examine Strong's information, and work with multiple pieces of information simultaneously.

Rather than navigating between pages, users build an environment that supports their current study.

Workspaces allow that environment to be preserved and restored over time.

---

## Study Rather Than Navigation

Traditional applications often organize their user experience around navigation.

This application organizes the experience around study.

Information is brought into the current workspace rather than requiring the user to continually move between unrelated screens.

Opening a cross reference, viewing a note, searching Scripture, or following a reading plan extends the existing workspace instead of replacing it.

This encourages exploration while preserving context.

---

## Domains

The application is composed of several functional domains.

Each domain represents a specific area of responsibility.

Current domains include:

* Bible
* Notes
* Reading Plans
* Annotations
* Search
* Settings
* Workspaces

Each domain owns its own behavior while collaborating with the rest of the application through well-defined Public APIs.

Together these domains provide the complete study experience.

---

## User Ownership

Study material belongs to the user.

Notes, reading plans, annotations, highlights, and other user-created information should remain portable independently of the application itself.

The application therefore treats user information as first-class data that can be preserved, synchronized, imported, exported, and shared without becoming coupled to a single installation or service.

User-created study material remains under the user's control and should continue to exist independently of the technologies used to store or synchronize it.

---

## Extensible By Design

The architecture intentionally allows the application to grow over time.

New domains, study tools, document types, and external communication mechanisms can be introduced without fundamentally changing the structure of the application.

This allows the application to evolve while preserving a consistent user experience and architectural model.

---

## Long-Term Vision

The long-term vision is to provide a study platform whose internal architecture remains stable while continuously expanding its capabilities.

Users should be able to invest years of study into the application with confidence that their information remains portable, understandable, and independent of any single communication technology or storage provider.

The application should continue evolving without requiring users to abandon either their data or their established study workflow.

---

## Key Characteristics

The application is:

* Offline-first.
* Workspace-oriented.
* Domain-driven.
* Multi-pane.
* User-owned.
* Extensible.
* Portable.
* Decentralization-friendly.

These characteristics influence every architectural and implementation decision throughout the project.

---

## Key Takeaways

* KJVOnly is an offline-first Bible study application.
* The application is designed around long-term study rather than simple reading.
* Workspaces provide persistent study environments built from multiple panes.
* The application operates entirely on locally managed Domain Objects.
* User-created information remains portable and independent of any particular service.
* The architecture is designed to support continuous evolution without disrupting the user experience.

# Major Domains

The application is organized around Domains.

A Domain represents a cohesive area of application responsibility that models a meaningful concept within the application.

Domains own application behavior.

They define the Domain Objects, business rules, persistence, Resource Boundary participation, and Public APIs required to support that concept.

The application intentionally organizes itself around these enduring concepts rather than around user interface features, modules, or technical implementation.

---

## Domains And Modules

Domains and Modules represent different architectural concepts.

A **Domain** owns application behavior.

A **Module** presents Domain capabilities within the user interface.

A single Domain may expose multiple Modules, and multiple Module instances may exist simultaneously within a Workspace.

Modules do not own business logic.

They present the capabilities provided by their Domain.

This distinction keeps application behavior independent from presentation while allowing the user interface to evolve without changing the underlying architecture.

---

## Bible Domain

The Bible Domain is the foundation of the application.

It owns every responsibility directly related to studying Scripture.

Responsibilities include:

* Bible content
* Chapter navigation
* Verse references
* Strong's integration
* Bible annotations
* Bible search
* Cross references
* Translation support
* Scripture presentation

Although these capabilities may appear as different Modules within the user interface, they remain responsibilities of the Bible Domain because they all exist to support the study of Scripture.

The Bible Domain owns the behavior.

Modules simply present that behavior.

---

## Notes Domain

The Notes Domain manages user-created study material.

Responsibilities include:

* Notes
* Note organization
* Note search
* Scripture associations
* User-authored content

The Notes Domain owns every aspect of personal note management.

Searching notes is a capability of the Notes Domain rather than a separate architectural concern.

---

## Reading Plans Domain

The Reading Plans Domain manages structured Bible reading.

Responsibilities include:

* Reading plans
* Reading schedules
* Reading progress
* Completed readings
* Plan management

Reading Plans collaborate closely with the Bible Domain but remain an independent area of application responsibility.

The Reading Plans Domain determines what should be read.

The Bible Domain provides the Scripture being read.

---

## Settings Domain

The Settings Domain manages application preferences.

Responsibilities include:

* User preferences
* Theme configuration
* Runtime preferences
* Local application settings

Settings influence how the application behaves without becoming part of the study data itself.

---

## Domain Collaboration

Domains remain intentionally independent.

When collaboration is required, Domains communicate through Public APIs rather than depending upon each other's internal implementation.

For example:

* Reading Plans request Bible content without owning Bible behavior.
* Notes associate with Scripture without modifying Bible content.
* Bible annotations remain part of the Bible Domain while collaborating with Notes when appropriate.
* Each Domain owns its own search behavior rather than depending upon a shared Search Domain.

This separation allows Domains to evolve independently while maintaining a cohesive application.

---

## Consistent Ownership

Every Domain follows the same architectural model.

Each Domain owns:

* Domain Objects
* Business behavior
* Public APIs
* Persistence
* Resource Boundary participation

This consistency makes the architecture predictable.

When introducing new functionality, the first question should not be:

> *Where should this code live?*

Instead, the question should be:

> *Which Domain owns this behavior?*

Ownership determines implementation.

---

## Growing The Application

The application grows by introducing new Domains only when new areas of responsibility emerge.

Capabilities that naturally belong to an existing Domain should remain within that Domain rather than becoming independent architectural concepts.

For example, Bible Search belongs to the Bible Domain because it searches Bible content.

Bible Annotations belong to the Bible Domain because they enrich Scripture.

Likewise, Note Search belongs to the Notes Domain because it searches Notes.

This approach prevents the architecture from fragmenting into collections of technical features while preserving clear ownership throughout the application.

---

## Key Takeaways

* Domains organize the application around meaningful business concepts.
* Modules present Domain capabilities but do not own business behavior.
* A single Domain may expose multiple Modules.
* Search is a capability owned by individual Domains rather than a standalone Domain.
* Annotations belong to the Bible Domain because they enrich Scripture.
* Every Domain owns its own Domain Objects, Public APIs, persistence, and Resource Boundary participation.
* New functionality should extend existing Domains whenever ownership remains clear.

# System Overview

The KJVOnly project consists of a single Application Architecture separated from external systems by a Resource Boundary.

The Application Architecture defines how the application behaves.

The Resource Boundary defines how Domain Objects are represented outside the application.

Together they provide a complete model for building an offline-first application whose internal behavior remains independent of its communication technology.

The application owns behavior.

The Resource Boundary owns communication.

---

## The Complete System

At a high level, the application is organized into two conceptual areas.

The first is the Application Architecture.

The second is the Resource Boundary through which the application communicates with external systems.

Conceptually:

```mermaid
flowchart LR

    subgraph Application["Application Architecture"]

        Runtime["Workspace Runtime"]

        Modules["Modules"]

        Domains["Domains"]

        Objects["Domain Objects"]

        Runtime --> Modules
        Modules --> Domains
        Domains --> Objects

    end

    Boundary["Resource Boundary"]

    Resources["Resources"]

    External["Boundary Implementations<br/>Nostr • Blossom • REST • RPC"]

    Objects --> Boundary
    Boundary --> Resources
    Resources --> External

    External --> Resources
    Resources --> Boundary
    Boundary --> Objects
```

Every user interaction ultimately occurs within the Application Architecture.

Only Resources cross the Resource Boundary.

---

## Application Architecture

The Application Architecture owns everything required to operate the application.

This includes:

* Workspace Runtime
* User Interface
* Domains
* Persistence
* Background Processing
* Public APIs
* Repository Organization

Applications operate exclusively on Domain Objects.

Every architectural decision within the application ultimately supports the creation, modification, presentation, or management of Domain Objects.

The application remains intentionally independent of any communication technology.

---

## Resource Boundary

The Resource Boundary separates the application's internal model from external systems.

When Domain Objects must be synchronized, published, discovered, imported, exported, archived, or reconstructed, they cross the Resource Boundary as Resources.

The Domain Resource Model defines the conceptual model used by the boundary.

Boundary implementations determine how those Resources are communicated with external systems.

This application primarily implements the Resource Boundary using Nostr together with compatible decentralized services such as Blossom.

Alternative implementations may use different communication technologies while preserving the same Application Architecture.

---

## Runtime Flow

Every interaction within the application follows the same general flow.

The user interacts with a Module.

The Module requests behavior from the appropriate Domain.

The Domain operates on Domain Objects.

If external communication is required, the Domain requests the Resource Boundary to represent those Domain Objects as Resources.

The Resource Boundary communicates with external systems before reconstructing Domain Objects when information returns to the application.

Conceptually:

```mermaid
flowchart LR

    User

    Module

    Domain

    DomainObject["Domain Object"]

    Boundary["Resource Boundary"]

    Resource

    External["External System"]

    User --> Module
    Module --> Domain
    Domain --> DomainObject

    DomainObject --> Boundary
    Boundary --> Resource
    Resource --> External

    External --> Resource
    Resource --> Boundary
    Boundary --> DomainObject
```

The application itself never operates directly on externally communicated Resources.

Resources exist only at the Resource Boundary.

---

## Architectural Independence

The architecture intentionally separates responsibilities.

Application behavior remains independent from communication technology.

Communication technology remains independent from application behavior.

This separation allows each side of the Resource Boundary to evolve without affecting the other.

For example:

* New Modules may be introduced without changing external communication.
* New Domains may be introduced without changing communication protocols.
* New communication technologies may be adopted without changing the application's internal architecture.

This independence is one of the primary goals of the overall design.

---

## Information Ownership

Information exists in two forms throughout the system.

Within the application it exists as Domain Objects.

Outside the application it exists as Resources.

The Resource Boundary defines how information moves between these representations while preserving application semantics.

This allows the application to remain focused on business behavior while external systems remain focused on communication and storage.

---

## Building The System

The architecture follows a consistent progression.

Application concepts establish ownership.

Ownership establishes responsibility.

Responsibilities define Public APIs.

Public APIs allow architectural owners to collaborate.

Only after these responsibilities have been established does implementation become important.

This progression appears throughout the repository.

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

The same progression is followed whether introducing a new Domain, designing a new feature, or extending existing functionality.

---

## Long-Term Evolution

The architecture is designed to evolve incrementally.

The Application Architecture should remain focused on application behavior.

The Resource Boundary should remain focused on communication.

Implementation technologies may change over time.

The architectural model should remain stable.

This allows the application to continue growing without requiring fundamental architectural redesign.

---

## Key Takeaways

* The project consists of a single Application Architecture separated from external systems by a Resource Boundary.
* The Application Architecture owns behavior.
* The Resource Boundary owns communication.
* Applications operate exclusively on Domain Objects.
* External systems operate exclusively on Resources.
* The Domain Resource Model defines the conceptual model used by the Resource Boundary.
* Boundary implementations communicate Resources using technologies such as Nostr, Blossom, REST, or RPC.
* Separating application behavior from communication technology allows both to evolve independently.

# Application Runtime

The Application Runtime provides the environment in which every Domain operates.

Rather than defining application behavior itself, the Runtime is responsible for coordinating presentation, navigation, interaction, and user workflow while allowing each Domain to remain focused on its own responsibilities.

The Runtime owns the study environment.

Domains own the study content.

Together they provide the complete application experience.

---

## Purpose

The purpose of the Runtime is to provide a consistent environment in which Domains can present their capabilities without becoming responsible for application infrastructure.

Rather than embedding presentation logic inside individual Domains, the Runtime provides a common execution model shared throughout the application.

This separation allows Domains to focus exclusively on business behavior while the Runtime manages how that behavior is presented to the user.

---

## The Workspace

A Workspace represents a complete study session.

Everything the user interacts with exists within a Workspace.

A Workspace defines:

* the current layout,
* the active panes,
* the buffers assigned to each pane,
* and the collection of active Module instances.

Workspaces allow users to build complex study environments that can be preserved and restored over time.

---

## Panes

A Pane represents a region within a Workspace.

Each Pane hosts a single Module instance.

Panes may be divided, replaced, resized, or removed without affecting the Domains themselves.

The Runtime manages the pane layout.

Domains remain unaware of how they are presented.

This separation allows presentation to evolve independently from application behavior.

---

## Buffers

A Buffer represents the navigation context assigned to a Pane.

Rather than containing business behavior, a Buffer carries the information required for a Module to present a particular piece of Domain data.

Examples include:

* the current Bible location,
* the selected reading plan,
* the active note,
* or any other navigation state required by a Module.

Buffers allow Modules to be recreated, moved between panes, or restored without coupling presentation to Domain implementation.

---

## Module Instances

A Module Instance presents the capabilities of a Domain within a Pane.

Modules do not own business behavior.

Instead, they request behavior from their owning Domain while presenting that behavior to the user.

Multiple instances of the same Module may exist simultaneously.

For example, a user may open several Bible readers, compare different passages, or search Scripture in one pane while reading another.

Each Module instance operates independently while sharing the same Domain behavior.

---

## Runtime Responsibilities

The Runtime is responsible for coordinating the study environment.

Responsibilities include:

* Workspace management
* Pane management
* Buffer management
* Module lifecycle
* Layout coordination
* Runtime events
* Session restoration
* User interaction flow

The Runtime intentionally avoids implementing Domain behavior.

Its responsibility is to coordinate the environment in which Domains operate.

---

## Domain Participation

Domains participate in the Runtime through Module instances.

Each Domain exposes one or more Modules that present its capabilities.

For example:

* The Bible Domain provides reading and study Modules.
* The Notes Domain provides note management Modules.
* The Reading Plans Domain provides reading plan Modules.
* The Settings Domain provides configuration Modules.

The Runtime hosts these Modules without becoming responsible for their business logic.

---

## Collaboration

Interaction within the Runtime follows a consistent pattern.

The user interacts with a Module.

The Module requests behavior from its Domain.

The Domain operates on Domain Objects.

The Runtime coordinates presentation without participating in Domain behavior.

Conceptually:

```mermaid
flowchart LR

    User

    Workspace

    Pane

    Module

    Domain

    DomainObject["Domain Object"]

    User --> Workspace
    Workspace --> Pane
    Pane --> Module
    Module --> Domain
    Domain --> DomainObject
```

The Runtime coordinates interaction.

Domains provide behavior.

This separation keeps both responsibilities focused and independently evolvable.

---

## Long-Term Evolution

The Runtime is expected to evolve as the application grows.

New presentation models, layout capabilities, workspace features, and interaction patterns may be introduced without affecting the Domains themselves.

Likewise, Domains may introduce new capabilities without requiring changes to the Runtime beyond presenting additional Module instances.

This separation allows both the Runtime and Domains to evolve independently while preserving a consistent user experience.

---

## Key Takeaways

* The Runtime provides the environment in which Domains operate.
* Workspaces represent complete study sessions.
* Panes organize the visual layout.
* Buffers provide navigation context.
* Module instances present Domain capabilities.
* Domains own business behavior.
* The Runtime owns presentation and interaction.
* Separating Runtime responsibilities from Domain responsibilities keeps the application flexible and easy to evolve.

