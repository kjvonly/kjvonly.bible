# Persistent UI Lifecycle

## Status

**Current Application Standard / Architecture Guidance**

Repository path:

```text
docs/03_implementation/runtime/010-persistent-ui-lifecycle.md
```

Related navigation detail:

```text
docs/03_implementation/runtime/016-navigation-architecture.md
```

---

# 1. Purpose

This document defines lifecycle semantics for UI that remains mounted while temporarily hidden.

The current Pane navigation model deliberately preserves previous navigation entries in the DOM until they are popped.

This produces three distinct lifecycle states:

```text
active
inactive but mounted
destroyed
```

The central rule is:

> **Hidden is not destroyed, and mounted is not necessarily active.**

Components, subscriptions, workers, media, timers, and callbacks must choose behavior according to that distinction.

---

# 2. Persistent Navigation Behavior

For a stack:

```text
modules.root
plans.subscription-details
bible.reader
```

only `bible.reader` is active and visible.

The previous entries remain mounted.

Back removes only the top entry:

```text
modules.root
plans.subscription-details
```

The existing Plans component is revealed rather than recreated.

---

# 3. Why Mounted Preservation Matters

Keeping prior entries mounted naturally preserves:

```text
DOM identity
local Svelte state
browser input values
scroll-owned DOM state
editor runtime state
component-owned caches
feature-local subscriptions that intentionally continue
```

No feature-specific reconstruction is needed for ordinary Back navigation.

---

# 4. Persistence Does Not Mean DOM Persistence Across Reload

Mounted identity exists only within the live browser session.

On reload:

```text
Pane.state.navigation survives
NavigationState[] is restored
NavigationView[] is rebuilt
components mount again
DOM identity is new
```

Tests should distinguish:

```text
Back preserves same instance
reload restores same semantic state
```

These are different contracts.

---

# 5. PaneNavigationContainer Lifecycle

`PaneNavigationContainer` renders every runtime `NavigationView`.

Non-active entries are hidden rather than removed.

The renderer keys entries by runtime `NavigationView` object identity.

Conceptually:

```svelte
{#each $views as navigationView, index (navigationView)}
    <div class={index === $views.length - 1 ? '' : 'hidden'}>
        <NavigationEntry {navigationView} ... />
    </div>
{/each}
```

The key is required so a pop followed by another push at the same array depth does not reuse the previous `NavigationEntry` component incorrectly.

---

# 6. NavigationEntry Lifecycle

Each mounted runtime entry has one `NavigationEntry` wrapper.

It owns entry-scoped runtime setup such as:

```text
NavigationEntryContext
entry-scoped result registration bridge
whenActive lifecycle tracking
entry semantic-state mutation bridge
entry Resource-selection mutation bridge
```

When the entry is popped, that `NavigationEntry` is destroyed and entry-owned runtime registrations are cleaned up.

---

# 7. Active Versus Mounted

An entry may be mounted but inactive.

Use `NavigationEntryContext.isActive()` when behavior depends on current top-entry status.

Do not infer active state from:

```text
component mounted
component exists in DOM
module type
Pane identity
```

The top runtime entry is active by definition.

---

# 8. `whenActive()`

`whenActive()` registers one-shot work that should happen when the current entry becomes active again.

Typical result flow:

```text
parent entry active
    ↓
push child
    ↓
parent hidden/mounted
    ↓
child backWithResult(...)
    ↓
parent result handler schedules whenActive(...)
    ↓
child pops
    ↓
parent becomes active
    ↓
callback runs once
```

The subscription is entry-owned and must be canceled if the entry is destroyed before activation.

---

# 9. Navigation Results

`onResult()` registers runtime-only handlers for the current entry.

`backWithResult()` delivers to the direct mounted parent before the child is popped.

Important lifecycle properties:

```text
result handler belongs to mounted parent entry
handler is not persisted
handler may be async
child is not popped until result delivery completes
normal Back delivers no result
entry destruction removes its runtime registrations
```

Do not encode result handlers into `NavigationState`.

---

# 10. Component-Local State

Local component state is the preferred owner when state only needs to survive while the entry remains mounted.

