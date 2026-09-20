# Module Registration

**Status:** Current
**Scope:** `client/kjvonly-pwa`

## Purpose

A Module is "registered" through several explicit runtime mappings rather than one central plugin registry.

This is intentional. Module identity, rendering, Resource requirements, and user-facing availability are separate responsibilities.

## Registration Surfaces

A renderable Module may participate in four separate registration surfaces:

```text
1. persisted Module identity
2. component rendering mapping
3. Resource-selection contributor registration
4. user-facing Module discovery/chooser
```

Not every Module must appear in every user-facing menu, but a Module created through the generic Buffer factory requires the runtime mappings relevant to its behavior.

## 1. Persisted Identity: `Modules`

`Modules` defines stable application Module identity.

Because the numeric value is stored in `Buffer.componentName`, enum values must remain stable across persisted Workspaces unless a migration is provided.

Do not reorder/renumber values casually.

## 2. Rendering Registration

`resolveModuleComponent()` maps the Module identity to a Svelte component.

The mapping is explicit and tested.

Rules:

```text
known renderable Module
    → component

Modules.NULL
    → undefined / intentionally non-renderable

unknown value
    → throw
```

There is no fallback component.

Browser components used by the resolver should come from browser-only `/ui` public APIs when crossing owner/Domain boundaries.

## 3. Resource-Selection Contributor Registration

`ModuleResourceSelectionBuilder` receives a set of `ModuleResourceSelectionContributor` implementations.

Each contributor declares the Module it supports and owns the Module's Resource-selection semantics.

Conceptually:

```text
Modules value
    → contributor
        → ResourceSelections
```

`Application` composes the contributor set.

The builder must stay generic; it must not grow Domain-specific branches.

A missing contributor is a configuration error and fails explicitly.

A Module that intentionally requires no Resource selections still participates explicitly through a no-Resource contributor rather than bypassing the selection-builder contract.

Archive is the current example:

```text
Modules.ARCHIVE
    → NoResourceModuleResourceSelectionContributor
    → empty ResourceSelections
```

This keeps generic Buffer creation uniform without pretending every Module has Domain Resource requirements.

## 4. Module Chooser / Availability

The application Module chooser exposes a user-facing subset of Modules.

Some choices are conditional.

For example, Login/Profile availability depends on authentication state.

User-facing availability is presentation policy. It is separate from whether the runtime knows how to render a Module.

Do not use the chooser object as the canonical runtime registry.

## Application Composition

`Application` is the composition root and the only place that should assemble the full runtime dependency graph.

The concrete `Application` class is imported directly by runtime bootstrap only from:

```text
src/routes/+layout.svelte
```

Normal consumers use `$lib/application` or `$lib/application/ui` as appropriate.

## Public API Registration

Adding a Module does not automatically mean adding its implementation to a root barrel.

Use the ownership rule:

```text
Node-safe contracts/services
    → owning root API

browser/Svelte components consumed externally
    → owning /ui API

same-owner internals
    → direct internal imports
```

Do not create nested public `index.ts` files merely because the filesystem has nested folders.

## Tests

Registration changes should normally update:

- module component resolver tests;
- Resource-selection contributor tests;
- ModuleBufferFactory tests when creation semantics change;
- browser tests only when user-facing rendering/availability behavior changes.

Persisted identity changes require special migration testing.

## Failure Modes

The runtime intentionally fails clearly for incomplete registration.

Examples:

```text
unsupported Modules value
    → component resolver error

missing Resource-selection contributor
    → selection builder error

missing required Resource selection in Buffer
    → ModuleResourceSelectionResolver error
```

Failing at these boundaries is preferable to silently rendering or loading the wrong data.

## Registration Checklist

```text
[ ] stable Modules value
[ ] explicit component resolver mapping
[ ] resolver test
[ ] Resource-selection contributor (including an explicit no-Resource contributor when appropriate)
[ ] contributor registered by Application
[ ] contributor test
[ ] public /ui export if component crosses owner boundary
[ ] Module chooser entry if user should open it directly
[ ] authentication/availability rule if conditional
[ ] persistence migration if an existing enum identity changed
```

## Summary

Module registration is deliberately decomposed:

```text
identity
    → Modules

presentation
    → resolveModuleComponent()

Resource context
    → ModuleResourceSelectionContributor

user availability
    → Module chooser / application presentation policy
```

Keeping these separate prevents the runtime from becoming a monolithic Module registry that owns Domain behavior.
