# KJVOnly Project Context

## Purpose

This document provides the mental model required to understand the KJVOnly project before reading its detailed architecture or source code.

It connects the major concepts without replacing the documents that define them precisely.

Use this document to understand:

* what the application is trying to accomplish,
* how the application is organized,
* what the major architectural owners are,
* how the Resource Boundary relates to the application,
* how Resources may be available before their Domain information is installed,
* how information moves between local Domain state and external Resources,
* how Modules may present installed and discoverable information as one user experience,
* and where to look for more detailed documentation.

This is an orientation document.

It intentionally avoids current source paths, concrete classes, worker protocols, storage schemas, framework wiring, and other implementation mechanics.

---

# Reading The Repository

The recommended reading order is:

```text
Project Context
    ↓
Principles
    ↓
Application Architecture
    ↓
Resource Boundary
    ↓
Implementation
    ↓
Developer Guide
    ↓
Source Code
```

Each layer answers a different question.

## Principles

Principles explain how architectural decisions should be made.

They establish ideas such as ownership, loose coupling, local authority, responsibility before technology, and requesting capabilities through intentional boundaries.

## Application Architecture

Application Architecture defines the application's enduring responsibilities and how those responsibilities collaborate.

It describes concepts such as:

* Workspace Runtime,
* Panes,
* Buffers,
* Modules,
* Domains,
* Public APIs,
* Data Access,
* Resource availability,
* Technical Infrastructure,
* Persistence,
* Startup,
* Background Processing,
* User Interface,
* and Application Events.

## Resource Boundary

The Resource Boundary defines how Domain information participates in an external Resource lifecycle using Nostr.

It defines concepts such as:

* Resources,
* Resource identity,
* Resource metadata,
* Resource representations,
* Resource descriptions,
* Discovery Roots,
* Discovery,
* Resolution,
* Installation,
* publication,
* synchronization,
* and archives.

## Implementation

Implementation documentation explains how the current codebase realizes those architectural responsibilities.

Implementation may change more frequently than architecture.

## Developer Guide

The Developer Guide explains how contributors should work within the architecture and current repository conventions.

## Source Code

The source is the executable form of the current implementation.

Architecture should not be rewritten merely because an implementation happens to use a particular mechanism today.

Likewise, implementation documentation should be updated when the source has changed.

---

# The Core Design Sequence

KJVOnly begins with application meaning rather than technology.

The design sequence is:

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

A concept should live with the architectural owner that gives it meaning.

Its responsibility should be understood before choosing the implementation mechanism used to fulfill that responsibility.

This rule is the foundation for both architecture and repository organization.

---

# What KJVOnly Is

KJVOnly is an offline-first Bible study application.

The local application experience remains primary.

Normal reading, study, notes, reading-plan activity, and other accepted local behavior should remain usable without requiring continuous network access.

External communication exists to distribute, publish, synchronize, share, discover, and preserve information.

It supports the application rather than becoming the application's source of meaning.

The central architectural distinction is therefore:

```text
Application meaning and accepted local state

            ≠

External representation and distribution
```

The Application Architecture owns the first side.

The Resource Boundary defines the second side for Resource-backed Domain information.

---

# One Application Architecture

KJVOnly has one Application Architecture.

The Resource Boundary is not a second architecture competing with the application.

It is a boundary within the overall system that defines how applicable Domain information exists outside the application's local Domain model.

Conceptually:

```text
Application

    Workspace Runtime
    Modules
    Domains
    Domain Objects
    Application-owned capabilities
    Resource availability / catalogs

================ Resource Boundary ================

    Resources
    Resource Descriptions
    Resource Representations
    Nostr publication / discovery / synchronization
```

The application remains responsible for application meaning on both sides of the boundary.

The Resource Boundary does not become the owner of Bible, Notes, Reading Plans, Strong's, or other Domain concepts merely because those concepts are distributed externally.

