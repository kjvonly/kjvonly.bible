# KJVOnly Project Context

# Introduction

Welcome to the KJVOnly project.

This document is the recommended starting point for a developer, contributor, or AI agent working in the repository.

Its purpose is to provide enough context to understand:

* what KJVOnly is,
* how the application is organized,
* which architectural concepts own which responsibilities,
* how the Resource Boundary fits into the Application Architecture,
* how the current implementation relates to the target architecture,
* and where to look next when more detail is required.

This is not an architecture specification.

It is a map of the architecture.

The authoritative decisions live in the Principles, Application Architecture, Resource Boundary ADRs, and implementation documentation.

The goal of this document is to make those documents—and eventually the source code—much easier to understand.

---

# The Mental Model

KJVOnly is an offline-first Bible study application organized around **meaning and ownership**.

The architecture follows this progression:

```text
Meaning
    ↓
Ownership
    ↓
Responsibility
    ↓
Public Boundary
    ↓
Implementation
```

When working on the repository, the first question should usually be:

> **Who owns this responsibility?**

not:

> Which service, component, worker, or database should contain this code?

Implementation follows ownership.

---

# One Application Architecture

KJVOnly has **one Application Architecture**.

The Resource Boundary is part of that architecture.

It is not a separate Resource Architecture.

At the highest level:

```text
Application

    Domain
        ↓
    Domain Object

========== Resource Boundary ==========

    Resource
        ↓
    Nostr Representation
        ↓
    Nostr Protocol / Relays
```

The application owns application meaning.

The Resource Boundary defines how Domain information participates in an external lifecycle using Nostr.

This distinction is one of the most important concepts in the project.

---

# What KJVOnly Is

KJVOnly is an offline-first Bible study application designed around sustained study rather than page navigation.

The application supports capabilities such as:

* Bible reading,
* Bible search,
* Strong's information,
* Bible annotations and highlights,
* personal Notes,
* Notes search,
* Reading Plans,
* reading progress,
* completed readings,
* multiple simultaneous study panes,
* and persistent study environments.

Normal study behavior should remain available without network connectivity.

Nostr enhances the application by allowing Resources to be published, discovered, synchronized, shared, and recovered.

Nostr does not define the application's internal model.

---

# Offline First

Offline-first is a fundamental architectural constraint.

The application should remain useful when:

```text
relay unavailable
network unavailable
external content server unavailable
another device unavailable
```

Local application behavior therefore comes first.

For user-created information:

```text
User Action
    ↓
Domain Operation
    ↓
Accepted Local State
    ↓
Application Continues
```

If the change must be published:

```text
Accepted Local State
    ↓
Durable Publication Intent
    ↓
Outbox
    ↓
Publication when possible
```

The network is asynchronous with respect to normal local application behavior.

A local operation MUST NOT require successful relay publication before becoming usable.

---

# Application Authority

The application owns its accepted local state.

External information is not automatically application state merely because it:

* exists on a relay,
* has a valid Nostr signature,
* has a newer timestamp,
* was returned by Resource Discovery,
* or passed Resource integrity verification.

The governing principle is:

> **The network proposes. The application decides.**

For locally created information:

> **Accept locally first. Publish externally independently.**

These rules connect the offline-first Application Architecture with the Resource Boundary.

---

# The Application Model

Inside the application, information is understood through **Domains** and **Domain Objects**.

Domains give information meaning.

Domain Objects are application-facing representations of that meaning.

For example:

```text
Bible Domain
    ↓
Bible Chapter

Notes Domain
    ↓
Note

Reading Plans Domain
    ↓
Reading Plan
```

The application does not use raw Nostr events as its Domain model.

It does not treat relay events, Blossom files, Resource descriptors, or database records as Domain Objects merely because they contain similar information.

---

# Major Domains

The current primary Domains are:

```text
Bible
Notes
Reading Plans
Settings
```

Search is not a standalone Domain.

Annotations are not a standalone Domain.

Workspace is not a Domain.

Those distinctions matter when reorganizing the implementation.

---

# Bible Domain

The Bible Domain owns application meaning related to Scripture.

Its responsibilities include:

* Bible content,
* Bible locations,
* chapters,
* verses,
* Bible navigation,
* Bible Search,
* Strong's integration,
* Bible annotations,
* verse highlights,
* word highlights,
* Bible-specific indexing,
* and Bible Resource interpretation.

Bible Search belongs to Bible because it searches Bible information.

Bible annotations belong to Bible because they enrich Bible information.

Strong's currently belongs with Bible because its application purpose is Scripture study.

