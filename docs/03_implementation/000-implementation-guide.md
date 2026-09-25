# Implementation Documentation Guide

## Status

Current

Save in the repository as:

```text
docs/03_implementation/000-implementation-guide.md
```

---

# Purpose

The KJVOnly.bible implementation documentation has grown into a set of focused architecture references.

This guide answers:

> **Which document should I read for the work I am about to do?**

Do not treat every document as required reading for every change.

Start with the smallest relevant set and follow cross-references only when the task crosses architecture boundaries.

---

# Core Runtime Documents

## Buffer / Module Runtime

```text
docs/03_implementation/runtime/005-buffer-contract.md
```

Read when working on:

```text
Buffer identity
Buffer.bag
Buffer.resourceSelections
ModuleBufferFactory
related/independent Module creation
Pane/Buffer relationship
Module resource context
```

---

## State Ownership and Context Boundaries

```text
docs/03_implementation/runtime/007-state-ownership-context-boundaries.md
```

Read when deciding:

```text
ApplicationContext vs Svelte context
application-global vs module-local state
view-local state
Buffer state
domain state
who owns persistence
who owns subscriptions
```

---

## Identity and Source of Truth

```text
docs/03_implementation/runtime/008-identity-source-of-truth.md
```

Read when working with:

```text
paneID
Pane object references
Buffer keys
Module identity
Domain Object IDs
Resource IDs
projections
snapshots
authorities
```

---

## Resolver and Boundary Design

```text
docs/03_implementation/runtime/009-resolver-boundary-design.md
```

Read when introducing or modifying:

```text
resolvers
factories
services
contexts
contributors
semantic lookup boundaries
feature facades over generic services
```

---

## Persistent UI Lifecycle

```text
docs/03_implementation/runtime/010-persistent-ui-lifecycle.md
```

Read when components remain mounted while hidden or when working with:

```text
persistent navigation
workers
subscriptions
timers
audio/media
active/inactive Module state
cleanup
```

---

## UI Shell and Layout Ownership

```text
docs/03_implementation/runtime/011-ui-shell-layout-ownership.md
```

Read when changing:

```text
PaneContainer
BufferContainer
BufferHeader
BufferBody
height
overflow
scroll ownership
outline/border
padding
module shells
```

---

## Mutation and Synchronization Rules

```text
docs/03_implementation/runtime/012-mutation-synchronization-rules.md
```

Read when implementing:

```text
user-originated mutations
service subscribers
multi-instance synchronization
persistence writes
events
draft/save flows
auto-save
```

---

## Live State and Snapshot Semantics

```text
docs/03_implementation/runtime/013-live-vs-snapshot-state.md
```

Read when deciding whether data is:

```text
live
snapshot
derived
draft
cached
```

Especially relevant to:

```text
Settings
Resource selections
Buffer runtime state
editor drafts
```

---

## Bespoke-to-Generic Refactoring

```text
docs/03_implementation/runtime/014-bespoke-to-generic-refactoring.md
```

Read before replacing multiple one-off implementations with:

```text
shared models
generic renderers
semantic definitions
resolvers
feature services
```

---

## Composition Roots and Container Boundaries

```text
docs/03_implementation/runtime/015-composition-root-container-boundaries.md
```

Read when deciding:

```text
where services are constructed
what Application owns
what Module containers own
where contexts are provided
where subscriptions are created/cleaned up
how popup/module entry paths should converge
```

---

## Application Navigation Architecture

```text
docs/03_implementation/runtime/016-navigation-architecture.md
```

Read when working on:

```text
persistent navigation stacks
Back behavior
module overlays
push vs replace vs split
Pane-local navigation context
cross-module navigation
Buffer-per-navigation-entry semantics
resource context for hidden Modules
```

Important:

```text
016 = Navigation Architecture
006 = Runtime Services
```

---

# UI Architecture

## Data-Driven UI and Resolver Architecture

```text
docs/03_implementation/ui/003-data-driven-ui-resolver-architecture.md
```