Likewise, a catalog of available Resources does not become the owner of the Domain information those Resources may eventually produce.

---

# Application Model

At a high level, the application is organized around four complementary ideas:

```text
Workspace Runtime
    ↓ hosts
Module Instances
    ↓ present
Domain Behavior
    ↓ operates on
Domain Objects
```

The Resource Boundary intersects this model only when Domain information requires an external lifecycle.

Resource availability may also be visible to the application before the corresponding Domain Object has been installed.

Each concept has a different responsibility.

---

# Workspace Runtime

The Workspace Runtime owns the user's active study environment.

It manages the structural model through which multiple active interactions can coexist.

Its enduring concepts are:

* Workspace,
* Pane,
* Buffer,
* Module Instance,
* layout and composition,
* navigation between active interactions,
* and preservation of Runtime state.

The Runtime does not own Bible behavior, Notes behavior, Reading Plans behavior, or Strong's behavior.

It provides the environment in which those behaviors are presented.

---

# Panes

A Pane represents a structural region of the Workspace.

Panes define how the Workspace is divided and where active interactions appear.

A Pane owns structural placement.

It does not own the business behavior displayed within it.

---

# Buffers

A Buffer represents one active Module interaction hosted by the Workspace.

Conceptually, it preserves the Runtime context associated with that interaction.

This distinction matters:

```text
Pane
    = where an interaction is placed

Buffer
    = the active interaction occupying that place
```

Workspace structure and Module state therefore remain related without becoming the same concept.

---

# Modules

A Module is an independently active user interaction hosted by the Workspace Runtime.

Modules present Domain behavior.

They do not become the owner of the Domain concepts they expose.

For example:

```text
Bible Reader Module
    → presents Bible behavior

Bible Search Module
    → presents Bible search behavior

Notes Module
    → presents Notes behavior

Reading Plans Module
    → presents Reading Plans behavior
```

A Domain may support several Modules.

A Module exists because a behavior needs an independently active Runtime interaction, not because it constitutes a new Domain.

A Module may also compose multiple states of availability into one coherent user experience.

For example, a Notes Module may present:

```text
an already installed Note

and

a discoverable Note Resource that can become installed
```

as Notes to the user.

That presentation choice does not make the unresolved Resource into a Note Domain Object.

Modules may unify experience without collapsing architectural state.

---

# Domains

Domains organize the application around enduring areas of meaning and behavior.

The current Domain model is:

```text
Bible Domain
    Bible content
    Bible navigation
    Bible references
    Bible search
    Bible text markup

Notes Domain
    Notes
    Notes search
    Scripture associations

Reading Plans Domain
    Plan definitions
    Plan subscriptions
    Plan progress

Strong's Domain
    Strong's definitions
```

Application-wide concerns such as Settings, Workspace coordination, and general Resource availability are not Domains merely because they have state or user interfaces.

Ownership follows meaning.

---

# Bible Domain

The Bible Domain owns concepts whose meaning comes from Scripture.

This includes:

* Bible content,
* Bible locations,
* navigation within Bible content,
* Bible references,
* Bible search,
* and Bible text markup.

Bible search does not require a separate Search Domain because its meaning comes from Bible content.

Bible text markup does not require a separate Markup Domain because its meaning exists only in relation to Bible content.

---

# Notes Domain

The Notes Domain owns user Notes and behavior whose meaning comes from Notes.

Notes may refer to Bible locations without becoming part of the Bible Domain.

A relationship to another Domain does not transfer ownership.

Conceptually:

```text
Note
    └── may reference Bible information

Note ownership
    = Notes Domain

Bible-reference ownership
    = Bible Domain
```

Cross-Domain collaboration should preserve both sides of that distinction.

A Resource that advertises Note information also does not become a Note merely because the Notes Module can display or resolve it.

The Notes Domain becomes responsible for the resulting Note only after the information has crossed the Resource and Domain acceptance boundaries.

---

# Reading Plans Domain