---

# Notes Domain

The Notes Domain owns personal study Notes.

Its responsibilities include:

* Note Domain Objects,
* Note creation and editing,
* Note organization,
* Notes Search,
* Note persistence behavior,
* Note validation,
* and Notes Resource interpretation.

Notes Search belongs to Notes.

It is not part of a generic Search Domain.

---

# Reading Plans Domain

The Reading Plans Domain owns structured reading behavior.

Its responsibilities include:

* Reading Plans,
* reading schedules,
* progression,
* completed readings,
* and Reading Plan Resource interpretation.

Completed readings may have their own Resource representation without becoming a separate Domain.

Reading Plans collaborate with Bible when a plan sends the user to Scripture.

That collaboration does not transfer Bible ownership to Reading Plans.

---

# Settings Domain

Settings owns meaningful application preferences.

Some settings may be entirely local.

A setting does not become a Resource merely because it is persisted.

Only information that deliberately participates in an external Resource lifecycle needs a Resource representation.

---

# Domains and Modules Are Different

A **Domain** owns application behavior.

A **Module** presents Domain behavior within the Workspace Runtime.

For example:

```text
Bible Domain
    ├── Bible Reading Module
    └── Bible Search Module

Notes Domain
    ├── Notes List Module
    └── Notes Search Module
```

Multiple instances of the same Module may exist simultaneously.

A user may have several Bible readers open at once.

They are separate Module Instances using the same Bible Domain.

Modules do not own Domain behavior simply because they display it.

---

# The Workspace Runtime

KJVOnly is a single-page application, but it is not organized around route-driven navigation.

The current application uses one primary route:

```text
/
```

Study interaction occurs through the **Workspace Runtime**.

The core Runtime relationship is:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
```

This model is central to understanding the client.

---

# Workspace

A Workspace represents an active study environment.

Today, the root Pane tree effectively acts as the Workspace.

The Runtime owns the Workspace arrangement.

Future support may include named Workspace snapshots that allow a user to save and restore different study contexts.

Workspace is an Application Runtime concept, not a Domain.

---

# Pane

A Pane is a region of the Workspace.

Panes form a tree and may be:

* split,
* closed,
* replaced,
* reorganized,
* or resized.

Pane layout is owned by the Workspace Runtime.

Domains should not directly manipulate the Pane tree.

---

# Buffer

A Buffer connects a Pane with the interaction being presented there.

Conceptually:

```text
Pane
    ↓
Buffer
    ├── Navigation Context
    └── Module Instance
```

The Buffer is Domain-agnostic.

Its purpose is to allow the Runtime to host different kinds of Modules without learning their Domain behavior.

---

# Navigation Context

A Buffer carries navigation context required to initialize or continue a Module interaction.

Examples include:

* a Bible location,
* a Reading Plan queue,
* selected Domain information,
* or other Module initialization state.

Navigation Context is not intended to become a generic dependency container.

It communicates interaction context.

---

# Module Instance

A Module Instance presents Domain capabilities within a Pane.

Examples include:

```text
Bible Reading
Bible Search
Notes List
Notes Search
Reading Plan
```

The Runtime determines where the Module appears.

The owning Domain determines what the Module means and what behavior it can perform.

---

# Runtime Collaboration

The normal user interaction path looks approximately like:

```text
User
    ↓
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
    ↓
Domain Public API
    ↓
Domain
    ↓
Domain Objects
```

The Runtime coordinates interaction.

The Domain owns meaning.

Neither should absorb the responsibility of the other.

---

# Architectural Ownership

A recurring principle throughout the project is:

> **Ownership is the assignment of responsibility to the part of the application that gives that responsibility meaning.**

There are several major ownership categories.

```text
Domains
    application meaning

Application Runtime
    study environment and interaction composition

Application Services
    genuinely cross-owner coordination

Resource Boundary
    external Resource lifecycle

Technical Infrastructure
    technical capability

User Interface
    shared presentation conventions
```

Shared use does not imply shared ownership.

---

# Public APIs

Architectural owners collaborate through explicit boundaries.

A **Public API** means:

> **Please do this.**

Conceptually:

```text
Consumer
    ↓
Public API
    ↓
Owner
    ↓
Internal Implementation
```

A caller should request behavior from the owner rather than manipulating the owner's persistence, services, or internal types directly.

---

# Application Events

An **Application Event** means:

> **This happened.**

Events announce completed facts.

They are not substitutes for behavior APIs.

For example:

```text
Public API
    "Save this Note."

Application Event
    "The Note changed."
