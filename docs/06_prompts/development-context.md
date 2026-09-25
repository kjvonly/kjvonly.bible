# KJVOnly.bible Development Context

I am continuing development and cleanup of **KJVOnly.bible**, an offline-first Bible PWA.

Use this prompt as the baseline mental model for the codebase. Do not redesign established architecture unless I explicitly ask for architectural changes.

---

# 1. Project Overview

Repository:

```text
~/git/kjvonly.bible
```

Primary application:

```text
client/kjvonly-pwa
```

The PWA is built with:

```text
SvelteKit
Svelte 5
TypeScript
Tailwind CSS
IndexedDB
Web Workers
Nostr
```

The application is browser-only. There is no SSR application architecture to preserve.

The app provides features such as:

```text
Bible reading
Bible search
Strong's
Notes
Reading plans
Text markup / highlighting
Resource discovery
Import / Export
Settings
Themes
Workspace / panes
```

The backend/supporting services include:

```text
relay/
blossom/
Postgres
MinIO
```

---

# 2. High-Level Architecture

The main architectural flow is:

```text
Published Resource
    ↓
Resource Resolution
    ↓
Resource Content decoding
    ↓
Domain Object Factory
    ↓
Domain Object
    ↓
Domain Store
    ↓
Application / Module
```

Resources are external/publishable representations.

Domain objects are the application's internal model.

Do not collapse these concepts together.

In particular:

```text
Resource ID
```

and:

```text
Domain Object ID
```

are different concepts and should remain separate.

---

# 3. Application Composition

Application services are composed through:

```text
Application
    ↓
ApplicationContext
```

Modules should normally consume application-facing services through the application context.

Avoid introducing new global singleton dependencies when a service already exists in the application composition root.

Infrastructure details should not leak unnecessarily into domain/UI code.

---

# 4. Domain Structure

The application is organized primarily by domains.

Conceptually:

```text
src/lib/
├── application/
├── components/
├── domains/
│   ├── bible/
│   ├── notes/
│   ├── reading-plans/
│   ├── strongs/
│   └── ...
├── infrastructure/
└── resource/
```

Inside a domain, prefer explicit folders based on responsibility:

```text
models/
services/
persistence/
resources/
runtime/
modules/
ui/
```

Do not dump unrelated files into a single large directory.

---

# 5. Import Boundaries

Within the same domain:

```text
use relative imports
```

For cross-domain imports:

```text
import through the other domain's public entrypoint
```

Example:

```ts
import { Something } from "$lib/domains/bible";
```

Do not deep-import another domain's internal implementation unless there is a deliberate architectural reason.

Important distinction:

The domain root:

```text
$lib/domains/<domain>/index.ts
```

must remain **Node-safe**.

Browser/Svelte-specific exports belong under:

```text
$lib/domains/<domain>/ui
```

Cross-domain browser/UI imports should therefore use:

```text
$lib/domains/<domain>/ui
```

Do not re-export Svelte/browser-only components through the domain root barrel.

---

# 6. Workspace Mental Model

The UI workspace consists of panes.

Conceptually:

```text
Workspace
    ↓
Pane tree
    ↓
Pane
    ↓
Buffer
    ↓
Module
```

The workspace uses a recursive pane tree.

A Pane may represent either:

```text
branch/internal node
```

or:

```text
leaf/rendered pane
```

Therefore branch nodes may legitimately have no pane ID or Buffer.

Do not assume every Pane object represents a visible pane.

---

# 7. Stable Pane Identity

This is important.

The stable identity of a rendered pane is:

```text
paneID
```

not:

```text
Pane object reference
```

Pane objects can be replaced or restructured when panes are split, removed, or moved.

UI/runtime code should therefore preserve:

```text
paneID
```

and re-resolve the current Pane when necessary.

Do not cache a Pane object and assume it remains stable for the lifetime of a module.

---

# 8. Buffer Mental Model

A Pane owns a Buffer.

Conceptually:

```text
Pane
    ↓
Buffer
    ↓
componentName
    ↓
module component resolver
    ↓
Svelte module
```

Buffers contain persisted/runtime module information.