The Reading Plans Domain owns the concepts used to define and follow reading plans.

Its enduring concepts include:

* Plan Definitions,
* Plan Subscriptions,
* and Plan Progress.

Reading Plans may reference Bible locations and initiate Bible reading interactions, but they do not own Bible behavior.

The Reading Plans Domain determines the reading-plan state.

The Bible Domain owns the Scripture concepts used to perform the reading.

---

# Strong's Domain

Strong's is a separate Domain.

It owns Strong's definitions and the behavior associated with that body of information.

Bible interactions may consume Strong's information, but consumption does not move Strong's ownership into the Bible Domain.

This follows the same general rule used throughout the application:

> Usage creates a dependency. It does not transfer ownership.

---

# Application-Owned Capabilities

Not every application responsibility belongs to a Domain.

Some capabilities exist because the application as a whole needs them.

Examples include:

* Settings,
* Workspace-wide coordination,
* application startup and lifecycle,
* authentication state,
* account state,
* Resource availability and catalogs,
* and other cross-cutting application capabilities.

These responsibilities should not be forced into a Domain when their meaning belongs to the application itself.

An application-owned capability may coordinate with several Domains without becoming the owner of their Domain Objects.

---

# Domain Objects

Domain Objects express information according to application meaning.

Examples include:

```text
Bible
    Chapter
    Text Markup

Notes
    Note

Reading Plans
    Plan Definition
    Plan Subscription
    Plan Progress

Strong's
    Strong's Definition
```

A Domain Object is not defined by:

* its network representation,
* a Resource description,
* a protocol event,
* a persistence record,
* a filesystem/catalog location,
* or the mechanism used to load it.

Those mechanisms may preserve, advertise, locate, or reconstruct Domain information, but they do not define its meaning.

---

# Public APIs

Architectural owners collaborate through intentional Public APIs.

A Public API represents what another owner is allowed to depend upon.

Conceptually:

```text
Consumer
    ↓
Owner Public API
    ↓
Owning Responsibility
    ↓
Internal Implementation
```

Public APIs expose meaningful capabilities and concepts while allowing internal implementation to evolve.

They do not transfer ownership to consumers.

A small Public API is preferable to exposing internal implementation merely for convenience.

---

# Cross-Owner Collaboration

Cross-owner dependencies are allowed when they reflect genuine application relationships.

For example:

```text
Reading Plans
    → Bible-owned location/navigation concepts

Notes
    → Bible-owned location concepts

Bible interaction
    → Strong's definitions

Module interaction
    → Resource availability
```

The important rule is that dependencies point toward the owner of meaning or capability.

When collaboration becomes awkward, first reconsider ownership and responsibility rather than immediately creating a global abstraction.

---

# Local Authority

KJVOnly is offline-first because accepted local state belongs to the application.

External information does not become authoritative merely because it exists on a network or is newer than local information.

The guiding rule is:

> **The network proposes. The application decides.**

External information must pass the applicable Resource, Domain, validation, and acceptance boundaries before it replaces accepted local Domain state.

A discoverable Resource is therefore not equivalent to accepted local Domain state.

This preserves a stable local model even when external systems are unavailable, inconsistent, or malicious.

---

# The Resource Boundary

Some Domain information needs an external lifecycle.

It may need to be:

* published,
* discovered,
* described,
* distributed,
* synchronized,
* shared,
* resolved,
* installed,
* or archived.

When that is required, the information participates in the Resource Boundary.

A Resource is the independently identifiable unit used for that external lifecycle.

Not every Domain Object must become a Resource.

Local-only preferences, Runtime state, transient interaction state, and other purely local information may remain entirely inside the application.

---

# Resources Are Not Domain Objects

Domain Objects and Resources are related but distinct.

```text
Domain Object
    ≠
Resource
    ≠
Nostr Event
```

A Domain Object expresses application meaning.

A Resource expresses distributable Domain information at the Resource Boundary.

A Nostr event is a protocol representation used to publish or discover Resource information.