```

Commands and events serve different purposes.

---

# Other Collaboration Mechanisms

Architectural owners may also collaborate through:

```text
Shared Identifier

Navigation Context
```

A Shared Identifier identifies information understood across boundaries.

Navigation Context initializes or continues a Runtime interaction.

The mechanism should match the meaning of the collaboration.

---

# Application Services

An Application Service owns behavior only when that behavior is genuinely cross-Domain or application-wide.

Using a service from two places does not automatically make it an Application Service.

For example, the Bible location reference is used by Bible and Reading Plans and therefore participates in application-level collaboration.

Bible chapter retrieval, however, remains Bible-owned even if several Modules use it.

---

# Background Processing

Background Processing changes when or where work executes.

It does not change ownership.

For example:

```text
Resource Synchronization
    ↓
may execute in background
```

but:

```text
Background Processing
    ≠
owner of Resource Synchronization
```

Likewise:

```text
Bible indexing
    ↓
may execute in a worker
```

while Bible remains the owner of the indexing behavior.

The rule is:

> **Execution changes. Ownership does not.**

---

# Persistence

Persistence answers:

> **How does accepted application state survive execution?**

Persistence is not itself the owner of Domain meaning.

A Domain may use:

* a repository,
* a Store,
* IndexedDB,
* an adapter,
* or another persistence mechanism.

The physical storage mechanism does not determine architectural ownership.

For example:

```text
Notes data
    → Notes-owned persistence

Bible data
    → Bible-owned persistence

Workspace snapshots
    → Application Runtime persistence

Outbox entries
    → Resource Boundary persistence
```

All of these may physically use one IndexedDB database.

That does not make them one architectural responsibility.

---

# The Resource Boundary

The Resource Boundary is one of the most important concepts in the project.

It defines:

> **How Domain information participates in an external Nostr Resource lifecycle.**

It is specifically a **Nostr Resource Boundary**.

Nostr is not an incidental implementation detail that could simply be replaced by REST without changing the specification.

The Resource Boundary ADRs deliberately define how Resources use:

* Nostr events,
* publisher public keys,
* kinds,
* `d` tags,
* `t` tags,
* `created_at`,
* event IDs,
* signed publications,
* addressable-event semantics,
* relay queries,
* and related external Resource mechanisms.

Blossom and HTTP may participate as external Resource-content storage.

They do not replace Nostr as the Resource publication and discovery protocol defined by this specification.

---

# Domain Resource Model

The **Domain Resource Model** is the conceptual foundation of the Resource Boundary.

It defines concepts such as:

```text
Domain Object
Resource
Resource Identifier
Published Resource Identity
Resource Type
Resource Classification
Resource Representation
Resource Granularity
```

It does not itself own Discovery, Resolution, Installation, publication, synchronization, or archives.

Those responsibilities are defined by subsequent Resource Boundary specifications.

---

# Domain Objects and Resources

A Domain Object represents information according to application meaning.

A Resource represents Domain information in a form that can participate in an external lifecycle.

They serve different purposes.

```text
Domain Object
    ≠
Resource
```

Not every Domain Object is a Resource.

Information needs a Resource representation when it must participate in external behavior such as:

* publication,
* discovery,
* distribution,
* synchronization,
* sharing,
* archival,
* or external retrieval.

Runtime state and purely local information may never cross the Resource Boundary.

---

# Resource Identity

A Published Resource uses Nostr addressable-event identity.

Its identity is:

```text
kind + publisher pubkey + d
```

The `d` tag contains the Resource Identifier.

For example:

```text
kjvonly/bible/chapters/kjv
```

A Nostr event ID serves a different purpose.

```text
kind + pubkey + d
    identifies the Published Resource

event id
    identifies one signed publication
```

The architecture does not introduce another Resource revision identity system.

---

# Resource Representations

A Resource can use three established representations:

```text
content
descriptor
descriptors
```

A `content` representation carries serialized Resource content directly in the Nostr event.

A `descriptor` representation describes externally stored Resource content.

A `descriptors` representation describes a collection of independently identifiable Resources.

Representation does not determine Resource identity or Domain meaning.

---

# External Resource Content

Some Resources are too large or otherwise inappropriate to carry directly inside a Nostr event.

A descriptor may therefore reference external content.

Conceptually:

```text
Nostr Resource Representation
        ↓
Descriptor
        ↓
Blossom / HTTP / other supported content source
        ↓
