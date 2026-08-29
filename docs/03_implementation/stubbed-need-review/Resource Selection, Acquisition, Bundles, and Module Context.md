# Resource Selection, Acquisition, Bundles, and Module Context

**Status:** Agreed Design — Implementation Pending  
**Scope:** Resource Architecture implementation refinement  
**Purpose:** Define the application-level Resource selection model, generic Resource loading/service contracts, Resource bundle behavior, module-scoped Resource context, and Domain Service boundaries before refactoring the Strong’s implementation.

---

# 1. Background

The initial Resource Architecture implementation established the complete inbound Resource lifecycle:

```text
Published Resource
    ↓
Resource Discovery
    ↓
Resource Resolution
    ↓
VerifiedResourceContent
    ↓
Content Decoding
    ↓
DecodedResourceContent
    ↓
Resource-Type Interpretation
    ↓
Candidate
    ↓
Domain Validation
    ↓
Validated Candidate
    ↓
Installation
    ↓
Domain Store
    ↓
Application
```

Bible Chapters were implemented first.

Strong’s was then implemented as the second concrete Resource Type.

This exposed several recurring patterns:

```text
Domain Service
    ↓
local Domain Store lookup
    ↓
Resource Loader on miss
    ↓
Resource Discovery
    ↓
Resource Resolution
    ↓
Content Decoding
    ↓
Domain Handler
```

At the same time, application startup and bootstrap requirements introduced additional constraints:

- A fresh installation must become usable quickly.
- The application publisher provides a set of default Resources.
- Those Resources may be represented by one Resource using a `descriptors` representation.
- Optional/default datasets may continue installing in the background.
- Users must be able to replace application-default Resources with Resources from other publishers.
- Multiple modules may simultaneously use different versions or publishers.
- Page refresh and Workspace restoration must preserve the exact Resources used by existing modules.
- First-launch behavior must not introduce a parallel Resource-processing architecture.

These requirements revealed that much of the implementation above Domain interpretation should be generic.

---

# 2. Core Design Principle

Bootstrap, on-demand loading, manual installation, background installation, and shared Resource bundles all use the same Resource architecture.

There is no special Resource pipeline for first launch.

The application may initiate different workflows, but all Published Resources ultimately flow through:

```text
Discovery
    ↓
Resolution
    ↓
Decoding
    ↓
Resource-Type Dispatch
    ↓
Domain Handler
    ↓
Interpreter
    ↓
Validator
    ↓
Installer
```

The workflow determines **what Resource to request and when**.

The Resource infrastructure determines **how that Resource is processed**.

---

# 3. Generic Resource Bundles

A Resource represented using `descriptors` is a generic collection of independently resolvable Resources.

It is not inherently a bootstrap Resource.

A publisher may create a Resource bundle for many purposes:

- application defaults,
- application bootstrap,
- study packages,
- Bible datasets,
- shared notes,
- annotations,
- reading plans,
- imported collections,
- future user-created Resource groups.

For example:

```text
Publisher
    ↓
kjvonly/resources/bundles/default
    ↓
representation = descriptors
    ↓
Bible Resource
Strong's Resource
Paragraph Resource
Pericope Resource
Search Resource
...
```

Another user might publish:

```text
kjvonly/resources/bundles/study-pack
```

containing an entirely different set of Resources.

Therefore:

```text
Resource Bundle
    = generic Resource concept

Application Default Bundle
    = one application workflow using a Resource Bundle
```

The application is simply another publisher with a pubkey.

---

# 4. Resource Bundle Resource Type

The current design uses a Resource Type such as:

```text
kjvonly/resources/bundles
```

with individual bundle Resources such as:

```text
kjvonly/resources/bundles/default
kjvonly/resources/bundles/study-pack
kjvonly/resources/bundles/sermon-series
```

The bundle itself is a logical Resource.

Its `descriptors` representation determines how its contained Resources are resolved.

The application does not require a Bundle Domain Object or Bundle Domain Handler merely to process a descriptor collection.

---

# 5. Strong’s Resource Type

Strong’s is an independent application Domain.

It should therefore no longer live beneath the Bible Resource namespace.

The current Resource Type is:

```text
kjvonly/strongs/definitions
```

Examples:

```text
Bundle/source Resource:

kjvonly/strongs/definitions/kjvs
```

```text
Individual Resource:

kjvonly/strongs/definitions/kjvs/G1
```