Keeping these concepts distinct prevents protocol and distribution concerns from becoming part of the Domain model.

A Resource may be known to the application before the corresponding Domain Object exists locally.

That distinction is intentional.

---

# Resource Descriptions

A Resource may be described before its represented content is resolved.

A Resource description identifies enough about a Resource for the Resource Boundary to determine how that Resource can participate in resolution and installation.

Conceptually:

```text
Resource Description
    ↓
describes a Resource
    ↓
Resource Resolution
    ↓
Domain interpretation and installation
```

A Resource description is not:

```text
the Resource's Domain Object

or

proof that the Resource has already been installed
```

It is a boundary object used to describe something that may be available.

This allows KJVOnly to reason about available information without eagerly downloading or installing everything that can be discovered.

---

# Resource Metadata

Resources may carry metadata needed to understand or locate them without interpreting their full Domain content.

Different metadata answers different questions.

Conceptually:

```text
Resource category
    = which family of Resource this belongs to

Semantic data type
    = which versioned application data contract it contains

Media type
    = how the represented content is physically encoded
```

These concepts should remain distinct.

A stable Resource category may span multiple semantic data versions.

For example, a Domain may continue to recognize an older semantic representation so that it can migrate or interpret that data after newer versions are introduced.

Version-specific interpretation remains the responsibility of the owning Domain.

---

# Resource Availability

A Resource can be **available** without being **installed**.

This distinction is important.

Conceptually:

```text
Available Resource
    = the application knows where/how the Resource may be obtained

Installed Domain Information
    = the Resource has passed the required boundaries and produced
      accepted local Domain state
```

Availability therefore does not imply:

* the Resource content has been downloaded,
* the Resource has been decoded,
* the Resource has passed Domain validation,
* or the corresponding Domain Object exists locally.

This allows discovery and cataloging to remain lightweight.

---

# Filesystem / Resource Catalog

KJVOnly uses a filesystem-like catalog capability for organizing available Resources.

The filesystem concept should be understood as:

```text
filesystem location
    ↓
Resource description
```

rather than:

```text
filesystem location
    ↓
already installed Domain Object
```

A filesystem entry says, conceptually:

> A Resource is available at this application-visible location.

It does not say:

> The Resource's Domain Object has already been installed.

The filesystem therefore owns Resource availability and organization.

It does not own:

* Bible Chapters,
* Notes,
* Reading Plans,
* Strong's definitions,
* target Resource resolution rules,
* or the resulting Domain Objects.

Those responsibilities remain with Resource and Domain owners.

---

# Filesystem Paths And Resource Identity

A filesystem location and a Resource identity answer different questions.

Conceptually:

```text
Filesystem location
    = where the application exposes or organizes an available Resource

Resource identity
    = which Resource is being described
```

The same Resource may be exposed through different filesystem locations.

A filesystem owner may also expose a Resource published by someone else.

Therefore filesystem organization must not be confused with Resource ownership or Resource identity.

---

# Nested Resource Catalogs

A filesystem entry may itself refer to another filesystem/catalog Resource.

This should be understood as composition rather than ownership transfer.

Conceptually:

```text
Catalog A
    ↓ contains a reference to
Catalog B
    ↓ contains Resources
```

The user interface may present this as one continuous browsable tree.

Architecturally, the two catalogs remain distinct.

The contents of the nested catalog do not become owned by the parent merely because they are reachable through it.

---

# Available And Installed Information In The UI

The application may present available and installed information together when that creates the right user experience.

For example:

```text
Notes Module

    installed Note
    available Note Resource
    installed Note
```

may appear to the user simply as:

```text
Note
Note
Note
```

The presentation layer may intentionally hide the distinction.

The architecture must not.

Conceptually:

```text
installed item
    → already has accepted Domain state

available item
    → Resource description that can be resolved and installed
```

When the user selects an available item:

```text
Available Resource
    ↓
Resource lifecycle
    ↓
Domain installation
    ↓
Domain retrieves accepted object
    ↓
ordinary application interaction
```

The Resource layer should not return a Domain Object merely to make this presentation easier.

The owning Domain remains responsible for retrieving its installed object.

---

# Resource Loading And Domain Retrieval

Resource installation and Domain retrieval are different responsibilities.

Conceptually:

```text
Domain asks for information
    ↓
accepted local state exists?
    ├── yes → return Domain Object
    └── no
         ↓
      known Resource is loaded
         ↓
      normal Resource lifecycle
         ↓
      Domain installation
         ↓
      Domain checks its accepted local state again
         ↓
      return Domain Object
```

This pattern preserves the boundary:

```text
Resource
    installs Resource-backed information

Domain
    retrieves Domain Objects
```

A successful Resource operation does not itself redefine the Domain's storage or retrieval API.

---

# Nostr And The Resource Boundary

The KJVOnly Resource Boundary uses Nostr as its Resource protocol.

Nostr therefore belongs in the Resource Boundary specification where protocol behavior defines the Resource contract.

This includes concepts such as:

* publisher identity,
* addressable Resource identity,
* signed publication,
* relay discovery,
* and synchronization ordering.

Resource content may also be stored externally and referenced through Resource representations.

External storage does not change Domain ownership or Resource identity.

The Resource Boundary should not be treated as a generic synonym for every external protocol capability in the application.

---

# Inbound Resource Lifecycle

The inbound Resource lifecycle is conceptually:

```text
Discovery Root / Resource Reference / Resource Description
    ↓
Resource Discovery or Known Resource Resolution
    ↓
Resource Representation
    ↓
Resource Resolution
    ↓
Verified Serialized Content
    ↓
Domain Interpretation
    ↓
Candidate Domain Information
    ↓
Domain Validation
    ↓
Installation Decision
    ↓
Accepted Local Domain State
```

Not every Resource begins at open-ended discovery.

A Resource description may already identify a known Resource and allow the application to enter the lifecycle at the appropriate later boundary.

Each stage answers a different question.

Discovery asks what representation is available.

Description identifies a Resource that may be resolved.

Resolution obtains and verifies the represented content.

Domain interpretation determines what the content means.

Domain validation determines whether it is valid for that Domain.

Installation decides whether the proposed external information should become accepted local state.

Successful discovery, cataloging, description, or resolution alone does not modify authoritative Domain state.

---

# Discovery Roots

Open-ended Resource discovery begins from configured Discovery Roots.

A Discovery Root establishes a publisher from which the application permits open-ended discovery.

An explicit Resource reference may be narrower than a Discovery Root.

A Resource description obtained from an already accepted relationship may also identify a specific Resource without widening open-ended discovery.

This distinction prevents one explicit cross-publisher relationship from silently widening the application's general trust/discovery scope.

---

# Outbound Resource Lifecycle

Locally created or changed Domain information becomes accepted local state before external publication succeeds.

When that information requires publication, the conceptual flow is:

```text
Local Domain Change
    ↓
Accepted Local State
    ↓
Durable Publication Intent
    ↓
Resource Representation
    ↓
Signed Nostr Publication
    ↓
Relay Distribution
```

Publication is therefore asynchronous with respect to local application success.

Network failure does not invalidate an already accepted local change.

A Resource catalog or filesystem may also publish references to Resources without becoming the owner of the Resources' Domain meaning.

---

# Synchronization

Synchronization reconciles accepted local state with valid externally published state.

It is not the same responsibility as normal Domain reads, Resource Discovery, Resource Resolution, Resource availability, catalog browsing, or Outbox publication.

For synchronizable Resources, the architecture uses Last Write Wins as the conflict policy.

A remote publication that wins ordering still must pass normal validation and Installation before replacing accepted local state.

Synchronization therefore preserves both:

* deterministic reconciliation,
* and local authority.

---

# Resource Archives

