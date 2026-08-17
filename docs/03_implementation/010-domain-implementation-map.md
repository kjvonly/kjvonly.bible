# Domain Implementation Map

**Status**

Refactoring Guide

---

# Purpose

This document maps the current KJVOnly implementation to the ownership model defined by the Application Architecture and Resource Boundary specifications.

Its purpose is to answer:

> **Which architectural owner should each existing implementation responsibility belong to during the refactor?**

This is not a new architecture specification.

The architecture is already defined.

This document translates those decisions into a practical migration map for the existing codebase.

---

# Refactoring Goal

The refactor should reorganize the existing application around explicit ownership without unnecessarily changing behavior.

The desired progression is:

```text
Current Implementation
        ↓
Identify Responsibility
        ↓
Identify Architectural Owner
        ↓
Move Behind Owner Boundary
        ↓
Preserve Existing Behavior
        ↓
Remove Obsolete Cross-Boundary Dependencies
```

The initial goal is structural clarity.

Behavioral redesign should happen separately unless the current behavior cannot satisfy the architecture.

---

# Ownership Model

Implementation ownership follows the principle:

> **Ownership is the assignment of responsibility to the part of the application that gives that responsibility meaning.**

KJVOnly uses four important implementation areas:

```text
Domains

Application

Resource Boundary

Technical Infrastructure
```

These areas collaborate but do not share ownership merely because code is reused.

---

# Domain Ownership

Domains own application meaning.

Current primary Domains are:

```text
Bible

Notes

Reading Plans

Settings
```

A Domain owns:

* its Domain Objects,
* Domain behavior,
* Domain validation,
* Domain-specific services,
* Domain-specific persistence behavior,
* Resource interpretation for its Domain information,
* Resource serialization for its Domain information,
* and presentation Modules whose behavior belongs primarily to that Domain.

A Domain does not own generic Nostr transport, Workspace layout, or shared technical infrastructure.

---

# Application Ownership

Application-level responsibilities coordinate multiple Domains or the application Runtime itself.

Current application responsibilities include:

```text
Workspace Runtime

Pane

Buffer

Module Instance lifecycle

cross-Domain navigation

shared application services

application settings coordination

application events
```

Application responsibilities must not absorb Domain behavior merely because several Domains use the application Runtime.

---

# Resource Boundary Ownership

The Resource Boundary owns the external Resource lifecycle.

Implementation responsibilities include:

```text
Nostr event processing

Resource Discovery

Resource Resolution

Resource Installation coordination

Outbox and publication

Multi-Device Synchronization

Resource Archives
```

The Resource Boundary does not own Domain meaning.

It coordinates with the owning Domain when Resource content must be interpreted, validated, serialized, or accepted.

---

# Technical Infrastructure Ownership

Technical Infrastructure supplies reusable capabilities.

Examples include:

```text
IndexedDB access

Nostr relay connections

HTTP access

Blossom access

compression

hashing

worker execution

generic event infrastructure
```

Infrastructure implements capabilities.

It does not determine Domain policy or Resource lifecycle policy.

---

# Current Repository Areas

The current client implementation primarily lives under:

```text
client/src/lib/
```

with existing organizational concepts including:

```text
components/
models/
modules/
services/
workers/
nostr/
```

These directories currently mix several different kinds of ownership.

The refactor should gradually replace organization by technical role with organization by architectural owner where appropriate.

---

# Target Ownership Model

Conceptually:

```text
client/src/lib/

    domains/
        bible/
        notes/
        reading-plans/
        settings/

    application/
        runtime/
        services/
        events/

    resource/
        nostr/
        discovery/
        resolution/
        installation/
        publishing/
        synchronization/
        archives/

    infrastructure/
        persistence/
        network/
        workers/

    components/
```

The exact physical layout is defined separately by the Target Code Organization document.

This document determines ownership rather than final folder names.

---

# Bible Domain

The Bible Domain owns Bible meaning and behavior.

Current responsibilities that should belong to Bible include:

| Responsibility                    | Target owner |
| --------------------------------- | ------------ |
| Bible chapter Domain Objects      | Bible        |
| Bible book/chapter/verse concepts | Bible        |
| Bible chapter retrieval behavior  | Bible        |
| Strong's-related Bible behavior   | Bible        |
| Bible annotations and highlights  | Bible        |
| Bible Search behavior             | Bible        |
| Bible-specific search indexes     | Bible        |
| Bible Resource interpretation     | Bible        |
| Bible Resource serialization      | Bible        |
| Bible Domain validation           | Bible        |
| Bible-specific persistence        | Bible        |

