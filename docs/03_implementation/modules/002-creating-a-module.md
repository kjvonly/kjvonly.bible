# Creating a Module

**Status:** Current
**Scope:** `client/kjvonly-pwa`

## Purpose

This document describes the implementation steps for adding a new renderable Module to the application.

A Module should be added as a small vertical slice. Do not start by adding generic runtime branching or by exposing Domain internals through ApplicationContext.

## 1. Decide Ownership

First determine whether the Module is:

```text
Application-owned
    examples: Settings, Login, Profile

Domain-owned
    examples: Bible, Notes, Reading Plans
```

Domain-owned behavior belongs under the Domain. Application-owned behavior belongs under `application/`.

The Module's Svelte component location should follow that ownership.

## 2. Add a Stable Module Identity

Add the Module to `Modules`.

The enum value is persisted through `Buffer.componentName`, so numeric values are compatibility-sensitive.

Rules:

- use an explicit numeric value;
- do not renumber existing values casually;
- treat renumbering as a persistence migration;
- do not reuse `Modules.NULL`.

## 3. Create the Module Component

Create the Svelte container/component under the owning Application or Domain area.

A top-level Module component normally receives the Pane identity required to interact with the runtime and, where applicable, the current Pane.

The component should consume application-owned capabilities through `useApplicationContext()` rather than constructing those services directly.

If the Module needs per-instance service state, expose a factory through ApplicationContext rather than making one global singleton.

## 4. Add the Browser-Only Public UI Export When Needed

If the component is consumed outside its owning folder/Domain, export it through the owning `/ui` API.

Examples:

```text
$lib/application/ui
$lib/domains/bible/ui
$lib/domains/notes/ui
$lib/domains/reading-plans/ui
```

Do not export Svelte components through the Node-safe root API.

Internal same-owner implementation files may import concrete component files directly.

## 5. Register the Rendering Mapping

Add the Module to `resolveModuleComponent()`.

The mapping must be explicit:

```text
Modules.<NEW>
    → NewModuleContainer
```

Do not add a default fallback.

`Modules.NULL` remains intentionally non-renderable.

Update the resolver tests so the mapping is exercised and unsupported values still fail clearly.

## 6. Define Resource Requirements

Every renderable Module created through `ModuleBufferFactory` needs a registered `ModuleResourceSelectionContributor`.

The contributor owns how the Module's Resource selections are derived.

It receives:

```text
originatingSelections
currentSelections
```

and returns the complete Resource-selection snapshot for the Buffer.

For an independent Module, the originating selection set is empty.

For a related Module, the originating Buffer's selections are supplied so the contributor may inherit relevant Resource context.

Do not put Module-specific branching in `ModuleResourceSelectionBuilder`.

If the Module requires no Resources, its contributor may legitimately return an empty selection set.

## 7. Register the Contributor in Application Composition

`Application` is the composition root.

Construct/register the Module's Resource-selection contributor there with the other contributors.

The generic builder should receive contributors as data/dependencies rather than importing Domains and branching itself.

## 8. Define Initial `bag` State

Determine what runtime/navigation state belongs in `Buffer.bag`.

Keep this state Module-specific.

Do not add generic Buffer fields for state used by only one Module.

`ModuleBufferFactory` shallow-copies the supplied navigation context when creating a new Buffer so common top-level mutations do not alias the caller's object.

If the Module needs deeper immutable semantics, own that behavior within the Module rather than changing Buffer generically without evidence.

## 9. Open or Replace the Module Through WorkspaceRuntime

Svelte should use `WorkspaceRuntime` for Workspace operations.

Typical operations include:

```text
replace the current Pane's Buffer
split and create a related Module
close a Pane
find the current Pane
```

Do not expose or consume `PaneService` directly.

The Module chooser is one example of replacing the current Buffer through WorkspaceRuntime.

## 10. Resolve Resources Inside the Module

Module UI reads the captured Resource context through `ModuleResourceSelectionResolver` using:

```text
paneID
    → Pane
    → Buffer.resourceSelections
    → required Resource Type
```

The resulting `PublishedResourceReference` is passed to the relevant Domain service.

Domain services must not receive Pane or Buffer objects.

## 11. Add Tests

At minimum consider tests for:

- component resolver registration;
- Resource-selection contributor behavior;
- independent vs related Buffer selection behavior;
- any nontrivial Module-specific navigation state;
- Workspace behavior if the new Module changes split/replace behavior.

Use browser tests only when browser/Svelte integration is actually part of the behavior being tested.

## 12. Update Documentation

Update the Module contract/registration docs only when the generic contract changes.

A new Module normally does not require a new generic architecture document.

Domain-specific behavior belongs in the relevant Domain implementation documentation.

## Checklist

```text
[ ] ownership chosen
[ ] Modules enum value added without renumbering existing values
[ ] Svelte container implemented
[ ] /ui export added if externally consumed
[ ] component resolver mapping + test added
[ ] Resource-selection contributor implemented
[ ] contributor registered by Application
[ ] Buffer.bag initial state defined
[ ] WorkspaceRuntime used for Pane/Buffer operations
[ ] ModuleResourceSelectionResolver used for captured Resource context
[ ] focused tests added
```
