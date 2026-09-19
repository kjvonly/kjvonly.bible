# Buffer Contract

## Status

Current

---

# Purpose

This document defines the concrete Buffer contract used by the KJVOnly.bible
Workspace Runtime.

A Buffer is the runtime object that binds one Module Instance to the state and
Resource context required to restore and continue that interaction.

The current relationship is:

```text
Leaf Pane
    ↓
Buffer
    ↓
Module Instance
```

The Buffer does not render the Module itself and does not implement Domain
behavior.

Its responsibility is narrower:

> A Buffer identifies one active Module Instance and preserves the serializable
> runtime context required by that instance.

This document describes:

```text
what a Buffer owns
what a Buffer deliberately does not own
how Buffer identity works
how Module identity is represented
how navigation/runtime context is stored
how Resource selections are captured
how independent and related Buffers are created
how Buffers are persisted and restored
how Pane and Buffer identity differ
what future Buffer concepts are not implemented yet
```

The conceptual runtime model is defined in:

```text
docs/01_application-architecture/002-workspace-runtime.md
```

The rendering implementation is described in:

```text
docs/03_implementation/runtime/004-rendering-engine.md
```

---

# Scope

This document covers the current Buffer implementation under:

```text
src/lib/application/runtime/buffer/
```

and the application Resource-selection code that supplies Buffer Resource
context.

It does not define:

* Pane-tree layout,
* CSS Grid rendering,
* Domain Object persistence,
* Resource acquisition,
* Resource publication,
* synchronization,
* authentication,
* or Outbox behavior.

Those systems may consume or contribute to Buffer context, but they do not
change the Buffer contract described here.

---

# Current Buffer Model

The current runtime object is intentionally small:

```typescript
export class Buffer {
    key: string = uuid4();
    componentName: Modules = Modules.NULL;
    bag: any = {};
    resourceSelections: ResourceSelections;

    constructor(
        resourceSelections: ResourceSelections = {}
    ) {
        this.resourceSelections = resourceSelections;
    }
}
```

The four current Buffer responsibilities are:

| Property | Responsibility |
| --- | --- |
| `key` | Stable Buffer identity. |
| `componentName` | Identifies the Module type represented by the Buffer. |
| `bag` | Stores Module-specific serializable navigation/runtime context. |
| `resourceSelections` | Captures the Resource-selection snapshot for the Module Instance. |

There are no other required Buffer fields in the current runtime contract.

---

# Buffer Responsibility

A Buffer owns runtime context for one Module Instance.

Conceptually:

```text
Buffer
    ├── identity
    ├── Module type
    ├── Module navigation/runtime context
    └── Resource-selection snapshot
```

The Buffer does **not** own:

```text
Pane position
Workspace layout
Svelte component instances
Domain behavior
Domain Objects
application services
Resource discovery
Resource installation
Resource publication
Outbox processing
focus coordination
selection coordination
```

Those responsibilities belong to other application layers.

This separation keeps the Buffer serializable and independent from rendering
technology.

---

# Buffer Identity

Every Buffer receives a UUID when it is created:

```typescript
key: string = uuid4();
```

Buffer identity is intentionally independent from Pane identity.

For example:

```text
Pane a
    Buffer 111...
        Bible
        Genesis 1

Pane b
    Buffer 222...
        Bible
        Romans 8
```

Both Buffers may represent the same Module type while preserving independent
runtime state.

The distinction is:

```text
Pane ID
    = where the interaction is displayed

Buffer key
    = which runtime interaction exists there
```

A Pane may receive a new Buffer while retaining the same Pane ID.

A new Module transition therefore does not reuse the originating Buffer
identity.

---

# Current Use of Buffer Identity

The current application persists and restores Buffer identity.

The identity is also protected by tests that verify related Module creation
produces a new Buffer key.

The current runtime does **not** yet maintain a global Buffer registry or
support detached Buffers.

Therefore `key` should not be interpreted as proof that those features already
exist.

It is the stable identity required by the current Runtime model and preserves
the ability to add those capabilities later without redefining what a Buffer
is.

---

# Module Identity

The Module represented by a Buffer is identified by:

```typescript
componentName: Modules
```

Despite the historical property name, `componentName` is not a Svelte
component reference.