---

# Bible Chapter Module

The existing Bible reading Module remains a Module Instance presented through the Workspace Runtime.

Its application meaning belongs to Bible.

Conceptually:

```text
Workspace Runtime
        ↓
Module Instance
        ↓
Bible Module
        ↓
Bible Public API
        ↓
Bible Domain
```

The Module should not directly own:

* pane-tree mutation,
* Nostr queries,
* Resource Resolution,
* IndexedDB implementation,
* or cross-Domain behavior.

---

# Bible Search

Bible Search is a Bible capability.

It is not a standalone Search Domain.

Therefore:

```text
Bible Search
    → Bible
```

Search infrastructure may be shared technically, but:

```text
Bible query meaning
Bible indexing policy
Bible search results
```

remain Bible-owned.

A generic search engine or indexing library belongs to Technical Infrastructure when shared.

---

# Strong's

Strong's information currently supports Bible behavior.

Unless future requirements establish an independent Domain, Strong's-related application behavior belongs to Bible.

This includes:

```text
Strong's metadata interpretation

Strong's lookup

Strong's presentation associated with Bible text

Strong's Resource interpretation
```

Its Resource lifecycle still passes through the general Resource Boundary.

---

# Bible Annotations

Bible annotations, including verse and word highlights, belong to the Bible Domain.

They should not become an independent Annotation Domain.

Current behavior includes:

```text
verse highlight

word highlight

annotation lookup

annotation persistence

annotation publication
```

Domain meaning belongs to Bible.

Generic publication mechanics belong to the Resource Boundary.

---

# Notes Domain

Notes owns all application meaning associated with Notes.

Responsibilities include:

| Responsibility                | Target owner |
| ----------------------------- | ------------ |
| Note Domain Objects           | Notes        |
| Notes List behavior           | Notes        |
| Notes Search behavior         | Notes        |
| Note validation               | Notes        |
| Notes persistence             | Notes        |
| Notes Resource interpretation | Notes        |
| Notes Resource serialization  | Notes        |
| Notes-specific indexes        | Notes        |

---

# Notes List Module

The Notes List is a presentation Module for the Notes Domain.

Conceptually:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Notes List Module
    ↓
Notes Public API
```

The Module requests Notes behavior.

It should not manipulate Notes persistence directly.

---

# Notes Search

Notes Search belongs to Notes.

It is not part of a generic Search Domain.

Shared indexing machinery may be infrastructure, but:

```text
what is indexed

how Notes queries are interpreted

how Notes results are represented
```

belong to Notes.

---

# Notes Module Communication

Existing behavior where Notes Search causes Notes List to refresh should eventually cross an explicit application boundary.

The intended ownership relationship is:

```text
Notes Search
    ↓
Notes Domain change / query result
    ↓
Application Event or Notes API
    ↓
Notes List reacts
```

The exact event mechanism is implementation detail.

The important rule is that one Module should not become the owner of another Module.

---

# Reading Plans Domain

Reading Plans owns plan meaning and progression.

Responsibilities include:

| Responsibility               | Target owner  |
| ---------------------------- | ------------- |
| Reading Plan Domain Objects  | Reading Plans |
| plan definitions             | Reading Plans |
| reading progression          | Reading Plans |
| completed-reading state      | Reading Plans |
| plan validation              | Reading Plans |
| plan persistence             | Reading Plans |
| plan Resource interpretation | Reading Plans |
| plan Resource serialization  | Reading Plans |
| Reading Plan Modules         | Reading Plans |

---

# Completed Readings

Completed readings belong to Reading Plans.

Their independent Nostr Resource representation does not make them a separate Domain.

Conceptually:

```text
Reading Plans Domain
    owns
        Reading Plan
        Progress
        Completed Reading
```

Different Resource Types may represent these concepts externally without changing Domain ownership.

---

# Reading Plans to Bible Navigation

Reading Plans may cause navigation into Bible content.

Reading Plans should not reach into Bible internals.

The current Buffer Bag/navigation-context mechanism provides an appropriate application-level collaboration boundary.

Conceptually:

```text
Reading Plans
    ↓
