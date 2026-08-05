# KJVOnly Documentation

Welcome to the KJVOnly documentation.

The documentation is organized into several layers, each serving a different purpose.

The recommended reading order is:

```
Principles
    ↓
Application Architecture
    ↓
Resource Architecture
    ↓
Implementation
    ↓
Reference
```

Each layer builds upon the previous one.

---

# Principles

The Principles describe the architectural philosophy behind the project.

They establish the fundamental ideas used throughout the rest of the documentation.

Examples include:

* Ownership
* Shared Concepts
* Local Authority
* Request Data, Not Location

Read these first.

---

# Application Architecture

The Application Architecture describes how the client application is organized.

It explains:

* Workspace Runtime
* Domains
* Application Services
* Data Access
* Persistence
* Startup
* Background Processing
* and the relationships between them.

These documents describe responsibilities rather than implementation details.

---

# Resource Architecture

The Resource Architecture documents describe the decentralized resource model used by the application.

These Architecture Decision Records (ADRs) define:

* Published Resources
* Resource Identity
* Resource Resolution
* Installation
* Synchronization
* Discovery
* Publication
* and related architectural decisions.

Together they define the application's resource model.

---

# Implementation

The Implementation guides explain how the current codebase realizes the Application Architecture.

These documents describe implementation details such as:

* Workspace Runtime implementation
* Module development
* Presentation Stack
* Theme system
* Tailwind conventions
* Domain Store implementations
* and other platform-specific behavior.

Implementation documents may evolve as the codebase changes while preserving the architectural concepts defined elsewhere.

---

# Reference

Reference documentation contains factual information that developers frequently need to look up.

Examples include:

* Resource kinds
* Domain Objects
* Settings
* Storage keys
* Interfaces
* Events
* and other project-specific reference material.

Reference documents are intended for lookup rather than sequential reading.

---

# Documentation Philosophy

The documentation intentionally separates concepts from implementation.

Principles explain how to think.

Application Architecture explains how the application is organized.

Resource Architecture explains how published resources are managed.

Implementation explains how today's code realizes those architectures.

Reference provides the factual information needed during development.

Maintaining this separation allows the implementation to evolve while preserving a stable conceptual architecture.