This preserves the Resource Identifier convention:

```text
namespace/domain/resource-type/...resource-id
```

while reflecting that Strong’s is its own Domain.

---

# 6. Application Default Bundle

The application should not hardcode a table such as:

```text
Bible      → kjvs
Strong's   → kjvs
Paragraphs → default
Pericopes  → default
```

Instead, the application knows only enough to locate its default bundle:

```text
Application Discovery Root
+
Application Default Bundle Resource ID
```

Conceptually:

```text
publisher:
    application publisher

resourceId:
    kjvonly/resources/bundles/default
```

The bundle itself declares the Resources that constitute the application's defaults.

This means adding a new default Resource normally does not require adding another hardcoded default to `application.ts`.

---

# 7. Default Bundle Policy

Generic Resource bundles may contain any number of Resources, including multiple Resources of the same Resource Type.

For example, a user bundle may validly contain:

```text
kjvonly/bible/chapters/kjv
kjvonly/bible/chapters/kjvs
kjvonly/bible/chapters/asv
```

The application-default workflow imposes a stricter rule:

> The application default bundle may contain at most one default Resource for each selectable Resource Type.

This allows the application to derive:

```text
Resource Type
    →
PublishedResourceReference
```

without ambiguity.

This restriction belongs to the application-default workflow, not the generic Resource Bundle model.

---

# 8. Global Current Resource Selections

The application maintains a current Resource selection for each selectable Resource Type.

The logical shape is:

```text
Resource Type
    →
PublishedResourceReference
```

A `PublishedResourceReference` contains:

```text
publisher
resourceId
```

Example:

```text
kjvonly/bible/chapters
    →
    publisher A
    kjvonly/bible/chapters/kjvs

kjvonly/strongs/definitions
    →
    publisher B
    kjvonly/strongs/definitions/kjvs
```

There is exactly one global current selection per Resource Type.

Users may change that selection at any time.

---

# 9. Selection Identity

A Resource selection identifies the selected **source/bundle Resource**, not an individual Domain Object.

Strong’s selection:

```text
publisher A
kjvonly/strongs/definitions/kjvs
```

not:

```text
publisher A
kjvonly/strongs/definitions/kjvs/G1
```

Bible Chapter selection:

```text
publisher A
kjvonly/bible/chapters/kjvs
```

not:

```text
publisher A
kjvonly/bible/chapters/kjvs/1_1
```

The selected source answers:

> Which dataset/source is this module using?

The Domain request answers:

> Which object inside that source is currently requested?

These are separate concepts.

---

# 10. Resource Selection Persistence

Global selections are persisted locally, initially using `localStorage`.

A small persistence abstraction should own this state:

```text
ResourceSelectionStore
```

Its responsibility is only persistence.

Conceptually:

```text
get(resourceType)
put(resourceType, reference)
getAll()
```

It does not know about:

- application defaults,
- Resource bundles,
- Bible,
- Strong’s,
- Workspaces,
- module creation,
- discovery,
- Resource installation.

---

# 11. ResourceSelectionService

Application-level selection behavior belongs to a:

```text
ResourceSelectionService
```

Its responsibilities are:

```text
get current global selection

change current global selection

initialize missing selections

provide selection snapshots when needed
```

It does not know which selections are application defaults.

The application-default workflow supplies those defaults.

Domain services never depend on `ResourceSelectionService`.

---

# 12. Initializing Global Selections

The application-default bundle supplies initial defaults.

Conceptually:

```text
Application Default Bundle
    ↓
contained PublishedResourceReferences
    ↓
derive Resource Type
    ↓
ResourceType → PublishedResourceReference
    ↓
ResourceSelectionService.initializeMissing(...)
```

Initialization follows:

```text
selection exists
    → preserve it

selection missing
    → persist bundle default
```

Therefore hardcoded application defaults are not repeatedly consulted during normal application use.

After initialization, the persisted selection is the current application preference.

---

# 13. Defaults Are Initialization Policy

Application defaults do not act as runtime fallback behavior.

If the current Strong’s selection is:

```text
Publisher B
kjvonly/strongs/definitions/enhanced
```

and that Resource becomes unavailable:

```text
DO NOT silently switch to application default
```

Instead the application reports that the selected Resource is unavailable and allows the user to select another source.

Likewise, an updated application-default bundle does not automatically overwrite existing selections.

The rule remains:

```text
missing selection
    → initialize from default

existing selection
    → preserve
```

Automatic migrations, if ever required, would be a separate application policy.

---

# 14. Default Bundle Installation

Loading the application-default bundle serves two purposes:

```text
1. Discover the application's default Resource references.

2. Begin normal installation of those Resources.
```

The same generic Resource processing pipeline handles those installations.

A failed Resource installation does not invalidate the corresponding default selection.

For example:

```text
Bundle advertises:

Bible     → Resource A
Strong's  → Resource B
Paragraph → Resource C
```

If Strong’s download fails temporarily:

```text
Strong's global selection
    → Resource B
```

may still be initialized.

Later, a normal Strong’s request can retry acquisition through the generic Resource Loader.

---

# 15. Background Default Installation

Default bundle installation should eventually execute through a Web Worker or equivalent background execution path.

The goal is:

```text
Fresh Application
    ↓
establish required selections/current reading context
    ↓
render usable application
    ↓
continue optional/default Resource installation in worker
```

The application should not block the UI while every descriptor in the default bundle resolves.

Moving execution to a worker does not create a second Resource architecture.

The worker runs the same conceptual pipeline:

```text
ResourceService
    ↓
Discovery
    ↓
Resolution
    ↓
Decode
    ↓
Dispatch
    ↓
Domain Handler
```

Background execution changes execution location, not architectural ownership.

---

# 16. Generic ResourceService

The Domain-specific:

```text
BibleChapterResourceService
StrongsResourceService
```

should be replaced by one generic:

```text
ResourceService
```

Conceptually:

```text
ResourceService.install(
    PublishedResourceReference
)
```

The service owns:

```text
exact Resource Discovery
    ↓
Resource Resolution
    ↓
Content Decoding
    ↓
Resource-Type Dispatch
```

It does not contain Bible-, Strong’s-, or other Domain semantics.

---

# 17. Resource Handler Dispatch

Each Resource Type registers one Domain handler.

Conceptually:

```text
resourceType
    →
ResourceHandler
```

Examples:

```text
kjvonly/bible/chapters
    → BibleChapterResourceHandler

kjvonly/strongs/definitions
    → StrongsResourceHandler

kjvonly/overlays/paragraphs
    → ParagraphResourceHandler
```

A generic handler contract is conceptually:

```ts
interface ResourceHandler {
    readonly resourceType: string;

    handle(
        resource: DecodedResourceContent
    ): Promise<void>;
}
```

Registration occurs in the Composition Root.

Exactly one handler may exist per Resource Type.

Duplicate registrations are application-construction errors.

---

# 18. Domain Handler Boundary

The Domain handler remains the boundary between generic Resource infrastructure and Domain interpretation.

```text
Generic ResourceService
    ↓
ResourceHandler
    ↓
Domain Interpreter
    ↓
Domain Validator
    ↓
Domain Installer
```

Candidate types and validated Domain types do not leak into `ResourceService`.

---

# 19. ResourceService Result

`ResourceService.install()` should no longer return only a boolean.

A descriptor collection may contain multiple independently processed Resources, so the result must preserve operation details.

Conceptually:

```text
ResourceInstallResult

requested:
    PublishedResourceReference

found:
    boolean

resources:
    per-Resource outcomes
```

`found` refers to the exact root Published Resource requested from Discovery.

```text
found = false
```

means the exact requested Published Resource did not exist.

This distinction is required by loader fallback behavior.

---

# 20. Per-Resource Outcomes

Each independently processed Resource should report enough information to identify it and understand its outcome.

Conceptually:

```text
PublishedResourceReference
Resource Type
Status
Failure/Cause if applicable
```

Initial statuses:

```text
handled
unsupported
failed
```

`handled` means:

> The Resource was successfully processed by its registered Domain handler.

It does not necessarily mean new Domain Objects were written.

Installation may legitimately retain newer/equal existing Domain Objects.

---

# 21. Descriptor Collection Processing

A `descriptors` collection is best effort across independent Resources.

Example:

```text
Default Bundle
    ↓
Bible
Strong's
Paragraphs
Pericopes
```

Processing:

```text
Bible
    → resolve
    → decode
    → ChapterHandler
    → commit

Strong's
    → resolve
    → fails

Paragraphs
    → resolve
    → decode
    → ParagraphHandler
    → commit
```

Strong’s failure does not roll back Bible.

It also does not prevent Paragraphs or Pericopes from being attempted.