They do **not** directly persist Svelte component constructors.

Buffers also contain:

```text
Buffer.resourceSelections
```

These are resource selections captured for that concrete module instance.

---

# 9. Resource Selection

Modules should consume resource selections captured in their Buffer.

The established pattern is:

```ts
moduleResourceSelectionResolver.require(paneID, RESOURCE_TYPE);
```

Do not repeatedly fall back to mutable global resource selections when a module already has captured Buffer selections.

Each domain/module owns its resource requirements.

Avoid central logic such as:

```ts
if (module === BIBLE) {
   ...
}
```

for determining all module resource dependencies.

Instead, module/domain-specific resource contributors own those requirements.

---

# 10. Bible Module

The Bible module consumes several resources, including concepts such as:

```text
Bible Chapters
Bible Search Index
Paragraphs
Pericopes
Bible Booknames
Strong's
Bible Text Markup
Notes
```

Paragraphs, pericopes, text markup, etc. are real module dependencies and should use the established resource-selection architecture.

---

# 11. Bible Text Markup

The old annotations architecture has been replaced with:

```text
Bible Text Markup
```

Conceptually:

```text
objectType:
bible/text-markup

objectId:
<publisher>/kjvs/<chapterRef>

id:
bible/text-markup:<publisher>/kjvs/<chapterRef>
```

A markup object stores markings by token index.

The editor currently supports formatting such as:

```text
text color
background/highlight
underline/decoration
```

Text markup is persisted through the domain/resource publication architecture.

Do not reintroduce the old annotation/Nostr-specific implementation.

---

# 12. Outbox / Publication

The publication boundary is:

```text
Domain Object
    ↓
ResourcePublication
    ↓
Outbox
    ↓
Publisher
```

The Outbox stores the final publication entry.

The Outbox ID is based on the Domain Object ID.

Repeated writes for the same object use last-write-wins semantics.

Do not bypass this architecture by publishing directly from UI/domain components.

---

# 13. UI Ownership

Prefer clear ownership of:

```text
height
overflow
outline
padding
scrolling
header/body layout
```

Avoid having multiple nested components fight over the same layout responsibility.

The common pane/module structure is approximately:

```text
PaneContainer
    ↓
BufferContainer
        ↓
BufferHeader
        ↓
BufferBody
```

Use existing shared components when possible rather than recreating common buttons, icons, headers, or containers.

---

# 14. SVG / Icon Conventions

Avoid hard-coded inline SVG markup inside feature components when the icon is reusable.

Prefer:

```text
$lib/components/svgs/
```

and shared button components such as:

```text
KJVButton
```

If an equivalent shared SVG already exists, reuse it rather than creating another copy.

For new icons, prefer consistent filled Material-style icons where appropriate.

SVG components should normally inherit semantic application colors instead of hard-coded colors.

For example:

```text
currentColor
```

or passed Tailwind fill/text classes.

---

# 15. Styling

Use Tailwind utilities where practical.

Prefer:

```text
gap-2
ml-2
-mr-*
flex
overflow-x-auto
```

over inline pixel styles when Tailwind can express the layout clearly.

Use semantic application theme classes such as:

```text
bg-neutral-50
text-neutral-700
bg-primary-500
border-neutral-400
bg-highlighta
```

Avoid hard-coded RGB/hex colors in feature components.

The theme system owns the actual palette.

## Tailwind dynamic-class retention

Tailwind only emits utility classes it can discover statically in source.

If a semantic class is selected dynamically through a resolver/map and the literal class name never appears in rendered source, the class may be omitted from the generated CSS.

This can affect classes such as:

```text
text-vivid-*
text-support-*
text-highlight*
decoration-highlight*
```

When a finite set of semantic classes is intentionally selected dynamically, keep literal hidden references in DOM/source so Tailwind can discover them.

Example:

```svelte
<!-- Tailwind must see these literal classes. Keep them in source/DOM. -->
<span class="text-highlighta hidden"></span>
<span class="text-highlightb hidden"></span>
<span class="text-highlightc hidden"></span>
<span class="text-highlightd hidden"></span>
<span class="text-highlighte hidden"></span>

<span class="decoration-highlighta hidden underline"></span>
<span class="decoration-highlightb hidden underline"></span>
<span class="decoration-highlightc hidden underline"></span>
<span class="decoration-highlightd hidden underline"></span>
<span class="decoration-highlighte hidden underline"></span>
```