It stores the logical Module type.

The rendering path is:

```text
Buffer.componentName
    ↓
resolveModuleComponent()
    ↓
Svelte component
```

The rendered component is therefore derived from the Buffer instead of being
stored inside it.

This keeps framework-specific objects out of persisted Runtime state.

---

# Modules.NULL

A newly constructed low-level Buffer defaults to:

```typescript
Modules.NULL
```

Normal application Module creation uses `ModuleBufferFactory`, which replaces
that sentinel with the requested Module type.

`Modules.NULL` remains a runtime sentinel.

The old `NullBuffer` subclass has been removed because a separate Buffer class
was not required to represent that state.

---

# Navigation and Runtime Context

Module-specific context is stored in:

```typescript
bag: any
```

Examples include values such as:

```text
Bible location
search query
note identifier
reading-plan navigation context
```

The Buffer does not interpret these values.

The owning Module defines their meaning.

Conceptually:

```text
Buffer.bag
    = opaque serializable context owned by the Module
```

This allows the generic Workspace Runtime to preserve Module state without
learning Domain-specific concepts.

---

# Why `bag` Is Generic

Different Modules require different initialization and navigation state.

A centralized Buffer schema such as:

```text
bibleLocationRef
searchQuery
noteId
planId
...
```

would make the generic Runtime depend on every Module and Domain.

Instead:

```text
Workspace Runtime
    knows there is a bag

Module
    knows what its bag means
```

The current implementation therefore retains `bag: any` as an explicit generic
boundary.

A future type-safe Module-specific context system may refine this boundary, but
such a change must preserve the Runtime's independence from Domain behavior.

---

# Buffer Creation Boundary

Application Module Buffers should normally be created through:

```text
ModuleBufferFactory
```

File:

```text
src/lib/application/runtime/buffer/module-buffer-factory.ts
```

The factory is responsible for combining:

```text
requested Module type
    +
Module Resource-selection policy
    +
explicit navigation context
    ↓
new Buffer
```

This prevents callers from creating a Module Buffer without establishing its
Resource context.

Direct `new Buffer(...)` remains appropriate inside low-level persistence,
factory implementation, and focused tests.

---

# Independent Buffer Creation

An independent Buffer is created with:

```typescript
moduleBufferFactory.independent(
    module,
    bag
)
```

Conceptually:

```text
requested Module
    ↓
ModuleResourceSelectionBuilder.independent()
    ↓
current application Resource-selection snapshot
    ↓
Module/domain contributor
    ↓
Buffer.resourceSelections
```

The resulting Buffer receives:

```text
new Buffer identity
requested Module type
explicit navigation context
Module-specific Resource selections
```

Independent creation does not inherit Resource selections from another Buffer.

---

# Related Buffer Creation

A related Buffer is created with:

```typescript
moduleBufferFactory.related(
    module,
    originatingBuffer,
    bag
)
```

Conceptually:

```text
originating Buffer.resourceSelections
        +
current application selections
        +
target Module policy
        ↓
ModuleResourceSelectionBuilder.related()
        ↓
new Buffer.resourceSelections
```

The target Module's Resource-selection contributor decides which originating
selections should be reused and which selections should fall back to current
application defaults.

The generic `ModuleBufferFactory` contains no Module-specific Resource rules.

---

# Related Does Not Mean Same Buffer

A related Module transition always creates a new Buffer object.

That means:

```text
originating Buffer key
    ≠
related Buffer key
```

This is intentional.

The target Module Instance needs its own runtime identity even when it inherits
Resource context from the originating interaction.

The relationship is contextual, not identity reuse.

---

# Navigation Context Is Explicit

`ModuleBufferFactory.related()` does not implicitly copy the originating
Buffer's `bag`.

The navigation context passed to the new Buffer is explicit:

```typescript
related(
    module,
    originatingBuffer,
    bag = {}
)
```

This prevents unrelated Module state from leaking into the target Module.

`WorkspaceRuntime.replaceBuffer()` may deliberately reuse the current Buffer's
bag when its caller does not provide a replacement bag.

That is Workspace transition policy, not an implicit `ModuleBufferFactory`
rule.

This distinction is important:

```text
ModuleBufferFactory
    creates a Buffer from explicit context

WorkspaceRuntime
    decides which context to provide during a Workspace operation
```