---

# 22. Installation Atomicity Remains Per Resource

Best-effort bundle processing does not change Resource installation atomicity.

The atomic installation unit remains:

```text
one decoded and validated Published Resource
```

For example:

```text
Strong's bundle
    ↓
G1
G2
G3
...
```

is one Resource.

Therefore:

```text
interpret all
validate all
one installation transaction
```

If a candidate invalidates the Strong’s Resource, that Resource installation fails atomically.

Other Resources in the outer descriptor collection remain independent.

---

# 23. Unsupported Resource Types

If a descriptor resolves to a Resource Type for which the client has no registered handler:

```text
status = unsupported
```

Processing continues.

This allows older clients to process the parts of future/shared bundles they understand.

For example:

```text
Bible       → handled
Strong's    → handled
Future Type → unsupported
Notes       → handled
```

Whether `unsupported` is acceptable is workflow policy.

For a shared user bundle it may be expected.

For an application-default bundle it may indicate an application packaging/version mismatch.

The generic ResourceService does not decide that policy.

---

# 24. Root Failures vs Child Failures

A failure affecting the root operation itself may reject/throw the entire `install()` operation.

Examples:

```text
catastrophic network failure
invalid root Resource Representation
malformed descriptor collection
unexpected infrastructure failure
```

Once a valid descriptor collection has produced independent child Resources, failures are reported per child.

Therefore:

```text
root cannot be processed
    → throw

root produces independent Resources
    → process/report each independently
```

---

# 25. Descriptor Identity on Resolution Failure

The Resource pipeline must preserve the identity of descriptors even if their content cannot currently be resolved.

For every descriptor, the system should retain:

```text
publisher
resourceId
```

alongside success/failure state.

This is required because the application-default workflow must be able to learn:

```text
Strong's default source
```

even if downloading the Strong’s bytes temporarily fails.

Descriptor identity and successful Resource installation are different facts.

---

# 26. Generic Resource Loader

Domain-specific loaders such as:

```text
BibleChapterResourceLoader
StrongsResourceLoader
```

should not exist merely to repeat identical loading behavior.

`application.ts` should configure generic loader instances directly.

No subclasses are required when the only difference is configuration.

---

# 27. ResourceLoader Responsibility

The generic loader answers:

> Given a selected source Resource and a Domain-object key, which candidate Published Resources should be attempted to make that Domain Object locally available?

Conceptually:

```ts
interface ResourceLoader<TKey> {
    load(
        source: PublishedResourceReference,
        key: TKey
    ): Promise<boolean>;
}
```

The loader does not:

- read localStorage,
- inspect global selections,
- know application defaults,
- inspect the Domain Store,
- return Domain Objects,
- interpret content,
- validate content,
- know first-run state,
- know bootstrap state.

---

# 28. Reference-Building Policy

Resource candidate construction is provided through a reference-building policy.

Conceptually:

```ts
interface ResourceReferenceBuilder<TKey> {
    individual(
        source: PublishedResourceReference,
        key: TKey
    ): PublishedResourceReference | null;

    bundle(
        source: PublishedResourceReference
    ): PublishedResourceReference;
}
```

For current Chapters and Strong’s:

```text
bundle(source)
    → source
```

and:

```text
individual(source, key)
    → source.resourceId + "/" + key
```

Examples:

```text
Strong's source:
kjvonly/strongs/definitions/kjvs

key:
G1

individual:
kjvonly/strongs/definitions/kjvs/G1
```

```text
Chapter source:
kjvonly/bible/chapters/kjvs

key:
1_1

individual:
kjvonly/bible/chapters/kjvs/1_1
```

Returning `null` from `individual()` allows future Resource Types to support bundle-only acquisition.

---

# 29. Generic Loader Algorithm

The generic loader follows:

```text
build individual reference
    ↓

individual supported?
    ↓ yes

ResourceService.install(individual)
    ↓

root absent
    → continue to bundle

root found and processed
    → return true

processing failure
    → propagate failure
    → DO NOT fallback
```

Then:

```text
ResourceService.install(bundle)
    ↓

root absent
    → return false

processed successfully
    → return true

processing failure
    → propagate failure
```

The distinction is:

```text
Resource absent
    → fallback permitted

Resource exists but is invalid/broken
    → fallback not permitted
```

---

# 30. Loader Boolean Semantics

The loader retains a simple boolean result.

