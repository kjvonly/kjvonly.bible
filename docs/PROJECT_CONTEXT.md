# KJVOnly Project Context

## Purpose

This document provides the mental model required to understand the KJVOnly project before reading its detailed architecture or source code.

It connects the major concepts without replacing the documents that define them precisely.

Use this document to understand:

* what the application is trying to accomplish,
* how the application is organized,
* what the major architectural owners are,
* how the Resource Boundary relates to the application,
* how information moves between local Domain state and external Resources,
* and where to look for more detailed documentation.

This is an orientation document.

It intentionally avoids current source paths, concrete classes, framework wiring, storage schemas, and other implementation mechanics.

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
* Resource representations,
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

================ Resource Boundary ================

    Resources
    Resource Representations
    Nostr publication / discovery / synchronization
```

The application remains responsible for application meaning on both sides of the boundary.

The Resource Boundary does not become the owner of Bible, Notes, Reading Plans, Strong's, or other Domain concepts merely because those concepts are distributed externally.

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

Application-wide concerns such as Settings and Workspace coordination are not Domains merely because they have state or user interfaces.

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
* and other cross-cutting application capabilities.

These responsibilities should not be forced into a Domain when their meaning belongs to the application itself.

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
* a protocol event,
* a persistence record,
* or the mechanism used to load it.

Those mechanisms may preserve or reconstruct Domain information, but they do not define its meaning.

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
```

The important rule is that dependencies point toward the owner of meaning.

When collaboration becomes awkward, first reconsider ownership and responsibility rather than immediately creating a global abstraction.

---

# Local Authority

KJVOnly is offline-first because accepted local state belongs to the application.

External information does not become authoritative merely because it exists on a network or is newer than local information.

The guiding rule is:

> **The network proposes. The application decides.**

External information must pass the applicable Resource, Domain, validation, and acceptance boundaries before it replaces accepted local Domain state.

This preserves a stable local model even when external systems are unavailable, inconsistent, or malicious.

---

# The Resource Boundary

Some Domain information needs an external lifecycle.

It may need to be:

* published,
* discovered,
* distributed,
* synchronized,
* shared,
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
Discovery Root / Resource Reference
    ↓
Resource Discovery
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

Each stage answers a different question.

Discovery asks what representation is available.

Resolution obtains and verifies the represented content.

Domain interpretation determines what the content means.

Domain validation determines whether it is valid for that Domain.

Installation decides whether the proposed external information should become accepted local state.

Successful discovery or resolution alone does not modify authoritative Domain state.

---

# Discovery Roots

Open-ended Resource discovery begins from configured Discovery Roots.

A Discovery Root establishes a publisher from which the application permits open-ended discovery.

An explicit Resource reference may be narrower than a Discovery Root.

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

---

# Synchronization

Synchronization reconciles accepted local state with valid externally published state.

It is not the same responsibility as normal Domain reads, Resource Discovery, Resource Resolution, or Outbox publication.

For synchronizable Resources, the architecture uses Last Write Wins as the conflict policy.

A remote publication that wins ordering still must pass normal validation and Installation before replacing accepted local state.

Synchronization therefore preserves both:

* deterministic reconciliation,
* and local authority.

---

# Resource Archives

Resources may also be transported in archive form.

An archive preserves Resource boundaries so that import/export does not require a separate application data model.

The important architectural idea is that archived information remains Resource information and returns through the same acceptance boundaries before becoming local Domain state.

---

# Persistence

Persistence preserves accepted application state across sessions.

Architecture distinguishes persistence from Domain meaning and from the Resource lifecycle.

Domains own the meaning of their information.

Persistence preserves that accepted information.

The Resource Boundary records the external provenance and lifecycle information required by Resource-backed state.

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

This keeps application behavior expressed in Domain terms.

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
* or a new implementation technique.

Likewise, new Resource behavior should extend the Resource Boundary when it concerns the external lifecycle of Domain information rather than creating a competing application data model.

Implementation may evolve significantly while these responsibilities remain stable.

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
What implementation best fulfills that contract today?
```

This keeps changes aligned with the architecture without freezing the implementation.

---

# Key Invariants

The following ideas should remain recognizable throughout the project:

* KJVOnly has one Application Architecture.
* The application operates on Domain Objects.
* Domains own application meaning and behavior.
* Workspace Runtime owns study-session structure rather than Domain behavior.
* Modules present Domain behavior as independently active interactions.
* Public APIs expose intentional cross-owner contracts.
* Usage does not transfer ownership.
* Strong's is its own Domain.
* Settings is application-owned rather than a Domain.
* Bible search and Bible text markup belong to the Bible Domain.
* Reading Plans own Plan Definitions, Plan Subscriptions, and Plan Progress.
* Accepted local state remains authoritative for normal application behavior.
* The network proposes; the application decides.
* Resources represent Domain information that requires an external lifecycle.
* Not every Domain Object must become a Resource.
* Resource, Domain Object, and Nostr Event are distinct concepts.
* Discovery, Resolution, Installation, publication, and synchronization are distinct responsibilities.
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

The implementation documents explain how those responsibilities are currently realized.

The Developer Guide explains how to change the codebase without weakening those boundaries.

By the time the source is examined, the purpose of its major boundaries should already be clear.
