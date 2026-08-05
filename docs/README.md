# KJVOnly Documentation

Welcome to the KJVOnly documentation.

The documentation is organized into several layers.

Each layer builds upon the previous one and serves a different purpose.

The recommended reading order is:

```text
Principles
    ↓
Application Architecture
    ↓
Resource Architecture
    ↓
Service Architecture
    ↓
Implementation
    ↓
Reference
```

---

# Principles

The Principles describe the design philosophy used throughout the project.

They explain how architectural decisions are made.

Examples include:

* Ownership
* Shared Concepts
* Responsibility Before Implementation
* Local Authority
* Capabilities Before Technologies
* Request Data, Not Location

Read these first.

---

# Application Architecture

The Application Architecture describes how the application is organized.

It explains:

* Workspace Runtime
* Runtime Rendering
* Domains
* Application Services
* Data Access
* Technical Infrastructure
* Resource Integration
* Persistence
* Startup
* Background Processing
* Module Presentation
* User Interface

These documents define application responsibilities rather than implementation details.

---

# Resource Architecture

The Resource Architecture describes the decentralized resource model used by the application.

These documents define:

* Published Resources
* Resource Identity
* Resource Resolution
* Resource Installation
* Resource Synchronization
* Discovery
* Publication
* and other architectural decisions governing Resources.

The Resource Architecture is independent from any specific application or service implementation.

---

# Service Architecture

The Service Architecture describes how the project's services realize the Resource Architecture.

These documents explain:

* Relay Architecture
* Blossom Architecture
* Authentication
* Resource publication
* Resource retrieval
* Storage services
* Deployment
* Service boundaries

The services documented here are the project's current implementation.

Alternative service implementations may provide the same Resource Architecture.

---

# Implementation

The Implementation guides describe how the current codebase realizes the documented architectures.

Examples include:

* Workspace Runtime implementation
* Module development
* Presentation Stack
* Theme system
* Tailwind conventions
* Domain Store implementations
* Relay implementation
* Blossom implementation
* Platform integration

Implementation documents describe the current code.

They may evolve without changing the architectural concepts defined elsewhere.

---

# Reference

Reference documentation contains factual information used during development.

Examples include:

* Resource kinds
* Domain Objects
* Events
* Interfaces
* Storage keys
* Settings
* Schemas
* Public APIs

Reference documentation is intended for lookup rather than sequential reading.

---

# Documentation Philosophy

The documentation intentionally separates architectural concepts from implementation details.

Each section answers a different question.

| Documentation            | Primary Question                                                   |
| ------------------------ | ------------------------------------------------------------------ |
| Principles               | **How should we think?**                                           |
| Application Architecture | **How is the application organized?**                              |
| Resource Architecture    | **How are Resources modeled?**                                     |
| Service Architecture     | **How do the project services realize the Resource Architecture?** |
| Implementation           | **How does today's code realize these architectures?**             |
| Reference                | **What facts should developers be able to quickly look up?**       |

Maintaining these boundaries allows the implementation to evolve while preserving a stable conceptual architecture.

The result is a documentation system that explains not only how the project is built today, but also the principles and architectural models that guide its future evolution.