Navigation Context
    ↓
Workspace Runtime
    ↓
Bible Module
    ↓
Bible Domain
```

The navigation request may include a shared Bible location reference.

The Reading Plans Domain does not perform Bible retrieval itself.

---

# Settings Domain

Settings owns application preferences that have Domain meaning.

Examples may include:

```text
theme-related application settings

user preferences

other durable configurable behavior
```

Not every setting necessarily becomes a Resource.

Local-only preferences remain local unless the Domain deliberately gives them an external Resource representation.

---

# Workspace Runtime

The Workspace Runtime is an Application responsibility.

It owns:

```text
Workspace

Pane tree

Pane splitting

Pane closing

Buffer lifecycle

Module Instance placement

layout composition

Runtime restoration coordination
```

It does not own Domain behavior.

---

# Workspace

The Workspace represents the active arrangement of application interaction.

The current application effectively uses the root Pane tree as its Workspace.

Future named Workspace snapshots remain an Application Runtime feature.

Workspace state should not be moved into a Domain merely because it is persisted.

---

# Pane

Pane is an Application Runtime object.

Current Pane behavior includes:

```text
identity

left/right child relationships

split orientation

Buffer association

replacement

closing

layout participation
```

Pane logic should eventually be moved out of `+page.svelte` and behind the Workspace Runtime boundary.

---

# Buffer

Buffer is an Application Runtime abstraction.

It connects a Pane with a Module Instance and its navigation context.

Conceptually:

```text
Pane
    ↓
Buffer
    ├── Navigation Context
    └── Module Instance
```

Buffer must remain Domain-agnostic.

A new Domain Module should not require changes to Buffer semantics merely because its navigation payload differs.

---

# Navigation Context

The existing Buffer Bag concept is application-level navigation context.

Examples include:

```text
Bible location reference

Reading Plan queue

Module initialization information
```

Navigation Context transfers initialization information.

It should not become a general cross-Domain dependency container.

---

# Module Instance

A Module Instance is a Runtime/presentation unit hosted by a Buffer.

Examples include:

```text
Bible Reading

Bible Search

Notes List

Notes Search

Reading Plan
```

A Module Instance:

* presents Domain behavior,
* calls the owning Domain's Public API,
* participates in Workspace Runtime,
* and may request navigation/layout changes.

It does not own:

* Workspace layout,
* another Domain,
* generic persistence,
* or Resource transport.

---

# Pane Service

The Pane Service is an Application service.

Modules may request Runtime operations such as:

```text
open another Pane

replace current Buffer

navigate to another Module

split layout
```

through the Pane/Workspace API.

Domains should not directly manipulate the Pane tree.

---

# Bible Location Reference

The Bible Location Reference is shared between more than one owner.

It is currently used by Bible and Reading Plans.

Therefore it should remain an Application-level shared identifier/value rather than become private Reading Plans infrastructure.

Conceptually:

```text
Reading Plans
        ↓
Bible Location Reference
        ↓
Application Navigation
        ↓
Bible
```

Its interpretation as an actual Bible location ultimately belongs to Bible.

---

# Application Events

Cross-owner notification should use Application Events where the meaning is:

> **This happened.**

Examples may include:

```text
Note changed

Workspace changed

Domain information accepted
```

Events should not become command APIs.

If a caller means:

> **Please do this**

it should normally call the owner's Public API instead.

---

# Current `services/`

The existing shared `services/` directory should be treated as a migration source rather than a permanent architectural owner.

Each service should be classified by meaning.

Use:

```text
Does one Domain give this service meaning?
    → move to that Domain

Does it coordinate multiple Domains?
    → Application service

Does it implement the Resource lifecycle?
    → Resource Boundary implementation

Does it only provide a technical capability?
    → Technical Infrastructure
```

The existence of multiple consumers is not sufficient reason to keep a service globally shared.

---

# Current `models/`

The existing `models/` directory should be decomposed by ownership.

A model belongs with the owner that gives it meaning.

Examples:

```text
Bible model
    → Bible

Note model
    → Notes

Reading Plan model
    → Reading Plans

Pane / Buffer model
    → Application Runtime

Resource representation model
    → Resource Boundary
