# Module Presentation Stack

**Status:** Current
**Scope:** `client/kjvonly-pwa`

## Purpose

This document describes how a persisted Module identity becomes rendered Svelte UI inside the Workspace.

The presentation stack is intentionally explicit and separate from Domain behavior.

## Rendering Flow

```text
Workspace Pane tree
    ↓
deriveWorkspaceLayout()
    ↓
normalized rectangular grid
    ↓
CSS grid areas
    ↓
leaf Pane / PaneContainer
    ↓
BufferContainer
    ↓
Buffer
    ↓
resolveModuleComponent(Buffer.componentName)
    ↓
Module container/component
```

The Workspace tree is recursive, but rendering is not an entirely recursive Svelte Pane-component tree. Layout is derived into a normalized grid first.

The runtime implementation docs contain the detailed Pane/grid behavior.

## Component Resolution

`resolveModuleComponent()` is the explicit Module-to-component registry.

It maps `Modules` values to Svelte components.

Rules:

- `Modules.NULL` resolves to no component;
- known renderable Modules map explicitly;
- unknown numeric values throw;
- there is no silent default Module.

Explicit failure protects persisted runtime state from accidentally rendering the wrong Module.

## Browser-Only UI APIs

Svelte component exports must remain separate from Node-safe root APIs.

Current browser-facing boundaries include:

```text
$lib/application/ui
$lib/domains/bible/ui
$lib/domains/notes/ui
$lib/domains/reading-plans/ui
```

This separation exists because exporting Svelte components through a Node-safe root barrel can pull browser-only dependencies such as Quill into Node unit tests.

That previously produced `document is not defined` failures.

Therefore:

```text
root API
    = contracts/services/models safe for non-browser consumers

/ui API
    = Svelte/browser presentation exports
```

## Internal Presentation Imports

The `/ui` API is an external boundary, not a requirement that every implementation file import its own components through a barrel.

Same-owner implementation code may import concrete component files directly.

This avoids unnecessary self-barrel cycles and keeps internal dependencies explicit.

## Buffer Presentation Components

The application runtime provides reusable Buffer presentation components such as:

```text
BufferContainer
BufferHeader
BufferBody
```

These are presentation helpers for Module containers. They do not own Domain behavior.

Modules may compose these components to get consistent sizing/header/body behavior while retaining their own content and actions.

## Pane Operations

Module UI interacts with Workspace structure through `WorkspaceRuntime`.

Examples:

```text
close Pane
replace Buffer
split Pane
find Pane
subscribe to Workspace changes
```

Svelte should not consume `PaneService` directly.

## ApplicationContext

A Module component consumes long-lived application/domain capabilities through `useApplicationContext()`.

This keeps construction in `Application`, the composition root.

Svelte components should not instantiate application-owned services directly.

## Domain UI Boundaries

Domain presentation components remain owned by their Domains.

For example, the module component resolver consumes public Domain `/ui` exports rather than reaching into another Domain's internal `modules/` tree.

Cross-domain UI imports should also use the owning Domain's `/ui` boundary.

## Module Components Versus Domain Services

A Module component coordinates user interaction and rendering.

Domain services own Domain behavior and persistence-facing operations.

The intended direction is:

```text
Module component
    → ApplicationContext / Domain public API
    → Domain service
    → Resource/persistence boundaries
```

Do not place persistence or transport logic directly in presentation components.

## Stable Pane Identity and Recreation

Pane IDs are stable rendered identities and are not reused during the page lifetime.

The runtime retains the `pane.toggle` recreation workaround for cases where stable Pane identity alone does not force Svelte to rebuild Module state after certain navigation changes.

That behavior is intentional and documented in the runtime implementation docs.

## Summary

The presentation stack resolves **where** through Workspace/Pane layout and **what** through Buffer/Module identity.

```text
Pane
    = where

Buffer + Modules value
    = what instance

component resolver
    = which Svelte presentation

ApplicationContext / Domain APIs
    = behavior dependencies
```
