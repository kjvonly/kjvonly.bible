# KJVOnly Documentation

Welcome to the KJVOnly documentation.

The documentation is organized into layers.

Each layer answers a different question about the project and builds upon the previous one.

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
Developer Guide
    ↓
Reference
```

---

# Documentation Overview

## 00 Principles

The Principles define the architectural philosophy used throughout the project.

They explain how design decisions are made without describing any specific implementation.

Typical topics include:

* Ownership
* Shared Concepts
* Local Authority
* Responsibility Before Implementation
* Request Data, Not Location

Read these first.

---

## 01 Application Architecture

The Application Architecture describes how the application is organized.

These documents define the responsibilities and relationships between the application's major architectural subsystems, including:

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
* Application Events

These documents intentionally describe architecture rather than implementation.

---

## 02 Resource Architecture

The Resource Architecture defines the decentralized Resource model used by the application.

These Architecture Decision Records (ADRs) describe:

* Published Resources
* Resource Identity
* Resource Resolution
* Resource Installation
* Resource Synchronization
* Discovery
* Publication
* and related architectural decisions.

The Resource Architecture is independent from any specific application or service implementation.

---

## 03 Service Architecture

The Service Architecture describes how the project's backend services realize the Resource Architecture.

These documents describe:

* Relay Architecture
* Blossom Architecture
* Authentication
* Resource publication
* Resource retrieval
* Storage services
* Deployment
* Service boundaries

These services are implementations of the Resource Architecture rather than requirements of it.

---

## 04 Implementation

Implementation documents explain how the current codebase realizes the documented architectures.

These documents describe implementation details such as:

* Runtime implementation
* Module implementation
* Presentation stack
* Domain stores
* Persistence
* UI implementation
* Service implementation
* Platform integration

Implementation documents may evolve as the code evolves while preserving the architectural concepts defined elsewhere.

---

## 05 Developer Guide

The Developer Guide explains how contributors should work within the existing architecture.

These documents establish development conventions that help maintain consistency across the project.

Typical topics include:

* Repository organization
* Coding standards
* Testing
* Documentation
* Development workflow
* Contribution guidelines

These documents are intended for developers contributing to the project rather than describing the application's architecture.

---

## 06 Reference

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

The documentation intentionally separates concepts from implementation.

Each section answers a different question.

| Documentation            | Primary Question                                                                 |
| ------------------------ | -------------------------------------------------------------------------------- |
| Principles               | **How should we think?**                                                         |
| Application Architecture | **How is the application organized?**                                            |
| Resource Architecture    | **How are Resources modeled?**                                                   |
| Service Architecture     | **How do the project services realize the Resource Architecture?**               |
| Implementation           | **How is the architecture implemented today?**                                   |
| Developer Guide          | **How should contributors work within the project?**                             |
| Reference                | **What project-specific information should developers be able to quickly find?** |

Maintaining these boundaries allows the implementation to evolve while preserving a stable conceptual architecture.

Developers new to the project should read the documentation in the order presented above.

Each layer provides the foundation for understanding the layers that follow.
