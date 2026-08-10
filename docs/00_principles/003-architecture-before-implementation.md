# Architecture Before Implementation

## Status

Current

---

# Purpose

This document defines the design process used throughout the KJVOnly application.

Architecture should be established before implementation decisions are made.

Its purpose is to ensure new functionality is designed around enduring responsibilities and clear ownership rather than technologies, frameworks, or existing code.

---

# Principle

Software should be designed from responsibility to implementation.

Implementation is the final step of the design process, not the first.

By identifying ownership, defining behavior, and establishing Public APIs before writing code, the architecture remains stable while implementations continue to evolve.

---

# The Design Process

Every new responsibility should follow the same design process.

---

## 1. Identify the Responsibility

Begin by describing the responsibility being introduced.

Do not think about packages, classes, frameworks, or technologies.

Instead ask:

> **What responsibility is being added to the application?**

Responsibilities should describe behavior rather than implementation.

---

## 2. Determine Ownership

Once the responsibility is understood, determine who gives that responsibility meaning.

Ask:

> **Who owns this behavior?**

Responsibilities generally belong to one of three areas:

* the Application Runtime,
* a Domain,
* or Infrastructure.

Ownership should be determined before considering how the responsibility will be implemented.

---

## 3. Refine the Responsibility

Once ownership has been established, continue refining the responsibility.

If the owner is a Domain:

* Which Domain owns it?
* Does it belong to Bible?
* Notes?
* Reading Plans?
* Another Domain?

If the owner is the Application Runtime:

* Which runtime responsibility owns it?
* Workspace?
* Layout?
* Rendering?
* Navigation?

If the owner is Infrastructure:

* Which technical capability realizes it?
* Resource Boundary?
* Persistence?
* Networking?
* Background processing?

Continue refining the responsibility until its ownership is clear.

---

## 4. Define the Behavior

Before implementation begins, define the behavior that the owner is responsible for providing.

Describe:

* the responsibility,
* the expected behavior,
* and the Public API through which other responsibilities will collaborate.

At this stage the architecture is complete.

No implementation decisions should be required to describe the behavior.

---

## 5. Choose an Implementation

Only after the architecture has been established should implementation decisions be made.

Examples include:

* programming languages,
* frameworks,
* storage technologies,
* transport protocols,
* rendering techniques,
* networking libraries,
* serialization formats,
* and implementation patterns.

These technologies realize the architecture.

They do not define it.

---

# Design Flow

Conceptually:

```text
New Responsibility
        │
        ▼
Identify Responsibility
        │
        ▼
Determine Ownership
        │
        ▼
Refine Responsibility
        │
        ▼
Define Behavior
        │
        ▼
Define Public API
        │
        ▼
Choose Implementation
```

Each step builds upon the previous one.

Skipping steps often results in responsibilities being assigned according to implementation rather than meaning.

---

# Enduring Responsibilities

Implementation technologies naturally evolve over time.

Examples include:

* UI frameworks,
* storage technologies,
* transport protocols,
* rendering techniques,
* networking libraries,
* and serialization formats.

The responsibilities they realize generally remain unchanged.

For example, the application will continue to require:

* workspace management,
* layout generation,
* navigation,
* domain behavior,
* persistence,
* and resource resolution.

Implementations may change repeatedly throughout the life of the project.

The responsibilities should endure.

---

# Refactoring

Refactoring should improve implementations without changing architectural responsibilities.

Before replacing an implementation, verify that the responsibility and ownership remain unchanged.

If they do, the surrounding architecture should require little or no modification.

This allows implementations to evolve while preserving a stable conceptual model.

---

# Common Anti-Patterns

## Starting with Technology

Avoid beginning the design process by selecting a framework, protocol, library, or storage technology.

Technology should realize a responsibility rather than define it.

---

## Designing Around Existing Code

Avoid allowing the current implementation to determine the architecture.

Existing code is an implementation.

Responsibilities should remain independent of how they are currently realized.

---

## Naming by Implementation

Names should describe enduring responsibilities rather than implementation details.

Prefer:

* Workspace Runtime
* Resource Boundary
* Domain Objects
* Resource Resolution
* Layout Generation

Instead of:

* CSS Grid
* +page.svelte
* IndexedDB Wrapper
* Relay Client

Architectural discussions should begin with responsibilities rather than implementation.

---

## Defining APIs After Implementation

Public APIs should emerge from architectural responsibilities.

They should not be reverse-engineered from completed implementations.

---

# Big Takeaway

Architecture is the process of defining responsibilities before implementation.

Every implementation should exist to realize an already understood responsibility.

By following a consistent design process—

* identify the responsibility,
* determine ownership,
* refine the responsibility,
* define the behavior,
* expose a Public API,
* then choose an implementation—

the architecture remains stable while implementations continue to evolve.

The implementation may change.

The architecture should not.
