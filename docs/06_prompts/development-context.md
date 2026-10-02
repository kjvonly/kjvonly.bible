# KJVOnly.bible Development Context

I am continuing development and cleanup of **KJVOnly.bible**, an offline-first Bible PWA.

Use this prompt as the baseline mental model for the codebase. Do not redesign established architecture unless I explicitly ask for architectural changes.

I may also provide a feature-specific handoff for the work currently in progress.

When information conflicts, use this precedence:

```text
newest explicit current source/archive I provide
    ↓
current feature-specific handoff
    ↓
this development-context prompt
    ↓
older uploaded source
    ↓
older patches / conversation assumptions
```

The newest supplied source is always the implementation source of truth.

A handoff explains architectural intent, history, rejected approaches, and what we were trying to accomplish. The current source proves what is actually implemented.

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
Filesystem/resource catalogs
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

A useful architectural rule is:

```text
Resource
    = how external/publishable data is discovered,
      resolved, decoded, processed, and installed

Domain
    = what that data means to the application

Application / Module
    = how the user interacts with that data
```

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

Dependencies that represent infrastructure, workers, persistence, or cross-domain collaborators should normally be constructed at the composition root and injected.

Avoid constructing infrastructure collaborators inside another service merely because it is convenient to instantiate them there.

If a dependency has become a required production capability, prefer making that dependency explicit rather than preserving an unnecessary optional runtime branch.

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

Prefer small, explicit boundaries when responsibilities are genuinely distinct.

Do not create abstractions merely for theoretical SRP purity. A new class/service should represent a real responsibility in the current architecture.

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

# 13. Resource / Filesystem Boundary

Filesystem and Resource have distinct responsibilities.

Conceptually:

```text
Filesystem
    = available/discoverable Resource mappings

Resource
    = Resource identity, resolution, decoding,
      currentness, installation lifecycle

Domain
    = semantic application data and behavior

Module/UI
    = user-facing composition and policy
```

A filesystem entry describes where a Resource is available.

It is not the target Domain Object.

The desired general flow is:

```text
FilesystemEntry
    ↓
ResourceDescriptor
    ↓
generic Resource loading lifecycle
    ↓
owning ResourceHandler
    ↓
owning Domain
```

Do not introduce filesystem-specific copies of:

```text
Resource resolution
Resource currentness
content decoding
Resource handler dispatch
target Domain installation
```

when the generic Resource lifecycle already owns them.

The current feature handoff should be used for the detailed Filesystem/Resource architecture when that area is being changed.

---

# 14. UI Ownership

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

# 15. Header / Navigation UI Conventions

For mobile/module headers, prefer:

```text
one leading control
title
no more than 3 trailing action slots
```

Prefer approximately:

```text
2 direct trailing actions
+
overflow menu
```

when several actions are available.

Use a **back arrow** for navigation/back behavior.

Reserve an **X/close control** for actually closing a pane/view rather than navigating backward.

## 15.1 Pane navigation stack

Each rendered leaf Pane owns one flat persisted navigation stack:

```text
Pane.state.navigation
    =
NavigationState[]
```

Every pane begins with:

```text
modules.root
```

Feature views are pushed on top of that root. Back pops one navigation entry, but it must never remove the final `modules.root`.

Navigation views remain mounted while hidden. Pushing a child view hides the previous view rather than destroying it, and Back reveals the same mounted instance.

Feature code should use the narrow pane navigation API rather than manipulating the persisted stack directly. Typical operations include:

```text
pushView
pushModule
split
backWithResult
back
closePane
escapePane
```

Do not reintroduce a generic feature-facing stack replacement API merely to make one flow convenient.

When opening another module as a drill-in from the current context, prefer pushing it onto the current pane stack when Back should return to the originating view.

For example:

```text
strongs / refs
    ↓ pushModule(Bible reader)
Bible
    ↓ Back
strongs / refs
```

Pass canonical navigation state such as `bibleLocationRef`; do not serialize presentation-only labels when the destination can derive them from its own resources.

## 15.2 Standard Back control

The standard pane Back control is:

```text
KJVBackButton
```

Use it for ordinary navigation Back behavior instead of recreating an arrow button in each module.