---

# Navigation Context Copying

When a Buffer is created, `ModuleBufferFactory` copies the supplied navigation
context before assigning it to the Buffer.

For plain objects this is a shallow copy:

```typescript
{
    ...bag
}
```

Arrays are copied with:

```typescript
[
    ...bag
]
```

Primitive values are returned unchanged.

The purpose is to prevent the new Buffer from sharing the caller's top-level
bag object accidentally.

This is **not** a recursive deep-clone guarantee.

Modules should keep persisted navigation context serializable and avoid relying
on mutable nested object sharing.

---

# Resource-Selection Snapshot

Each Buffer contains:

```typescript
resourceSelections: ResourceSelections
```

A `ResourceSelections` value maps Resource type to the selected published
Resource reference:

```typescript
Record<
    string,
    PublishedResourceReference
>
```

For example:

```text
kjvonly/bible/chapters
    → publisher + chapter Resource ID

kjvonly/overlays/paragraphs
    → publisher + paragraph Resource ID
```

The important rule is:

> Resource selections are captured for the Module Instance when its Buffer is
> created.

Normal Module reads should not silently replace that captured context with the
latest mutable global application selections.

---

# Why Resource Selections Live on Buffer

A Module Instance may remain open while application-level selections change.

If the Module always read global selection state, an existing interaction could
silently change its source underneath the user.

Buffer snapshots instead provide:

```text
Module creation time
    ↓
capture Resource context
    ↓
Buffer.resourceSelections
    ↓
Module keeps using that context
```

This allows multiple Module Instances to use different Resource contexts at the
same time.

---

# Module Resource Selection Resolver

Module/UI code normally reads a Buffer's Resource context through:

```text
ModuleResourceSelectionResolver
```

The lookup path is:

```text
paneID
    ↓
WorkspaceRuntime.findPane()
    ↓
Pane.buffer
    ↓
Buffer.resourceSelections
    ↓
required Resource type
    ↓
PublishedResourceReference
```

The normal consumer pattern is:

```typescript
moduleResourceSelectionResolver.require(
    paneID,
    RESOURCE_TYPE
)
```

This gives Module code access to its captured Resource context without forcing
it to understand Pane-tree traversal or mutable application selection state.

---

# Domain Boundary

Domain services do not receive Buffers.

They receive application/domain values such as:

```text
PublishedResourceReference
Bible location
note data
plan data
```

The dependency direction remains:

```text
Module/UI
    ↓
ModuleResourceSelectionResolver
    ↓
PublishedResourceReference
    ↓
Domain service
```

Not:

```text
Domain service
    ↓
Buffer
```

This prevents Workspace Runtime concepts from leaking into Domains.

---

# Pane and Buffer Relationship

A Leaf Pane hosts one Buffer.

The identities are separate:

```text
Pane
    stable structural identity

Buffer
    stable interaction identity
```

Replacing a Buffer does not replace the Pane.

Conceptually:

```text
Before

Pane a
    Buffer A
        Bible

After

Pane a
    Buffer B
        Notes
```

The Pane remains the same Workspace location.

The Buffer represents a new Module Instance.

---

# Workspace Buffer Replacement

`WorkspaceRuntime.replaceBuffer()` is the main operation for changing the
Module presented by an existing Pane.

Its high-level flow is:

```text
find Pane
    ↓
read current Buffer
    ↓
create related or independent replacement Buffer
    ↓
assign Pane.buffer
    ↓
toggle transient Pane rendering flag
    ↓
persist Workspace
    ↓
publish Workspace change
```

If the Pane already has a Buffer, replacement is related to that Buffer's
Resource selections.

If it has no Buffer, an independent Buffer is created.

The old Buffer is no longer active in the Workspace after replacement.

---

# Pane Splitting and Buffers

When a Pane is split, the existing Buffer remains associated with the original
Leaf Pane while a new related Buffer is created for the new Leaf Pane.

Conceptually:

```text
Before

Pane a
    Buffer A

After

Branch
    Pane a
        Buffer A

    Pane b
        Buffer B
```

`Buffer A` is preserved.

`Buffer B` has a new identity and receives Resource selections according to the
target Module's related-selection policy.

---