```text
true
```

means:

> One of the candidate Published Resources was found and successfully processed.

```text
false
```

means:

> None of the candidate Published Resources existed.

A thrown failure means:

> Resource acquisition or processing failed.

`true` does not guarantee that the requested Domain Object now exists.

The Domain Service verifies that by rereading its Domain Store.

---

# 31. Exact Resource Acquisition

The application-default bundle does not need an object-key loader.

It already has an exact Published Resource reference.

Therefore it may call:

```text
ResourceService.install(reference)
```

directly.

An additional "exact loader" abstraction should not be introduced unless another concrete use case proves it useful.

---

# 32. Global Selection vs Module Selection

Global selections are application defaults for **future module creation**.

They are not live dependencies of existing modules.

Once a module is created, it owns a snapshot of the Resource selections it uses.

This distinction is required to safely support multiple simultaneously open Bible modules.

---

# 33. Buffer Resource Selection Context

The Buffer carries a Resource selection map:

```text
Resource Type
    →
PublishedResourceReference
```

Conceptually:

```text
Buffer
    navigation state
    resourceSelections
    module/runtime state
```

Example Bible Buffer:

```text
navigation:
    bibleLocationRef = 1_1

resourceSelections:

    kjvonly/bible/chapters
        →
        publisher A
        kjvonly/bible/chapters/kjvs

    kjvonly/strongs/definitions
        →
        publisher B
        kjvonly/strongs/definitions/kjvs

    kjvonly/overlays/paragraphs
        →
        publisher C
        .../scheme-a
```

The Workspace Runtime does not interpret the Resource Types.

It stores and restores the context.

---

# 34. Snapshot Semantics

Resource selections are copied into the Buffer.

They are not live references back to global state.

```text
Global Current Selections
    ↓ COPY

Buffer Resource Selections
```

After creation:

```text
Buffer
    owns the snapshot
```

Changing a global selection later does not mutate existing Buffers.

---

# 35. Independent Module Creation

When a user opens a new independent module:

```text
Module declares required Resource Types
    ↓
read current global selections
    ↓
copy relevant PublishedResourceReferences
    ↓
new Buffer
```

A new Bible reader may require:

```text
kjvonly/bible/chapters
kjvonly/strongs/definitions
kjvonly/overlays/paragraphs
kjvonly/overlays/pericopes
```

Only those selections need to be copied.

---

# 36. Related Module Creation

When one module opens another related module, the originating Buffer has priority.

For each Resource Type required by the new module:

```text
originating Buffer has selection?
    → inherit it

otherwise
    → use global current selection
```

Example:

```text
Bible Module A:
    Chapters Publisher A
    Strong's Publisher B
```

A verse reference opens another Bible pane.

The new pane inherits:

```text
Chapters Publisher A
Strong's Publisher B
```

even if the application's global defaults have since changed.

This keeps related study context coherent.

---

# 37. Do Not Blindly Copy Entire Selection Maps

The target module should receive only selections for Resource Types it actually requires.

Example:

```text
Bible Buffer:
    chapters
    strongs
    paragraphs
    pericopes
```

If it opens a Dictionary module that requires only:

```text
dictionary definitions
```

the Dictionary Buffer does not need to inherit unrelated Bible selections.

Module requirements drive context construction.

---

# 38. Missing Selection Is Valid State

If neither the originating Buffer nor global application state contains a required Resource selection:

```text
no selection
```

is a valid result.

The module can report:

```text
No Strong's resource is selected.

Choose a Strong's source.
```

It must not independently reach into application defaults or choose a publisher.

---

# 39. Changing a Module Resource

Changing a Resource source inside a module changes only that module's Buffer.

Example:

```text
Module A
Strong's Publisher A
    ↓
Strong's Publisher B
```

Result:

```text
Module A → Publisher B
Module B → unchanged
Module C → unchanged
Global default → unchanged
```

If the UI provides:

```text
Make default for new modules
```

that is a separate explicit action that updates the global `ResourceSelectionService`.

---

# 40. Page Refresh and Workspace Restoration

Because Published Resource references are persisted in Buffer context:

```text
Pane
    ↓
Buffer
        ↓
resourceSelections
```

can be persisted as part of Workspace state.

After refresh:

```text
restore Workspace
    ↓
restore Buffer
    ↓
restore exact PublishedResourceReferences
```

Existing modules do not reconstruct their Resource sources from current global selections.