The same pattern is appropriate for dynamically resolved semantic colors when the literal Tailwind utilities otherwise do not occur in statically discoverable markup.

Before debugging an SVG using `currentColor`, verify that the expected Tailwind `text-*`, `fill-*`, or `decoration-*` utility was actually emitted.

Do not replace semantic theme classes with hard-coded colors merely to work around Tailwind class discovery.

---

# 16. Settings / Themes

Settings include visual properties such as:

```text
fontSize
fontWeight
fontFamily
colorTheme
isDarkTheme
```

and some module-display settings.

Settings persistence is owned by the Settings service.

Do not write directly to localStorage from UI components unless the architecture explicitly requires it.

The theme system uses semantic tokens and supports multiple light/dark themes.

---

# 17. Workers

Workers are used for expensive or isolated tasks such as:

```text
Resource processing
Archive import/export
Search
```

Keep worker boundaries one-directional.

Do not allow worker implementation modules to import browser worker factories if that creates circular Vite worker graphs.

Browser worker construction should live at the main-thread boundary.

---

# 18. Archive / Import / Export

Archive operations use ephemeral workers.

The architecture intentionally separates:

```text
Archive UI
Archive service
Worker
Resource decoding
Domain persistence
Application event notification
```

Import/export should reuse established domain/resource pipelines rather than implementing special-case persistence.

---

# 19. Development Style

When investigating an issue:

1. Inspect the current supplied source.
2. Treat the newest file I provide as authoritative.
3. Inspect nearby tests and established patterns before changing code.
4. Identify the smallest correct change.
5. Preserve existing architecture and behavior unless the requested change intentionally modifies it.
6. Avoid unrelated cleanup in the same patch.
7. Tell me briefly if you discover an important behavioral implication.
8. Produce a patch.
9. Verify the patch applies before giving it to me.
10. Give validation commands separately from patch-application commands.

I prefer incremental work.

Do not generate a giant refactor unless I explicitly request one.

When a larger refactor is necessary, break it into small independently reviewable patches whenever practical.

---

# 20. Patch Workflow

When I ask for a code change, produce a downloadable `.patch` file unless I explicitly ask for another format.

## 20.1 Patch filename convention

Use:

```text
YYYYMMDD-<scope>-<description>.patch
```

Where:

```text
YYYYMMDD
```

is the current date,

```text
<scope>
```

is the feature/domain/task area,

and:

```text
<description>
```

is a short, specific kebab-case description of the change.

Examples:

```text
20260924-settings-move-max-width-to-appearance.patch
20260924-search-left-align-header-title.patch
20260924-plans-nav-fix-selected-subview-ownership.patch
20260924-close-module-use-modules-as-default.patch
20260924-archive-resource-state-terminology-docs.patch
```

If I explicitly provide a patch prefix or filename convention for the current task, use that convention instead of inventing a different one.

Examples of task-specific prefixes I may request:

```text
settings
search
plans-nav
close-module
archive
simple-app-hosting
circular-imports
```

Do not silently change the active naming convention during a task.

## 20.2 Recreated or revised patches

If a patch has already been given to me and must be recreated because:

```text
the source changed
the patch did not apply
the patch was incorrect
I requested a revision
the same logical patch needs to be regenerated
```

do **not** overwrite or reuse the original patch filename.

Append a revision suffix before `.patch`:

```text
-v2
-v3
-v4
```

Example:

```text
20260924-settings-search-navigation-browser-test.patch
20260924-settings-search-navigation-browser-test-v2.patch
20260924-settings-search-navigation-browser-test-v3.patch
```

The revision number describes the patch artifact, not an application or API version.

If I explicitly ask to keep the original filename, follow that instruction.

## 20.3 Patch path format

Patch paths must always be repository-root-relative Git paths.

Use standard `a/` and `b/` prefixes:

```diff
diff --git a/client/kjvonly-pwa/src/lib/example.ts b/client/kjvonly-pwa/src/lib/example.ts
--- a/client/kjvonly-pwa/src/lib/example.ts
+++ b/client/kjvonly-pwa/src/lib/example.ts
```

For new files:

```diff
--- /dev/null
+++ b/client/kjvonly-pwa/src/lib/example.ts
```

For deleted files:

```diff
--- a/client/kjvonly-pwa/src/lib/example.ts
+++ /dev/null
```

Do not generate patch paths containing:

```text
/Users/<name>/...
~/git/...
worktrees/<name>/...
/mnt/data/...
absolute filesystem paths
```

The patch should be applicable from the repository root:

```text
~/git/kjvonly.bible
```

Do not omit the `a/` and `b/` prefixes unless there is a specific reason and I explicitly request a different patch format.

## 20.4 Patch generation

Prefer generating a real Git/unified diff from exact before/after source files.

Do not hand-write diff hunk counts when a real diff can be generated.

Before giving me the patch:

1. base it on the exact source state used for the change;
2. ensure all paths are repository-root-relative;
3. verify the diff is syntactically valid;
4. run the equivalent of:

```bash
git apply --check PATCH_NAME.patch
```

against the source state used to build it.

If the patch cannot be verified against the current source, say so explicitly instead of claiming it was verified.

## 20.5 Patch delivery

Always give me a downloadable patch link.

Then give patch application commands separately:

```bash
git apply --check PATCH_NAME.patch &&
git apply PATCH_NAME.patch
```

Do not combine npm/test/build commands with the patch application command.

Afterward give validation separately.

For the primary PWA, the normal full validation is:

```bash
cd client/kjvonly-pwa
npm run test && npm run build
```

When the patch specifically adds or changes browser tests, also call out the targeted browser-test command when useful:

```bash
cd client/kjvonly-pwa
npm run test:browser
```

Run targeted tests first when they provide a faster useful failure signal, then run the broader validation when appropriate.

---

# 21. Patch Scope

Keep patches focused.

Good patch scope:

```text
one UI behavior
one architecture boundary
one cleanup concern
one bug fix
one test boundary
one documentation concern
```

Avoid mixing unrelated concerns merely because they are nearby.

If a requested change naturally makes imports, dependencies, components, or tests dead, remove those dead dependencies as part of the same patch when doing so is a direct consequence of the requested change.

Do not use a small requested change as an excuse for speculative cleanup elsewhere.

If an architectural problem is discovered while working on a focused patch, explain it briefly and either:

```text
fix it only if required for the requested change
```

or:

```text
leave it as the next explicit patch
```

---

# 22. Testing Strategy

Tests should protect behavior and architecture boundaries rather than merely increase test count.

Before adding a test, determine whether the behavior is best exercised as:

```text
unit/service test
browser/component test
integration test
```

Prefer the smallest test level that can accurately exercise the behavior.

## 22.1 Regression-first workflow

For a bug or regression:

1. Identify the existing failing test when one already covers the behavior.
2. If no useful test exists, add the smallest focused regression test when practical.
3. Confirm the test exercises the actual failure mode.
4. Make the implementation change.
5. Run the focused test.
6. Run the broader relevant suite/build afterward.

When I explicitly say not to write code yet, investigate and identify the likely failing boundary first without producing implementation changes.

## 22.2 Unit and service tests

Prefer normal Vitest/unit tests for deterministic code such as:

```text
models
normalizers
pure functions
resolvers
factories
services
definition validation
search indexing/matching
navigation mapping
domain logic
persistence adapters that can be isolated
```

Good tests verify meaningful contracts and edge cases.

Avoid snapshotting trivial markup or testing implementation details that do not represent a behavioral contract.

## 22.3 Browser tests

Use browser tests when the behavior depends on real browser or Svelte runtime behavior that a normal unit test would not faithfully represent.

Examples include:

```text
Svelte component mounting/unmounting
Svelte context propagation
DOM identity preservation
persistent NavigationContainer behavior
focus behavior
scrollIntoView behavior
browser input state
actual event dispatch
window APIs
matchMedia
IndexedDB
localStorage interactions across mounted components
multiple simultaneously mounted module instances
component ownership/lifecycle behavior
```

