# Ownership

## Status

Current

---

# Purpose

This document defines the ownership principle used throughout the KJVOnly application.

Ownership determines where responsibilities belong before implementation decisions are made.

Its purpose is to ensure every responsibility has a clear owner, allowing the architecture to evolve without becoming tightly coupled to implementation details.

---

# Principle

Every responsibility should have a single owner.

Ownership is determined by meaning rather than implementation.

The owner of a responsibility is the part of the application that gives that responsibility purpose.

Once ownership is established, other parts of the application collaborate through the owner's Public API rather than assuming ownership themselves.

Ownership should remain stable even as implementations evolve.

---

# What Is Ownership?

Ownership is the assignment of responsibility to the part of the application that gives that responsibility meaning.

Ownership is not determined by:

* package structure,
* implementation technology,
* where code currently resides,
* or who happens to use the behavior.

Instead, ownership answers a single question:

> **Who gives this responsibility meaning?**

The answer identifies the owner.

---

# Determining Ownership

When introducing a new responsibility, identify its owner before deciding how it should be implemented.

Consider the following examples.

| Responsibility          | Owner                |
| ----------------------- | -------------------- |
| Workspace               | Application Runtime  |
| Pane                    | Application Runtime  |
| Buffer                  | Application Runtime  |
| Bible chapter retrieval | Bible Domain         |
| Bible annotations       | Bible Domain         |
| Bible search            | Bible Domain         |
| Notes                   | Notes Domain         |
| Reading Plans           | Reading Plans Domain |
| Relay communication     | Infrastructure       |
| IndexedDB persistence   | Infrastructure       |
| Compression             | Infrastructure       |

Notice that ownership is determined by purpose rather than implementation.

Bible search belongs to the Bible Domain regardless of how it is implemented.

Relay communication belongs to Infrastructure regardless of which relay implementation is used.

---

# Collaboration

Ownership does not prevent collaboration.

It defines it.

When another part of the application requires behavior owned elsewhere, it should collaborate through the owner's Public API.

Ownership does not change simply because another responsibility needs access.

Shared use does not imply shared ownership.

This preserves clear architectural boundaries while allowing independent parts of the application to work together.

---

# Ownership Heuristics

The following questions provide a simple way to determine ownership.

---

## Does this responsibility coordinate the application?

Responsibilities that coordinate presentation, layout, navigation, workspace management, or runtime behavior belong to the **Application Runtime**.

The Runtime owns how the application executes.

---

## Does this responsibility define a business concept?

Responsibilities that define application behavior belong to the Domain that gives them meaning.

Each Domain owns its own Domain Objects, business rules, operations, and Public APIs.

Examples include:

* Bible,
* Notes,
* Reading Plans,
* Settings,
* and future application Domains.

---

## Does this responsibility exist only because of an implementation technology?

Responsibilities that provide technical capabilities belong to **Infrastructure**.

Examples include:

* Resource Boundary implementations,
* relay communication,
* Blossom integration,
* IndexedDB,
* networking,
* serialization,
* compression,
* and background workers.

Infrastructure supports the application.

It should not define application behavior.

---

# Physical Organization

Ownership and physical organization are related but not identical.

Code may temporarily reside in a package that does not reflect its long-term owner.

This is acceptable while the implementation evolves.

During refactoring, responsibilities should move toward their owner rather than remaining where they were originally implemented.

The repository should evolve to reflect architectural ownership over time.

---

# Big Takeaway

Ownership is the foundation of the architecture.

Every responsibility has one owner.

Ownership is determined by meaning rather than implementation.

Public APIs allow independently owned responsibilities to collaborate without transferring ownership.

When ownership is clear:

* responsibilities become easier to understand,
* Public APIs become easier to define,
* implementations become easier to replace,
* and the architecture remains stable as the application evolves.