Its current interaction contract is:

```text
tap
    → navigation.back()

press and hold for 1.5 seconds
    → navigation.escapePane()
```

The hold-progress indicator is intentionally delayed by approximately:

```text
300 ms
```

so normal taps do not flash the progress ring.

`escapePane()` means:

```text
multiple panes
    → close the current pane

final/only pane
    → discard that pane's current navigation history
    → replace it with a fresh modules.root
```

The final pane itself is not removed.

This is a semantic pane-escape operation. Do not replace it with a generic arbitrary stack-reset API.

If a Back control has additional domain behavior, such as persisting a draft before leaving, it may remain a custom control rather than using `KJVBackButton`.

## 15.3 Header leading content

`KJVHeader` supports caller-owned leading content for cases where the leading control is richer than a simple header action.

The standard pattern for Back is:

```svelte
{#snippet leadingContent()}
    <KJVBackButton></KJVBackButton>
{/snippet}

<KJVHeader
    {title}
    {leadingContent}
></KJVHeader>
```

`leadingContent` takes precedence over the simpler `leadingAction` definition.

Shared views such as `KJVMenuView` should accept caller-owned leading content rather than owning navigation policy themselves.

Do not add fake/invisible leading controls solely to preserve mathematical title centering. If a screen legitimately has no leading control, use normal container/layout spacing instead.

## 15.4 Nested menu/navigation views

A nested screen that presents a real Back affordance should normally be a real navigation entry.

Do not model:

```text
parent view
    + local boolean swaps body to "child screen"
    + Back calls navigation.back()
```

because the pane stack still points at the parent and Back will pop too far.

Instead prefer:

```text
parent view
    ↓ pushView(child)
child view
    ↓ Back
parent view
```

When a child menu needs the parent to perform an action using live parent state, return a small semantic result with:

```text
backWithResult(...)
```

The still-mounted parent owns interpretation of that result after it becomes active again.

The Notes overflow menu follows this pattern: `notes.root` pushes `notes.actions`, and the actions view returns intent rather than copying the Notes list's live filtered state into persisted navigation.

For patches primarily involving headers/navigation headers, the patch filename must include the exact word:

```text
headers
```

---

# 16. SVG / Icon Conventions

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

# 17. Styling

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

# 18. Settings / Themes

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

The Settings module also includes an About page for application/project information such as build/source information and legal attribution. Keep About within the existing Settings navigation/page architecture rather than creating a separate module-specific shell.

Do not write directly to localStorage from UI components unless the architecture explicitly requires it.

The theme system uses semantic tokens and supports multiple light/dark themes.

---

# 19. Workers

Workers are used for expensive or isolated tasks such as:

```text
Resource processing
Archive import/export
Search
Filesystem search
```

Keep worker boundaries one-directional.

Do not allow worker implementation modules to import browser worker factories if that creates circular Vite worker graphs.

Browser worker construction should live at the main-thread boundary.

When one worker supports materially different operations, prefer explicit request/message names.

For example:

```text
ProcessRepresentationRequest
ProcessDescriptorRequest
```

is preferable to an ambiguous:

```text
ProcessRequest
```

when both operations exist.

When dispatching distinct job types, prefer explicit control flow such as a `switch` when it makes the boundary easier to understand.

Do not optimize worker dispatch code for compactness at the expense of showing which operation is being performed.

---

# 20. Archive / Import / Export

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

# 21. Development Style

When investigating an issue:

1. Inspect the current supplied source.
2. Treat the newest file I provide as authoritative.
3. Read the current feature handoff when one is supplied.
4. Inspect nearby tests and established patterns before changing code.
5. Identify the smallest correct change.
6. Preserve existing architecture and behavior unless the requested change intentionally modifies it.
7. Avoid unrelated cleanup in the same patch.
8. Tell me briefly if you discover an important behavioral implication.
9. Produce a patch when I ask for implementation.
10. Verify the patch applies before giving it to me.
11. Give validation commands separately from patch-application commands.

I prefer incremental work.

Do not generate a giant refactor unless I explicitly request one.

When a larger refactor is necessary, break it into small independently reviewable patches whenever practical.

If I ask to:

```text
review
audit
discuss
think through
just tell me
don't write code yet
don't write a patch yet
```

do not produce implementation changes.

Discuss the architecture/finding first and wait until I tell you to continue.

If an investigation reveals a potentially important architectural change, explain it before broadening the implementation scope.

---

# 22. Patch Workflow

When I ask for a code change, produce a downloadable `.patch` file unless I explicitly ask for another format.

## 22.1 Patch filename convention

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

### Required filename keywords

For Filesystem-related work, the generated patch filename must contain the exact word:

```text
filesystem
```

For header/navigation-header work, the generated patch filename must contain the exact word:

```text
headers
```

These keyword requirements take precedence over a more generic scope name.

## 22.2 Recreated or revised patches

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

### Failed downloads

A failed download is different from a code revision.

If I say the generated patch download failed:

```text
do not change the patch contents
```

Re-upload the **same patch bytes** under the next revision filename:

```text
-v2
-v3
-v4
```

Example:

```text
20260930-filesystem-search.patch
```

download fails:

```text
20260930-filesystem-search-v2.patch
```

The only intended change is the artifact filename.

Do not silently regenerate different code when I only reported a download failure.

## 22.3 Patch path format

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

## 22.4 Patch generation

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

When practical also run:

```bash
git diff --check
```

If the patch cannot be verified against the current source, say so explicitly instead of claiming it was verified.

## 22.5 Patch delivery

Always give me a downloadable patch link.

Then give one copyable patch application command:

```bash
git apply --check PATCH_NAME.patch && git apply PATCH_NAME.patch
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

### Patch checksums

Do **not** provide:

```text
SHA256
SHA
MD5
checksums
```

for generated patches unless I explicitly ask for one.

The normal patch response should contain:

```text
download link
apply command
relevant validation information/commands
```

without a checksum.

---

# 23. Patch Scope

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

Prefer extending an existing clean seam over creating a parallel lifecycle.

---

# 24. Testing Strategy

Tests should protect behavior and architecture boundaries rather than merely increase test count.

Before adding a test, determine whether the behavior is best exercised as:

```text
unit/service test
browser/component test
integration test
```

Prefer the smallest test level that can accurately exercise the behavior.

## 24.1 Regression-first workflow

For a bug or regression:

1. Identify the existing failing test when one already covers the behavior.
2. If no useful test exists, add the smallest focused regression test when practical.
3. Confirm the test exercises the actual failure mode.
4. Make the implementation change.
5. Run the focused test.
6. Run the broader relevant suite/build afterward.

When I explicitly say not to write code yet, investigate and identify the likely failing boundary first without producing implementation changes.

If I provide actual failing test output, treat that output as authoritative.

Diagnose the failure at the correct boundary before adding unrelated work.

## 24.2 Unit and service tests

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

## 24.3 Browser tests

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

## 24.4 Browser-test fixtures

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

## 24.5 Browser-test cleanup

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

## 24.6 Test naming and placement

Place tests next to the implementation when that is the established local pattern.

Use browser-test folders/configuration for browser-only behavior.

Test names should describe the behavioral contract, for example:

```text
preserves the previous navigation view while a nested view is active
updates another mounted Settings module after a user change
preserves the root search state after navigating to a result and back
```

Prefer behavioral language over names tied to private implementation details.

## 24.7 Test-result honesty

Do not claim the test suite passed unless it actually ran successfully.

If an uploaded/extracted source tree does not contain `node_modules`, say explicitly that the real Vitest/build suite could not be run.

Distinguish clearly between:

```text
git apply --check passed

git diff --check passed

TypeScript syntax/transpile checks passed

targeted Vitest tests passed

full test suite passed

build passed
```

Do not describe one level of validation as though it proved another.

---

# 25. JSDoc and Code Documentation

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

# 26. Source Authority

I frequently modify the repository manually between messages.

Therefore:

```text
the newest source file/archive I upload always wins
```

Do not assume an older patch, handoff, ZIP, conversation snapshot, generated document, or previous assistant response still matches the repository.

If I upload a current file, build the next patch against that exact file.

If I upload a current archive, inspect that archive rather than reconstructing current state from older patches.

If multiple sources conflict:

```text
newest explicit current source
    wins over
