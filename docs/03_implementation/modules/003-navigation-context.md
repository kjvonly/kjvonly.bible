# Module Navigation Context

**Status:** Current
**Scope:** `client/kjvonly-pwa`

## Purpose

Module navigation state is stored on the Module instance rather than in the Pane tree or a global navigation singleton.

The generic runtime represents this state with:

```text
Buffer.bag
```

The runtime deliberately keeps `bag` flexible because navigation state differs substantially between Modules.

## Ownership

```text
Pane
    = structural Workspace placement

Buffer
    = Module-instance identity and state

Buffer.bag
    = Module-owned navigation/runtime context
```

A Pane should not accumulate Module-specific fields.

Likewise, generic Buffer fields should not be added just because one Module needs another navigation value.

## Buffer Creation

`ModuleBufferFactory` accepts an optional `bag` when creating an independent or related Buffer.

The factory shallow-copies object/array navigation context before assigning it to the new Buffer.

Conceptually:

```text
requested navigation context
    ↓
copyNavigationContext()
    ↓
new Buffer.bag
```

This prevents the most common accidental top-level aliasing between the caller and the new Buffer.

The copy is intentionally shallow.

## Independent Versus Related Modules

The terms `independent` and `related` primarily describe Resource-selection creation, but the caller also chooses the new Module's initial navigation context.

```text
independent(module, bag)
    → new Buffer
    → selections derived from current application state

related(module, originatingBuffer, bag)
    → new Buffer
    → selections may inherit from originating Buffer
```

The runtime does not automatically copy the originating Buffer's `bag`.

If two Modules should share or transform navigation state, the caller must make that relationship explicit.

## Bible Navigation Example

Bible Module state commonly carries Bible location/navigation information in its Buffer bag.

The exact shape belongs to the Bible Module contract, not to WorkspaceRuntime.

Bible reference parsing/manipulation is handled by `BibleLocationReferenceService`, which is application-owned and exposed through ApplicationContext for Svelte consumers.

`BibleNavigationService` handles chapter next/previous behavior and is also application-owned.

Neither service changes the generic meaning of `Buffer.bag`.

## Reading Plan → Bible Navigation

Reading Plans may open Bible reading context.

The current type dependency is one-way:

```text
Reading Plans
    → Bible navigation contract
```

Bible does not import Reading Plans types.

Bible owns the minimal reading-navigation information that Bible UI needs; Reading Plans extends that state with plan-specific fields.

This prevents a Bible ↔ Reading Plans type cycle.

## Container-Local NavigationService

Login/Profile use a separate `NavigationService` concept for container-local view stacks.

That service is **not** the generic Buffer navigation model.

Each container needs an independent stack, so `Application` exposes a `NavigationServiceFactory` through ApplicationContext.

Conceptually:

```text
Application
    → NavigationServiceFactory
        ↓
Login/Profile container
    → independent NavigationService instance
```

Do not replace that with one global NavigationService singleton.

## Persistence

Buffer persistence includes Module identity and Module runtime state needed to restore the Workspace.

Navigation context therefore needs to remain serializable according to the current persistence model.

Do not put Svelte component instances, live service objects, DOM nodes, functions, or other non-persistable runtime objects in `bag`.

## Pane Replacement

Replacing a Pane's Buffer creates a new Module instance contract for that Pane.

The Pane identity remains stable while the Buffer identity/state changes.

This distinction is important for DOM stability and Workspace persistence.

## `pane.toggle`

`pane.toggle` is separate from Module navigation context.

It is a transient Svelte recreation workaround used to force module recreation in specific rendering situations.

It is not persisted and must not be folded into `Buffer.bag`.

Do not remove it casually.

## Rules

1. Keep Module-specific navigation data in `Buffer.bag`.
2. Keep Pane structural state out of Module navigation data.
3. Do not add generic Buffer fields for one Module's needs.
4. Make cross-Module navigation transformations explicit.
5. Keep `bag` persistable.
6. Use application/domain services for behavior; `bag` is state, not a service container.
7. Preserve one-way Domain dependencies when sharing navigation contracts.