```

Avoid maintaining one global application `models/` directory merely because all entries are TypeScript data structures.

---

# Current `modules/`

The current Module organization should be retained conceptually but aligned with Domain ownership.

Modules remain Runtime presentation units.

They should live near or clearly reference their owning Domain.

Conceptually:

```text
Bible
    modules/
        reading
        search

Notes
    modules/
        list
        search

Reading Plans
    modules/
        plans
```

The final physical structure is defined by the Target Code Organization document.

---

# Current `nostr/`

The existing `nostr/` implementation currently includes both generic Nostr behavior and Domain-aware Resource access.

These responsibilities should be separated.

---

# Generic Nostr Infrastructure

Generic relay/protocol capabilities belong to Technical Infrastructure or the Resource Boundary implementation.

Examples include:

```text
relay connections

REQ execution

AUTH handling

event verification

event publication

Nostr filter transport
```

These components should not understand Bible, Notes, or Reading Plans.

---

# Resource-Specific Nostr Processing

Resource lifecycle behavior belongs to the Resource Boundary implementation.

Examples include:

```text
Resource event parsing

Resource Discovery

Resource Resolution

Outbox publication

Resource synchronization
```

These components understand the Resource protocol contract but not Domain-specific meaning.

---

# Domain Resource Mapping

Domain-specific Resource interpretation belongs to the owning Domain.

For example, existing code such as:

```text
nostr/events/chapters.nostr.ts
```

contains Bible-specific Resource knowledge.

Its responsibility should ultimately be divided between:

```text
generic Resource/Nostr mechanics
        → Resource Boundary

chapter meaning / serialization
        → Bible Domain
```

The final implementation should avoid a generic `nostr/events/` folder becoming the owner of Domain knowledge.

---

# Existing Offline API

The current offline Nostr abstraction provides useful behavior around:

```text
cache hits

synced state

unsynced state

event retrieval
```

During refactoring, it should be decomposed according to responsibility rather than renamed wholesale.

Potential ownership:

```text
generic local/network retrieval coordination
    → Resource Boundary / Application Data Access

Domain interpretation
    → owning Domain

IndexedDB mechanics
    → Technical Infrastructure

synchronization decisions
    → Resource Synchronization

publication durability
    → Outbox
```

---

# Resource Discovery

Resource Discovery belongs to the Resource Boundary implementation.

It owns:

```text
Nostr discovery inputs

relay filter construction

multi-relay result handling

Published Resource grouping

current publication selection

bounded recursive discovery
```

It must not own Domain interpretation or Installation.

---

# Resource Resolution

Resource Resolution belongs to the Resource Boundary implementation.

It owns:

```text
content representation handling

descriptor retrieval

descriptor collection handling

Blossom / HTTP retrieval coordination

integrity verification

resolution failures
```

Provider-specific network access may be implemented by infrastructure adapters.

---

# Resource Installation

Resource Installation belongs to the Resource Boundary as an acceptance coordinator.

Its implementation coordinates:

```text
Verified Resource Content
        ↓
Owning Domain Interpretation
        ↓
Candidate Domain Objects
        ↓
Domain Validation
        ↓
Installation Decision
        ↓
Accepted Local State
```

Domain-specific parsing does not move into generic Installation infrastructure.

---

# Resource Publishing

Publication responsibilities divide cleanly.

```text
Domain
    determines what information means
    and how it becomes Resource content

Resource Boundary
    creates publication intent
    and Resource representation lifecycle

Nostr processing
    creates/signs protocol event

Outbox
    durably publishes

Infrastructure
    communicates with relays
```

No single service needs to own the entire path.

---

# Outbox

The Outbox belongs to the Resource Boundary implementation.

It owns:

```text
durable publication intent

pending publication state

retry

publication status

safe coalescing

restart recovery
```

It does not own synchronization conflict resolution.

---

# Multi-Device Synchronization

Synchronization belongs to the Resource Boundary implementation.

It owns:

```text
same-Resource reconciliation

Last Write Wins comparison

modifiedAt / created_at ordering

remote/local candidate selection

superseding stale publication intent where appropriate
```

It still relies on Installation for acceptance.

---

# Resource Archives

Resource Archive behavior belongs to the Resource Boundary implementation.

It owns:

```text
.kjva envelope

Resource entry export

Resource entry import

archive versioning

