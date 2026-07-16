# ADR 0000 — Architecture Overview

**Status**

Accepted

---

# Purpose

This document introduces the architectural concepts that define KJVOnly.

It is intended to be read before the remaining Architecture Decision Records (ADRs).

The purpose of this document is not to describe implementation details, but to establish the vocabulary, guiding principles, and relationships used throughout the architecture.

Each subsequent ADR expands on one of the concepts introduced here.

---

# Design Philosophy

KJVOnly is built around a small set of architectural concepts.

Rather than introducing new abstractions for every feature, the architecture favors composing existing concepts into more capable systems.

The architecture is:

* Resource-oriented
* Offline-first
* Publisher-owned
* Manifest-driven
* Event-synchronized
* Strategy-based
* Composable

New capabilities should be expressed by combining existing concepts before introducing new ones.

This keeps the architecture small, understandable, and consistent over time.

---

# Core Concepts

## Resource

A resource is the fundamental unit of application data.

Resources have stable identities and may represent Bible text, overlays, notes, reading plans, search indexes, manifests, publisher metadata, or other application content.

Resources are identified independently of where they are stored or how they are transported.

---

## Manifest

A manifest describes a collection of resources.

It tells the application:

* what resources exist
* how they are resolved
* how they are verified
* how they should be installed

Manifests bootstrap application state.

---

## Publisher

Publishers own resources.

Ownership is determined by the publisher's public key.

Installing a resource never transfers ownership.

Users create independent ownership only by forking a resource.

---

## Domain Object

A domain object is the application's in-memory representation of a resource.

Domain objects contain application data only.

They do not expose protocol-specific structures.

---

## Domain Store

Domain stores contain the application's local state.

The user interface renders entirely from domain stores.

Synchronization and installation update domain stores.

---

## Event Model

The Event Model forms the boundary between the application and the Nostr protocol.

It translates between domain objects and Nostr events.

Application features never operate directly on raw Nostr events.

---

## Strategies

Strategies isolate behavior that varies independently.

Examples include:

* Storage Strategy
* Event Strategy
* Search Strategy

Using strategies allows new implementations without changing higher architectural layers.

---

# Architectural Layers

The architecture is composed of independent layers.

```text
Application
        ↓
Domain Stores
        ↓
Domain Objects
        ↓
Resources
        ↓
Event Model
        ↓
Nostr Protocol
```

Each layer communicates only with the adjacent layers.

Responsibilities are not shared across layers.

---

# Resource Lifecycle

Resources move through a predictable lifecycle.

```text
Publisher

↓

Trust

↓

Discovery

↓

Installation

↓

Auto Sync

↓

Fork (optional)

↓

Removal
```

Each stage represents an independent architectural decision.

Trust determines discovery.

Installation determines local availability.

Auto Sync determines update behavior.

Forking creates independent ownership.

---

# Installation Pipeline

Regardless of where resources originate, installation follows the same pipeline.

```text
Source

↓

Manifest

↓

Resolve Resources

↓

Download

↓

Verify

↓

Install

↓

Domain Stores
```

The source may be:

* Trusted publisher
* Archive
* Local file
* Future resource source

Only the source changes.

The installation pipeline remains the same.

---

# Application Lifecycle

The application becomes usable as soon as the current reading context is available.

Everything else continues independently.

```text
Open Application

↓

Initialize

↓

Render

↓

Background Services
```

Background services include:

* synchronization
* updates
* search indexing
* resource installation
* discovery

Application responsiveness always takes priority over background work.

---

# Ownership Model

Publisher-owned resources remain owned by their publisher.

Forking creates a new user-owned resource.

The original publisher resource remains unchanged.

```text
Publisher Resource
        │
        ├── Installed
        │
        └── Fork
                │
                ▼
        User-Owned Resource
```

Ownership is never transferred.

Only new ownership is created.

---

# Layer Responsibilities

Each architectural layer validates its own responsibilities.

Examples include:

* Event Model validates protocol structure.
* Event Strategies validate event types.
* Domain models validate application rules.
* Resource Installation validates downloads and installation completeness.

Validation is distributed throughout the architecture rather than centralized into a single subsystem.

---

# Guiding Principles

## Resource-Oriented Design

Everything important is represented as a resource.

---

## Stable Identity

Resources maintain stable identities.

Versions change.

Identity does not.

---

## Offline First

The application always prefers local operation.

Network connectivity enhances the application but should never be required for normal use.

---

## Separation of Concerns

Each architectural layer has one responsibility.

Responsibilities should not overlap.

---

## Composition Over New Concepts

Before introducing a new architectural concept, determine whether the capability can be expressed by composing existing concepts.

Prefer:

```text
Manifest

+

Resources

=

Archive
```

over inventing a separate backup architecture.

Architectural concepts should be reused before new ones are created.

---

## Strategy-Based Extensibility

Behavior that varies independently should be isolated behind strategy interfaces.

This allows storage providers, event formats, search implementations, and future extensions to evolve independently.

---

## Publisher Ownership

Resources always belong to their publisher.

Users modify publisher content by creating forks rather than editing publisher resources directly.

---

## Local First

The user interface renders from local domain stores.

Synchronization updates local state rather than driving the user interface directly.

---

# ADR Roadmap

The remaining ADRs expand upon the concepts introduced here.

| ADR  | Concept                             |
| ---- | ----------------------------------- |
| 0001 | Data Distribution Strategy          |
| 0002 | Domain, Resource, and Storage Model |
| 0003 | Manifest Events                     |
| 0004 | Resource Resolution                 |
| 0005 | Resource Discovery                  |
| 0006 | Resource Versioning                 |
| 0007 | IndexedDB Schema                    |
| 0008 | Sync / Outbox Strategy              |
| 0009 | Trusted Publishers                  |
| 0010 | Import / Export Format              |
| 0011 | Search Index Strategy               |
| 0012 | Resource Installation               |
| 0013 | Event Model                         |
| 0014 | Application Lifecycle               |
| 0015 | Resource Update Policy              |

---

# Big Picture

Every architectural decision in KJVOnly builds upon a small number of core concepts.

```text
Resources

↓

Manifests

↓

Discovery

↓

Installation

↓

Domain Stores

↓

Rendering

↓

Synchronization
```

The architecture favors composition over specialization.

By keeping the number of architectural concepts intentionally small, new capabilities can be added without increasing conceptual complexity, resulting in a system that remains understandable, maintainable, and extensible as it evolves.