# Buffer Persistence

Buffer persistence is implemented in:

```text
src/lib/application/runtime/buffer/persistence/buffer-persistence.ts
```

The persisted representation contains only serializable Buffer state:

```typescript
export interface PersistedBuffer {
    key: string;
    componentName: Modules;
    bag: any;
    resourceSelections: ResourceSelections;
}
```

The persisted Buffer does not contain:

```text
Svelte components
callbacks
subscriptions
service instances
DOM state
Pane dimensions
transient Pane.toggle state
```

This is a deliberate boundary between Runtime state and rendering state.

---

# Serialization

`serializeBuffer()` persists:

```text
key
componentName
bag
resourceSelections
```

Resource-selection reference objects are copied into the persisted result.

The Buffer `bag` is treated as Module-owned serializable state and is persisted
as supplied.

Modules are therefore responsible for ensuring values stored in `bag` are
compatible with Workspace persistence.

---

# Restoration

`restoreBuffer()` validates the persisted Buffer and reconstructs a runtime
`Buffer`.

Restoration preserves:

```text
exact Buffer key
Module type
bag
Resource-selection snapshot
```

It does **not** generate a new Buffer identity.

That is essential because Workspace persistence restores an existing runtime
interaction rather than creating a new one.

---

# Persisted Module Validation

A persisted `componentName` must be a valid `Modules` value.

Unknown Module values are rejected instead of being silently converted to a
default Module.

This makes persisted Module compatibility explicit.

Changes to the numeric `Modules` representation must therefore consider
existing persisted Workspaces.

---

# Persisted Resource Selection Validation

Persisted Resource selections are parsed with:

```text
parseResourceSelections()
```

Each entry must contain:

```text
publisher
resourceId
```

and the Resource type encoded by the Resource ID must match the map key.

Invalid selections are rejected.

The runtime does not silently rebuild invalid persisted Buffer selections from
current global application state.

That protects the snapshot semantics of Buffer Resource context.

---

# Legacy Persistence Compatibility

The parser intentionally ignores unknown historical Buffer properties.

For example, persisted Buffers may still contain removed fields such as:

```text
name
selected
```

Those fields do not become part of the restored Buffer contract.

They are simply ignored while recognized current state is restored.

Persisted Buffers that predate `resourceSelections` restore with an empty
selection map.

This provides a narrow compatibility path without keeping obsolete runtime
fields alive in the current model.

---

# Removed Historical Buffer State

Earlier implementations included fields such as:

```text
name
component
keyboardBindings
selected
onFocus
```

They have been removed from the current Buffer runtime object.

The reasons differ, but the shared rule is:

> Do not keep speculative or unused state on Buffer merely because the Buffer
> may support richer behavior in the future.

Current behavior should define current state.

Future runtime capabilities can add state when there is a concrete ownership
model and active behavior requiring it.

---

# Focus and Selection

The current Buffer does not contain a `selected` flag or `onFocus` callback.

That does not mean focus and selection are invalid Runtime concepts.

It means they are not currently implemented as Buffer-local state.

When real focus/selection behavior is implemented, coordination belongs to:

```text
WorkspaceRuntime
```

because selection normally involves relationships across multiple Panes and
Buffers rather than an isolated boolean on one Buffer.

---

# Buffer Names

The current Buffer does not contain a user-visible `name`.

Historically, the model was inspired partly by editor-style named Buffers.

A future feature could support:

```text
named Buffers
detached Buffers
Buffer picker/list
switching a Pane between existing Buffers
Buffers surviving Pane replacement
```

Those capabilities are **not** implemented today.

If they are introduced, naming should be added as part of a concrete Buffer
registry/lifecycle design rather than restored as an unused string property.

---

# Active Workspace Lifetime

Today a Buffer's practical lifetime is primarily tied to its participation in
the active Workspace tree.

Deleting a Pane removes its Buffer from the active Workspace.

Replacing a Pane Buffer replaces the active interaction with a newly-created
Buffer.

There is currently no detached Buffer store that retains those Buffers after
they leave the active Pane tree.

This is an implementation limitation, not a redefinition of Buffer identity.

---

# Public API Boundary

The Buffer model is intentionally not broadly exported from the root runtime
public API for arbitrary external mutation.