This allows a Workspace to restore a reproducible study configuration.

---

# 41. Navigation and Resource Selection Are Separate

Buffer state should preserve the distinction:

```text
Resource Selection
    = which dataset/source?

Navigation State
    = where inside that dataset?
```

For Bible:

```text
selection:
    Publisher A / KJVS

navigation:
    Genesis 1
```

Moving to Genesis 2 does not change the Resource selection.

Likewise:

```text
Strong's selection:
    Publisher B / KJVS Strong's

requested key:
    G1
```

The selected source remains unchanged while different keys are requested.

---

# 42. Domain Service API

Domain services receive the selected `PublishedResourceReference` explicitly from module context.

They never query global Resource selections.

Strong’s:

```ts
StrongsService.get(
    source: PublishedResourceReference,
    key: string
): Promise<Strongs>
```

Chapter:

```ts
ChapterService.get(
    source: PublishedResourceReference,
    chapterRef: string
): Promise<Chapter>
```

The source comes from the module's Buffer.

---

# 43. Domain Service Responsibilities

A Domain Service owns:

```text
validate selected source Resource Type

interpret Domain-specific source path

derive local Domain Object identity

read local Domain Store

if missing:
    invoke generic ResourceLoader

reread local Domain Store

return Domain Object
```

It does not own:

```text
global Resource selections
application defaults
Buffer state
source switching
publisher selection
Discovery Roots
Resource Discovery
Resource Resolution
Content Decoding
bundle-vs-individual fallback
installation implementation
```

---

# 44. Validate Source Resource Type

Each Domain Service verifies that the supplied source belongs to the expected Resource Type.

For Strong’s:

```text
expected:
    kjvonly/strongs/definitions
```

For Bible Chapters:

```text
expected:
    kjvonly/bible/chapters
```

A Chapter source must not accidentally be supplied to Strong’s.

Invalid Buffer/context state should fail explicitly rather than silently producing an incorrect local identity.

---

# 45. Domain Interpretation of Resource Paths

Generic Resource infrastructure understands:

```text
Resource Type
path segments
```

It does not understand the semantic meaning of those segments.

Example:

```text
kjvonly/strongs/definitions/kjvs
```

parses generically into:

```text
resourceType:
    kjvonly/strongs/definitions

path:
    ["kjvs"]
```

The Strong’s Domain determines that:

```text
"kjvs"
```

represents the relevant Strong’s edition/version.

Similarly:

```text
kjvonly/bible/chapters/kjvs
```

is interpreted by the Bible Domain.

This keeps Domain semantics out of generic Resource infrastructure.

---

# 46. Do Not Pass Version Separately

The old conceptual shape:

```text
publisher
version
key
```

should become:

```text
PublishedResourceReference
key
```

The source Resource is authoritative.

Passing both:

```text
source.resourceId = .../kjvs
version = kjv
```

would create two potentially contradictory sources of truth.

The Domain extracts whatever edition/version information it requires from the selected source Resource.

---

# 47. Local Domain Identity Remains Publisher-Scoped

Different publishers may publish the same version/edition name.

Therefore local Domain Object identity continues to include publisher identity.

Examples:

```text
Publisher A / kjvs / G1
Publisher B / kjvs / G1
```

are distinct Strong’s Domain Objects.

Likewise:

```text
Publisher A / kjvs / 1_1
Publisher B / kjvs / 1_1
```

are distinct Chapters.

Changing module source does not overwrite data installed from another publisher.

---

# 48. Domain Source Parsing Helpers

Each Domain may provide a small source-parsing helper.

Conceptually:

```text
parseStrongsSource(reference)
    →
publisher
edition
```

and:

```text
parseBibleChapterSource(reference)
    →
publisher
version
```

Such helpers own:

- expected Resource Type validation,
- expected Resource path shape,
- extraction of Domain-specific source identity.

They belong to the Domain, not generic Resource infrastructure.

---

# 49. Domain Store Read-Through Behavior

Domain Services retain local-first behavior.

Strong’s:

```text
source + G1
    ↓
derive local Strong's ID
    ↓
Strong's Store.get()
    ↓

hit
    → return

miss
    ↓
ResourceLoader.load(source, G1)
    ↓
reread Strong's Store
```

Chapter follows the same structure.

---

# 50. Domain Error Semantics

Two failure categories remain distinct.

## Resource unavailable