Serialized Resource Content
```

External content is verified by Resource Resolution before it can proceed toward Domain interpretation.

Storage location is not Resource identity.

---

# Discovery Roots

A Discovery Root is a publisher from which the application permits open-ended Resource Discovery.

It establishes where broad discovery may begin.

It does not automatically mean:

* every Resource should be installed,
* the publisher controls accepted local state,
* every publisher referenced later becomes another root,
* or all Domain information from that publisher is authoritative.

A specific Resource reference to another publisher may permit bounded discovery without promoting that publisher to a Discovery Root.

---

# Resource Discovery

Resource Discovery answers:

> **Which Resource Representations are available?**

It uses Nostr.

Discovery may query by:

* publisher,
* Published Resource Identity,
* Resource Classification,
* Resource reference,
* or exact event ID.

Discovery finds Resource Representations.

It does not:

* retrieve descriptor content,
* interpret Domain meaning,
* install Domain Objects,
* or replace accepted local state.

---

# Resource Resolution

Resource Resolution answers:

> **How does a known Resource Representation become verified serialized Resource content?**

Conceptually:

```text
Resource Representation
        ↓
Resolve Representation
        ↓
Serialized Resource Content
        ↓
Integrity Verification
        ↓
Verified Resource Content
```

Resolution may read embedded content or retrieve externally stored content.

Resolution verifies Resource integrity.

It does not validate application meaning.

---

# Resource Integrity and Domain Validity

These are deliberately separate:

```text
Resource Resolution
    verifies Resource content

Domain Validation
    verifies application meaning
```

Content may be cryptographically correct while still being invalid according to a Domain.

Successful Resolution therefore does not imply Installation.

---

# Resource Installation

Installation answers:

> **When does verified external Resource information become accepted local application state?**

The inbound acceptance path is:

```text
Nostr / External Content
        ↓
Resource Representation
        ↓
Resource Resolution
        ↓
Verified Resource Content
        ↓
Domain Interpretation
        ↓
Candidate Domain Object
        ↓
Domain Validation
        ↓
Installation Decision
        ↓
Accepted Local State
```

Installation is the acceptance boundary.

Persistence may follow acceptance.

Persistence is not the definition of Installation.

---

# Local Authority at the Resource Boundary

Finding newer network information does not automatically replace local state.

The application may:

* reject invalid information,
* reject an installation,
* retain existing local state,
* or reconcile through synchronization policy.

The network supplies candidate Resource information.

The application determines accepted Domain information.

---

# Outbox and Publishing

Local Domain changes are accepted before publication.

When accepted Domain information must be published:

```text
Local Domain Change
        ↓
Accepted Local State
        ↓
Durable Publication Intent
        ↓
Resource
        ↓
Resource Representation
        ↓
Nostr Event
        ↓
Signing
        ↓
Relay Publication
```

The persistent Outbox ensures required publication is not forgotten when the application is offline.

Relay failure does not invalidate the local change.

---

# Multi-Device Synchronization

Different devices may independently modify the same Published Resource while offline.

KJVOnly uses **Last Write Wins** for reconciliation.

For synchronizable information:

```text
Domain modifiedAt
    =
Nostr created_at
```

The later valid logical write wins reconciliation for the same Published Resource Identity.

This does not mean:

```text
newest network event
    =
automatic local authority
```

A remote winner still proceeds through normal Resource validation and Installation.

The synchronization model intentionally does not introduce:

* locking,
* automatic merging,
* conflict copies,
* a separate logical clock,
* or a Resource revision system.

Clock skew remains an accepted limitation.

---

# Resource Archives

Resources may be made portable without live relay or external-content access using Resource Archives.

The archive format is:

```text
.kjva
```

A Resource Archive contains serialized Resources while preserving their Resource boundaries and applicable provenance.

Archive import still uses the normal Domain validation and Installation process.

A Resource Archive is not automatically a complete dump of application state.

Runtime state, arbitrary settings, caches, installation bookkeeping, and other local-only information do not become archive content unless they deliberately have a Resource representation.

---

# Resource Boundary Lifecycle

The complete conceptual model is:

```text
                     OUTBOUND

Accepted Domain Information
        ↓
Resource
        ↓
Resource Representation
        ↓
Nostr Event
        ↓
Nostr Relays


                     INBOUND

Nostr Relays / Resource Archive
        ↓
Resource Representation
        ↓
Resource Discovery / Resolution
        ↓
Verified Resource Content
        ↓
Domain Interpretation
        ↓
Candidate Domain Object
        ↓
Domain Validation
        ↓
Installation
        ↓