portable serialized Resource content
```

It does not own arbitrary application backup.

---

# Persistence

Persistence is implementation infrastructure used by architectural owners.

The physical mechanism is expected to remain IndexedDB in the browser application.

Ownership follows the information being persisted.

Examples:

```text
Bible records
    → Bible-owned persistence

Notes records
    → Notes-owned persistence

Reading Plan records
    → Reading Plans-owned persistence

Workspace snapshots
    → Application Runtime persistence

Resource installation metadata
    → Resource Boundary persistence

Outbox
    → Resource Boundary persistence
```

A shared IndexedDB database does not imply shared ownership.

---

# Workers

Workers are execution mechanisms.

A worker does not become an architectural owner merely because work runs inside it.

Classify worker behavior by responsibility:

```text
Bible indexing worker
    → Bible behavior executed in worker infrastructure

Resource download worker
    → Resource Resolution behavior executed in worker infrastructure

Outbox worker
    → Publishing behavior executed in worker infrastructure
```

> **Execution changes. Ownership does not.**

---

# Components

Generic visual components may remain under shared `components/` when they contain no Domain meaning.

Examples:

```text
buttons

menus

layout primitives

generic dialogs
```

Domain-specific components should remain associated with their Domain or Module.

A component should not become globally shared merely because it could theoretically be reused.

---

# Current `+page.svelte`

`+page.svelte` currently acts as the SPA shell and contains significant Workspace Runtime behavior.

Current responsibilities include:

```text
root Pane tree management

split handling

close handling

Buffer replacement

Workspace reorganization

Runtime restoration

recursive pane rendering coordination
```

The long-term direction is to reduce `+page.svelte` to an application shell.

Workspace behavior should move behind the Workspace Runtime API while rendering remains in Svelte.

Conceptually:

```text
+page.svelte
    ↓
Workspace Runtime
    ↓
Pane Tree
    ↓
Buffer
    ↓
Module Instance
```

This extraction should be performed incrementally.

---

# Target Dependency Direction

The refactor should move toward:

```text
UI / Module
    ↓
Owner Public API
    ↓
Domain or Application Owner
    ↓
Persistence / Resource Boundary when required
    ↓
Technical Infrastructure
```

Avoid:

```text
UI
    ↓
IndexedDB

Domain
    ↓
raw Nostr relay

Domain A
    ↓
Domain B internals

Resource infrastructure
    ↓
Workspace Runtime
```

---

# Domain-to-Domain Dependencies

One Domain should not import another Domain's private implementation.

Preferred collaboration mechanisms are:

```text
Public API

Application Event

Shared Identifier

Navigation Context
```

The mechanism should match the interaction semantics.

---

# Public API Rule

If one owner requires another owner to perform behavior:

```text
Consumer
    ↓
Public API
    ↓
Owner
```

Do not bypass the owner because an internal repository, Store, service, or model is easier to import.

---

# Event Rule

Use an Application Event for completed facts:

```text
"This happened."
```

Do not use events merely to avoid calling a Public API.

Commands remain explicit behavior requests.

---

# Resource Boundary Rule

Domains should not directly depend on Nostr transport.

Preferred direction:

```text
Domain
        ↕
Resource Mapping / Acceptance
        ↕
Resource Boundary
        ↕