```text
local object missing
+
ResourceLoader returns false
```

Meaning:

> No applicable Published Resource could be found.

The UI may offer:

```text
This Strong's resource is unavailable.

Choose another Strong's source.
```

## Installation invariant failure

```text
ResourceLoader returns true
+
Domain Store reread still misses
```

Meaning:

> The Resource pipeline reported successful processing, but the expected Domain Object does not exist.

This indicates a programming/data-contract problem rather than normal Resource unavailability.

---

# 51. Domain Services Do Not Change Selections

If a Domain Service cannot load its selected Resource:

```text
Domain Service
    → report failure
```

The module/UI decides whether the user wants to select another source.

If changed:

```text
update Buffer selection
    ↓
call Domain Service again with new reference
```

The Domain Service does not modify the Buffer or global selections itself.

---

# 52. Complete Runtime Flow

The resulting runtime architecture is:

```text
Application Default Bundle
        ↓
Default Selection Workflow
        ↓
Global Resource Selections
        ↓
Module creation
        ↓
snapshot / inheritance
        ↓
Buffer Resource Selections
        ↓
Module Instance
        ↓
Domain Service
        ↓
Domain Store
        ↓ miss
Generic Resource Loader
        ↓
Reference-Building Policy
        ↓
Generic ResourceService
        ↓
Discovery
        ↓
Resolution
        ↓
Decode
        ↓
Resource-Type Dispatch
        ↓
Domain Resource Handler
        ↓
Interpreter
        ↓
Validator
        ↓
Installer
        ↓
Domain Store
        ↓
Domain Service reread
        ↓
Domain Object
```

---

# 53. Architectural Boundaries

## Application configuration owns

```text
Application Discovery Root
Application Default Bundle reference
Domain handler registration
Generic loader configuration
```

## Application Resource-selection layer owns

```text
global current Resource selections
selection persistence
initializing missing selections
module-context selection snapshots
```

## Workspace/Buffer runtime owns

```text
persisting module context
restoring module context
carrying Resource selection snapshots
```

It does not interpret Resource Types.

## Generic Resource layer owns

```text
Discovery
Resolution
Decoding
Resource-Type dispatch
generic acquisition/fallback orchestration
```

## Domain layer owns

```text
Resource path semantics
Domain Object identity
interpretation
validation
installation
Domain Store access
Domain-level availability errors
```

---

# 54. Important Invariants

The following rules should guide the implementation.

### No first-run Resource path

```text
if firstRun
```

must not exist inside Resource loaders, Domain services, interpreters, validators, or installers.

---

### No default publisher inside Domains

Domain services must not contain:

```text
KJVONLY_PUBKEY
```

or any equivalent built-in publisher preference.

---

### No global selection reads inside Domain services

Existing modules must operate from Buffer snapshots.

---

### No silent fallback to application defaults

A user's explicit selection is preserved until explicitly changed.

---

### No mixing Domain identity with Resource discovery

`objectType` remains a Domain Object concept.

Resource dispatch uses:

```text
resourceType
```

derived from Resource identity.

---

### No special descriptor parsing in application code

Representation handling remains below the Resource Resolution boundary.

Application workflows consume generic Resource results.

---

### No unnecessary Domain-specific loaders

Different Resource Types should use differently configured instances of the generic Resource Loader unless actual Domain-specific acquisition behavior emerges.

---

### No unnecessary Bundle Domain Object

A `descriptors` Resource can act as a generic Resource bundle without requiring application Domain interpretation of the collection itself.

---

### Background execution does not alter ownership

A Web Worker may execute Resource acquisition/install work, but the Resource architecture remains unchanged.

---

# 55. Implications for the Existing Strong’s Implementation

The Strong’s vertical slice proved the required Domain-specific components:

```text
StrongsInterpreter
StrongsValidator
StrongsInstaller
StrongsResourceHandler
StrongsStore
IndexedDBStrongsStore
StrongsService
```

These concepts remain.

The following implementation concepts should be replaced/refactored:

```text
StrongsResourceService
    → generic ResourceService

StrongsResourceLoader
    → configured generic ResourceLoader

StrongsService(publisher, ...)
    → StrongsService.get(source, key)

hardcoded application publisher
    → Buffer-supplied PublishedResourceReference
```

The Strong’s Resource namespace should move from:

```text
kjvonly/bible/strongs/...
```

to:

```text
kjvonly/strongs/definitions/...
```

---