Accepted Domain Information
```

Nostr is the protocol contract around Resource publication and discovery.

Domains retain ownership of application meaning on both sides.

---

# The Resource Boundary Specifications

The Resource Boundary ADRs are intended to be read in order:

```text
00  Resource Boundary Overview

01  Domain Resource Model
02  Data Distribution Strategy
03  Nostr Event Model
04  Nostr Resource Identity

05  Discovery Roots
06  Resource Discovery
07  Resource Resolution
08  Resource Installation Lifecycle

09  Outbox and Publishing
10  Multi-Device Synchronization
11  Resource Archives
```

Each specification answers one Resource lifecycle question.

Do not reinterpret one ADR in isolation from the concepts established before it.

---

# Application Architecture vs Resource Boundary

These should not be thought of as two independent architectures.

There is one Application Architecture.

The Resource Boundary is one responsibility within it.

A useful distinction is:

```text
Application Architecture

    defines:
        Runtime
        Domains
        Public APIs
        Events
        Persistence responsibility
        Background Processing
        User Interface
        Repository Organization
        Resource Boundary


Resource Boundary

    defines:
        Resource model
        Nostr representation
        Resource identity
        discovery
        resolution
        installation
        publication
        synchronization
        archives
```

The Resource Boundary does not own all communication in the abstract.

It owns the application's defined Nostr Resource lifecycle.

---

# Technical Infrastructure

Technical Infrastructure provides capabilities used by architectural owners.

Examples include:

```text
Nostr relay connectivity
IndexedDB
HTTP
Blossom access
workers
gzip
SHA-256
signing support
```

Infrastructure answers:

> **How can this technical operation be performed?**

It does not answer:

> **What does this information mean?**

or:

> **Should this Resource become accepted local state?**

Those decisions belong elsewhere.

---

# Current Implementation State

The architecture documents describe the target ownership model.

The source code is currently being refactored toward that model.

Do not assume that existing file placement represents architectural ownership.

Historically, the client has been organized primarily by technical roles such as:

```text
components/
models/
modules/
services/
workers/
nostr/
```

Those directories may currently contain responsibilities belonging to several different architectural owners.

The ongoing refactor is moving toward ownership-oriented organization.

---

# Target Client Organization

The intended high-level structure is:

```text
client/src/lib/

    application/
        application coordination
        Workspace Runtime
        navigation
        events

    domains/
        bible/
        notes/
        reading-plans/
        settings/

    resource/
        Nostr Resource processing
        discovery
        resolution
        installation
        publishing
        synchronization
        archives

    infrastructure/
        Nostr transport
        persistence mechanics
        HTTP
        Blossom
        workers
        technical utilities

    components/
        genuinely shared presentation
```

This is a target direction.

The current repository may not yet fully match it.

---

# DDD in This Project

DDD here does not mean reproducing a standard folder template or creating a Repository, Factory, Aggregate, Manager, and Controller for every concept.

DDD primarily means:

```text
Meaning
    ↓
Ownership
    ↓
Boundary
    ↓
Code location
```

If Bible meaning gives a responsibility its purpose, that responsibility belongs to Bible.

If Notes meaning gives it purpose, it belongs to Notes.

If it exists to compose the study environment, it belongs to the Application Runtime.

If it implements the external Resource lifecycle, it belongs to the Resource Boundary.

If it only provides technical capability, it belongs to Infrastructure.

---

# Current Refactoring Rule

The structural refactor should preserve behavior wherever practical.

The preferred sequence is:

```text
Identify responsibility
        ↓
Identify owner
        ↓
Establish Public Boundary
        ↓
Move implementation
        ↓
Update dependencies
        ↓
Verify behavior
        ↓
Commit
```

Do not redesign working behavior merely because code is being moved.

Architecture alignment and behavioral change should remain separable whenever practical.

---

# Important Current Implementation Areas

Several existing areas require special attention during the refactor.

## `+page.svelte`

The application remains a single-route SPA.

`+page.svelte` currently contains substantial Workspace Runtime logic.

The target is for it to become primarily the SPA shell and rendering entry while Workspace behavior moves behind the Runtime boundary.

Do not replace the Pane-based interaction model with route-based navigation.

---

## Existing `modules/`

The Module concept remains valid.

Modules are Runtime presentation units.

During the refactor, Domain-specific Modules should become associated with their owning Domain rather than remaining one globally owned application concept.

---

## Existing `services/`

The global services area should be treated as a migration source.

For each service, determine:

```text
one Domain gives it meaning
    → Domain

cross-Domain coordination
    → Application

Resource lifecycle
    → Resource Boundary

pure technical capability
    → Infrastructure