Accepted Resource-backed Domain state may also be made portable in archive form.

An archive preserves the Resource association and revision information needed to reconstruct normal inbound Resource candidates without preserving original transport packaging.

The important architectural idea is that archived information returns through the same Domain interpretation, validation, freshness, and Installation boundaries before becoming accepted local Domain state.

---

# Persistence

Persistence preserves accepted application state across sessions.

Architecture distinguishes persistence from Domain meaning, Resource availability, and from the Resource lifecycle.

Domains own the meaning of their information.

Persistence preserves that accepted information.

Resource catalogs preserve information about what Resources are available.

The Resource Boundary records the external provenance and lifecycle information required by Resource-backed state.

These responsibilities may use the same technical persistence mechanism without becoming the same architectural concept.

The exact persistence technology belongs to Implementation.

---

# Data Access

Application behavior should request Domain information through Domain-owned capabilities rather than asking callers to know where that information is stored or retrieved.

Conceptually:

```text
Consumer
    ↓ asks for Domain information
Domain capability
    ↓
Accepted local state
```

If obtaining missing or updated information requires Resource activity, that activity occurs beneath the appropriate boundary rather than becoming the consumer's responsibility.

When a Module intentionally presents discoverable Resources before installation, it may also consume Resource-availability capabilities.

That does not make the unresolved Resource into Domain information.

A useful distinction is:

```text
Domain access
    = obtain accepted Domain information

Resource availability
    = discover what information could become available
```

Modules may compose both when the user experience requires it.

---

# Search

Search belongs to the owner of the information being searched.

A Domain may provide rich search over installed Domain information because it understands that information's meaning and content.

A Resource catalog may provide search over metadata describing available Resources.

These are different capabilities.

For example:

```text
Installed Notes search
    → may search Note content and Note-specific fields

Available Resource search
    → may search Resource name, path, category, or other catalog metadata
```

A Module may merge those results into one user experience.

It should not resolve every Resource merely to make catalog search equivalent to Domain full-text search.

---

# Background Processing

Not all maintenance work must block foreground interaction.

Background Processing exists for responsibilities that improve or maintain application state independently of an immediate user action.

Examples may include:

* Resource maintenance,
* synchronization,
* publication retries,
* derived-data maintenance,
* or other deferred work.

Background execution does not change ownership.

The subsystem that owns the underlying behavior remains responsible for its rules even when the work executes later.

---

# Technical Infrastructure

Technical Infrastructure provides mechanisms used by architectural owners.

Examples include networking, persistence engines, cryptography, workers, browser APIs, and other technical capabilities.

Infrastructure does not become an architectural owner merely because many parts of the application depend upon it.

Architectural owners depend on technical mechanisms through boundaries that preserve application meaning.

A worker, database, index, or protocol transport should therefore be understood as an implementation mechanism rather than as the owner of the concepts it processes.

---

# Application Events

Independent parts of the application sometimes need to observe meaningful changes owned elsewhere.

Application Events describe that communication responsibility.

An event communicates that something happened.

It does not become the owner of the behavior that produced the change.

The architecture does not require every change to flow through one global event bus.

Owners may expose appropriate notification boundaries while preserving ownership of the underlying state and behavior.

---

# Growth And Evolution

The architecture should grow by extending existing ownership whenever the new capability derives its meaning from an existing owner.

A new Domain should represent a genuinely new area of enduring application meaning, not merely:

* a new screen,
* a new storage requirement,
* a new protocol,
* a new service,
* a new catalog,
* or a new implementation technique.

Likewise, new Resource behavior should extend the Resource Boundary when it concerns the external lifecycle of Domain information rather than creating a competing application data model.

Resource catalogs should extend Resource availability and organization rather than becoming alternate Domain stores.

Implementation may evolve significantly while these responsibilities remain stable.

---

# Schema Evolution

Externally available Resources may outlive a particular application data schema.

A stable Resource family may therefore contain information encoded according to more than one semantic version.