Read when building or refactoring:

```text
definitions
registries
generic rows/items
semantic IDs
resolver maps
search metadata
custom escape hatches
```

---

# Testing Architecture

## Testing Strategy and Browser Harnesses

```text
docs/03_implementation/testing/001-testing-strategy-browser-harnesses.md
```

Read when choosing between:

```text
unit tests
browser tests
focused integration tests
```

Also covers:

```text
minimal browser hosts
real-service preference
DOM identity assertions
multi-instance tests
cleanup
IndexedDB/localStorage
```

---

## Architecture Invariants and Validation

```text
docs/03_implementation/testing/002-architecture-invariants-validation.md
```

Read when converting architecture rules into executable tests.

Examples:

```text
unique IDs
resolver completeness
Node-safe domain roots
Buffer identity rules
Resource snapshot rules
navigation persistence
subscriber cleanup
```

---

# Module Documentation

## Settings Module

```text
docs/03_implementation/modules/003-settings-module.md
```

The Settings implementation is the reference example for:

```text
application-global value authority
module-local contexts
persistent internal navigation
definition-driven UI
semantic resolvers
search
multi-instance synchronization
```

Use it as an implementation reference, not as a reason to make every Module Settings-shaped.

---

# Task-Oriented Reading Map

## Working on Workspace / Pane / Buffer

Read:

```text
runtime/005-buffer-contract.md
runtime/007-state-ownership-context-boundaries.md
runtime/008-identity-source-of-truth.md
runtime/016-navigation-architecture.md
```

Add:

```text
runtime/011-ui-shell-layout-ownership.md
```

for rendering/layout changes.

---

## Working on a Module

Read:

```text
runtime/015-composition-root-container-boundaries.md
runtime/007-state-ownership-context-boundaries.md
runtime/013-live-vs-snapshot-state.md
runtime/010-persistent-ui-lifecycle.md
```

---

## Working on Navigation

Read:

```text
runtime/016-navigation-architecture.md
runtime/005-buffer-contract.md
runtime/008-identity-source-of-truth.md
runtime/010-persistent-ui-lifecycle.md
runtime/015-composition-root-container-boundaries.md
```

For browser coverage:

```text
testing/001-testing-strategy-browser-harnesses.md
```

---

## Working on Shared / Generic UI

Read:

```text
ui/003-data-driven-ui-resolver-architecture.md
runtime/009-resolver-boundary-design.md
runtime/014-bespoke-to-generic-refactoring.md
```

---

## Working on Synchronization / Persistence

Read:

```text
runtime/012-mutation-synchronization-rules.md
runtime/007-state-ownership-context-boundaries.md
runtime/013-live-vs-snapshot-state.md
```

---

## Working on CSS / Layout / Shells

Read:

```text
runtime/011-ui-shell-layout-ownership.md
```

Remember the Tailwind class-discovery rule:

```text
dynamic utility names may be removed when their literal classes do not appear
```

For a finite dynamically selected semantic palette, retain literal hidden class references in source where necessary.

---

## Working on Tests

Read:

```text
testing/001-testing-strategy-browser-harnesses.md
testing/002-architecture-invariants-validation.md
```

Then read the architecture document for the subsystem being tested.

---

# Documentation Hierarchy

Use this priority when documents appear to conflict:

```text
current accepted ADR / application architecture
    ↓
current implementation architecture document
    ↓
current source code
    ↓
older implementation notes / handoffs / historical patches
```

When the current source intentionally differs from a document:

```text
determine whether the source changed intentionally
update the architecture document when the new behavior is accepted
```

Do not silently let implementation docs become historical fiction.

---

# Documentation Rule

Architecture documentation should explain:

```text
ownership
boundaries
invariants
dependency direction
extension pattern
anti-patterns
```

JSDoc should explain:

```text
important API-level contracts
```

Tests should make critical rules executable.

The preferred combination for important architecture is:

```text
implementation document
    + meaningful JSDoc
    + invariant/regression test
```