current feature handoff
    wins over
this development-context prompt
    wins over
older uploaded source
    wins over
old patch/conversation assumptions
```

If the exact current source is required and is not available, retrieve or inspect it before generating a patch rather than guessing.

Do not ask me to repeat information that is already available in the current source, handoff, or test output.

---

# 27. Handoff Usage

For substantial ongoing work, I may provide a detailed handoff from the previous chat.

Use it to understand:

```text
architecture
decisions
rejected approaches
past bugs
patch sequence
reasoning behind current boundaries
next intended work
```

The handoff should guide interpretation of the source.

The source remains authoritative for what is actually implemented.

A useful rule is:

```text
handoff explains intent
latest source proves reality
```

If the source and handoff differ:

1. identify the inconsistency;
2. do not silently force the source to match the handoff;
3. determine whether the source intentionally evolved;
4. follow the newest source unless I explicitly tell you otherwise.

When beginning a new chat from a handoff plus fresh source, first review the implementation against the handoff before proposing another patch.

---

# 28. Communication Style

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

If I say:

```text
just tell me
don't write a patch yet
don't write code yet
let's discuss this first
```

respond with analysis/design discussion only.

Do not produce a patch until I tell you to continue.

---

# 29. Default Chat Workflow Checklist

Use the following as the default workflow for code-change chats unless I explicitly override it.

```text
1. Read the current source I supplied.
2. Treat the newest source as authoritative.
3. Read the current feature handoff when one is supplied.
4. Inspect nearby implementation and tests.
5. Preserve established architecture unless I request a redesign.
6. Identify the smallest correct change.
7. Add or update a focused test when the behavior warrants it.
8. Use browser tests only when browser/Svelte runtime behavior is genuinely part of the contract.
9. Add meaningful JSDoc to important APIs/functions when the change introduces or clarifies an architectural boundary.
10. Generate a real repo-root patch using a/ and b/ paths.
11. Name it YYYYMMDD-<scope>-<description>.patch.
12. Apply any task-specific filename keyword requirements such as filesystem or headers.
13. If revising/recreating the same logical patch, use -v2, -v3, etc.
14. If only the download failed, re-upload identical patch contents under the next -vN filename.
15. Verify git apply --check before giving me the patch.
16. Run git diff --check when practical.
17. Give me a downloadable patch link.
18. Give git apply --check && git apply separately.
19. Do not provide a checksum unless I request one.
20. Give tests/build commands separately.
21. Stop after the focused step unless I ask to continue.
22. When I say done, let's continue, move to the next logical small step.
```

---

# 30. Architecture Documentation Map

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

# 31. Current Engineering Philosophy

Prefer:

```text
explicit ownership
small boundaries
domain separation
stable pane identity
captured resource selections
composition-root dependencies
shared UI components
semantic theme classes
data-driven definitions where appropriate
resolvers instead of repeated special-case branching
meaningful JSDoc on important APIs
behavior-focused tests
browser tests for real browser/Svelte behavior
generic infrastructure with domain-specific interpretation
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
domain-specific behavior leaking into generic infrastructure
parallel domain-specific copies of generic Resource machinery
hand-written malformed patch hunks
absolute filesystem paths in patches
reusing the same filename for a recreated patch
changing patch contents merely because a download failed
browser tests for logic that should be a simple unit test
tests that leak DOM/storage/subscriber state
JSDoc that only repeats the function name
```

When reviewing code, reason from this mental model first.

---

# 32. General Architecture Review Rule

Before introducing a new service, resolver, processor, worker path, or abstraction, ask:

```text
Is this responsibility already owned somewhere else?

Is this genuinely a new architectural boundary?

Can an existing generic lifecycle support the operation?

Am I pushing domain-specific interpretation into generic infrastructure?

Am I creating a parallel path because the existing seam is inconvenient?

Is this solving a current requirement or only a hypothetical future problem?
```

Prefer extending an existing clean seam over creating a parallel lifecycle.

At the same time, do not force unrelated responsibilities into one large class merely to minimize the number of files.

The goal is understandable code with explicit ownership and small, reusable boundaries.