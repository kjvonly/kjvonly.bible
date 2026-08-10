# Ownership

## Status

Current

---

# Purpose

This document defines the ownership model used throughout the KJVOnly application.

Ownership determines where responsibilities belong before implementation decisions are made.

Its purpose is to guide architectural decisions, package organization, and future refactoring by ensuring every responsibility has a clear architectural owner.

---

# Principle

Code should be organized according to responsibility and ownership rather than technical role alone.

Every responsibility belongs to the part of the application that gives it meaning.

Its physical location within the repository is an implementation detail.

As the application evolves, packages, folders, and implementation technologies may change.

Ownership should remain stable.

---

# Architectural Owners

The application is organized around three architectural owners.

Each owner has a distinct responsibility.

Understanding who owns a responsibility is more important than understanding where it is currently implemented.

---

## Application Runtime

The Application Runtime owns the presentation and coordination of the application.

Examples include:

* workspace management,
* pane trees,
* buffers,
* layout,
* module composition,
* and user interaction.

The Runtime understands how the application is presented.

It does not own application behavior or communication with external systems.

---

## Domains

Domains own the application's business concepts.

Each Domain owns:

* Domain Objects,
* business rules,
* domain operations,
* Public APIs,
* and the behavior presented to the user.

Examples include:

* Bible,
* Notes,
* Reading Plans,
* Settings,
* and future application domains.

If another architectural owner requires behavior owned by a Domain, that behavior should be accessed through the Domain's Public API.

Ownership does not change simply because another owner needs to collaborate with it.

---

## Infrastructure

Infrastructure provides the technical capabilities required to realize the application.

Examples include:

* Resource Boundary implementations,
* Nostr communication,
* Blossom integration,
* IndexedDB,
* background workers,
* compression,
* serialization,
* networking,
* and other implementation technologies.

Infrastructure exists to support the application.

It should not define application behavior or architectural ownership.

---

# Ownership Test

When introducing a new abstraction, determine its owner before deciding how it should be implemented.

A useful heuristic is:

> **If the implementation technology changed tomorrow, would the application still require this responsibility?**

If the answer is **yes**, the responsibility belongs to the application.

If the answer is **no**, it belongs to the supporting infrastructure.

For example:

| Responsibility                   | Owner                |
| -------------------------------- | -------------------- |
| Workspace                        | Application Runtime  |
| Pane                             | Application Runtime  |
| Buffer                           | Application Runtime  |
| Bible Reader Module              | Bible Domain         |
| Bible Search                     | Bible Domain         |
| Notes                            | Notes Domain         |
| Reading Plans                    | Reading Plans Domain |
| Resource Boundary Implementation | Infrastructure       |
| Relay Communication              | Infrastructure       |
| Compression                      | Infrastructure       |
| Resource Serialization           | Infrastructure       |

The purpose of this heuristic is not to determine the final package structure.

Its purpose is to identify ownership.

Once ownership is understood, implementation decisions become significantly easier.

---

# Ownership Heuristics

Ownership should always be determined before deciding where code is physically organized.

Begin by identifying the responsibility.

The following heuristics provide a simple decision process.

---

## 1. Does it coordinate the application?

If the responsibility exists to coordinate presentation, manage layout, control the Workspace Runtime, or orchestrate user interaction, it belongs to the **Application Runtime**.

Examples include:

* workspace management,
* pane management,
* buffer management,
* layout generation,
* and module composition.

---

## 2. Does it define business behavior?

If the responsibility represents a business concept that gives meaning to the application, it belongs to a **Domain**.

Examples include:

* Bible reading,
* Bible annotations,
* Bible search,
* note organization,
* reading plan generation,
* and other domain-specific behavior.

A useful question is:

> **Which Domain gives this responsibility meaning?**

If another architectural owner requires that behavior, it should collaborate through the Domain's Public API rather than assuming ownership itself.

Shared use does not imply shared ownership.

---

## 3. Is it primarily implementation?

If the responsibility exists to communicate with external systems or provide technical capabilities, it belongs to **Infrastructure**.

Examples include:

* Resource Boundary implementations,
* relay communication,
* Blossom integration,
* IndexedDB,
* background workers,
* compression,
* serialization,
* and networking.

Infrastructure supports the application.

It should not define application behavior.

---

These heuristics identify ownership.

They do not prescribe directory structure.

Ownership is an architectural decision.

Physical organization is an implementation decision.

---

# Physical Organization

Ownership and physical organization are related but not identical.

An abstraction may temporarily reside in a package that does not reflect its long-term owner.

This is acceptable while the implementation evolves.

As the architecture matures, code should move toward its owner rather than remaining where it was originally implemented.

The repository should evolve to reflect architectural ownership over time.

---

# Big Takeaway

Ownership is an architectural decision.

Physical organization is an implementation decision.

Implementation technologies may change.

Communication technologies may change.

Repository structure may change.

Ownership should remain stable.

Meaning establishes ownership.

Ownership establishes responsibility.

Responsibilities define Public APIs.

Public APIs enable collaboration.

Implementation realizes those responsibilities.

When ownership is clear, implementation naturally evolves toward a simpler, more maintainable architecture.