Examples:

```text
search query
expanded section
selected local tab
unsaved presentation state
scroll helper state
open inline menu
```

Because hidden entries remain mounted, this state survives ordinary child navigation automatically.

Do not persist it merely to preserve Back behavior.

---

# 11. Semantic State That Must Survive Reload

When state must survive reload or Workspace restoration, place the serializable semantic portion in `NavigationState.state` if navigation owns it.

Examples:

```text
Bible location
Plan subscription/detail ID
selected search navigation parameters
note ID
a Settings subpage destination when it is part of the persisted stack
```

Keep runtime implementation objects out of persisted state.

---

# 12. Resource Snapshot Lifecycle

An entry's Resource selections remain associated with that entry while it is hidden.

```text
NavigationState.state.resourceSelections
```

Hiding an entry does not cause it to re-resolve from current application defaults.

This preserves independent interaction context.

An explicit Resource update changes that entry's snapshot through the entry navigation boundary.

---

# 13. Subscriptions

Every subscription must have an owner and a policy for inactivity.

Possible policies:

```text
continue while mounted
pause while inactive
unsubscribe/recreate on activation
exist only while active
exist for Application lifetime
```

Choose deliberately.

A subscription should not continue merely because the component happened to remain mounted if inactive work would be incorrect or expensive.

---

# 14. Service Subscribers

Application-global service subscriptions often remain useful while a feature entry is hidden.

Example: a mounted Settings instance may continue receiving application Settings snapshots so it is current when revealed.

If the projection does not need hidden updates, it may pause instead.

The owner determines the policy.

---

# 15. Workers

Worker lifecycle is independent from DOM visibility unless the owner intentionally couples them.

Possible patterns:

```text
Application-owned worker
    survives all Pane/view lifecycle

feature runtime worker
    exists while feature entry is mounted

active-only expensive worker
    starts/stops with entry activity

ephemeral operation worker
    exists only for one import/export/search operation
```

Do not use one blanket rule for all workers.

---

# 16. Timers and Polling

Timers owned by a hidden entry can continue consuming resources and mutating UI state.

Ask whether the timer should:

```text
continue while hidden
pause while hidden
restart on activation
move to an application-owned service
```

Entry activity provides the correct semantic signal when visibility matters.

---

# 17. Audio and Media

Media may have lifecycle semantics different from visual component visibility.

For example, future audio playback might intentionally continue while its originating view is hidden.

The media owner must decide:

```text
UI hidden
    does playback continue?

entry destroyed
    does playback stop or transfer to application owner?
```

Do not let Svelte destruction accidentally define product behavior.

---

# 18. Focus and Accessibility

Hidden navigation entries must not participate in normal user interaction.

The navigation renderer's hidden state should prevent inactive content from acting as visible interactive UI.

When an entry becomes active again, existing DOM state is revealed.

If explicit focus restoration is required, keep it as UI/navigation lifecycle behavior rather than Domain state.

---

# 19. Layout Lifecycle

`PaneLayoutContext` is owned by the rendered Pane.

It exposes reactive layout values such as `clientHeight` to descendants.

A navigation entry becoming hidden does not create a second Pane layout owner.

Feature components consume the Pane's measurement rather than independently redefining Pane sizing.

---

# 20. Pop Lifecycle

Back from depth greater than one performs the semantic lifecycle transition:

```text
active top entry
    ↓
persisted top state removed
    ↓
runtime top NavigationView removed
    ↓
NavigationEntry destroyed
    ↓
previous mounted entry becomes active
```

The previous entry is not remounted.

---

# 21. Push Lifecycle

Push performs:

```text
build semantic NavigationState
resolve runtime component
persist new entry
publish runtime NavigationView
previous entry stays mounted/inactive
new entry mounts/active
```

Persistence is updated before runtime notification so synchronous activation subscribers cannot observe a runtime stack that has not yet been persisted.

---

# 22. Split Lifecycle

A split does not hide the originating entry behind another entry in the same Pane.

Instead it creates another Pane with an independent navigation runtime.

The origin Pane remains active with its existing stack.

The new Pane starts with:

```text
modules.root
[target when non-root]
```

Each Pane then owns independent mounted-entry lifecycles.

---

# 23. Closing `modules.root`

`modules.root` represents the Pane's default/empty navigation state.

Closing an ordinary working entry uses Back.

Closing `modules.root` requests structural Pane deletion.

If it is the final Pane, deletion is rejected and the Pane remains.

This is Workspace lifecycle, not ordinary child-entry lifecycle.

---

# 24. Multi-Pane Lifecycle Isolation

Two Panes must have independent lifecycle state.

Example:

```text
Pane A
    Search hidden under Bible

Pane B
    Settings root active
```

Activating/popping entries in Pane A must not affect:

```text
Pane B entry activity
Pane B result handlers
Pane B Resource snapshots
Pane B component identity
Pane B layout context
```

---

# 25. Hidden State and Derived Work

A hidden component may still react to live stores and recompute `$derived` values.

That is acceptable when cheap and semantically correct.

For expensive work, consider:

```text
entry activity gate
service-level memoization
worker pause/restart
ephemeral worker creation
```

Do not optimize by destroying the entire entry if same-instance Back preservation is part of the interaction contract.

---

# 26. Destroy Cleanup

When an entry is actually destroyed, release all entry-owned runtime resources.

Examples:

```text
Svelte subscriptions
manual store subscriptions
whenActive subscriptions
result registrations
DOM listeners
feature-owned workers
timers
media handles when entry-owned
AbortControllers
```

Cleanup is part of ownership, not optional polish.

---

# 27. Anti-Patterns

Avoid:

```text
treating mounted as active
reconstructing previous view on Back
persisting local UI state only to survive Back
global activity flag shared by all Panes
hidden entry resolving Resources from active top entry
result handlers surviving destroyed entries
whenActive subscriptions leaking after destruction
array-index keyed navigation entries
feature directly mutating runtime views
component destruction accidentally owning application-global work
```

---

# 28. Lifecycle Decision Table

| State/capability | Hidden entry | Destroyed entry |
| --- | --- | --- |
| Local Svelte state | preserve | release |
| DOM identity | preserve | release |
| NavigationState | preserve | removed when popped |
| Entry Resource snapshot | preserve | removed with entry |
| Result registration | preserve while entry exists | cleanup |
| `whenActive` subscription | preserve until activation | cleanup |
| Application service | continue | continue |
| Entry-owned subscription | owner decides active/hidden policy | cleanup |
| Entry-owned worker | owner decides | cleanup |
| Application-owned worker | continue | continue |

---

# 29. Architecture Invariants

1. Active, inactive-mounted, and destroyed are distinct states.
2. Push hides the previous entry without destroying it.
3. Back destroys only the popped entry and reveals the previous instance.
4. Navigation entries are keyed by runtime identity, not array index.
5. Same-session Back preserves component/DOM identity.
6. Reload preserves semantic state, not DOM identity.
7. Entry Resource snapshots survive inactivity unchanged unless explicitly updated.
8. Result and activation registrations are runtime-only and entry-owned.
9. Hidden entries do not become a source of Pane-global state.
10. Destroy cleanup releases all entry-owned resources.
11. Application-owned work does not accidentally stop because one view is destroyed.
12. Multi-Pane lifecycle state remains isolated.

---

# 30. Testing Guidance

High-value browser/runtime tests include:

```text
push child → parent DOM node remains mounted
Back → exact same parent DOM node visible
pop + push different view at same depth → old component destroyed
normal Back → no result callback
backWithResult → parent handler runs before child pop
whenActive → callback runs after parent becomes active
entry destroyed before activation → pending activation callback does not leak
Resource selection remains entry-local across hidden/visible transitions
reload → semantic stack restored with new DOM instances
two Panes → independent activity/lifecycle
```

---

# 31. Summary

Persistent UI lifecycle is based on one simple distinction:

```text
hidden != destroyed
mounted != active
```

The navigation runtime preserves prior entries because same-instance continuation is valuable. Runtime owners must therefore decide explicitly what continues while hidden, what pauses until active, and what is released only on destruction.
