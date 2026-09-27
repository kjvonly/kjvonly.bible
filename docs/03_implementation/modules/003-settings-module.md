# Settings Module Implementation

## Status

**Current**

**Area:** `client/kjvonly-pwa`

Primary implementation:

```text
client/kjvonly-pwa/src/lib/application/modules/settings/
```

Application settings authority:

```text
client/kjvonly-pwa/src/lib/application/services/settings.service.ts
```

Navigation architecture:

```text
docs/03_implementation/runtime/016-navigation-architecture.md
```

---

# Purpose

The Settings module is the application UI for viewing and editing application settings.

It separates three responsibilities:

```text
SettingsService
    application-global Settings authority and persistence

Pane navigation runtime
    one flat mounted navigation history per Pane

Settings feature contexts/services
    Settings-specific rendering/navigation behavior
```

The Settings module no longer owns a private generic `NavigationService` or a `SettingsContainer` navigation shell.

Settings views participate directly in the Pane's application navigation stack.

---

# 1. Core Ownership Model

The current ownership model is:

```text
Application
    ↓
SettingsService
    application-global values
    persistence
    normalization
    subscriber publication
    document/theme application

Pane
    ↓
PaneNavigation
    settings.root
    settings.group
    settings.select
    settings.custom

SettingsNavigationEntry
    ↓
SettingsContext
SettingsNavigationContext
    ↓
Settings views/components
```

The key rule is:

> **Settings values are application-global, while the live UI state of each mounted Settings navigation entry remains local to that mounted interaction.**

---

# 2. SettingsService Is the Value Authority

`SettingsService` owns application Settings values.

Svelte Settings components do not directly use `localStorage` as their persistence mechanism.

The service owns:

```text
load persisted Settings
normalize Settings
update one setting
persist the merged Settings snapshot
apply visual Settings to the application
publish updated snapshots to subscribers
```

This makes multiple Settings views consistent without turning one mounted Settings component into the application authority.

---

# 3. Multi-Instance Semantics

Multiple Settings interactions can be mounted at the same time.

They share application Settings values through `SettingsService` but do not share local UI state.

Example:

```text
Pane A
    settings.root
    search query = "font"

Pane B
    settings.group
    page = bible
```

Changing a setting in Pane B updates application Settings and is reflected in Pane A through the service subscription.

Pane A's search query and mounted navigation state remain independent.

---

# 4. Definition-Driven UI

Settings structure is declared through the Settings definition rather than one component per setting.

The definition describes concepts such as:

```text
pages
sections
rows
row types
setting keys
select options
semantic IDs
icons
search metadata
custom view IDs
formatters
```

Stable semantic IDs are used instead of Svelte component constructors in definition data.

Resolvers map those IDs to presentation behavior where needed.

---

# 5. Important Settings Files

Current structure is approximately:

```text
application/modules/settings/
    components/
        settingsIcon.svelte
        settingsPage.svelte
        settingsRow.svelte
        settingsScreen.svelte
        settingsSearch.svelte
        settingsSection.svelte

    definitions/
        settings.definition.ts

    models/
        settings-definition.model.ts
        settings-navigation.model.ts

    resolvers/
        settings-custom-view-component-resolver.ts
        settings-definition-resolver.ts
        settings-icon-component-resolver.ts
        settings-value-formatter.ts

    runtime/
        settings-context.ts
        settings-navigation-context.ts

    search/
        settings-search.model.ts
        settings-search.ts

    services/
        settings-navigation.service.ts

    settings-navigation-view-registrations.ts
    settingsNavigationEntry.svelte
    settings.svelte
    settingsGroupPage.svelte
    settingsChoicePage.svelte
    settingsCustomPage.svelte
```

---

# 6. Stable Navigation View IDs

Settings owns these stable Pane navigation views:

```ts
SETTINGS_VIEWS.ROOT
    = 'settings.root'

SETTINGS_VIEWS.GROUP
    = 'settings.group'

SETTINGS_VIEWS.SELECT
    = 'settings.select'

SETTINGS_VIEWS.CUSTOM
    = 'settings.custom'
```

All four are registered by the Settings feature through:

```text
settings-navigation-view-registrations.ts
```

Application composition installs those registrations into the shared navigation registry.

There is no Settings-specific runtime component registry hidden inside `SettingsContainer`.

---

# 7. Settings Navigation Uses the Pane Stack

Settings navigation is ordinary Pane navigation.

Example:

```text
modules.root
settings.root
settings.group
settings.select
```

Only the top entry is visible.

Previous Settings views remain mounted.

Back from `settings.select` reveals the exact mounted `settings.group` entry.

Back again reveals the exact mounted `settings.root` entry.

This is the same mounted-state preservation contract used by Bible, Search, Plans, and other application views.

