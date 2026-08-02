# Application Overview

## Status

Current

---

# Purpose

This document provides a high-level overview of the KJVOnly application.

It introduces the primary concepts used throughout the application and establishes the terminology used by the remaining implementation documentation.

Rather than describing individual source files or implementation details, this document explains how the application is organized and how its major responsibilities relate to one another.

The application consists of two complementary architectures.

The first is the **Application Architecture**, responsible for presenting the user interface and coordinating user interactions.

The second is the **Resource Architecture**, documented by the Architecture Decision Records (ADRs), which defines how application data is identified, discovered, resolved, installed, published, and synchronized.

The two architectures are intentionally independent.

The application operates on Domain Objects.

The Resource Architecture is responsible for producing and maintaining those Domain Objects.

This separation allows the application's behavior and user experience to evolve independently from the mechanisms used to distribute application data.

---

# Scope

This document provides a conceptual overview of the application.

It introduces:

- the application runtime,
- the workspace model,
- panes,
- buffers,
- modules,
- domains,
- the Resource Architecture,
- supporting infrastructure,
- and the relationship between these concepts.

This document does not describe the detailed implementation of individual subsystems.

Topics such as workspace management, pane rendering, domain organization, persistence, synchronization, startup, publishing, and resource resolution are described by their own implementation documents.

---

# Big Takeaway

The KJVOnly application is organized around a persistent workspace.

The workspace is modeled as a recursive pane tree.

Every visible feature in the application is presented by instantiating a module inside a buffer hosted by a leaf pane.

Modules provide user interactions for application domains.

Application domains own the data and behavior used by those modules.

The Resource Architecture retrieves, installs, publishes, and synchronizes the Domain Objects required by those domains.

Together these concepts allow the application runtime and the Resource Architecture to evolve independently while remaining connected through a shared domain model.

---

# Application Model

At a high level, the application consists of four major areas.

```mermaid
flowchart TD

    WORKSPACE["Workspace Runtime"]

    MODULES["Modules"]

    DOMAINS["Domains"]

    OBJECTS["Domain Objects"]

    RESOURCES["Resource Architecture"]

    WORKSPACE --> MODULES

    MODULES --> DOMAINS

    DOMAINS --> OBJECTS

    RESOURCES --> OBJECTS
```

Each area has a distinct responsibility.

The **Workspace Runtime** manages the visible application and user interaction.

**Modules** provide individual application features that users interact with.

**Domains** own the application's business concepts, data, and behavior.

The **Resource Architecture** manages the lifecycle of application data from publication through installation and synchronization.

These responsibilities intentionally remain separate.

The workspace does not communicate directly with Nostr.

Modules do not operate on serialized Resources.

The Resource Architecture does not participate in rendering the user interface.

Instead, both architectures meet at the application's Domain Objects.

Domain Objects form the common language shared between the application runtime and the Resource Architecture.

This boundary allows either architecture to evolve without unnecessarily affecting the other.

---

# Application Runtime

The application is implemented as a single-page application (SPA).

Although SvelteKit provides the routing framework, routing is not used as the primary application composition model.

Nearly all application behavior exists within the root route.

The root route hosts a persistent workspace that remains active throughout the lifetime of the application.

User interaction occurs by manipulating the workspace rather than navigating between pages.

Conceptually, the application behaves more like a desktop application than a traditional website.

Subsequent sections describe how the workspace is modeled and how application features are presented within it.

# Workspace Runtime

The Workspace Runtime is responsible for presenting and managing the visible application.

Rather than constructing the user interface through route navigation, the application maintains a persistent workspace that remains active for the lifetime of the application.

All user interaction occurs within this workspace.

Opening a Bible chapter, displaying notes, searching Scripture, viewing references, or interacting with any other application feature occurs by modifying the workspace rather than navigating between pages.

The workspace therefore becomes the primary application runtime.

---

# Workspace Model

The workspace is modeled as a recursive pane tree.

This tree represents the complete visible layout of the application.

Each node within the tree is represented by a `Pane`.

A pane may either contain another pair of panes or display a single buffer.

Conceptually:

```mermaid
flowchart TD

    Workspace

    Workspace --> Root["Root Pane"]

    Root --> Left["Pane"]

    Root --> Right["Pane"]

    Left --> BufferA["Buffer"]

    Right --> BufferB["Buffer"]
```

The workspace itself is therefore defined entirely by the pane tree.

Changing the workspace means modifying the tree.

The rendered user interface is simply a visual representation of that tree.

---

# Pane Tree

The pane tree is implemented as a conventional recursive tree structure.

Each pane represents either:

- a **branch pane**, or
- a **leaf pane**.

A branch pane divides the available space between two child panes.

A leaf pane hosts a single buffer.

Conceptually:

```mermaid
flowchart TD

    Branch["Branch Pane"]

    Branch --> Left["Left Pane"]

    Branch --> Right["Right Pane"]

    Left --> BufferA["Buffer"]

    Right --> BufferB["Buffer"]
```

This recursive structure allows the workspace to support arbitrarily nested layouts while remaining represented by a single root pane.

The current implementation stores this tree directly within the workspace runtime.

Operations such as splitting, replacing, or deleting panes modify the tree before the workspace is re-rendered.

---

# Workspace Operations

The workspace provides a small number of primitive operations that modify the pane tree.

These include:

- splitting a pane,
- replacing the buffer displayed by a pane,
- deleting a pane,
- rebuilding the workspace layout,
- and updating pane dimensions.

More complex user interactions are composed from these primitive operations.

For example, opening a Bible module in a new pane is implemented by splitting an existing pane, creating a new buffer, assigning the requested module to that buffer, and regenerating the workspace layout.

This keeps the workspace runtime small while allowing application behavior to remain flexible.

---

# Rendering

The workspace runtime does not directly construct the visible layout.

Instead, it transforms the pane tree into a CSS Grid representation.

The generated grid becomes the visual representation of the current workspace.

Conceptually:

```text
Pane Tree
        │
        ▼
Grid Template Areas
        │
        ▼
Rendered Workspace
```

The pane tree therefore represents the logical layout.

CSS Grid represents the visual layout.

Separating these concepts allows the application to modify the workspace model without coupling application behavior to the rendering implementation.

---

# Stable Rendering

One of the primary goals of the workspace runtime is preserving module state.

The workspace is designed so that changes affecting one pane do not unnecessarily recreate modules hosted by unaffected panes.

For example, a user may have multiple Bible modules open, each displaying a different chapter and scroll position.

Opening a new module should not cause those existing modules to be recreated.

To preserve component identity, the workspace maintains stable pane identifiers and carefully controls how panes are rendered.

Deleted pane identifiers continue to be tracked after removal, allowing existing pane components to remain associated with their original identity.

This prevents unnecessary component recreation and preserves runtime state such as scroll position, selection state, and module-specific interaction state.

This behavior is a defining characteristic of the application's workspace model and contributes significantly to its desktop-like user experience.

---

# Relationship to Modules

The workspace is intentionally independent of application functionality.

It understands panes and buffers.

It does not understand Bible chapters, notes, search results, or reading plans.

Application functionality is introduced by the modules hosted within buffers.

This separation allows the workspace runtime to remain generic while supporting any number of application modules.

As new modules are introduced, the workspace itself does not require modification.

It continues to provide the same responsibilities:

- layout,
- composition,
- rendering,
- and workspace management.

The modules provide the application behavior.