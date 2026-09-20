# Module Contract

**Status:** Current
**Scope:** `client/kjvonly-pwa`

## Purpose

A Module is a user-facing interaction with an application or Domain capability that can be displayed inside a Workspace Pane.

A Module is **not** a separate application, route, service container, or persistence boundary. The runtime represents a Module instance with a `Buffer`, places that Buffer in a Pane, and resolves the Buffer's Module identity to a Svelte component for rendering.

The core runtime relationship is:

```text
Workspace
    → Pane tree
        → leaf Pane
            → Buffer
                → Module identity
                → navigation/runtime bag
                → captured Resource selections
                    ↓
                module component
```

## Module Identity

Application Module identity is defined by the `Modules` enum.

The numeric values are explicit because `Buffer.componentName` is persisted. Renumbering an existing value is therefore a persisted-state compatibility break unless accompanied by a migration.

Current identities include the application and Domain-facing modules such as:

```text
MODULES
BIBLE
STRONGS
SEARCH
NOTES
PLANS
LOGIN
SETTINGS
PROFILE
ARCHIVE
NULL
```

`Modules.NULL` is a Buffer sentinel. It has no renderable component.

Unknown persisted Module values are treated as invalid runtime state and must fail explicitly rather than silently falling back to another module.

## Buffer Is the Module-Instance Runtime Contract

A rendered Module instance is represented by a `Buffer`.

The current important Buffer fields are:

```text
key
componentName
bag
resourceSelections
```

### `key`

Stable Buffer identity.

Buffer identity is intentionally independent from Pane identity. A Pane is where a Buffer is displayed; a Buffer is the runtime identity/state of the Module instance displayed there.

### `componentName`

The persisted `Modules` identity used by the rendering resolver.

### `bag`

Module-specific runtime/navigation state.

The application runtime deliberately does not define a universal shape for `bag`. Each Module owns the meaning of the state it stores there.

Examples include Bible location/navigation state and Module-specific view state.

### `resourceSelections`

A snapshot of the Resource selections captured when the Buffer is created or replaced.

This snapshot is part of the Module instance. Module UI resolves required Resource references from the current Pane/Buffer through `ModuleResourceSelectionResolver`.

Domain services receive `PublishedResourceReference` values and remain independent from Pane/Buffer mechanics.

## Pane Is Not the Module

A Pane owns structural placement in the Workspace tree.

A Buffer owns the displayed Module instance.

Therefore:

```text
Pane identity
    ≠ Buffer identity
    ≠ Module identity
```

A Pane may replace the Buffer it displays without replacing the Pane itself.

## Module Resource Requirements

Resource requirements are Module/Domain-owned.

The generic runtime must not contain branching such as:

```ts
if (module === Modules.BIBLE) {
    // build Bible selections
}
```

Instead, `ModuleResourceSelectionBuilder` delegates to registered `ModuleResourceSelectionContributor` implementations.

A contributor receives:

```text
originatingSelections
currentSelections
```

and produces the Resource-selection snapshot for the new Module instance.

This supports two creation modes:

```text
independent Module
    → selections derived from current application selections

related Module
    → selections may inherit from the originating Buffer
```

The semantics belong to the Module/Domain contributor, not to the generic Buffer factory.

## Module Rendering Contract

Rendering is explicit:

```text
Buffer.componentName
    ↓
resolveModuleComponent()
    ↓
Svelte component
```

The resolver returns no component for `Modules.NULL` and throws for unsupported values.

There is intentionally no silent Bible/default fallback.

## Application-Owned Versus Domain-Owned Modules

Some Modules are application-level capabilities, for example Settings, Login, Profile, Archive, and the Module chooser.

Others present Domain functionality, for example Bible, Notes, Reading Plans, Search, and Strong's/reference views.

The distinction affects ownership and public APIs, but not the runtime Buffer contract.

Browser-facing Module components are exposed through browser-only `/ui` APIs where they form a public presentation boundary.

Examples:

```text
$lib/application/ui
$lib/domains/bible/ui
$lib/domains/notes/ui
$lib/domains/reading-plans/ui
```

Node-safe root APIs must not re-export browser-only Svelte components.

## Services and Module State

A Module component should not construct long-lived application/domain services directly.

Application-owned services needed by Svelte are constructed by `Application` and exposed through `ApplicationContext`.

Per-container state uses an application-owned factory when independent instances are required.

Workers are separate composition roots and do not consume `ApplicationContext`.

## Removed Historical Contract Fields

The following historical Buffer fields were intentionally removed and are not part of the Module contract:

```text
name
component
keyboardBindings
selected
onFocus
```

`NullBuffer` was also removed. `Modules.NULL` remains as the sentinel identity.

Do not restore these fields merely because older docs or experiments refer to them.

## Summary

A Module instance is:

```text
Module identity
    + Buffer identity
    + Module-owned navigation/runtime bag
    + captured Resource-selection snapshot
    + explicit Svelte component mapping
```

The generic runtime owns placement, Buffer creation, and rendering coordination. Domains own their Module semantics, Resource requirements, and behavior.
