# Module Events and Runtime Communication

**Status:** Current
**Scope:** `client/kjvonly-pwa`

## Purpose

The application does **not** implement one generic Module event bus.

Runtime communication is intentionally split by responsibility. This document records those mechanisms so new code does not invent a catch-all Module event system merely because this file is named "module events."

## Principle

Use the narrowest owner-specific communication mechanism that matches the behavior.

Current communication mechanisms include:

```text
WorkspaceRuntime notifications
Application/domain service subscriptions
worker message + pub/sub adapters
Svelte stores for local/container state
Buffer replacement/navigation state
Outbox wakeups
```

These mechanisms should not be collapsed into one global event dispatcher without a concrete need.

## Workspace Events

Workspace structural changes are coordinated by `WorkspaceRuntime`.

Consumers may react to Workspace changes through its notification/subscription behavior.

Examples include:

```text
Pane split/delete
Buffer replacement
layout changes
Pane dimensions
```

Module UI must use WorkspaceRuntime rather than publishing PaneService events directly.

## Application and Domain Service Subscriptions

Services may expose focused subscriptions when live application/domain state requires them.

Examples include Settings, authentication/account state, Bible search results, and other active service-specific state.

A subscription should belong to the service that owns the state.

Do not create a separate Module event solely to relay data already owned by a service.

## Settings Example

`SettingsService` publishes the normalized Settings snapshot to subscribers.

Subscribers should use the published snapshot directly rather than immediately rereading persistence.

This matters for correctness as well as efficiency; paragraph/pericope rendering previously exposed races when individual Bible Module instances reread and asynchronously applied stale state.

## Worker Communication

Workers use explicit message protocols.

Examples include:

```text
Resource Worker protocol
Bible search messages
Notes search messages
Reading Plans worker commands/responses
Nostr verification messages
```

The Reading Plans worker boundary is typed with explicit command/response shapes rather than open-ended `any` messages.

Worker protocols are not Module events. Workers are separate composition roots.

## Module-to-Module Interaction

Modules generally interact through application/domain state or explicit Workspace operations rather than sending direct events to one another.

Examples:

```text
Reading Plans opens Bible context
    → explicit Buffer/navigation state + Bible-owned contract

Module chooser changes displayed Module
    → WorkspaceRuntime.replaceBuffer()

Bible opens Notes UI
    → Domain UI boundary + runtime interaction
```

Keep cross-Domain dependencies one-way where possible.

## Buffer Replacement as Runtime Action

Changing the Module displayed in a Pane is not modeled as a broadcast event.

It is an explicit Workspace operation:

```text
workspaceRuntime.replaceBuffer(paneID, module)
```

The runtime creates the new Buffer through the Module Buffer factory and Resource-selection machinery.

## Outbox Wakeups

Outbox wakeups are application publication coordination, not Module events.

A successful Domain write may atomically enqueue publication and wake the Outbox processor.

The Outbox then publishes durable intents independently from Module presentation lifecycle.

## Local Svelte State

Purely local UI state should remain local Svelte state or a container-local store/service.

Do not route local modal/view state through an application-global event system.

`NavigationServiceFactory` is an example: Login/Profile each receive independent navigation stacks rather than publishing global navigation events.

## When to Add a New Subscription/Event Mechanism

Before adding one, identify:

1. who owns the state/event;
2. whether an existing service already owns it;
3. whether the communication crosses a Worker boundary;
4. whether WorkspaceRuntime already models the operation;
5. whether the state is local to one container;
6. whether durable publication belongs in the Outbox instead.

Only add a new mechanism when none of the existing ownership boundaries fit.

## Anti-Patterns

Avoid:

```text
global catch-all Module event bus
stringly typed event names shared across unrelated Domains
Svelte components publishing persistence events directly
PaneService events consumed by Modules
worker messages typed as any when the protocol is known
events used to hide direct cross-Domain coupling
```

## Summary

There is no universal Module event contract.

Communication remains owner-specific:

```text
Workspace structure
    → WorkspaceRuntime

application/domain state
    → owning service subscriptions

Worker boundary
    → typed messages

local UI state
    → local Svelte/container state

publication
    → Outbox
```
