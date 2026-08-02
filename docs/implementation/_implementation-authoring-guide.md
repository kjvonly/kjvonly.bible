# Implementation Documentation Authoring Guide

## Purpose

This guide defines the conventions used by the implementation documentation.

Unlike the Architecture Decision Records (ADRs), implementation documents describe how the application realizes the architecture.

Implementation documents should remain aligned with the architecture while accurately reflecting the current implementation.

---

# Goals

Implementation documents should:

- describe implementation responsibilities,
- explain how the architecture is realized,
- document important implementation decisions,
- support future maintenance,
- assist future contributors,
- and provide migration guidance where appropriate.

Implementation documents should not redefine architectural concepts that already exist in the ADRs.

---

# Documentation Organization

Implementation documentation is organized into three areas.

```text
docs/implementation/

legacy/
target/

reference/
```

## legacy

Describes the implementation that existed when the architecture phase completed.

Legacy documents are historical references used to understand the migration.

They are not maintained once the corresponding implementation has been replaced.

---

## target

Describes the intended implementation.

These documents evolve as the application evolves.

They are the primary implementation reference.

---

## reference

Contains implementation reference material.

Examples include:

- IndexedDB schema
- package layout
- naming conventions
- file formats
- serialization examples
- worker responsibilities

Reference documents should avoid explanatory discussion.

---

# Writing Principles

Implementation documents should be:

- factual,
- concise,
- implementation-focused,
- and responsibility-oriented.

Avoid unnecessary abstraction.

Prefer describing concrete implementation responsibilities.

---

# Single Responsibility

Each implementation document should describe one implementation concern.

Examples include:

- application startup
- resource loading
- Domain Stores
- workers
- synchronization

Avoid combining multiple unrelated responsibilities into one document.

---

# Scope

Every document should clearly define its scope.

Use the following sections near the beginning of every document.

```markdown
## Purpose

...

## Scope

This document defines...

This document does not define...
```

---

# Document Structure

Most implementation documents should follow this structure.

```markdown
# Title

## Status

## Purpose

## Scope

## Background

## Responsibilities

## High-Level Flow

## Detailed Design

## Important Types

## Diagrams

## Notes
```

Not every document requires every section.

Use only the sections that improve clarity.

---

# Diagrams

Prefer Mermaid diagrams wherever practical.

Implementation documents should be readable by skimming diagrams before reading detailed text.

Use diagrams to describe:

- control flow,
- ownership,
- dependencies,
- startup,
- installation,
- synchronization,
- and interactions between components.

Avoid diagrams that simply restate prose.

---

## Diagram Types

Prefer the following Mermaid diagram types.

**Pipeline**

```text
flowchart LR
```

**Hierarchy**

```text
flowchart TD
```

**Runtime Interaction**

```text
sequenceDiagram
```

**Lifecycle**

```text
stateDiagram-v2
```
---

# Code Examples

Use real TypeScript examples whenever possible.

Prefer shortened examples that demonstrate the responsibility being discussed.

Avoid large code listings.

Implementation documentation should explain the implementation rather than duplicate it.

---

# Terminology

Use terminology defined by the ADR glossary.

Examples include:

- Domain
- Domain Object
- Domain Store
- Published Resource
- Resource Representation
- Resource Resolution
- Resource Installation

Do not invent alternative terminology.

---

# Legacy Documents

Legacy documents describe how the application currently works.

They should:

- remain factual,
- avoid recommendations,
- avoid criticism,
- and avoid describing the target implementation except where needed for migration context.

---

# Target Documents

Target documents describe the intended implementation.

They should assume the ADRs are authoritative.

Do not restate architectural decisions.

Instead describe:

- implementation responsibilities,
- interfaces,
- package organization,
- object ownership,
- runtime behavior,
- and interactions.

---

# File References

When referencing implementation files:

Use repository-relative paths.

Example:

```text
client/src/lib/nostr/events/offline.nostr.ts
```

Avoid embedding large directory trees.

Reference only the files relevant to the implementation being discussed.

---

# Markdown

Use ATX headings.

```markdown
#
##
###
```

Leave one blank line between sections.

Prefer tables over long bullet lists where appropriate.

Wrap code blocks with language identifiers.

---

# Style

Prefer:

- active voice,
- present tense,
- short paragraphs,
- and consistent terminology.

Avoid conversational language.

Avoid implementation speculation.

If behavior is unknown, document it as unknown rather than guessing.

---

# Future Evolution

Implementation documentation is expected to evolve.

Unlike ADRs, implementation documents are living documents.

Update them whenever implementation responsibilities materially change.

Keep documents synchronized with the codebase.