# 56. Implications for Bible Chapters

After Strong’s proves the new generic path, Bible Chapters should be moved to the same architecture.

Eventually:

```text
BibleChapterResourceService
    → removed

BibleChapterResourceLoader
    → generic configured ResourceLoader

ChapterService(publisher, ...)
    → ChapterService.get(source, chapterRef)
```

The Chapter and Strong’s implementations should remain deliberately parallel where their semantics are genuinely identical.

---

# 57. Expected Composition Root Shape

`application.ts` remains the Composition Root.

It should eventually construct:

```text
Domain Handlers
    Chapter Handler
    Strong's Handler
    Paragraph Handler
    ...

        ↓

Generic ResourceService
    handler registry

        ↓

Configured Generic ResourceLoaders
    Chapter loader
    Strong's loader
    ...

        ↓

Domain Services
    ChapterService
    StrongsService
    ...
```

The configured loader instances are generic objects, not subclasses created solely to supply constants.

---

# 58. Extending the Application

Adding a new Resource-backed Domain should eventually require:

```text
1. Define Resource Type.

2. Implement Domain Interpreter.

3. Implement Domain Validator.

4. Implement Domain Installer.

5. Implement Domain Handler.

6. Register Resource Type → handler.

7. Configure a loader if the Domain requires object-level acquisition.

8. Add the default Resource to the application's published default bundle if desired.
```

It should not require:

```text
new generic Resource pipeline
new bootstrap logic
new application default table
new localStorage field
new ResourceService implementation
new first-run handler
```

This is the primary extensibility goal of the design.

---

# 59. Planned Refactor Sequence

The implementation should proceed incrementally.

```text
1. Introduce generic ResourceHandler contract / registry.

2. Refactor ResourceService into generic discovery-resolution-decode-dispatch service.

3. Upgrade ResourceService result to preserve per-Resource outcomes and descriptor identities.

4. Refactor Strong's onto generic ResourceService.

5. Introduce generic ResourceReferenceBuilder.

6. Introduce configured generic ResourceLoader.

7. Replace StrongsResourceLoader with configured generic loader.

8. Refactor StrongsService to accept PublishedResourceReference + key.

9. Add Strong's Domain source parsing / identity handling.

10. Update Strong's tests.

11. Implement ResourceSelectionStore.

12. Implement ResourceSelectionService.

13. Add Resource selections to Buffer context and persistence.

14. Implement snapshot/inheritance behavior during module creation.

15. Implement application-default bundle workflow.

16. Move default bundle Resource processing to background/Web Worker execution where appropriate.

17. Refactor Bible Chapters onto the same generic ResourceService/ResourceLoader architecture.

18. Remove obsolete Domain-specific Resource Services/loaders.

19. Complete browser tests for:
        module-scoped selections
        refresh restoration
        multiple simultaneous Bible sources
        Strong's local-hit/read-through behavior
        descriptor bundle processing
        application-default initialization
```

Each step should preserve working application behavior and be tested before moving to the next.

---

# 60. Final Design Summary

The application now distinguishes four related but independent concepts:

```text
Discovery Roots
    = which publishers participate in Resource Discovery

Application Default Bundle
    = which Resources the application publisher recommends initially

Global Current Resource Selections
    = which source each Resource Type should use for new modules

Buffer Resource Selections
    = which exact sources an existing module is using
```

The resulting architecture is:

```text
Publisher
    ↓
Generic Resource Bundle
    ↓
Resource Discovery / Resolution
    ↓
Application Default Workflow
    ↓
Global Resource Selections
    ↓
Module Snapshot / Inheritance
    ↓
Buffer
    ↓
Domain Service
    ↓
Generic Resource Loader
    ↓
Generic ResourceService
    ↓
Domain Handler
    ↓
Domain Object
```

The design achieves the primary goals:

- fresh-install behavior uses normal Resource architecture,
- optional data may install in the background,
- no first-run special cases are required in Domains,
- application defaults are publisher-controlled Resources rather than hardcoded tables,
- users may swap Resource sources independently,
- multiple modules may use different publishers/versions simultaneously,
- page refresh preserves exact module Resource context,
- Resource bundles become a general sharing primitive,
- the stack above Domain interpretation becomes generic,
- Domain services remain deterministic and application-state-independent,
- future Resource Types require minimal changes to shared infrastructure.

This design is the baseline for the upcoming Strong’s refactor.