Nostr Infrastructure
```

This keeps Domain behavior independent of relay availability and protocol libraries.

---

# Migration Classification

Every file moved during the refactor should first be classified into one of these ownership categories:

| Category            | Question                                                  |
| ------------------- | --------------------------------------------------------- |
| Bible               | Does Bible meaning give this code its purpose?            |
| Notes               | Does Notes meaning give this code its purpose?            |
| Reading Plans       | Does plan/progression meaning give this code its purpose? |
| Settings            | Does settings behavior give this code its purpose?        |
| Workspace Runtime   | Does it compose Pane/Buffer/Module interaction?           |
| Application Service | Does it coordinate multiple owners?                       |
| Resource Boundary   | Does it implement the external Resource lifecycle?        |
| Infrastructure      | Does it provide a reusable technical capability?          |
| Shared UI           | Is it presentation with no Domain meaning?                |

If ownership cannot be identified, that ambiguity should be resolved before moving the file.

---

# Initial Migration Inventory

The following high-level migration map should guide the first pass.

| Current area                           | Target ownership                                   |
| -------------------------------------- | -------------------------------------------------- |
| Bible Module                           | Bible                                              |
| Bible Search Module                    | Bible                                              |
| Strong's behavior                      | Bible                                              |
| Bible annotations                      | Bible                                              |
| Notes List                             | Notes                                              |
| Notes Search                           | Notes                                              |
| Reading Plans                          | Reading Plans                                      |
| Completed readings                     | Reading Plans                                      |
| `bibleLocationReferenceService`        | Application/shared                                 |
| Pane service                           | Workspace Runtime                                  |
| Pane/Buffer models                     | Workspace Runtime                                  |
| Workspace management in `+page.svelte` | Workspace Runtime                                  |
| Domain models in global `models/`      | respective Domain                                  |
| shared Domain services in `services/`  | respective owner                                   |
| `chapters.nostr.ts`                    | split Bible mapping / Resource Boundary mechanics  |
| `offline.nostr.ts`                     | split Resource/Data Access/Infrastructure concerns |
| relay connection code                  | Infrastructure                                     |
| Resource Discovery                     | Resource Boundary                                  |
| Resource Resolution                    | Resource Boundary                                  |
| Resource Installation                  | Resource Boundary                                  |
| Outbox                                 | Resource Boundary                                  |
| Synchronization                        | Resource Boundary                                  |
| Archives                               | Resource Boundary                                  |
| IndexedDB implementation               | Infrastructure                                     |
| Domain persistence interfaces          | respective Domain                                  |
| generic workers                        | Infrastructure execution                           |
| Domain worker behavior                 | respective Domain                                  |

---

# Refactoring Rules

The implementation refactor should follow these rules.

## Preserve behavior first

Moving responsibility should not automatically change behavior.

```text
Move
    ↓
Compile
    ↓
Test
    ↓
Commit
```

Behavioral changes should be deliberate follow-up work.

---

## Move one owner at a time

Avoid a repository-wide directory rewrite.

Prefer vertical slices such as:

```text
Bible
    ↓
Notes
    ↓
Reading Plans
    ↓
Workspace Runtime
    ↓
Resource Boundary
```

Each slice should leave the application working.

---

## Introduce boundaries before deleting compatibility code

When existing code violates the target dependency direction:

1. introduce the target Public API,
2. move consumers to it,
3. move implementation behind it,
4. remove the obsolete direct dependency.

Do not move everything at once and repair imports afterward.

---

## Do not create abstractions solely for the refactor

The architecture does not require every owner to contain:

```text
Factory
Repository
Manager
Controller
Strategy
Store
```

Introduce abstractions only where the implementation needs them.

DDD organization is about ownership and Domain meaning, not reproducing a standard folder template.

---

# Refactor Completion Criteria

The structural refactor is substantially complete when:

```text
Domain behavior is located with its Domain.

Modules interact through Domain Public APIs.

Workspace Runtime owns Pane/Buffer composition.

Domains no longer depend directly on Nostr transport.

Resource Boundary implementation no longer owns Domain meaning.

Persistence follows architectural ownership.

Cross-Domain imports respect Public APIs.

Technical Infrastructure contains technical capability,
not application policy.

+page.svelte acts primarily as the SPA shell/rendering entry.

Global technical-role directories no longer obscure ownership.
```

---

# What This Document Does Not Define

This document does not define:

* final directory names,
* exact TypeScript interfaces,
* repository APIs,
* Domain Object schemas,
* IndexedDB schema,
* individual migration commits,
* dependency-injection strategy,
* testing framework,
* or Resource protocol behavior.

Those concerns are either already defined by architecture specifications or belong to implementation work.

The physical target structure is defined by:

```text
011-target-code-organization.md
```

---

# Big Takeaway

The refactor is not primarily about moving files into a `domains/` directory.

It is about making ownership visible in the implementation.

```text
Responsibility
    ↓
Owner
    ↓
Public Boundary
    ↓
Implementation
```

Bible meaning belongs to Bible.

Notes meaning belongs to Notes.

Reading Plan meaning belongs to Reading Plans.

Workspace composition belongs to the Application Runtime.

The external Resource lifecycle belongs to the Resource Boundary.

Generic technical capability belongs to Infrastructure.

> **Move code to the owner that gives the code meaning, then enforce that ownership through dependencies.**