```

Do not preserve global sharing merely because multiple files currently import a service.

---

## Existing `models/`

Models should move according to meaning.

Examples:

```text
Note
    → Notes

Reading Plan
    → Reading Plans

Pane
    → Workspace Runtime

Resource Representation
    → Resource Boundary
```

The long-term architecture does not require one global `models/` owner.

---

## Existing `nostr/`

Current Nostr code may mix:

* Domain-specific Resource behavior,
* Resource lifecycle behavior,
* and generic Nostr transport.

These responsibilities should be separated.

For example, Bible-specific chapter Resource interpretation belongs to Bible.

Generic Resource event processing belongs to the Resource Boundary.

Relay connectivity belongs to Infrastructure.

Do not simply rename the existing `nostr/` directory and assume the boundary has been fixed.

---

# Repository Areas

At a high level, the repository contains:

```text
docs/
    architecture and implementation documentation

client/
    SvelteKit browser application

relay/
    local Nostr relay implementation

blossom/
    external Resource-content service

data/
    application Resource source data

zarf/
    development and seed tooling
```

The client is an offline-first browser application.

The relay and Blossom service support the Resource lifecycle.

They are not the owners of application meaning.

---

# Client Runtime

The browser client uses SvelteKit but does not use server-side rendering as its application model.

The application behaves as an SPA.

Svelte is the presentation implementation.

The architectural model remains:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
    ↓
Domain
```

Framework structure should not be mistaken for application architecture.

---

# How To Navigate the Documentation

The recommended reading order is:

```text
PROJECT_CONTEXT.md
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

---

# Principles

The Principles explain **how architectural decisions are made**.

They establish concepts such as:

* ownership,
* loose coupling,
* architecture before implementation,
* Local Authority,
* and requesting data rather than storage location.

When interpreting an ambiguous design decision, start with the Principles.

---

# Application Architecture

The Application Architecture explains **how the application is organized and behaves**.

Important topics include:

```text
Domains
Public APIs
Data Access
Technical Infrastructure
Resource Boundary
Persistence
Application Startup
Background Processing
Module Presentation
User Interface
Application Events
Workspace Runtime
```

These specifications define ownership and collaboration.

---

# Resource Boundary

The Resource Boundary explains **how Domain information participates in the Nostr Resource lifecycle**.

Start with:

```text
00-resource-boundary-overview.md
```

and read through:

```text
11-resource-archives.md
```

The ADRs are intentionally ordered.

Later documents rely on decisions established earlier.

---

# Implementation Documentation

Implementation documents describe **how the current application realizes the architecture**.

These documents may describe concrete mechanisms such as:

* Workspace implementation,
* Runtime rendering,
* Nostr event processing,
* Resource Discovery implementation,
* Resource Resolution implementation,
* Resource Installation implementation,
* IndexedDB persistence,
* Outbox processing,
* Domain implementation mapping,
* and target code organization.

Implementation documents may change more quickly than architecture documents.

They must not silently redefine architecture.

---

# Refactoring Documentation

Two implementation documents are particularly important during the current restructuring:

```text
010-domain-implementation-map.md

011-target-code-organization.md
```

The Domain Implementation Map answers:

> **Which architectural owner should existing implementation responsibilities belong to?**

The Target Code Organization answers:

> **How should those owners become visible in the physical TypeScript/Svelte structure?**

Use those documents before performing broad file moves.

---

# Source Code

The source code is currently converging toward the documented architecture.

During the refactor, the following may all be true at the same time:

```text
architecture says where responsibility belongs

implementation docs describe the target

existing source still reflects older organization
```

Do not automatically infer architecture from current directories.

When implementation and architecture differ, first determine whether the source simply has not been migrated yet.

---

# Working Rules for Developers

When introducing or moving functionality:

1. Determine the owner.
2. Use the owner's Public API from outside that owner.
3. Keep Domain meaning out of Infrastructure.
4. Keep raw Nostr transport out of normal Domain behavior.
5. Keep Workspace layout behavior out of Domains.
6. Keep Resource lifecycle policy inside the Resource Boundary.
7. Keep persistence separate from ownership.
8. Preserve offline-first behavior.
9. Prefer incremental refactoring over repository-wide rewrites.
10. Do not invent architecture when an accepted specification already answers the question.

---

# Working Rules for AI Agents

AI agents working in this repository should treat the architecture documents as intentional constraints rather than suggestions.

Before proposing a new abstraction, first determine whether an existing owner already owns the responsibility.

Do not casually introduce:

```text
new Domain
new architectural layer
generic Manager
global Store
generic Service
shared module
new Resource identity concept
new synchronization mechanism
```

merely because such patterns are common elsewhere.

The project deliberately avoids architecture-by-template.

When working on implementation:

```text
read the relevant architecture
        ↓