Examples from the Settings architecture include:

```text
previous navigation views remain mounted while hidden
Back reveals the same DOM/component instance
search input state survives navigation
focusRowID scrolls/pulses the correct row
two Settings modules synchronize values through SettingsService
```

When testing preserved component/DOM identity, prefer identity assertions such as:

```ts
expect(restoredElement).toBe(originalElement);
```

rather than only checking equal text or values.

## 22.4 Browser-test fixtures

Keep browser-test hosts and fixtures minimal.

Prefer:

```text
real production component under test
real service when inexpensive
small test host
smallest valid ApplicationContext
```

over bootstrapping the entire application.

Only mock the boundary that is not relevant to the test.

For example, if `NavigationContainer` requires `ApplicationContext` only because `BufferContainer` reads `SettingsService`, provide the smallest valid context containing the real `SettingsService` rather than launching the whole app.

## 22.5 Browser-test cleanup

Browser tests must clean up state they create.

Examples:

```text
unmount mounted Svelte components
remove temporary DOM nodes
restore patched browser APIs
clear localStorage keys used by the test
close/delete temporary IndexedDB state when applicable
unsubscribe temporary subscribers
```

Tests should not depend on execution order or leak state into later tests.

## 22.6 Test naming and placement

Place tests next to the implementation when that is the established local pattern.

Use browser-test folders/configuration for browser-only behavior.

Test names should describe the behavioral contract, for example:

```text
preserves the previous navigation view while a nested view is active
updates another mounted Settings module after a user change
preserves the root search state after navigating to a result and back
```

Prefer behavioral language over names tied to private implementation details.

---

# 23. JSDoc and Code Documentation

Add JSDoc where it materially improves understanding, IDE hover information, or preservation of an architectural contract.

Good JSDoc targets include:

```text
exported/public functions
service methods
factories
resolvers
domain boundary APIs
context provider/consumer APIs
non-obvious lifecycle functions
functions with important side effects
functions with ownership or synchronization rules
generic APIs whose type relationship is not obvious
normalization/migration functions
```

Useful JSDoc should explain things such as:

```text
what boundary the function owns
why the function exists
important invariants
side effects
persistence behavior
synchronization behavior
failure behavior
why a non-obvious implementation choice is intentional
```

Example:

```ts
/**
 * Persist one Settings value using the latest application Settings as the
 * merge base. This prevents a module-local stale snapshot from overwriting
 * unrelated settings changed by another mounted Settings instance.
 */
updateSetting<K extends keyof Settings>(
    setting: K,
    value: Settings[K]
): void {
    ...
}
```

Do not add noisy JSDoc that simply restates the function name.

Usually avoid JSDoc on trivial local functions such as:

```text
onClick handlers
one-line event wrappers
obvious local getters
simple rendering helpers
private functions whose behavior is self-evident
```

Normal inline comments are appropriate for small local implementation details.

Keep comments and JSDoc synchronized with the implementation. Stale architectural comments are worse than no comments.

---

# 24. Source Authority

I frequently modify the repository manually between messages.

Therefore:

```text
the newest source file I upload always wins
```

Do not assume an older patch, handoff, ZIP, conversation snapshot, generated document, or previous assistant response still matches the repository.

If I upload a current file, build the next patch against that exact file.

If multiple uploaded sources conflict:

```text
newest explicit current source
    wins over
older uploaded source
    wins over
old patch/handoff/conversation assumptions
```

If the exact current source is required and is not available, retrieve or inspect it before generating a patch rather than guessing.

---

# 25. Communication Style

Be concise.

When auditing:

```text
finding
why it matters
recommended change
```

is usually enough.

When creating patches, avoid long explanations unless there is an architectural or behavioral issue I should know about.

If I say:

```text
done, let's continue
```

continue to the next logical audit/refactor item rather than repeating previous work.

If something is intentionally unusual but architecturally valid, leave it alone rather than normalizing it just for consistency.