---

# 8. SettingsNavigationEntry

`SettingsNavigationEntry.svelte` is the shared registered component for the Settings view IDs.

It is not a separate navigation stack owner.

It consumes the current Pane navigation entry through:

```text
NavigationEntryContext
```

and resolves which Settings screen to render from:

```text
navigationState.view
```

Conceptually:

```text
settings.root
    → Settings

settings.group
    → SettingsGroupPage

settings.select
    → SettingsChoicePage

settings.custom
    → SettingsCustomPage
```

The surrounding application `NavigationEntry` remains the owner of generic navigation-entry state and lifecycle.

---

# 9. SettingsContext

Each mounted Settings entry provides a feature-local `SettingsContext` containing a reactive Settings projection and an update capability.

Conceptually:

```ts
interface SettingsContext {
    settings: Settings;

    update<K extends keyof Settings>(
        setting: K,
        value: Settings[K]
    ): void;
}
```

The context is not the persistence authority.

Updates delegate to `SettingsService`.

The mounted Settings entry subscribes to `SettingsService` so external changes update its reactive projection.

---

# 10. Settings Service Subscription Lifecycle

A mounted Settings entry:

```text
reads initial Settings
subscribes with a unique subscriber ID
updates its local reactive projection on publication
unsubscribes when destroyed
```

This prevents destroyed Settings entries from remaining active subscribers.

Hidden entries remain mounted, so they remain synchronized while hidden.

That is intentional because Settings values are live application-global state.

---

# 11. SettingsNavigationContext

`SettingsNavigationContext` exposes the Settings-specific navigation facade to descendants such as rows and search results.

It is local to the nearest Settings entry subtree through Svelte context lookup.

The context is not a global Settings navigator.

---

# 12. SettingsNavigationService

`SettingsNavigationService` is a feature facade over the Pane navigation capability.

It translates declarative Settings meaning into semantic Settings view navigation.

The service does not own a stack.

Conceptually:

```text
Settings row/search result
    ↓
SettingsNavigationService
    ↓
PaneNavigation.pushView(...)
```

Its current semantic operations include:

```text
navigate(row)
navigateToSearchResult(result)
navigateToPage(pageID, focusRowID?)
back()
```

---

# 13. Row Navigation

Settings rows that navigate are semantic definitions.

Examples:

```text
group
    → settings.group

select
    → settings.select

custom
    → settings.custom
```

The generic row renderer does not import the destination Svelte components.

It asks `SettingsNavigationService` to interpret the declarative row.

---

# 14. Navigation State

Settings child entries carry small serializable state.

Group page:

```ts
{
    pageID,
    focusRowID?
}
```

Select/custom page:

```ts
{
    rowID
}
```

The feature view validates/reads only the semantic fields it needs.

Do not put Svelte components, callbacks, services, or definition objects into navigation state.

---

# 15. Root Settings View

`settings.svelte` is the root Settings screen.

It owns root-view UI state such as:

```text
search query
search result presentation
root-page interaction state
```

That state stays alive while child Settings entries are pushed because `settings.root` remains mounted hidden.

This is why returning from a child Settings page preserves the root search interaction without explicit reconstruction.

---

# 16. Settings Search

Settings search is derived from the declarative Settings definition.

Search should not maintain a second unrelated model of available Settings.

The search index can include:

```text
page titles
section titles
row titles
row descriptions
select option labels
search metadata
```

Search results use semantic IDs and route through `SettingsNavigationService`.

---

# 17. Search Result Navigation

A search result may target:

```text
a row on the root page
a row on another Settings group page
a select/custom row destination
```

`SettingsNavigationService` interprets that semantic destination.

For a non-root page it can push:

```text
settings.group
    state.pageID
    state.focusRowID
```

The target page then focuses its own row.

---

# 18. Focused Row Behavior

When `focusRowID` is present, the target Settings page scopes row lookup to its own page DOM.

Do not use a global document query to locate the row because hidden prior Settings pages may still be mounted.

The page may:

```text
scroll the row into view
center it when possible
apply temporary focus/pulse presentation
avoid repeating identical focus unnecessarily
```

Reduced-motion preference should be respected by the scrolling/focus behavior.

---

# 19. SettingsScreen

`SettingsScreen` is the shared Settings presentation shell for root/group/select/custom views.

It centralizes common presentation such as:

```text
ViewHeader
ViewBody
title
Back/Close affordances
body layout/padding
```

`SettingsScreen` composes the shared view-region primitives but does not own the Pane shell. The single `PaneSurface` remains above the navigation stack.

Pane layout measurement comes from the Pane-owned layout context where required rather than being threaded through generic navigation props.

---

# 20. Closing and Back

Settings no longer needs two separate hosting modes such as:

```text
Workspace Settings module
Bible Settings popup
```

Migrated Settings interactions use normal Pane navigation.

For a child Settings view:

```text
Back
    → navigation.back()
```

For the root Settings entry, normal application navigation policy determines whether Back reveals the previous Pane entry or the Modules root.

Pane structural deletion remains the `modules.root` close policy, not Settings-specific Workspace manipulation.

---

# 21. Settings Values Versus Settings UI State

Do not conflate:

```text
application Settings value
    application-global / SettingsService

Settings navigation state
    Pane NavigationState

Settings root search query
    mounted root-view local state

Settings reactive projection
    feature context synchronized from SettingsService
```

These scopes intentionally have different lifetimes.

---

# 22. Live Versus Persistent State

Settings values are durable application preferences.

Settings navigation is persisted as part of the Pane navigation stack:

```text
Pane.state.navigation
```

View-local transient UI state such as a live search input survives same-session Back because the component remains mounted. It is not automatically promoted into Settings persistence.

A browser reload reconstructs the component tree from semantic navigation state; it does not restore arbitrary component-local DOM state.

---

# 23. Multi-Instance Synchronization

Expected behavior:

```text
Settings A changes a value
    ↓
SettingsService persists + publishes
    ↓
Settings A updates projection
Settings B updates projection
other application consumers update
```

This publication is synchronization, not another user-originated persistence mutation.

The subscriber path should not republish the same change.

---

# 24. Definition and Resolver Boundaries

The Settings definition remains data.

Resolvers own mapping from semantic identifiers to concrete presentation behavior.

Examples include:

```text
icon ID → icon component
custom view ID → custom component
formatter ID → formatting function
page/row ID → definition lookup
```

Avoid storing framework component constructors inside persisted or declarative Settings data when a semantic ID can represent the same choice.

---

# 25. Generic Rendering

Generic Settings components should remain driven by definitions and contexts.

Typical flow:

```text
SettingsDefinition
    ↓
SettingsPage
    ↓
SettingsSection
    ↓
SettingsRow
```

Specialized custom views are escape hatches for behavior that does not fit a generic row type.

---

# 26. Important Boundaries

Settings components should not:

```text
create a generic NavigationService
create a NavigationServiceFactory
render their own NavigationContainer stack
mutate Workspace Pane geometry for normal Settings navigation
persist settings directly to localStorage
store callbacks/components in NavigationState
use Pane objects as Settings identity
```

They should consume:

```text
SettingsService through application ownership
PaneNavigation through navigation context/facade
NavigationEntryContext for current entry state
SettingsContext for Settings values
SettingsNavigationContext for Settings semantics
```

---

# 27. Removed Settings Navigation Architecture

The navigation refactor removed/superseded the previous Settings structure:

```text
SettingsContainer as module/navigation composition root
module-local generic NavigationService
NavigationServiceFactory
legacy generic NavigationContainer
NavigationView { component, obj }
bind:obj navigation payloads
Settings-specific popup host mode
paneID-based Settings close behavior
bind:pane compatibility handling
root close callback stored in navigation obj
```

Do not reintroduce these patterns.

---

# 28. Testing Priorities

High-value Settings tests include:

## Persistent mounted root

```text
settings.root
    search = "pericopes"

push child
Back
```

Verify the exact root DOM/input instance remains and the query is preserved.

## Multi-instance synchronization

Mount two Settings interactions.

Verify a Settings value mutation in one updates the other while their navigation/search state remains independent.

## Search navigation

Verify search result IDs resolve to the expected Settings destination and optional focused row.

## Definition integrity

Verify semantic IDs are unique and resolver-referenced IDs are valid.

## Subscription cleanup

Destroy a Settings entry and verify its SettingsService subscription is removed.

---

# 29. Adding a Setting

A normal new setting should usually require changes in the smallest applicable set:

```text
Settings model/defaults/normalization
Settings definition
optional formatter/icon/custom resolver entry
tests
```

Do not add a bespoke navigation branch when the definition can describe the destination.

---

# 30. Summary

The current Settings architecture is:

```text
SettingsService
    global value authority
    persistence
    synchronization

SettingsDefinition
    declarative information architecture

PaneNavigation
    shared application navigation history

settings.* stable view IDs
    registered by Settings feature

SettingsNavigationEntry
    shared entry component
    provides feature contexts
    resolves current Settings screen

SettingsContext
    local reactive projection + update capability

SettingsNavigationService
    feature semantic facade over PaneNavigation

SettingsNavigationContext
    descendant access to Settings navigation meaning

Settings views
    local presentation/search/focus state
```

The central rule is:

> **Settings is a feature on the shared Pane navigation architecture, not a navigation subsystem of its own. Settings values remain application-global; mounted UI state remains local to the interaction that owns it.**
