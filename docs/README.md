# KJVOnly Documentation

The KJVOnly documentation is organized so that enduring concepts are understood before current implementation details.

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

Each layer answers a different question and should avoid taking over the responsibilities of another layer.

---

# Project Context

Start with:

```text
docs/PROJECT_CONTEXT.md
```

Project Context provides the mental model for the repository.

It explains:

* what KJVOnly is,
* how the Application Architecture is organized,
* how the Resource Boundary relates to the application,
* how Domains, Modules, Runtime concepts, and Resources fit together,
* and how the documentation layers relate to one another.

It is an orientation document, not a detailed specification or implementation guide.

---

# 00 Principles

The Principles define how architectural decisions are made.

They establish durable rules such as:

* ownership follows meaning,
* responsibilities should remain loosely coupled,
* local application state remains authoritative,
* responsibilities should be understood before implementation technologies,
* and consumers should request capabilities rather than depend on another owner's internal location.

Principles should remain more stable than either architecture or implementation.

---

# 01 Application Architecture

```text
docs/01_application-architecture/
```

The Application Architecture defines the application's enduring responsibilities and relationships.

It covers concepts such as:

* Workspace Runtime,
* Panes and Buffers,
* Module Presentation,
* Domains,
* Public APIs,
* Data Access,
* Technical Infrastructure,
* the Resource Boundary,
* Persistence,
* Startup,
* Background Processing,
* User Interface,
* and Application Events.

These documents describe **what the application owns and how responsibilities relate**.

They intentionally avoid describing the current source layout, framework wiring, concrete classes, storage schemas, or other implementation mechanics.

---

# 02 Resource Boundary

```text
docs/02_resource-boundary/
```

The Resource Boundary specification defines how Domain information participates in an external Resource lifecycle using Nostr.

It covers:

* the Domain / Resource model,
* Nostr Resource identity,
* Discovery Roots,
* Resource Discovery,
* Resource Resolution,
* Resource Installation,
* publication and the Outbox,
* multi-device synchronization,
* and Resource Archives.

The Resource Boundary is part of the application's architecture, but it is not a second Application Architecture.

The application operates on Domain Objects.

Resources are the externally distributable representation used when Domain information must be published, discovered, synchronized, shared, installed, or archived.

Nostr protocol details belong here when they define the Resource contract.

Current TypeScript, Worker, browser-storage, or service wiring belongs in Implementation instead.

---

# 03 Implementation

```text
docs/03_implementation/
```

Implementation documents explain how the current codebase realizes the architecture.

They may describe concrete details such as:

* runtime composition,
* current public code boundaries,
* Domain services and stores,
* Resource processing,
* Nostr integration,
* persistence,
* Workers,
* Outbox processing,
* browser APIs,
* UI behavior,
* tests,
* and tooling.

Implementation documentation is expected to evolve as the source changes.

When a current implementation document disagrees with the source, inspect the source and update the implementation document.

Do not silently rewrite architecture merely to match an accidental implementation detail.

---

# 05 Developer Guide

```text
docs/05_developer-guide/
```

The Developer Guide explains how contributors should work within the architecture and current codebase.

It covers practical development rules such as:

* ownership and import boundaries,
* public API conventions,
* change and refactoring workflow,
* testing,
* patch workflow,
* documentation placement,
* and validation expectations.

The Developer Guide may reference concrete repository conventions because its purpose is to guide contributors.

It should not redefine the architecture.

---

# Documentation Boundaries

Each documentation layer has a different job.

| Documentation | Primary Question |
| --- | --- |
| Project Context | **What is the overall mental model?** |
| Principles | **How should architectural decisions be made?** |
| Application Architecture | **What responsibilities make up the application?** |
| Resource Boundary | **How does Domain information participate in the external Resource lifecycle?** |
| Implementation | **How is the architecture realized today?** |
| Developer Guide | **How should contributors change the codebase safely?** |
| Source Code | **What does the application actually do today?** |

A useful rule is:

```text
Architecture defines responsibility.
Implementation records realization.
Developer guidance defines working conventions.
Source code provides the executable truth of the current implementation.
```

If a disagreement appears, first determine which layer owns the disputed statement.

Do not move implementation mechanics upward into architecture simply because they are current.

Do not leave implementation documentation stale when the source has already changed.

---

# Documentation Philosophy

The project is organized around enduring application meaning rather than temporary implementation technology.

The same progression appears throughout the documentation:

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

Reading the documentation in order makes the source easier to understand because implementation details are encountered only after their architectural purpose is known.