identify ownership
        ↓
inspect current implementation
        ↓
determine migration gap
        ↓
change implementation
```

Do not redesign accepted architecture unless the requested implementation cannot satisfy it.

If a real conflict is discovered, surface the conflict explicitly.

---

# Architecture Is Authoritative

Accepted architecture documents should be treated as read-only unless a task explicitly asks to revise them.

Implementation work should attempt to satisfy the architecture before proposing an architecture change.

The fact that existing code behaves differently is not, by itself, evidence that the architecture should change.

The implementation is currently undergoing alignment.

---

# Useful Distinctions

Several distinctions recur throughout the project.

They are worth memorizing.

```text
Domain
    ≠
Module

Domain Object
    ≠
Resource

Resource
    ≠
Nostr Event

Published Resource Identity
    ≠
Event ID

Resource Integrity
    ≠
Domain Validity

Discovery
    ≠
Resolution

Resolution
    ≠
Installation

Installation
    ≠
Persistence

Publication
    ≠
Persistence

Last Write Wins
    ≠
automatic network authority

Background Execution
    ≠
ownership

Shared Use
    ≠
shared ownership
```

Many architectural mistakes come from collapsing one of these distinctions.

---

# The Complete Application Model

A useful high-level picture is:

```text
                            APPLICATION

User
 ↓
Workspace Runtime
 ↓
Pane
 ↓
Buffer
 ↓
Module Instance
 ↓
Domain Public API
 ↓
Domain
 ↓
Domain Objects
 │
 │ when external lifecycle is required
 ▼

===================== RESOURCE BOUNDARY =====================

Resource
 ↓
Resource Representation
 ↓
Nostr Event / Descriptor
 ↓
Nostr Relays + External Resource Content

=============================================================

Inbound information returns through:

Discovery
 ↓
Resolution
 ↓
Verified Resource Content
 ↓
Domain Interpretation
 ↓
Candidate Domain Object
 ↓
Domain Validation
 ↓
Installation
 ↓
Accepted Local Domain State
```

The Runtime owns the study environment.

Domains own application meaning.

The Resource Boundary owns the external Nostr Resource lifecycle.

Infrastructure provides the technical capabilities used to implement all three.

---

# How New Functionality Should Be Reasoned About

When adding functionality, reason in this order:

```text
What does this mean?
        ↓
Who owns that meaning?
        ↓
What responsibility is required?
        ↓
How should other owners collaborate with it?
        ↓
Does the information need an external Resource lifecycle?
        ↓
Which existing architecture applies?
        ↓
How should it be implemented?
```

Do not begin with the folder or framework feature.

Begin with meaning.

---

# Example — Bible Search

Question:

> Where does Bible Search belong?

Reasoning:

```text
What is being searched?
    Bible information

Who owns Bible information?
    Bible Domain

Therefore:
    Bible Search belongs to Bible
```

A shared search engine may still exist in Technical Infrastructure.

Technical reuse does not transfer application ownership.

---

# Example — Reading Plan Opens Scripture

Question:

> How should Reading Plans open a Bible chapter?

Reading Plans should not import Bible internals or mutate Workspace state directly.

Conceptually:

```text
Reading Plans
    ↓
Navigation Context / Shared Bible Location
    ↓
Workspace Runtime
    ↓
Bible Module
    ↓
Bible Public API
```

Each owner retains its responsibility.

---

# Example — Incoming Note Resource

Question:

> What happens when another device publishes an updated Note?

Conceptually:

```text
Nostr Publication
        ↓
Resource Discovery
        ↓
Resource Resolution
        ↓
Verified Note Resource Content
        ↓
Notes Domain Interpretation
        ↓
Candidate Note
        ↓
Notes Validation
        ↓
LWW Reconciliation if applicable
        ↓
Installation
        ↓
Accepted Local Note
```

The relay never directly writes a Note into accepted application state.

---

# Example — Offline Note Edit

Question:

> What happens when a user edits a Note while offline?

```text
User Edit
    ↓
Notes Domain
    ↓
Accepted Local Note
    ↓
Persist Local State
    +
Durable Publication Intent
    ↓
User Continues Working
```

Later:

```text
Connectivity
    ↓
Outbox
    ↓
Resource Representation
    ↓
Signed Nostr Event
    ↓
