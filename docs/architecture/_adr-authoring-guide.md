# ADR Authoring Guide

This document defines the conventions for writing and maintaining Architecture Decision Records (ADRs) for KJVOnly.

The ADRs collectively form the architecture specification for the application.

New ADRs should extend that specification rather than duplicate, contradict, or redefine existing architectural decisions.

---

# Purpose

An ADR documents a significant architectural decision.

Each ADR should define a single architectural responsibility and explain the reasoning behind that decision.

Implementation details belong in separate implementation documentation.

---

# Architecture Principles

Every ADR should reinforce the core architectural principles.

- Offline-first.
- Domain Objects are the application's working model.
- Resources are the unit of distribution.
- Architectural components have a single responsibility.
- Existing pipelines are reused whenever possible.
- Simplicity is preferred over unnecessary complexity.

---

# One Responsibility Per ADR

Each ADR should own exactly one architectural concept.

Good examples include:

- Resource Discovery
- Resource Resolution
- Domain Storage Model
- Resource Installation Lifecycle
- Search Indexes

Avoid combining multiple architectural responsibilities into a single ADR.

---

# Preferred ADR Structure

Unless there is a strong reason otherwise, each ADR should follow this structure.

```text
Status

Problem

Decision

(optional sections)

Relationship to Other ADRs

Scope

Big Takeaway
```

Not every ADR requires every section, but the overall structure should remain consistent.

---

# Define Concepts Once

Architectural concepts should be defined only once.

Later ADRs should reference earlier decisions instead of redefining them.

For example:

- Domain Objects are defined in the Domain & Resource Model.
- Resource Resolution is defined in the Resource Resolution ADR.
- Discovery Roots are defined in the Discovery Roots ADR.

Avoid repeating those definitions.

---

# Relationship Between ADRs

The ADRs are designed to compose into a complete architecture specification.

When an ADR depends on another architectural concept:

- reference the owning ADR,
- extend the concept where appropriate,
- avoid restating existing responsibilities.

---

# Scope

Every ADR should clearly define its boundaries.

Include sections similar to:

```text
This ADR defines...

This ADR does not define...
```

Clearly defining scope prevents overlap and keeps responsibilities focused.

---

# Architecture Before Implementation

ADRs describe architecture.

They do not describe implementation.

Implementation details belong in separate documentation.

Examples of implementation details include:

- JSON schemas
- IndexedDB layouts
- API definitions
- class diagrams
- function names
- file layouts
- programming language details
- specific libraries

Those topics should be documented elsewhere.

---

# Naming

Prefer architectural nouns over implementation strategies.

Good examples:

- Resource Archives
- Search Indexes
- Discovery Roots
- Domain Storage Model

Avoid names such as:

- Search Strategy
- Archive Strategy
- Installation Strategy

The title should describe the architectural concept being defined.

---

# Terminology

Use consistent terminology throughout the architecture.

Do not redefine existing terms.

When introducing a new architectural concept:

1. Define it once.
2. Add it to the glossary.
3. Reuse the same terminology consistently.

---

# Mermaid Diagrams

Use Mermaid diagrams whenever they communicate the architecture more clearly than text alone.

Useful diagram types include:

- architectural relationships,
- ownership,
- pipelines,
- lifecycles,
- state transitions,
- and data flow.

Avoid diagrams that merely repeat surrounding text.

Diagrams should improve understanding, not increase complexity.

---

# Writing Style

Write ADRs as architecture specifications.

Prefer:

- concise language,
- declarative statements,
- present tense,
- and consistent terminology.

Avoid:

- implementation discussions,
- speculative language,
- conversational writing,
- and historical narratives.

Focus on the architecture as it exists.

---

# Big Takeaway

End each ADR with a concise summary of the architectural decision.

Where appropriate, include a final Mermaid diagram that reinforces the primary architectural concept.

The Big Takeaway should leave readers with a clear understanding of the ADR's purpose.

---

# Maintaining the Architecture

When modifying existing ADRs:

- preserve established terminology,
- avoid changing architectural responsibilities unnecessarily,
- update related ADRs when architectural boundaries change,
- update the ADR Index if documents are added, removed, or renamed,
- update the glossary when introducing new terminology.

The architecture should evolve as a coherent specification rather than as a collection of independent documents.