Normal external consumers should interact through higher-level capabilities
such as:

```text
WorkspaceRuntime
ModuleResourceSelectionResolver
runtime UI components
```

Runtime implementation code may use the concrete Buffer model directly.

This keeps Buffer mutation centralized around Workspace and Module creation
operations.

---

# Tests Protecting the Contract

The main Buffer tests are:

```text
src/lib/application/runtime/buffer/module-buffer-factory.spec.ts
src/lib/application/runtime/buffer/persistence/buffer-persistence.spec.ts
```

Related Pane/Workspace persistence and transition behavior is also protected by:

```text
src/lib/application/runtime/pane/persistence/pane-persistence.spec.ts
src/lib/application/runtime/workspace/workspace-runtime.spec.ts
```

Important tested invariants include:

```text
independent Buffer creation receives target Module selections
related Buffer creation receives originating Resource selections
related Module creation gets a new Buffer identity
navigation context is copied into the new Buffer
originating bag is not implicitly copied by ModuleBufferFactory
persisted Buffer identity is restored exactly
persisted Module context is restored
persisted Resource selections are restored
legacy removed fields are tolerated
invalid Resource selections are rejected
unknown persisted Modules are rejected
```

---

# Contract Invariants

The implementation should preserve these rules:

```text
A Leaf Pane hosts one active Buffer.

Pane identity and Buffer identity are independent.

A Module transition creates a new Buffer identity.

A Buffer identifies exactly one Module type at a time.

The Buffer stores Module context, not rendered component instances.

Resource selections are captured per Buffer.

Related Buffer creation may inherit Resource context but not Buffer identity.

ModuleBufferFactory does not implicitly copy the originating bag.

Domain services do not depend on Buffer or Pane types.

Persisted Buffer restoration preserves identity and Resource context.

Removed historical Buffer fields do not define the current contract.
```

---

# Anti-Patterns

Do not reintroduce direct component storage such as:

```typescript
buffer.component = SomeSvelteComponent;
```

Resolve presentation from the Module type instead.

Do not read mutable global Resource selections from normal Module code when the
Buffer already contains its captured selection context.

Do not make Domain services accept a Buffer just to discover Resource or
navigation state.

Do not copy an originating Buffer's entire bag into a related Module by default.
Pass only context intentionally required by the target Module.

Do not add speculative Buffer properties for possible future features without
an implemented owner and lifecycle.

Do not reuse the originating Buffer key when creating a new Module Instance.

---

# Adding Buffer State

Before adding a new Buffer property, answer:

```text
Is this state specific to one Module Instance?
Must it survive Workspace persistence?
Is it independent from Pane layout?
Is it independent from Domain behavior?
Does a concrete current feature read and write it?
```

If those answers are not clearly yes, the state probably belongs somewhere
else.

Common alternatives include:

```text
WorkspaceRuntime
Pane rendering state
Module-local Svelte state
Application service state
Domain Object state
Resource-selection state
```

The Buffer should remain small.

---

# Important Files

## Buffer runtime object

```text
src/lib/application/runtime/buffer/models/buffer.model.ts
```

## Buffer creation

```text
src/lib/application/runtime/buffer/module-buffer-factory.ts
```

## Buffer persistence

```text
src/lib/application/runtime/buffer/persistence/buffer-persistence.ts
```

## Resource selections

```text
src/lib/application/resources/resource-selections.ts
src/lib/application/resources/module-resource-selection-builder.ts
src/lib/application/resources/module-resource-selection-resolver.ts
```

## Workspace operations

```text
src/lib/application/runtime/workspace/workspace-runtime.ts
```

## Rendering

```text
src/lib/application/runtime/rendering/module-component-resolver.ts
src/lib/application/runtime/pane/components/pane.svelte
```

---

# High-Level Mental Model

The simplest mental model is:

```text
Pane
    = where

Buffer
    = which interaction + its runtime context

Module
    = what application interaction runs

Domain
    = behavior and data
```

For Resource-backed Modules:

```text
Pane
    ↓
Buffer
    ├── Module type
    ├── navigation/runtime bag
    └── Resource-selection snapshot
            ↓
ModuleResourceSelectionResolver
            ↓
Domain service
```

That relationship is the current Buffer contract.