When a test fails after a patch, investigate the failure against the current source and adjust the patch/test at the correct boundary rather than immediately rewriting unrelated code.

---

# 26. Default Chat Workflow Checklist

Use the following as the default workflow for code-change chats unless I explicitly override it.

```text
1. Read the current source I supplied.
2. Treat the newest source as authoritative.
3. Inspect nearby implementation and tests.
4. Preserve established architecture unless I request a redesign.
5. Identify the smallest correct change.
6. Add or update a focused test when the behavior warrants it.
7. Use browser tests only when browser/Svelte runtime behavior is genuinely part of the contract.
8. Add meaningful JSDoc to important APIs/functions when the change introduces or clarifies an architectural boundary.
9. Generate a real repo-root patch using a/ and b/ paths.
10. Name it YYYYMMDD-<scope>-<description>.patch.
11. If recreating the same logical patch, use -v2, -v3, etc.
12. Verify git apply --check before giving me the patch.
13. Give me a downloadable patch link.
14. Give git apply --check && git apply separately.
15. Give tests/build commands separately.
16. Stop after the focused step unless I ask to continue.
17. When I say done, let's continue, move to the next logical small step.
```

---

# 27. Architecture Documentation Map

Use the implementation docs as the primary architecture reference before redesigning established behavior.

Key paths:

```text
docs/03_implementation/runtime/005-buffer-contract.md
docs/03_implementation/runtime/007-state-ownership-context-boundaries.md
docs/03_implementation/runtime/008-identity-source-of-truth.md
docs/03_implementation/runtime/009-resolver-boundary-design.md
docs/03_implementation/runtime/010-persistent-ui-lifecycle.md
docs/03_implementation/runtime/011-ui-shell-layout-ownership.md
docs/03_implementation/runtime/012-mutation-synchronization-rules.md
docs/03_implementation/runtime/013-live-vs-snapshot-state.md
docs/03_implementation/runtime/014-bespoke-to-generic-refactoring.md
docs/03_implementation/runtime/015-composition-root-container-boundaries.md
docs/03_implementation/runtime/016-navigation-architecture.md

docs/03_implementation/ui/003-data-driven-ui-resolver-architecture.md

docs/03_implementation/testing/001-testing-strategy-browser-harnesses.md
docs/03_implementation/testing/002-architecture-invariants-validation.md

docs/03_implementation/modules/003-settings-module.md
```

Navigation architecture is:

```text
docs/03_implementation/runtime/016-navigation-architecture.md
```

Do not assume `006` is Navigation; `006` is Runtime Services.

When working in a subsystem, read the narrowest relevant documents rather than loading every architecture document.

Suggested reading:

```text
Workspace / Pane / Buffer
    → Buffer Contract
    → State Ownership
    → Identity / Source of Truth
    → Navigation Architecture

Module runtime
    → Composition Roots
    → Live vs Snapshot State
    → Persistent UI Lifecycle

Generic UI / registries
    → Data-Driven UI / Resolver Architecture
    → Resolver Boundary Design
    → Bespoke-to-Generic Refactoring

Testing
    → Testing Strategy / Browser Harnesses
    → Architecture Invariants

Settings
    → Settings Module Implementation
    → Navigation Architecture
    → State Ownership
```

---

# 28. Current Engineering Philosophy

Prefer:

```text
explicit ownership
small boundaries
domain separation
stable pane identity
captured resource selections
shared UI components
semantic theme classes
data-driven definitions where appropriate
resolvers instead of repeated special-case branching
meaningful JSDoc on important APIs
behavior-focused tests
browser tests for real browser/Svelte behavior
small verified patches
repo-root a/ and b/ patch paths
```

Avoid:

```text
global mutable state
deep cross-domain imports
duplicated SVG/buttons
inline hard-coded colors
unnecessary wrappers
large speculative refactors
worker circular imports
cached Pane references
UI directly owning persistence infrastructure
hand-written malformed patch hunks
absolute filesystem paths in patches
reusing the same filename for a recreated patch
browser tests for logic that should be a simple unit test
tests that leak DOM/storage/subscriber state
JSDoc that only repeats the function name
```

When reviewing code, reason from this mental model first.
