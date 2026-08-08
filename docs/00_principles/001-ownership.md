# Ownership

## Status

Current

---

# Purpose

This document defines the ownership model used throughout the KJVOnly application.

Ownership determines where responsibilities belong within the application.

It is intended to guide implementation decisions, package organization, and future refactoring efforts.

The goal is to organize code according to responsibility rather than technical role alone.

---

# Principle

Code should be organized by responsibility and ownership rather than by technical role alone.

A responsibility belongs to the part of the application that gives it meaning.

Its physical location within the repository is an implementation detail.

As the application evolves, packages and folders may change.

Ownership should remain stable.

---

# Ownership Models

The application is organized around four primary ownership models.

Each model has a distinct responsibility.

Understanding who owns a responsibility is more important than understanding where its implementation currently resides.

---

## Application Runtime

The Application Runtime owns the presentation and coordination of the application.

Examples include:

- workspace management,
- pane trees,
- buffers,
- layout,
- module composition,
- and user interaction.

The runtime understands how the application is presented.

It does not understand application data or resource distribution.

---

## Application Services

Application Services provide capabilities shared across multiple domains.

These services represent application-wide concepts that are not owned by any single domain.

Examples include:

- Bible location references,
- navigation,
- application settings,
- theme management,
- workspace services,
- pane services,
- and other shared application capabilities.

These responsibilities remain meaningful regardless of the underlying transport, storage, or networking implementation.

When introducing a new application service, consider whether the responsibility is shared across multiple domains.

If the responsibility exists to support several domains, it likely belongs as an Application Service.

---

## Domains

Domains own the application's business concepts.

Each domain owns:

- Domain Objects,
- business rules,
- domain operations,
- domain-specific services,
- and the modules that present those capabilities to the user.

Examples include:

- Bible,
- Notes,
- Reading Plans,
- and other application domains.

If a responsibility exists only to support a single domain, it should generally be owned by that domain.

Domains should not depend upon knowledge of unrelated domains.

---

## Technical Infrastructure

Technical Infrastructure owns the implementation technologies used to support the application.

Examples include:

- Nostr communication,
- Blossom integration,
- IndexedDB,
- background workers,
- compression,
- serialization,
- networking,
- and other implementation technologies.

Infrastructure provides capabilities required by the application.

It should not define application behavior.

---

# Ownership Test

When introducing a new abstraction, determine its owner before deciding where it should be implemented.

A useful heuristic is:

> **If the underlying implementation technology changed tomorrow, would this abstraction still exist?**

If the answer is **yes**, the responsibility likely belongs to the application.

If the answer is **no**, the responsibility likely belongs to the supporting infrastructure.

For example:

| Responsibility | Owner |
|-------------------------------|---------------------------|
| Workspace | Application Runtime |
| Pane | Application Runtime |
| Buffer | Application Runtime |
| Bible Reader Module | Bible Domain |
| Notes Module | Notes Domain |
| BibleLocationReferenceService | Shared Application |
| ThemeService | Shared Application |
| NavigationService | Shared Application |
| Relay Communication | Technical Infrastructure |
| Compression | Technical Infrastructure |
| Resource Serialization | Technical Infrastructure |

The purpose of this heuristic is not to determine the final package structure.

Its purpose is to identify ownership.

Once ownership is understood, the physical organization of the implementation becomes much easier to reason about.
---

# Ownership Heuristics

Determining ownership should occur before deciding where code is physically organized.

When introducing a new abstraction, identify the responsibility first.

The following heuristics provide a simple decision process for determining ownership.

## 1. Is it responsible for presenting or coordinating the user interface?

If the responsibility exists to present the application, manage layout, coordinate user interaction, or control the workspace, it belongs to the **Application Runtime**.

Examples include:

- workspace management,
- pane management,
- buffer management,
- layout generation,
- and module composition.

---

## 2. Is it a capability shared across multiple domains?

If the responsibility represents an application-wide concept used by multiple domains, it belongs to **Application Services**.

Examples include:

- Bible location references,
- navigation,
- theme management,
- application settings,
- and other shared application capabilities.

A useful question is:

> **Would multiple domains naturally depend upon this capability?**

If the answer is yes, it is likely an Application Service.

---

## 3. Is it only meaningful within a single domain?

If the responsibility exists solely to support one domain, it belongs to that domain.

Examples include:

- Bible parsing,
- Bible search ranking,
- note organization,
- reading plan generation,
- and other domain-specific behavior.

A useful question is:

> **Would another domain have any reason to depend upon this abstraction?**

If the answer is no, it should generally remain within the owning domain.

---

## 4. Is it primarily an implementation technology?

If the responsibility exists to communicate with external systems or provide technical capabilities, it belongs to **Technical Infrastructure**.

Examples include:

- relay communication,
- Blossom integration,
- IndexedDB,
- background workers,
- compression,
- serialization,
- and networking.

These responsibilities support the application but should not define its behavior.

---

These heuristics are intended to identify ownership rather than prescribe directory structure.

Ownership is an architectural decision. Physical organization is an implementation decision.
---

# Physical Organization

Ownership and physical location are related but not identical.

An abstraction may temporarily reside in a package that does not reflect its long-term ownership.

This is acceptable while the implementation evolves.

When refactoring, ownership should take precedence over existing directory structure.

Code should move toward its owner rather than remaining where it was originally implemented.

---

# Big Takeaway

Ownership is an architectural decision.

Packages, folders, and implementation technologies may evolve over time.

The owner of a responsibility should remain stable.

When ownership is clear, implementation decisions become simpler, refactoring becomes safer, and the application naturally evolves toward a cleaner and more maintainable design.