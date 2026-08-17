# KJVOnly Documentation

Welcome to the KJVOnly documentation.

KJVOnly is an offline-first Bible study application organized around **meaning, ownership, and explicit architectural responsibility**.

The documentation is structured so that a developer or AI agent can understand the project from the architectural model down to the current implementation without having to infer the design from the source tree.

Start with:

`PROJECT_CONTEXT.md`

That document provides the mental model for the entire repository.

---

# Recommended Reading Order

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
Reference  
↓  
Source Code

Each layer answers a different question.

---

# Project Context

`PROJECT_CONTEXT.md` is the entry point to the repository.

It explains:

- what KJVOnly is,
- how the major architectural concepts fit together,
- how Domains and the Workspace Runtime relate,
- what the Resource Boundary is,
- how Nostr participates in the architecture,
- how the current implementation relates to the target structure,
- and where to look next.

It is intended for:

- new developers,
- returning contributors,
- and AI agents working in the repository.

Read it before trying to infer architecture from the current source layout.

---

# 00 — Principles

The Principles define **how architectural decisions should be reasoned about**.

Important principles include:

- Ownership,
- Loose Coupling,
- Architecture Before Implementation,
- Local Authority,
- and Request Data, Not Location.

The central progression is:

Meaning  
↓  
Ownership  
↓  
Responsibility  
↓  
Public Boundary  
↓  
Implementation

The Principles should be consulted whenever ownership or architectural responsibility is unclear.

---

# 01 — Application Architecture

The Application Architecture defines **how the application is organized and behaves**.

KJVOnly has one Application Architecture.

It defines concepts including:

- Domains,
- Workspace Runtime,
- Panes,
- Buffers,
- Module Presentation,
- Public APIs,
- Data Access,
- Technical Infrastructure,
- Resource Boundary,
- Persistence,
- Application Startup,
- Background Processing,
- User Interface,
- Application Events,
- and repository ownership.

The application operates internally on Domain Objects.

Architectural owners collaborate through explicit boundaries rather than through shared implementation internals.

---

# 02 — Resource Boundary

The Resource Boundary defines:

> **How Domain information participates in an external Nostr Resource lifecycle.**

It is part of the Application Architecture.

It is not a separate Resource Architecture.

The Resource Boundary defines the relationship:

Domain Information  
↓  
Resource  
↓  
Resource Representation  
↓  
Nostr Event / External Content

and the reverse path back toward accepted local application state.

The Resource Boundary ADRs cover:

- Domain Resource Model,
- Data Distribution Strategy,
- Nostr Event Model,
- Nostr Resource Identity,
- Discovery Roots,
- Resource Discovery,
- Resource Resolution,
- Resource Installation,
- Outbox and Publishing,
- Multi-Device Synchronization,
- and Resource Archives.

Nostr is deliberately part of this specification.

Concepts such as:

- `pubkey`,
- event `kind`,
- `d` tags,
- `t` tags,
- `created_at`,
- event IDs,
- addressable-event semantics,
- relay filters,
- and signed events

are protocol contracts where the Resource Boundary depends on them.

The Resource Boundary is therefore not a generic communication abstraction with Nostr as one interchangeable implementation.

---

# Resource Boundary Reading Order

The Resource Boundary ADRs should be read sequentially:

- `00-resource-boundary-overview.md`
- `01-domain-resource-model.md`
- `02-data-distribution-strategy.md`
- `03-nostr-event-model.md`
- `04-nostr-resource-identity.md`
- `05-discovery-roots.md`
- `06-resource-discovery.md`
- `07-resource-resolution.md`
- `08-resource-installation-lifecycle.md`
- `09-outbox-and-publishing.md`
- `10-multi-device-synchronization.md`
- `11-resource-archives.md`

Each ADR owns one Resource lifecycle responsibility.

Later ADRs rely on concepts defined earlier rather than redefining them.

---

# Important Resource Boundary Rules

Several distinctions are fundamental:

Domain Object ≠ Resource

Resource ≠ Nostr Event

Published Resource Identity ≠ Event ID

Discovery ≠ Resolution

Resolution ≠ Installation

Resource Integrity ≠ Domain Validity

Installation ≠ Persistence

Publication ≠ Persistence

Last Write Wins ≠ automatic network authority

Published Resource Identity is:

`kind + publisher pubkey + d`

while the Nostr event ID identifies one signed publication.

The application remains authoritative over accepted local state:

> **The network proposes. The application decides.**

Local creation remains offline-first:

> **Accept locally first. Publish externally independently.**

---

# Implementation

Implementation documentation explains **how the current codebase realizes the documented architecture**.

Unlike architecture documents, implementation documents are expected to evolve as the source code changes.

Topics include:

- Workspace Runtime implementation,
- Runtime rendering,
- Domain implementation,
- Nostr event processing,
- Resource Discovery implementation,
- Resource Resolution implementation,
- Resource Installation implementation,
- application persistence,
- Outbox and publishing,
- and current refactoring direction.

Implementation mechanisms may include:

- TypeScript services,
- repositories,
- IndexedDB,
- Nostr libraries,
- workers,
- adapters,
- strategies,
- and concrete source files.

These mechanisms implement architecture.

They do not redefine it.

---

# Current Refactoring Guides

The client is currently being refactored from primarily technical-role organization toward architecture-oriented ownership.

Two implementation documents are especially important:

- `010-domain-implementation-map.md`
- `011-target-code-organization.md`

`010-domain-implementation-map.md` answers:

> **Which architectural owner should each implementation responsibility belong to?**

`011-target-code-organization.md` answers:

> **How should those owners be expressed in the physical TypeScript/Svelte structure?**

The target direction is approximately:

client/src/lib/

- `application/`
- `domains/`
- `resource/`
- `infrastructure/`
- `components/`

The current source tree may not yet fully match this structure.

Do not infer architectural ownership solely from current file placement.

---

# Developer Guide

The Developer Guide contains practical guidance for working in the repository.

Topics may include:

- repository workflow,
- coding conventions,
- testing,
- development setup,
- documentation practices,
- migration guidance,
- and contribution rules.

Developer documentation explains **how to work within the architecture**.

It does not define architectural ownership.

---

# Reference

Reference documentation contains project-specific information intended primarily for lookup.

Examples may include:

- Nostr kinds,
- Resource Types,
- Domain Objects,
- events,
- schemas,
- interfaces,
- settings,
- storage identifiers,
- and Public API references.

Reference documentation should not be treated as an architectural decision unless it points to the ADR that defines that decision.

---

# Repository Areas

At a high level, the repository contains:

- `docs/` — architecture and implementation documentation
- `client/` — SvelteKit offline-first browser application
- `relay/` — Nostr relay service
- `blossom/` — external Resource-content service
- `data/` — Resource source data
- `zarf/` — development and seed tooling

The client owns application behavior.

The relay and Blossom services provide capabilities used by the Resource lifecycle.

They do not own Domain meaning.

---

# Application Runtime

KJVOnly is a browser SPA.

Application interaction is not primarily route-driven.

The central Runtime model is:

Workspace  
↓  
Pane  
↓  
Buffer  
↓  
Module Instance  
↓  
Domain

Current primary Domains are:

- Bible
- Notes
- Reading Plans
- Settings

Search belongs to the Domain whose information is being searched.

Annotations belong to Bible.

Workspace is an Application Runtime concept rather than a Domain.

---

# Documentation Philosophy

The documentation progresses from stable concepts toward changing implementation.

| Documentation | Primary Question |
| --- | --- |
| Project Context | **What is this project and how should I think about it?** |
| Principles | **How should architectural decisions be made?** |
| Application Architecture | **Who owns application responsibilities and how do they collaborate?** |
| Resource Boundary | **How does Domain information participate in the Nostr Resource lifecycle?** |
| Implementation | **How is that architecture realized today?** |
| Developer Guide | **How should contributors work within the project?** |
| Reference | **What project-specific facts should be easy to look up?** |
| Source Code | **What currently implements those decisions?** |

Architecture should change much more slowly than implementation.

Implementation should move toward the documented architecture rather than causing architecture to be rediscovered from the source tree.

---

# Architecture Authority

Accepted architecture documents should normally be treated as authoritative unless a task explicitly revises them.

When source code and architecture appear to disagree:

1. Understand the architecture.
2. Inspect the implementation.
3. Determine whether the code is already aligned, awaiting migration, or genuinely incompatible.

Do not redesign the architecture merely because legacy implementation is organized differently.

---

# For Developers and AI Agents

Before changing code:

1. Identify what the behavior means.
2. Determine which architectural owner gives it that meaning.
3. Read the relevant architecture document.
4. Inspect the implementation documentation.
5. Examine the current source.
6. Refactor or implement through the owner's Public Boundary.

Avoid casually introducing new:

- Domains,
- architectural layers,
- global services,
- global stores,
- shared modules,
- Resource identity systems,
- or synchronization mechanisms

when an existing architectural owner already covers the responsibility.

---

# Where To Start

If you are new to the repository:

1. Read `PROJECT_CONTEXT.md`.
2. Read the Principles.
3. Read the relevant Application Architecture documents.
4. Read the Resource Boundary overview and the ADRs relevant to your task.
5. Read the corresponding implementation documentation.
6. Then inspect the source code.

You do not need to memorize the entire architecture before making a small change.

You do need to understand **who owns the responsibility you are changing**.

---

# Big Takeaway

KJVOnly is organized around one Application Architecture.

Domains own application meaning.

The Workspace Runtime owns the study environment.

The Resource Boundary defines the external **Nostr Resource lifecycle**.

Technical Infrastructure provides implementation capabilities.

The implementation is being incrementally refactored so that the source tree expresses those same ownership boundaries.

Meaning  
↓  
Ownership  
↓  
Responsibility  
↓  
Public Boundary  
↓  
Implementation

Start with the owner.

Then follow the documentation into the code.