The owning Domain is responsible for interpreting or migrating representations it continues to support.

Conceptually:

```text
Available Resource
    ↓
semantic data version
    ↓
owning Domain interpretation
    ↓
migration when required
    ↓
current Domain Object
```

Resource discovery should not unnecessarily hide older supported information merely because a newer semantic version exists.

Likewise, generic Resource or filesystem/catalog infrastructure should not contain Domain-specific migration logic.

---

# Documentation Boundaries

The documentation deliberately separates concepts from current realization.

```text
Principles
    = decision philosophy

Application Architecture
    = application responsibilities and ownership

Resource Boundary
    = external Resource lifecycle and protocol contract

Implementation
    = current realization of those responsibilities

Developer Guide
    = contributor workflow and repository conventions
```

This separation is important.

Architecture should not accumulate current implementation mechanics.

Implementation documentation should not redefine architectural ownership.

Developer guidance should not become a hidden source of architecture decisions.

This Project Context document should remain an orientation layer.

Detailed filesystem schemas, worker messages, concrete service names, database indexes, and other current mechanisms belong in Implementation documentation rather than here.

---

# How To Approach A Change

When introducing or refactoring functionality, reason in this order:

```text
What does this capability mean?
    ↓
Who owns that meaning?
    ↓
What responsibility is required?
    ↓
What must other owners be allowed to consume?
    ↓
Does an existing boundary already provide that capability?
    ↓
What implementation best fulfills that contract today?
```

This keeps changes aligned with the architecture without freezing the implementation.

Before creating a parallel lifecycle, first determine whether an existing owner already has the necessary responsibility but lacks the correct entry point.

---

# Key Invariants

The following ideas should remain recognizable throughout the project:

* KJVOnly has one Application Architecture.
* The application operates on Domain Objects.
* Domains own application meaning and behavior.
* Workspace Runtime owns study-session structure rather than Domain behavior.
* Modules present Domain behavior as independently active interactions.
* Modules may unify user experience without collapsing underlying architectural states.
* Public APIs expose intentional cross-owner contracts.
* Usage does not transfer ownership.
* Strong's is its own Domain.
* Settings is application-owned rather than a Domain.
* Resource availability/cataloging is not itself a Domain.
* Bible search and Bible text markup belong to the Bible Domain.
* Reading Plans own Plan Definitions, Plan Subscriptions, and Plan Progress.
* Accepted local state remains authoritative for normal application behavior.
* The network proposes; the application decides.
* Resources represent Domain information that requires an external lifecycle.
* Not every Domain Object must become a Resource.
* Resource, Resource Description, Domain Object, and Nostr Event are distinct concepts.
* A Resource may be available before its corresponding Domain Object is installed.
* Filesystem/catalog entries represent available Resource mappings, not installed Domain Objects.
* Filesystem location and Resource identity are distinct concepts.
* Resource categories, semantic data types, and physical media types answer different questions.
* Discovery, description, Resolution, Installation, publication, synchronization, and Domain retrieval are distinct responsibilities.
* Loading a Resource and retrieving the resulting Domain Object are separate responsibilities.
* Domain schema migration belongs to the owning Domain.
* Nostr is the protocol defined by the Resource Boundary for Resource publication and discovery.
* Implementation mechanisms remain subordinate to architectural responsibility.

---

# Where To Go Next

After this document, continue through the repository in this order:

```text
docs/00_principles/
    ↓
docs/01_application-architecture/
    ↓
docs/02_resource-boundary/
    ↓
docs/03_implementation/
    ↓
docs/05_developer-guide/
    ↓
source code
```

The architecture documents explain what the system owns and why.

The Resource Boundary documents explain the external lifecycle of Resource-backed Domain information.

The implementation documents explain how those responsibilities are currently realized.

The Developer Guide explains how to change the codebase without weakening those boundaries.

By the time the source is examined, the purpose of its major boundaries should already be clear.