Relay
```

Offline behavior remains the default rather than an exception.

---

# What Should Remain Stable

The following concepts are intended to survive implementation changes:

```text
Domain ownership

Workspace → Pane → Buffer → Module Instance

Public APIs

Application Events

Resource Boundary

Resource Identity

Local Authority

Discovery / Resolution / Installation separation

durable Outbox publication

Last Write Wins synchronization

Resource Archives

offline-first behavior
```

Frameworks, libraries, adapters, directory details, and implementation patterns may change.

The responsibilities should change much more slowly.

---

# What Is Currently Changing

The source code is being refactored to better express the documented architecture.

The main direction is:

```text
technical-role organization

    components/
    models/
    modules/
    services/
    workers/
    nostr/

            ↓

ownership-oriented organization

    application/
    domains/
    resource/
    infrastructure/
    components/
```

This is intended as an incremental refactor.

The existing application is not being discarded.

Behavior should remain stable while ownership and dependency boundaries become explicit.

---

# What To Do When Something Is Unclear

When you encounter an unfamiliar piece of code:

```text
1. Determine what information or behavior it represents.

2. Identify the architectural owner.

3. Read that owner's architecture specification.

4. Check the Domain Implementation Map.

5. Check the Target Code Organization.

6. Inspect the current source implementation.

7. Decide whether the code is:
       already aligned,
       waiting to be migrated,
       or genuinely conflicting with architecture.
```

Do not infer a new architectural rule merely from legacy file placement.

---

# Documentation Authority

The documentation has different levels of purpose.

```text
Principles
    establish design rules

Application Architecture
    establishes ownership and collaboration

Resource Boundary ADRs
    establish Nostr Resource lifecycle contracts

Implementation Docs
    describe current and target implementation

Developer Guide
    describes development practice

Source Code
    realizes those decisions
```

Architecture is more stable than implementation.

Implementation documentation should evolve as the refactor progresses.

---

# Recommended Reading Path

For a developer or AI agent beginning work:

```text
1. PROJECT_CONTEXT.md

2. Principles

3. Application Architecture
       especially:
           Domains
           Public APIs
           Resource Boundary
           Persistence
           Module Presentation
           Application Events

4. Resource Boundary
       00 → 11 in order

5. Implementation
       Workspace Runtime
       Runtime Rendering
       Domain Implementation Map
       Target Code Organization
       relevant Resource implementation docs

6. Developer Guide

7. Source Code
```

It is usually unnecessary to memorize every document before making a small change.

Read this context first, then follow the ownership of the task into the relevant specifications.

---

# Key Takeaways

KJVOnly is an offline-first Bible study application built around one Application Architecture.

The architecture begins with meaning.

Meaning determines ownership.

Domains own application meaning.

The Workspace Runtime owns the study environment.

Modules present Domain capabilities.

Architectural owners collaborate through explicit Public APIs, Application Events, Shared Identifiers, and Navigation Context.

The Resource Boundary is part of the Application Architecture.

It defines how Domain information participates in a **Nostr-specific external Resource lifecycle**.

A Domain Object is not automatically a Resource.

A Resource is not a Nostr event.

A Nostr event does not automatically become accepted application state.

Published Resource Identity is:

```text
kind + publisher pubkey + d
```

while an event ID identifies one publication.

Incoming Resource information moves through:

```text
Discovery
    ↓
Resolution
    ↓
Domain Interpretation
    ↓
Domain Validation
    ↓
Installation
```

Local application information is accepted first and published independently through a durable Outbox.

Multi-device synchronization uses Last Write Wins while preserving Local Authority.

Resource Archives make Resources portable without turning them into arbitrary application backups.

Persistence implements durability but does not own application meaning.

Technical Infrastructure provides capabilities but does not own policy.

The source code is currently being incrementally refactored from technical-role organization toward ownership-oriented organization.

When source structure and architecture differ, do not assume the source structure is the intended architecture.

Start with ownership.

Then understand the current implementation.

Then refactor toward the documented boundary.

---

# Final Mental Model

If only one model is remembered, use this one:

```text
Meaning
    ↓
Domain Ownership
    ↓
Domain Objects
    ↓
Application Behavior

        ↕

Workspace Runtime
    composes interaction

        ↕

Resource Boundary
    gives selected Domain information
    an external Nostr Resource lifecycle

        ↕

Nostr / Relays / External Resource Content
```

The application remains locally authoritative and offline-first.

Nostr enables decentralized publication, discovery, and synchronization without becoming the application's internal model.

The implementation exists to realize these responsibilities.

> **Understand the owner first. The code becomes much easier to understand afterward.**
