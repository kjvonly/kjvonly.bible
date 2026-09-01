# Application Bootstrap, Default Resource Selection, and Resource Worker Execution Design

## Status

**Status:** Implemented except for the final Resource Worker coordinator / child-worker routing slice  
**Scope:** Application bootstrap policy, default Resource collection, Resource Selection initialization, startup fallback selections, Resource Worker execution, bootstrap reliability, integration behavior, and final worker concurrency design  
**Application:** KJVOnly.bible  
**Date:** 2026-08-31

---

# 1. Purpose

This document captures the Application Bootstrap design and implementation work completed during the 2026-08-30 through 2026-08-31 implementation cycle.

The work began with a small application startup requirement:

> On application startup, install the application-provided default Resources without blocking the user interface.

That requirement expanded into several related problems that needed to be solved coherently:

- how the application identifies its bootstrap Resource,
- how a descriptor collection supplies application default Resource identities,
- how bootstrap installation remains part of the generic Resource lifecycle,
- how already-current Resources remain visible in bootstrap results,
- how bootstrap outcomes initialize Resource Selection,
- how existing user selections remain authoritative,
- how first startup can request Genesis 1 immediately,
- how provisional application defaults differ from durable Resource Selection,
- how duplicate in-flight Resource installs are handled,
- how Resource processing moves into a Web Worker,
- how worker failure propagates to callers,
- how large descriptor-backed bootstrap work avoids blocking latency-sensitive content Resources,
- and how the Resource Worker can evolve into a small coordinator with representation-specific child workers.

This document records both:

1. the implementation that is already complete, and
2. the final planned Resource Worker execution change required before Application Bootstrap is considered finished.

The final worker change does not alter bootstrap semantics. It changes only how Resource processing work is scheduled inside the Resource worker subsystem.

---

# 2. Source and Design Context

This specification follows the style and level of detail established by:

```text
20260830-resource-descriptor-resolution-design-spec.md
```

That document established the descriptor collection, Resource Resolution, Blossom strategy, Resource receipt, and generic Resource Service model on which Application Bootstrap depends.

The related Resource Selection design is captured by:

```text
20260829-Resource Selection, Acquisition, Bundles, and Module Context.md
```

The implementation work described here refined that earlier Resource Selection design in one important area:

```text
application defaults
    ↓
provisional startup fallback
```

The application now has a narrow startup fallback mechanism so that required first-use Resources can be requested before the bootstrap descriptor collection has finished installing.

That fallback is not a general runtime fallback policy.

This distinction is defined precisely later in this document.

---

# 3. Architectural Context

The generic inbound Resource lifecycle remains:

```text
Published Resource
    ↓
Resource Discovery
    ↓
Resource Representation
    ↓
Resource Resolution
    ↓
Verified Resource Content
    ↓
Resource Content Decoding
    ↓
Resource Handler
    ↓
Domain Interpretation
    ↓
Domain Validation
    ↓
Domain Installation
    ↓
Resource Receipt
```

Application Bootstrap does not introduce another Resource lifecycle.

Bootstrap is an application workflow that decides:

```text
which Resource to request
and
when to request it
```

The generic Resource infrastructure continues to decide:

```text
how the Resource is discovered,
resolved,
decoded,
handled,
installed,
and recorded.
```

This separation is foundational.

---

# 4. Core Design Principle

Application Bootstrap is application policy implemented on top of the generic Resource architecture.

Conceptually:

```text
Application
    ↓
knows bootstrap PublishedResourceReference
    ↓
ResourceService.install(...)
    ↓
generic Resource lifecycle
```

The generic Resource infrastructure does not know:

```text
this Resource is "bootstrap"

this publisher is "the application publisher"

this descriptor collection contains "application defaults"

these Resources should become Resource Selections
```

Those are Application responsibilities.

---

# 5. Bootstrap Is Not a Special Resource Type

The bootstrap Resource currently uses:

```text
resourceId:
    kjvonly/resources/collections/default

resourceType:
    kjvonly/resources/collections

representation:
    descriptors
```

The `descriptors` representation is generic.

Another publisher may use the same descriptor machinery for:

- study collections,
- reading packages,
- imported data,
- shared collections,
- Bible datasets,
- notes packages,
- future user-defined Resource groups.

Therefore:

```text
descriptor collection
    ≠
bootstrap
```

Instead:

```text
bootstrap
    =
application policy that requests one descriptor collection
```

---

# 6. Bootstrap Resource Identity

The application knows one bootstrap reference:

```ts
const APPLICATION_BOOTSTRAP_RESOURCE:
    PublishedResourceReference = {

    publisher:
        KJVONLY_PUBKEY,

    resourceId:
        'kjvonly/resources/collections/default'
};
```

This is intentionally a normal `PublishedResourceReference`.

No bootstrap-specific identity model is introduced.

The stable identity remains:

```text
publisher + resourceId
```

---

# 7. Bootstrap Publication Shape

The development bootstrap publication is a kind `37770` Resource with:

```text
d:
    kjvonly/resources/collections/default

t:
    kjvonly/resources/collections

representation:
    descriptors

m:
    application/json
```

Its event content is a descriptor document describing the default child Resources.

Conceptually:

```text
Bootstrap Collection
    ↓
[
    Chapter source Resource descriptor,
    Strong's source Resource descriptor
]
```

---

# 8. Current Development Bootstrap Children

The current development bootstrap collection describes two child Resources:

```text
kjvonly/bible/chapters/kjvs

kjvonly/strongs/definitions/kjvs
```

These are source/bundle Resource identities.

They are not individual Domain Object identities.

---

# 9. Chapter Bootstrap Resource

The current development Chapter bootstrap Resource is:

```text
publisher:
    KJVOnly application publisher

resourceId:
    kjvonly/bible/chapters/kjvs

resourceType:
    kjvonly/bible/chapters
```

Its Blossom payload currently contains two Chapter candidates:

```text
kjvs/1_1
kjvs/1_2
```

Production is expected to contain the complete application-provided Chapter dataset.

The current small payload exists only to keep development bootstrap testing inexpensive.

---

# 10. Strong's Bootstrap Resource

The Strong's source Resource is:

```text
publisher:
    KJVOnly application publisher

resourceId:
    kjvonly/strongs/definitions/kjvs

resourceType:
    kjvonly/strongs/definitions
```

The current development payload contains only:

```text
H7225
```

but:

```text
H7225
```

is a Domain Object key inside the Strong's Resource.

It is not the Published Resource identity.

This distinction was corrected during bootstrap implementation.

---

# 11. Strong's Identity Correction

An earlier development seed represented the Strong's bootstrap child as:

```text
kjvonly/strongs/definitions/kjvs/H7225
```

That was incorrect for the intended source/bundle publication model.

The corrected identity is:

```text
kjvonly/strongs/definitions/kjvs
```

with payload:

```json
{
    "H7225": {
        "...": "..."
    }
}
```

The important invariant is:

```text
advertised Resource
    =
selected Resource
    =
installed Resource
    =
receipt Resource
```

The application must not infer a parent Resource identity by stripping path segments from an individual Domain object or Resource identifier.

---

# 12. Resource Selection Identity

Resource Selection identifies the selected source Resource.

For Bible Chapters:

```text
kjvonly/bible/chapters
    →
publisher A
kjvonly/bible/chapters/kjvs
```

Not:

```text
publisher A
kjvonly/bible/chapters/kjvs/1_1
```

For Strong's:

```text
kjvonly/strongs/definitions
    →
publisher A
kjvonly/strongs/definitions/kjvs
```

Not:

```text
publisher A
kjvonly/strongs/definitions/kjvs/H7225
```

The selected source answers:

> Which Resource source is this application or module using?

The Domain request answers:

> Which object inside that source is currently requested?

These remain separate concepts.

---

# 13. Default Collection Policy

A generic descriptor collection may contain multiple Resources of the same Resource Type.

For example, a user collection may validly advertise:

```text
kjvonly/bible/chapters/kjv
kjvonly/bible/chapters/kjvs
kjvonly/bible/chapters/asv
```

Application Bootstrap imposes a stricter policy:

> The application bootstrap collection may advertise at most one default Resource for each selectable Resource Type.

This rule belongs to Application policy.

It does not belong to:

```text
ResourceDescriptorValidator
DescriptorsRepresentationResolver
ResourceResolver
ResourceService
```

---

# 14. Why Bootstrap Requires Unique Resource Types

Application Bootstrap must be able to derive:

```text
Resource Type
    →
one PublishedResourceReference
```

without ambiguity.

Given:

```text
kjvonly/bible/chapters
```

the bootstrap collection may advertise one application default Chapter source.

If it advertises two Chapter sources, the application cannot silently choose one.

Therefore duplicate bootstrap Resource Types are an Application bootstrap configuration error.

---

# 15. Startup Lifecycle

The implemented startup sequence is:

```text
Application.start()
    ↓
restore Nostr signer state
    ↓
restore persisted Resource Selections
    ↓
configure Resource Client relays
    ↓
Application state = started
    ↓
start bootstrap Resource installation asynchronously
```

Bootstrap intentionally does not block `Application.start()`.

The application becomes usable before all bootstrap child Resources finish installing.

---

# 16. Why Bootstrap Is Non-Blocking

The bootstrap collection may eventually contain substantial datasets:

```text
Bible Chapters
Strong's definitions
paragraph overlays
pericopes
search indexes
book metadata
reading plans
other application-provided Resources
```

Waiting for every default Resource to download, decode, validate, and install before rendering the application would make first launch unnecessarily dependent on bulk installation.

Therefore:

```text
Application startup
    ≠
bootstrap completion
```

The application starts.

Bootstrap proceeds asynchronously.

---

# 17. Bootstrap Failure Does Not Fail Application Startup

The application treats bootstrap installation as recoverable startup work.

The following conditions produce diagnostics rather than a failed `Application.start()`:

- bootstrap Resource not found,
- child Resource unavailable,
- child Resource unsupported,
- child Resource decode failure,
- child Resource Domain validation failure,
- Blossom retrieval failure,
- receipt write failure,
- bootstrap selection initialization error.

The user should retain access to already-installed and on-demand Resources even when bootstrap is incomplete.

---

# 18. Bootstrap Install Result

Bootstrap consumes the normal:

```text
ResourceInstallResult
```

Conceptually:

```ts
interface ResourceInstallResult {
    requested:
        PublishedResourceReference;

    found:
        boolean;

    resources:
        readonly ResourceInstallOutcome[];
}
```

`found` refers only to the exact root Resource requested.

For bootstrap:

```text
found = false
```

means:

```text
kjvonly/resources/collections/default
```

was not discovered.

It does not mean that individual default Resources do or do not exist independently.

---

# 19. Per-Resource Bootstrap Outcomes

Child Resources may produce:

```text
handled
current
unsupported
failed
```

These statuses serve Resource lifecycle semantics first.

Application Bootstrap interprets them only after Resource processing has completed.

---

# 20. `handled`

`handled` means:

> The Resource was processed successfully by its registered Resource Handler during this install request.

For bootstrap completeness:

```text
handled
    =
complete
```

For Resource Selection initialization:

```text
identified handled child
    =
valid default candidate
```

---

# 21. `current`

`current` means:

> The Resource was checked and no processing was required because the existing Resource receipt already represents an equal or newer processed revision.

This is semantically different from `handled`.

Conceptually:

```text
handled
    → work performed now

current
    → work not required now
```

Both are successful bootstrap outcomes.

---

# 22. Why `current` Was Added

Before `current` was added, descriptor resolution behaved conceptually like:

```text
descriptor
    ↓
receiptService.needsProcessing(...)
    ↓
false
    ↓
continue
```

The child Resource disappeared from the result.

That was acceptable when the only question was:

```text
does this Resource need downloading?
```

It became incorrect when bootstrap also needed to answer:

```text
which default Resource identities did the collection advertise?
```

If the Resource was already current, its identity still mattered.

---

# 23. `ResourceResolutionResult.current`

The resolution result was expanded to preserve current Resource identity:

```ts
interface ResourceResolutionResult {
    readonly contents:
        readonly VerifiedResourceContent[];

    readonly current:
        readonly ResourceResolutionCurrent[];

    readonly failures:
        readonly ResourceResolutionFailure[];
}
```

A current entry preserves:

```text
publisher
resourceId
resourceType
```

without returning serialized Resource content.

---

# 24. Current Resource Retrieval Rule

For a descriptor child:

```text
validate descriptor
    ↓
check receipt
    ↓
receipt equal/newer?
    ├── yes
    │    ↓
    │  add identity to current[]
    │    ↓
    │  do not retrieve external content
    │
    └── no
         ↓
       resolve strategy
```

The optimization remains intact.

The only change is that the Resource no longer becomes invisible.

---

# 25. `current` at ResourceService Boundary

`ResourceService` folds `resolution.current` into:

```text
ResourceInstallOutcome {
    reference
    resourceType
    status: current
}
```

That gives Application Bootstrap enough information to initialize selections even when the default Resource was already installed before the current bootstrap run.

---

# 26. Bootstrap Completeness Rule

Application Bootstrap currently considers these statuses complete:

```text
handled
current
```

Everything else is incomplete:

```text
unsupported
failed
```

Conceptually:

```ts
resource.status !== 'handled' &&
resource.status !== 'current'
```

produces the incomplete set.

Incomplete bootstrap Resources are logged.

They do not fail application startup.

---

# 27. Why `unsupported` Is Incomplete

`unsupported` means:

> The Published Resource was resolved but the current application has no registered Resource Handler for its Resource Type.

Therefore the Resource is not locally usable through the current application implementation.

It is incomplete from an installation perspective.

However its identity may still be valid for default selection initialization.

Those two questions remain separate.

---

# 28. Why `failed` Is Incomplete

`failed` means some stage of Resource processing failed.

Examples:

```text
descriptor retrieval
integrity verification
content decoding
Domain interpretation
Domain validation
Domain installation
```

The Resource is incomplete from an installation perspective.

But a failure does not necessarily invalidate its already-validated Resource identity.

That distinction is important to Resource Selection.

---

# 29. Bootstrap Has Two Independent Responsibilities

Loading the application bootstrap collection serves two independent purposes:

```text
1. identify the application's default Resource references

2. begin normal installation of those Resources
```

These responsibilities are related, but they are not equivalent.

A Resource may be a valid advertised default even if its current download fails.

---

# 30. Installation Failure Does Not Invalidate Default Identity

Suppose the bootstrap collection advertises:

```text
Bible
    → Resource A

Strong's
    → Resource B
```

and Strong's retrieval fails.

The correct result is:

```text
Strong's install
    → failed

Strong's default identity
    → still Resource B
```

The application can later retry acquisition through the normal Resource loading path.

This is why identified failed child outcomes may still initialize missing Resource Selections.

---

# 31. Trusted Failure Identity Boundary

A failed outcome is usable for bootstrap selection initialization only when it contains:

```text
reference
resourceType
```

A failure may occur before trustworthy child identity is available.

For example:

```text
malformed descriptor entry
    ↓
descriptor validation fails before identity is trusted
```

Such a failure may have:

```text
reference = undefined
resourceType = undefined
```

It must not initialize a Resource Selection.

---

# 32. Identified Failure Rule

The Application bootstrap selection candidate rule is therefore:

```text
failed + complete trusted identity
    → may initialize missing selection

failed + incomplete identity
    → ignored for selection initialization
```

Installation completeness still reports both as failed.

---

# 33. Root Collection Failure Exclusion

A descriptor document failure may identify the containing bootstrap Resource itself:

```text
requested:
    kjvonly/resources/collections/default

failure:
    publisher = bootstrap publisher
    resourceId = kjvonly/resources/collections/default
    resourceType = kjvonly/resources/collections
```

That identity is not a selectable child default.

Therefore Application Bootstrap explicitly excludes the exact `result.requested` identity from Resource Selection candidates.

---

# 34. Bootstrap Selection Candidate Algorithm

Conceptually:

```text
for each ResourceInstallOutcome:
    ↓
does it have reference + resourceType?
    ├── no → ignore for selection initialization
    └── yes
         ↓
is it the requested bootstrap collection itself?
    ├── yes → ignore
    └── no
         ↓
has this Resource Type already appeared?
    ├── yes → bootstrap configuration error
    └── no
         ↓
collect PublishedResourceReference
```

Then:

```text
ResourceSelectionService.initializeMissing(
    collected references
)
```

---

# 35. Bootstrap Selection Initialization Is Application Policy

The generic Resource lifecycle does not perform:

```text
Resource Type
    →
global Resource Selection
```

That conversion belongs to Application Bootstrap.

This preserves the difference between:

```text
descriptor collection
    → which Resources should be resolved/installed?

Resource Selection
    → which Resource source should application context use?
```

Generic collections never automatically redefine global selections.

---

# 36. ResourceSelectionService Responsibility

`ResourceSelectionService` owns application-level current Resource Selection behavior.

Its responsibilities include:

```text
get effective selection

require effective selection

explicitly select Resource

restore persisted selections

initialize missing established selections

produce a detached effective snapshot
```

It does not know:

```text
which Resource is bootstrap

which defaults belong to KJVOnly

which Resource Type is Bible

which Resource Type is Strong's

how Resources are discovered

how Resources are installed
```

---

# 37. Selection State Has Two Layers

The implementation now distinguishes:

```text
established current selections

fallback selections
```

These are intentionally different states.

---

# 38. Established Current Selections

Established current selections come from:

```text
persisted state
bootstrap initialization
explicit user/application selection
```

They represent the actual current application preference.

They are persisted.

---

# 39. Fallback Selections

Fallback selections are application-provided startup references.

They exist to answer an early-startup question:

> If no established selection exists yet, what source may the application use immediately?

They are:

- available immediately,
- not persisted merely because they exist,
- replaceable by bootstrap initialization,
- lower precedence than restored or explicitly selected current values.

---

# 40. Why Fallback Selections Were Reintroduced

An earlier implementation removed hardcoded application defaults entirely and constructed:

```text
ResourceSelectionService([])
```

This correctly eliminated defaults from normal Resource Selection policy.

However it exposed a first-startup gap:

```text
fresh application
    ↓
no persisted selection
    ↓
bootstrap still installing
    ↓
UI requests Genesis 1
    ↓
no Chapter source selection exists yet
```

The application needs a Chapter source before bulk bootstrap installation completes.

The fallback layer solves that requirement without making built-in defaults durable current selections.

---

# 41. Fallback Is Not General Runtime Fallback

The word `fallback` is intentionally narrow here.

It does not mean:

```text
selected Resource unavailable
    ↓
silently switch to application fallback
```

That behavior remains forbidden.

Instead:

```text
no established current selection exists yet
    ↓
startup fallback may provide an effective reference
```

Once an established current selection exists:

```text
current
    >
fallback
```

If that current Resource later becomes unavailable, the application does not silently substitute the fallback.

---

# 42. Selection Precedence

The effective selection rule is:

```text
established current selection
    ??
startup fallback selection
```

Precedence:

```text
restored / bootstrap / explicit current
    >
application startup fallback
```

---

# 43. Fresh Startup Selection Flow

On a fresh application:

```text
Application constructed
    ↓
fallback Chapter source exists
fallback Strong's source exists
    ↓
no persisted selections restored
    ↓
effective selections use fallbacks
    ↓
application may request Genesis 1 immediately
    ↓
bootstrap eventually returns advertised defaults
    ↓
initializeMissing(...)
    ↓
fallback does not count as established current state
    ↓
bootstrap default becomes established current selection
    ↓
persist established selection
```

---

# 44. Returning User Selection Flow

For an existing user:

```text
Application constructed
    ↓
fallbacks exist
    ↓
restore()
    ↓
persisted Chapter selection becomes current
    ↓
current overrides fallback
    ↓
bootstrap returns
    ↓
initializeMissing(...)
    ↓
Chapter already has established current selection
    ↓
preserve user selection
```

The bootstrap collection does not overwrite existing user preference.

---

# 45. Updated Bootstrap Collection Rule

An updated application bootstrap collection does not automatically replace established current selections.

The rule remains:

```text
established selection exists
    → preserve

established selection missing
    → initialize from bootstrap
```

Automatic migration from one default Resource to another would be a separate Application policy.

It is not part of bootstrap initialization.

---

# 46. Fallback Persistence Rule

Fallback selections are never persisted merely because the service was constructed with them.

Persistence writes only:

```text
established current selections
```

This prevents:

```text
Application constructor
    ↓
built-in fallback
    ↓
localStorage
```

from accidentally turning a temporary startup value into durable user state before bootstrap has a chance to advertise the current application default.

---

# 47. Effective Snapshot Rule

`ResourceSelectionService.snapshot()` exposes effective selection state.

Conceptually:

```text
copy fallback selections
    ↓
overlay established current selections
```

This allows module/application context creation to see a usable source even during first startup.

Persistence does not use that effective snapshot directly.

Persistence writes only the established-current map.

---

# 48. Current Application Fallbacks

The current Application composition supplies:

```text
Bible Chapter:
    publisher = KJVONLY_PUBKEY
    resourceId = kjvonly/bible/chapters/kjvs

Strong's:
    publisher = KJVONLY_PUBKEY
    resourceId = kjvonly/strongs/definitions/kjvs
```

These references are deliberately small in number.

They exist for first-use startup continuity.

The long-term default collection remains the authoritative way to advertise the full set of application defaults.

Adding every future bootstrap Resource to the fallback list is not implied.

Only Resources required before bootstrap can reasonably complete need provisional startup references.

---

# 49. Genesis 1 First-Boot Requirement

A concrete startup requirement surfaced during implementation:

> On first application boot, the user should be able to request Genesis 1 immediately.

The local relay currently publishes individual Chapter Resources such as:

```text
kjvonly/bible/chapters/kjvs/1_1

kjvonly/bible/chapters/kjvs/1_2
```

Production is expected to publish all 1189 Chapters individually.

Therefore first-read acquisition does not need to wait for the complete Chapter bundle.

---

# 50. Individual Chapter Acquisition

Given effective Chapter selection:

```text
publisher:
    KJVOnly publisher

source:
    kjvonly/bible/chapters/kjvs
```

and requested Chapter:

```text
1_1
```

the normal Resource Loader may request:

```text
kjvonly/bible/chapters/kjvs/1_1
```

The discovered representation is:

```text
content
```

and the Resource can be installed independently.

The source selection remains:

```text
kjvonly/bible/chapters/kjvs
```

The individual Chapter Resource is only the acquisition unit.

---

# 51. Bundle and Individual Chapter Resources Coexist

The publication model supports both:

```text
source/bundle:
    kjvonly/bible/chapters/kjvs

individual:
    kjvonly/bible/chapters/kjvs/1_1
```

This allows:

```text
first user read
    → small individual content Resource

background bootstrap
    → larger source/bundle Resource
```

without changing application-facing Chapter identity.

---

# 52. Why First-Read Latency Still Appeared

After fallback selections were implemented, first startup correctly downloaded the individual Genesis 1 Resource.

However a noticeable delay remained.

That proved:

```text
selection availability
    → fixed

Resource execution contention
    → still present
```

The remaining issue was not missing Resource identity.

It was worker execution topology.

---

# 53. Current Resource Worker Boundary

The Application currently constructs one:

```text
ResourceWorkerClient
```

and exposes it through:

```text
ApplicationContext.resourceService
```

Application-facing Resource Loaders use the same client.

Bootstrap also uses the same client.

Therefore all Resource work currently enters one Resource Worker boundary.

---

# 54. ResourceWorkerClient Public Contract

The application-facing contract is intentionally simple:

```ts
install(
    reference:
        PublishedResourceReference
): Promise<ResourceInstallResult>
```

The caller does not know:

- representation type,
- worker topology,
- descriptor strategy,
- Domain handler,
- scheduling policy.

This is a useful boundary and should remain stable.

---

# 55. Current Worker Message Contract

The main thread currently sends:

```text
install {
    requestId
    reference
}
```

The Resource worker cannot know the representation yet.

It requests discovery back through the main-thread bridge:

```text
Resource Worker
    ↓
discovery {
    requestId
    reference
}
    ↓
main-thread ResourceDiscovery
    ↓
discovery-result {
    requestId
    representation
}
```

The representation becomes known before Resource Resolution begins.

---

# 56. Why Discovery Remains on the Main Thread

Resource Discovery currently depends on browser/application Nostr infrastructure:

```text
NostrSigner
ResourceClient
rx-nostr
NIP-42 authentication
relay configuration
verification client
```

The Resource Worker does not recreate that stack.

The boundary remains:

```text
main thread
    → Nostr discovery

Resource worker subsystem
    → processing after ResourceRepresentation exists
```

---

# 57. Worker-Side Resource Processing

The current Resource worker owns:

```text
ResourceService
ResourceResolver
ContentRepresentationResolver
DescriptorsRepresentationResolver
ResourceDescriptorDocumentDecoder
ResourceDescriptorValidator
BlossomResourceResolutionStrategy
ResourceContentDecoder
ResourceReceiptService
Bible Chapter Resource Handler
Strong's Resource Handler
Domain installers
IndexedDB persistence adapters
```

This removed Resource CPU/data processing from the main application composition.

---

# 58. Why Moving Processing to a Worker Was Important

Resource processing can include:

```text
SHA-256
gzip decompression
JSON parsing
descriptor iteration
Domain interpretation
Domain validation
large Domain installation transactions
```

These operations should not block Svelte rendering or interaction on the main thread.

The worker move therefore addressed UI-thread responsiveness.

It did not yet address head-of-line blocking between different Resource workloads inside the worker itself.

---

# 59. Worker Discovery Bridge

The worker uses a discovery proxy that communicates with main-thread `ResourceDiscovery`.

Conceptually:

```text
worker ResourceService
    ↓
worker discovery proxy
    ↓
message to main
    ↓
ResourceDiscovery.get(...)
    ↓
ResourceRepresentation
    ↓
message to worker
```

This preserves one Nostr implementation and keeps worker Resource processing transport-neutral after discovery.

---

# 60. Worker Request Correlation

Worker requests use request IDs.

This allows multiple outstanding install operations to be matched independently.

The `ResourceWorkerClient` already supports results arriving out of order.

Conceptually:

```text
install-1
install-2

worker returns:
    install-2
    install-1

client resolves:
    correct Promise for each request
```

This remains required after child-worker routing is added.

---

# 61. Worker Failure Semantics

Worker infrastructure failure must not leave application Promises pending forever.

The implemented Resource Worker Client handles failure by:

```text
worker error/messageerror
    ↓
reject pending install Promises
    ↓
prevent additional use of failed worker
    ↓
terminate failed worker
```

`dispose()` likewise rejects pending requests and terminates the worker.

No automatic Resource operation retry is introduced.

---

# 62. Why Worker Failure Is Different From Resource Failure

A normal Resource failure returns a normal Resource result or Resource error associated with the request.

A worker crash means:

```text
execution infrastructure disappeared
```

Pending callers cannot assume their operations completed.

Therefore they must be rejected.

This preserves explicit failure instead of silent hanging.

---

# 63. Exact-Reference In-Flight Deduplication

ResourceService now deduplicates concurrent requests for the same exact Published Resource identity.

The key is based on:

```text
publisher
resourceId
```

Conceptually:

```text
install(Resource A)
install(Resource A)
    ↓
same in-flight Promise
```

Only one actual install executes.

---

# 64. Why In-Flight Deduplication Was Added

Application Bootstrap and normal application loading can overlap.

Without deduplication:

```text
bootstrap requests Resource A

UI requests Resource A before receipt exists
```

could perform duplicate work.

Receipts do not solve that race because neither request may have written its receipt yet.

The in-flight map closes that narrow window.

---

# 65. In-Flight Deduplication Scope

The current rule is deliberately narrow:

```text
same publisher + same resourceId + concurrent
    → share work
```

Different Resources are not serialized.

A later request after completion is not permanently cached by the in-flight map.

Normal receipt freshness handles later requests.

No:

- general scheduler,
- global semaphore,
- retry queue,
- priority queue,
- cross-tab lock,
- distributed lock

was introduced.

---

# 66. In-Flight Failure Cleanup

If an in-flight install rejects:

```text
in-flight entry
    → removed
```

A later request may try again.

Concurrent callers share the same rejection for the active attempt.

This prevents a rejected Promise from permanently poisoning the Resource identity.

---

# 67. Blossom Integration

The bootstrap descriptor collection currently resolves child Resources through Blossom.

For each descriptor, the Blossom strategy owns:

```text
strategy data validation
HTTP retrieval
optional size verification
SHA-256 verification
raw Uint8Array return
```

It does not:

```text
decompress
parse JSON
interpret Domain data
install Domain Objects
write Resource receipts
```

Those remain downstream Resource lifecycle responsibilities.

---

# 68. Bootstrap Descriptor Payload

Each current development bootstrap descriptor contains:

```text
metadata:
    publisher
    resourceId
    category
    modifiedAt
    mediaType

strategy:
    type = blossom

    data:
        url
        sha256
        size
```

The descriptor is self-contained.

Child identity is not inherited from the containing bootstrap event.

---

# 69. Real Bootstrap Integration Flow

The tested integration flow is conceptually:

```text
Application
    ↓
ResourceWorkerClient
    ↓
Resource Worker
    ↓
main-thread Resource Discovery
    ↓
bootstrap descriptors Resource
    ↓
DescriptorsRepresentationResolver
    ↓
Resource receipts
    ↓
Blossom strategy
    ↓
SHA-256 verification
    ↓
raw gzip bytes
    ↓
ResourceContentDecoder
    ↓
Chapter / Strong's Resource Handler
    ↓
Domain validation
    ↓
IndexedDB installation
    ↓
Resource receipt
```

This is the same Resource lifecycle used by normal on-demand acquisition.

---

# 70. Receipt Behavior During Bootstrap

Descriptor child receipts prevent repeatedly downloading unchanged bootstrap Resources.

The freshness rule is:

```text
no receipt
    → process

incoming modifiedAt > receipt modifiedAt
    → process

incoming modifiedAt <= receipt modifiedAt
    → current
```

Receipt checks occur before Blossom retrieval.

---

# 71. Outer Bootstrap Collection Receipt

The bootstrap descriptor collection itself does not represent installed Domain data merely because its child Resources were processed.

Current bootstrap behavior records receipts for processed child Resources.

The important receipt identities are:

```text
kjvonly/bible/chapters/kjvs

kjvonly/strongs/definitions/kjvs
```

The outer collection is orchestration metadata, not a Domain installation.

---

# 72. Bootstrap Second-Run Behavior

After child Resources have already been processed:

```text
bootstrap descriptors
    ↓
receipt checks
    ↓
children current
    ↓
no external re-download
```

The outward bootstrap result still preserves child identities as:

```text
status: current
```

This allows both:

```text
bootstrap completeness
and
Resource Selection initialization
```

to remain correct on later runs.

---

# 73. Application Bootstrap Selection Tests

The Application bootstrap selection browser specification contains five focused policy tests.

They prove:

```text
1. missing Resource selections are initialized from bootstrap results

2. an existing Resource selection is preserved while another missing type is initialized

3. an identified failed bootstrap Resource still initializes its missing selection

4. duplicate bootstrap Resource Types are rejected without changing existing selections

5. current bootstrap Resources initialize selections
```

These are Application policy tests.

---

# 74. Why Bootstrap Selection Tests Mock ResourceWorkerClient

An initial standalone browser test attempted to depend on the actual bootstrap Resource already being present on the relay.

That produced:

```text
[Application bootstrap Resource not found]
```

followed by localStorage timeout failures when the relay was not seeded for that test.

That test mixed two concerns:

```text
real Resource acquisition fixture

Application selection policy
```

The corrected test isolates Application policy by mocking only:

```text
ResourceWorkerClient.install()
```

while keeping real:

```text
Application
ResourceSelectionService
LocalStorageResourceSelectionStore
localStorage
```

---

# 75. Test Layering

Bootstrap behavior is intentionally tested at multiple layers.

## Resource infrastructure tests

Prove:

```text
discovery
resolution
current semantics
receipt freshness
Blossom retrieval
integrity
decode
Domain handling
worker messaging
```

## Real integration tests

Prove:

```text
relay
→ Resource Client
→ worker bridge
→ descriptor resolution
→ Blossom
→ Domain installation
→ IndexedDB
```

## Application bootstrap policy tests

Prove:

```text
ResourceInstallResult
→ bootstrap candidate policy
→ ResourceSelectionService.initializeMissing(...)
→ localStorage
```

No single test needs to prove every layer at once.

---

# 76. ResourceSelectionService Test Responsibilities

The Resource Selection tests should preserve the following behavior:

```text
fallback is immediately readable

explicit current selection overrides fallback

restored persisted current selection overrides fallback

fallback construction does not persist

initializeMissing may replace fallback with established current state

initializeMissing does not replace restored/explicit current state

missing Resource Types are initialized independently

effective snapshot includes fallback where no current exists

persistence excludes fallback-only entries
```

These rules are part of startup correctness.

---

# 77. Performance Issue Surfaced by Real Startup

After first-start selection was fixed, the application correctly requested the individual Genesis 1 content Resource.

A lag still remained.

This revealed a different issue:

> bulk descriptor-backed Resource processing and latency-sensitive content Resource processing should not share one execution lane.

The problem becomes clearer in production.

---

# 78. Production Contention Example

Consider:

```text
bootstrap descriptor request
    ↓
Chapter source bundle
    ↓
large external file
    ↓
decode / validate / install many objects
```

While that work is active, the user navigates:

```text
Genesis 1
    ↓
Genesis 2
    ↓
John 3
```

Those individual Chapters are small `content` Resources.

They should not wait behind a large descriptor workload.

---

# 79. Representation Types Already Provide a Useful Execution Boundary

The Resource model has exactly two current representation types:

```text
content

descriptors
```

They have meaningfully different workload characteristics.

## `content`

Serialized Resource payload is carried in the Resource event.

Therefore it is naturally bounded by event transport constraints and expected to be comparatively small.

Typical user-facing example:

```text
individual Chapter
```

## `descriptors`

The event contains references to external Resource content.

A descriptor collection may resolve:

- large files,
- many Resources,
- expensive decompression,
- large JSON payloads,
- bulk Domain installations.

This naturally represents heavier work.

---

# 80. Final Worker Design Principle

The Application should continue to see exactly one Resource worker/service boundary.

Internally, the Resource Worker should become a coordinator.

Conceptually:

```text
Application
    ↓
ResourceWorkerClient
    ↓
Resource Coordinator Worker
    ↓
representation-specific child workers
```

This keeps execution topology hidden from Application and Domain code.

---

# 81. Why Application Should Not Own Multiple Resource Workers

An alternative would expose:

```text
contentResourceWorkerClient

descriptorResourceWorkerClient

backgroundResourceWorkerClient
```

to Application composition.

That would leak execution policy upward.

The Application would need to know which worker should process which Resource.

That is unnecessary because Resource infrastructure already knows the representation after discovery.

Therefore the single outer Resource worker boundary is retained.

---

# 82. Resource Coordinator Worker

The existing:

```text
resource.worker.ts
```

should become the Resource Coordinator Worker.

Its responsibilities become:

```text
accept outer install(reference) requests

preserve request correlation

perform root Resource Discovery through the existing main-thread bridge

receive ResourceRepresentation

route by representation

coordinate child worker result/error messages

preserve exact-reference in-flight semantics

manage child worker lifecycle

forward final ResourceInstallResult to ResourceWorkerClient
```

It should stop doing heavy Resource processing itself.

---

# 83. Child Worker Topology

The initial fixed topology is:

```text
Resource Coordinator Worker
    │
    ├── Content Resource Worker
    │
    ├── Descriptor Resource Worker 1
    ├── Descriptor Resource Worker 2
    └── Descriptor Resource Worker 3
```

The child workers are created when the Resource Coordinator Worker initializes.

No worker is created per Resource request.

---

# 84. Content Worker

There is initially one Content Resource Worker.

It handles root Resources where:

```text
representation = content
```

Typical workload:

```text
individual Chapter Resources
other small inline Resource payloads
```

This provides a dedicated latency-sensitive Resource execution lane.

---

# 85. Descriptor Worker Pool

There are initially three Descriptor Resource Workers.

They handle root Resources where:

```text
representation = descriptors
```

Typical workloads:

```text
bootstrap collection
manual study collection
large dataset collection
descriptor-backed install
```

Three workers prevent one large descriptor operation from monopolizing every descriptor execution slot.

---

# 86. Bootstrap Is Not Given a Special Worker

No dedicated:

```text
bootstrap worker
background bootstrap worker
application default worker
```

is introduced.

Bootstrap remains:

```text
ResourceService.install(
    APPLICATION_BOOTSTRAP_RESOURCE
)
```

After discovery:

```text
representation = descriptors
```

so the Resource Coordinator naturally routes it into the Descriptor Worker Pool.

This keeps bootstrap ordinary.

---

# 87. Genesis 1 With Final Worker Topology

The target fresh startup flow becomes:

```text
Application constructed
    ↓
Chapter startup fallback immediately available
    ↓
restore persisted selections
    ↓
Application starts
    ↓
bootstrap request begins
    ↓
Coordinator discovers bootstrap
    ↓
representation = descriptors
    ↓
Descriptor Worker Pool
```

At the same time:

```text
UI requests Genesis 1
    ↓
Chapter ResourceLoader
    ↓
.../kjvs/1_1
    ↓
Coordinator discovers Resource
    ↓
representation = content
    ↓
Content Resource Worker
```

The two operations use separate child execution lanes.

---

# 88. Why No Separate Background Resource Worker Is Required

An earlier possibility was:

```text
foreground Resource worker
background Resource worker
```

The representation-specific coordinator design is cleaner for the immediate problem.

The expensive bootstrap work is already a `descriptors` workload.

User-facing Chapter reads are `content` workloads.

Therefore:

```text
representation routing
```

provides the required isolation without adding application-specific priority concepts.

If a user intentionally requests a descriptor collection, it remains descriptor work and uses the descriptor pool.

---

# 89. Root Discovery Happens Before Child Routing

The outer install request contains only:

```text
PublishedResourceReference
```

Representation is not known until Resource Discovery succeeds.

Therefore the Coordinator must:

```text
install(reference)
    ↓
ResourceDiscovery bridge
    ↓
ResourceRepresentation
    ↓
inspect representation
    ↓
choose child worker
```

The Application and `ResourceWorkerClient` do not need to change their public request contract.

---

# 90. Child Workers Begin After Root Discovery

A child worker receives an already-discovered root representation.

Conceptually the internal child request should contain enough information to preserve:

```text
outer request identity
requested PublishedResourceReference
ResourceRepresentation
```

For example:

```text
process {
    requestId
    requested
    representation
}
```

The exact internal message type name is an implementation detail.

The required semantic is not.

---

# 91. ResourceService Internal Refactor Seam

Today `ResourceService.install(reference)` performs:

```text
Discovery
    ↓
Resolution
    ↓
processing
```

The Coordinator topology discovers the root before choosing a child worker.

Therefore worker-internal composition needs a seam that can begin processing from:

```text
ResourceRepresentation
```

without performing root Resource Discovery again.

The external application-facing API should remain:

```ts
install(
    PublishedResourceReference
): Promise<ResourceInstallResult>
```

The exact internal class name is not locked.

The implementation should prefer the smallest refactor that separates:

```text
root discovery

from

post-discovery Resource processing
```

without creating a second Resource architecture.

---

# 92. Child Worker Processing Boundary

Once a child receives the discovered representation, it owns the normal post-discovery Resource lifecycle:

```text
ResourceRepresentation
    ↓
Resource Resolution
    ↓
ResourceResolutionResult
    ↓
Resource Content Decoding
    ↓
Resource Handler
    ↓
Domain Installation
    ↓
Resource Receipt
```

Descriptor child workers additionally own:

```text
descriptor document decoding
descriptor validation
receipt freshness checks
Blossom retrieval
integrity verification
```

---

# 93. Descriptor Child Resource Processing Remains Internal

A root `descriptors` representation may resolve many child Resource contents.

Those child contents do not bounce back through the Coordinator merely because they represent independently installable Resources.

The assigned Descriptor Resource Worker should process the entire root descriptor operation using the existing descriptor best-effort semantics.

Conceptually:

```text
root descriptor collection
    ↓
assigned descriptor worker
    ↓
descriptor A
descriptor B
descriptor C
...
    ↓
process outcomes
    ↓
one ResourceInstallResult
```

This preserves collection behavior and avoids unnecessary inter-worker chatter.

---

# 94. Initial Descriptor Pool Scheduling

The first implementation should use a deliberately simple scheduling rule:

```text
descriptor request arrives
    ↓
idle descriptor worker exists?
    ├── yes → assign request
    └── no  → enqueue FIFO
```

When a descriptor worker finishes:

```text
mark idle
    ↓
take next queued descriptor request
```

No more sophisticated policy is required now.

---

# 95. Why Three Descriptor Workers

A single descriptor worker still permits head-of-line blocking:

```text
1 GB descriptor-backed install
    ↓
4 MB descriptor-backed install
    ↓
small install waits
```

Three descriptor workers allow several independent descriptor workloads to progress concurrently.

This is a practical initial compromise between:

```text
one serialized heavy lane

and

unbounded parallel Resource processing
```

The count may be revisited only with performance evidence.

---

# 96. Why No Size-Aware Scheduling Yet

Descriptor strategy metadata may already contain:

```text
size
```

for integrity/retrieval purposes.

However scheduling by size is a separate concern.

The current implementation should not add a generic Resource-level:

```text
size
```

field merely for worker scheduling.

Reasons:

- Resource representation size and actual processing cost are not equivalent,
- descriptor collections can describe several differently sized Resources,
- decompression and Domain installation cost may dominate transfer size,
- the current problem is solved by execution-lane separation and a small pool,
- size-aware scheduling can be added behind the pool seam later if measurements justify it.

---

# 97. Descriptor Pool Is the Future Optimization Seam

The Coordinator should depend conceptually on:

```text
descriptor executor
```

rather than embedding scheduling assumptions throughout Resource processing.

Today:

```text
descriptor executor
    =
fixed pool of three workers
    +
FIFO queue
```

Future internal implementations may use:

```text
dynamic worker count
hardwareConcurrency
size-aware assignment
work stealing
priority
cancellation
```

without changing:

```text
Application
ResourceWorkerClient
Resource Loader
Domain services
Resource identities
Resource lifecycle
```

None of those future optimizations are part of the current bootstrap milestone.

---

# 98. Exact-Reference Deduplication Must Remain an Outward Invariant

The current exact-reference in-flight rule remains important after child workers are introduced.

Two simultaneous outer requests for:

```text
same publisher
same resourceId
```

must not be dispatched to two different descriptor workers.

Therefore deduplication must occur before child selection.

Conceptually:

```text
Coordinator install(reference)
    ↓
exact reference already in flight?
    ├── yes → join existing operation
    └── no
         ↓
       discover
         ↓
       route
```

The implementation may move the current in-flight map to the Coordinator or preserve it through an equivalent outer Resource facade.

The semantic is locked.

---

# 99. Cross-Collection Child Races Remain Separate

Two different descriptor collections could theoretically describe the same child Resource concurrently.

Example:

```text
Collection A
    → Resource X

Collection B
    → Resource X
```

If the two root collections are assigned to different descriptor workers, child-level receipt checks may race.

This is not the same as exact root request deduplication.

The current bootstrap work does not introduce:

- shared cross-worker child locks,
- global Resource transaction schedulers,
- cross-tab coordination.

If real usage exposes this race as harmful, it should be addressed separately.

---

# 100. IndexedDB Concurrency

Different child workers may perform independent IndexedDB transactions.

Existing Domain installation atomicity remains per Published Resource.

Conceptually:

```text
Resource A
    → transaction A

Resource B
    → transaction B
```

The worker pool does not redefine Domain replacement policy.

It only allows independent Resource operations to execute on different worker threads.

---

# 101. Child Worker Failure Requirement

The final implementation must preserve the existing outward failure guarantee:

> No Resource install Promise may remain pending indefinitely because a worker execution lane failed.

If a child worker fails while processing an assigned request, the Coordinator must produce an outward failure/rejection for that affected request.

No automatic Resource operation retry is required.

The exact child replacement policy after an infrastructure crash is not part of bootstrap semantics and may be decided during implementation, but it must not silently retry the failed Resource operation.

---

# 102. Coordinator Failure Requirement

If the Resource Coordinator Worker itself fails, existing `ResourceWorkerClient` failure behavior remains applicable:

```text
reject pending installs
terminate failed worker
block additional use
```

The outer Application-facing failure semantics should not change merely because child workers now exist.

---

# 103. Other Application Workers Remain Separate

The Resource worker hierarchy is not an application-wide generic worker pool.

The application has other worker-owned subsystems, including examples such as:

```text
Bible/Search Worker
    → FlexSearch index

Notes Worker
    → Notes FlexSearch index
```

These remain separate and self-contained.

Target organization:

```text
Application
    │
    ├── Resource Coordinator Worker
    │     ├── Content Resource Worker
    │     ├── Descriptor Resource Worker
    │     ├── Descriptor Resource Worker
    │     └── Descriptor Resource Worker
    │
    ├── Search Worker
    │     └── search index state
    │
    └── Notes Worker
          └── notes search index state
```

There is no shared global worker scheduler.

---

# 104. Why Separate Worker Subsystems Are Preferred

Resource processing, Bible search, and Notes search have different:

- state,
- lifecycle,
- data ownership,
- latency characteristics,
- failure modes,
- initialization requirements.

Combining them into one generic application worker pool would increase coordination without solving a concrete architecture problem.

Worker ownership should follow subsystem ownership.

---

# 105. Bootstrap Completion Definition

Application Bootstrap should be considered complete when the following are implemented and tested:

```text
bootstrap Published Resource reference
    ✓

descriptor-backed application default collection
    ✓

Chapter source bundle
    ✓

Strong's source bundle identity
    ✓

generic Resource Worker boundary
    ✓

worker discovery bridge
    ✓

real Blossom descriptor integration
    ✓

worker crash/pending Promise handling
    ✓

exact-reference in-flight deduplication
    ✓

current Resource identity preservation
    ✓

bootstrap handled/current completeness rule
    ✓

bootstrap Resource Selection initialization
    ✓

existing selection preservation
    ✓

identified failed child default initialization
    ✓

duplicate bootstrap Resource Type rejection
    ✓

startup fallback selection layer
    ✓

Genesis 1 can identify/request individual Resource on first boot
    ✓

representation-specific child Resource execution
    pending

content Resource lane independent from descriptor work
    pending

three-worker descriptor pool
    pending
```

Once the final worker routing slice is complete and green, no additional bootstrap-specific architecture work is currently required.

---

# 106. Implementation History

The bootstrap design evolved through the following commits.

| Commit | Date | Design / implementation significance |
| --- | --- | --- |
| `6f51b7c189a45e27ea90786f52465bb914021755` | 2026-08-30 23:52 | Added bootstrap settings and initial Application bootstrap code. |
| `28f410ed88b66e69190c0641619e89c663204d9d` | 2026-08-31 00:04 | Added a small bootstrap seed/file for development testing. |
| `3416e457bbec417c19ac8afe46d249c9f8924179` | 2026-08-31 00:23 | Added initial bootstrap bundle verification. |
| `b578d0f6e79babc9ed7dded7190ffe01cca76e02` | 2026-08-31 08:20 | Added Resource Worker Client and message contracts. |
| `ac9009976ca4f40dc5f2f6b52c59ffa29a0b258c` | 2026-08-31 08:27 | Added Resource Discovery worker bridge. |
| `8d2364031cdaf4e91ee0821c61e097aa9ef7c944` | 2026-08-31 08:32 | Implemented the Resource Worker. |
| `49accfe06ad1e14e6b62dd8429f4329afca76f9c` | 2026-08-31 08:41 | Added integration tests for worker discovery. |
| `374727e22f46a010028c63a66dcd07be5a96a77c` | 2026-08-31 09:07 | Unified Application/tests on the same Resource Worker Client and moved Resource Resolver/install composition out of Application into the worker. |
| `b56f719dce622c0ca67c042e682a9ae278c122e4` | 2026-08-31 17:13 | Added `.env.test`, real Blossom integration testing, and fixed the Blossom fetch default binding. |
| `a16c7473776b4c37bac8445a08bdb38970f71ad1` | 2026-08-31 17:26 | Added worker failure handling so pending install Promises reject if the worker crashes. |
| `dff166b576e3587c80596be0cf6c949b3072a740` | 2026-08-31 18:05 | Added exact-reference concurrent in-flight install deduplication. |
| `072609a6b737a6073ef3e2302e13b8e62191ecef` | 2026-08-31 18:54 | Added explicit `current` Resource outcomes so receipt-current Resources retain identity instead of disappearing. |
| `39fb3015b3ebb4941e742d435f1adc0a9cdbea4d` | 2026-08-31 19:25 | Treated `current` as complete in Application Bootstrap and updated bootstrap seed behavior to use a Strong's bundle. |
| `7cd046bfe6397071d0f232c3be675fb3aaa2f733` | 2026-08-31 19:37 | Removed application-default knowledge from ResourceSelectionService and made initialization accept generic Published Resource references. |
| `68983050972d98edbcfa12ed2c19505df645f3a6` | 2026-08-31 19:39 | Corrected integration tests to use the Strong's source/bundle Resource identity instead of the H7225 child identity. |
| `7917e27cee0fa902dc7546868d802b5239f5341c` | 2026-08-31 19:50 | Initialized missing Resource Selections from bootstrap-advertised default Resources. |
| `de38832530eb4dc7b35cf49c0ee6078b5bf1211f` | 2026-08-31 19:59 | Added Application startup coverage proving Resource Selection initialization. |
| `7728020d21184dfb2238eb85ccbac4afb29d221a` | 2026-08-31 20:17 | Added tests proving an identified failed bootstrap Resource may still initialize a missing Resource Selection. |
| `043d9c278cc0012ce6975126104f0cd18547b74c` | 2026-08-31 20:23 | Reintroduced application-provided defaults as non-persisted startup fallbacks so individual Chapters can be requested immediately on first application start. |

The final planned worker-coordinator commit should follow this sequence rather than revisiting earlier bootstrap semantics.

---

# 107. Final Worker Implementation Sequence

The remaining bootstrap implementation should be performed in small slices.

## Step 1 — Introduce internal child-worker message contracts

Add worker-internal messages for:

```text
Coordinator → child
    process discovered representation

Child → Coordinator
    result

Child → Coordinator
    error
```

Do not change the public `ResourceWorkerClient.install(reference)` contract.

## Step 2 — Factor post-discovery Resource processing

Create the minimum worker-internal seam required to process:

```text
ResourceRepresentation
```

without performing root Resource Discovery again.

Reuse the current:

- Resource Resolver,
- content decorators,
- descriptor resolver,
- Blossom strategy,
- Resource handlers,
- Domain installers,
- receipt service.

Do not duplicate the Resource lifecycle.

## Step 3 — Create Content child worker

Create one child worker initialized with the normal post-discovery Resource processing dependencies.

Route only:

```text
representation = content
```

to this worker.

## Step 4 — Create Descriptor child worker

Create a descriptor-capable child worker using the same post-discovery Resource processing infrastructure.

It must preserve current descriptor behavior:

```text
best effort
receipt checks
Blossom
integrity
decode
Domain handlers
current outcomes
failures
```

## Step 5 — Create fixed three-worker Descriptor Pool

Instantiate three descriptor child workers when the Coordinator starts.

Track:

```text
idle
busy
queued request
```

Use FIFO when all workers are busy.

## Step 6 — Route after root discovery

Coordinator flow:

```text
outer install(reference)
    ↓
root discovery bridge
    ↓
not found?
    → normal found:false result

found
    ↓
representation = content?
    → Content Worker

representation = descriptors?
    → Descriptor Pool
```

## Step 7 — Preserve outer request correlation

The Coordinator must preserve the original outer request ID all the way to the final:

```text
install-result
or
install-error
```

sent back to `ResourceWorkerClient`.

## Step 8 — Preserve exact-reference in-flight deduplication

Ensure duplicate concurrent root requests join one operation before child worker routing.

Do not allow the same exact root Resource to occupy two descriptor workers.

## Step 9 — Preserve failure lifecycle

A failed child operation must complete/reject the affected outer request.

A Coordinator failure must continue to trigger the existing main-thread worker failure behavior.

No automatic Resource retry.

## Step 10 — Update disposal

When the Coordinator is disposed/terminated, child workers must not remain orphaned.

Coordinator shutdown should terminate:

```text
Content Worker
Descriptor Worker 1
Descriptor Worker 2
Descriptor Worker 3
```

## Step 11 — Run existing Resource integration suite unchanged where possible

Existing Application callers should not need a new API.

The strongest sign that the boundary is correct is that normal Resource Loader and Application bootstrap tests require little or no caller-side change.

---

# 108. Required Final Worker Tests

The final worker slice should add focused tests for execution routing.

## Coordinator discovery routing

```text
content representation
    → Content Worker

descriptors representation
    → Descriptor Pool
```

## Content isolation

```text
descriptor worker busy

content request arrives

content request dispatched immediately
without waiting for descriptor completion
```

## Descriptor concurrency

```text
descriptor request A
descriptor request B
descriptor request C

→ three descriptor workers occupied
```

## Descriptor queue

```text
workers A/B/C busy

descriptor request D
    → queued

one worker completes
    → D dispatched
```

## FIFO descriptor queue

Given queued:

```text
D
E
F
```

workers should receive queued jobs in:

```text
D
E
F
```

order as capacity becomes available.

## Exact root deduplication

```text
same exact descriptor Resource requested twice concurrently
    → one child assignment
    → callers share one operation/result
```

## Not-found root

```text
root discovery returns null
    → no child worker selected
    → found:false
```

## Child error propagation

```text
assigned child reports processing error
    → affected outer request settles with failure/error
```

## Coordinator shutdown

```text
dispose/termination
    → all child workers terminated
```

---

# 109. Bootstrap-Specific Final Integration Test

After child-worker routing is implemented, the most useful bootstrap-level concurrency proof is:

```text
fresh application
    ↓
bootstrap descriptor install starts
    ↓
descriptor worker remains intentionally busy
    ↓
request Genesis 1
    ↓
Genesis 1 routed to Content Worker
    ↓
Genesis 1 completes without waiting for bootstrap descriptor job
```

The test does not need a production-sized Chapter dataset.

It only needs to prove execution-lane independence.

---

# 110. What Is Deliberately Not Being Implemented

The final bootstrap worker slice does not include:

```text
size-aware descriptor scheduling

dynamic descriptor worker count

hardwareConcurrency tuning

worker work stealing

descriptor priority queues

Resource cancellation

automatic operation retry

persistent background job queue

cross-tab Resource locks

global application worker pool

streaming large Resource content

generic Resource size metadata
```

These remain future optimizations or independent features.

---

# 111. Large Descriptor Payloads

The descriptor architecture can point to very large external payloads.

The current strategy contract still permits:

```text
Promise<Uint8Array>
```

which means large content may be held in memory.

The three-worker pool increases possible concurrent memory pressure compared with fully sequential descriptor processing.

Therefore the fixed pool size should remain intentionally small.

If real production datasets show memory pressure, the appropriate future work may be:

```text
Blob staging
streaming
temporary storage
bounded pool sizing
```

rather than simply adding more workers.

---

# 112. Pool Size Is an Execution Policy, Not Resource Semantics

The number:

```text
3 descriptor workers
```

is not part of:

- Resource identity,
- Resource representation,
- descriptor schema,
- Domain semantics,
- Resource Selection.

It is a worker execution policy.

It may change later without affecting Published Resources.

---

# 113. No New Resource Representation Is Needed

The worker execution design does not add representations such as:

```text
background
large
bundle
priority
```

The existing representation model remains:

```ts
type ResourceRepresentationType =
    | 'content'
    | 'descriptors';
```

Execution topology follows the existing distinction.

---

# 114. No Generic Bundle Abstraction Is Introduced

The bootstrap collection may be described colloquially as a bundle or default bundle.

Architecturally:

```text
one Published Resource
representation = descriptors
```

describes independently resolvable child Resources.

No new generic:

```text
Bundle
BundleService
BundleWorker
```

is required for Application Bootstrap.

---

# 115. No Domain Bootstrap Handler Is Introduced

The bootstrap collection does not require:

```text
BootstrapDomainObject
BootstrapResourceHandler
DefaultBundleDomain
```

The collection is resolved generically.

The Application interprets only the resulting child Resource identities for selection policy.

---

# 116. No Bootstrap-Specific Receipt Type Is Introduced

Bootstrap uses normal Resource receipts.

There is no:

```text
BootstrapReceipt
DefaultResourceReceipt
BootstrapInstalledFlag
```

Freshness remains per Published Resource.

---

# 117. No Bootstrap-Specific Resource Service Is Introduced

The application continues to request:

```text
resourceService.install(reference)
```

The final worker pool does not create:

```text
BootstrapResourceService
BackgroundResourceService
ContentResourceService
DescriptorResourceService
```

as separate application abstractions.

There is still one generic application-facing Resource installation capability.

The worker subsystem may contain internal executors, but callers do not see separate Resource architectures.

---

# 118. Application Ownership Boundary

Application Bootstrap owns:

```text
bootstrap Resource reference

when bootstrap begins

bootstrap diagnostics

which child identities may initialize selections

unique-default-per-Resource-Type policy

startup fallback references
```

It does not own:

```text
Nostr Event parsing

descriptor decoding

Blossom retrieval

SHA-256

gzip

Domain interpretation

Domain validation

Domain persistence

Resource receipt policy
```

---

# 119. Resource Infrastructure Ownership Boundary

Resource infrastructure owns:

```text
Resource Discovery

representation conversion

Resource Resolution

descriptor processing

strategy dispatch

receipt freshness

content decoding

Resource Handler dispatch

install outcome construction

worker execution details
```

It does not know whether the root request came from:

```text
bootstrap

Chapter navigation

Strong's lookup

manual install

future sync
```

---

# 120. Domain Ownership Boundary

Domain handlers/installers own:

```text
interpret candidate data

validate Domain schema/invariants

construct Domain identities

apply Domain replacement policy

atomically persist Domain state
```

Bootstrap does not bypass Domain validation merely because content is application-provided.

---

# 121. Startup Fallback Ownership Boundary

Startup fallback references are an Application composition concern.

`ResourceSelectionService` accepts them generically as:

```text
PublishedResourceReference[]
```

It does not know why they exist.

This keeps:

```text
Bible
Strong's
KJVOnly publisher
```

out of ResourceSelectionService.

---

# 122. Bootstrap Diagnostics

Current bootstrap diagnostics distinguish:

```text
bootstrap root not found

bootstrap selection initialization failure

bootstrap Resources incomplete

bootstrap installation infrastructure failure
```

This is preferable to collapsing all failures into one startup error.

The application can remain usable while diagnostics provide operational visibility.

---

# 123. Duplicate Default Diagnostic

If the bootstrap collection produces two identified children with the same Resource Type:

```text
Application bootstrap Resource selection initialization failed
```

is emitted.

Existing selections remain unchanged because initialization does not proceed with an ambiguous map.

This prevents order-dependent default selection.

---

# 124. Selection Initialization Failure Does Not Hide Installation Diagnostics

Bootstrap selection initialization is wrapped separately from Resource completeness reporting.

Therefore a duplicate default configuration can produce:

```text
selection initialization warning
```

while the application may still inspect/log incomplete Resource outcomes.

Selection policy failure does not erase Resource processing results.

---

# 125. Bootstrap Not Found Behavior

If:

```text
ResourceDiscovery.get(
    APPLICATION_BOOTSTRAP_RESOURCE
)
```

returns no Resource:

```text
warn

return from bootstrap workflow
```

The Application remains started.

Startup fallbacks can still make essential known sources available.

This is another reason the startup fallback layer is useful.

---

# 126. First-Run Offline Behavior

On a completely fresh device with no installed Domain data and no reachable Resource source:

```text
startup fallback
    → provides identity only

Resource acquisition
    → may still fail
```

Fallback selection does not imply local content exists.

The application should distinguish:

```text
know which source to request

from

have the source content locally
```

---

# 127. Previously Installed Offline Behavior

If Domain data is already installed locally:

```text
ChapterStore
    → returns existing object
```

normal Domain reads do not require a network request merely because bootstrap is running.

Bootstrap receipts likewise allow background default processing to skip already-current Resources.

---

# 128. Bootstrap and Resource Selection Are Loosely Coupled

Bootstrap installation can succeed even if Resource Selection persistence fails.

Resource Selection can be initialized from an identified failed child Resource even if that Resource did not install.

This loose coupling is intentional.

Conceptually:

```text
Resource availability state

and

selected source identity
```

are separate pieces of application state.

---

# 129. Bootstrap and Receipts Are Loosely Coupled

A successful Domain installation remains successful even if receipt persistence fails.

The application may redownload later, but Domain state is not rolled back.

This is especially important for bootstrap because receipt storage should never convert successfully installed application data into a failed bootstrap outcome.

---

# 130. Bootstrap and User Choice

Once a user explicitly selects another source:

```text
ResourceSelectionService.select(...)
```

that becomes established current state and is persisted.

Later bootstrap runs preserve it.

The application default collection is not an enforcement mechanism.

It initializes missing state.

---

# 131. Bootstrap and Future New Resource Types

If a future application version adds a new default Resource Type to the bootstrap collection:

```text
existing user:
    Chapter selection already established
    Strong's selection already established
    New Type missing
```

bootstrap can initialize only:

```text
New Type
```

without modifying existing user preferences.

This is one of the main advantages of `initializeMissing(...)`.

---

# 132. Why Bootstrap Collection Remains Valuable Even With Startup Fallbacks

Startup fallbacks might appear to reintroduce a hardcoded defaults table.

They do not replace the bootstrap collection.

Fallbacks solve only:

```text
what must be usable before bootstrap result exists?
```

The bootstrap collection still solves:

```text
what are the application's current advertised defaults?

what additional default Resource Types exist?

what Resources should begin background installation?

what child revisions should be checked?
```

The default collection remains authoritative for initialization.

---

# 133. Minimal Fallback Principle

Fallback references should be kept minimal.

A Resource should be added to Application fallback composition only when:

```text
the application genuinely needs its source identity
before bootstrap can reasonably finish
```

For example:

```text
initial Bible Chapter source
```

has a concrete first-render requirement.

Future bulk-only Resources may not need startup fallback entries.

---

# 134. Resource Worker Coordinator Does Not Change Selection Semantics

The final worker topology is an execution optimization.

It does not change:

```text
bootstrap candidate rules

Resource Selection precedence

fallback semantics

receipt rules

current semantics

default uniqueness

Published Resource identity
```

Those are already implemented bootstrap semantics.

---

# 135. Resource Worker Coordinator Does Not Change Publication

No seed format change is required merely because child workers are introduced.

The bootstrap event remains:

```text
representation = descriptors
```

Individual Chapter events remain:

```text
representation = content
```

The existing publication model supplies the routing signal naturally.

---

# 136. Resource Worker Coordinator Does Not Change Application API

Application continues to depend on:

```text
Pick<ResourceService, 'install'>
```

or equivalent generic `install(reference)` capability.

Chapter and Strong's loaders do not select workers.

Bootstrap does not select workers.

The Resource worker subsystem owns routing.

---

# 137. Deferred: Size-Aware Descriptor Scheduling

A future descriptor executor could inspect known work metadata.

Potential examples:

```text
strategy.data.size
number of descriptors
historical processing cost
```

A future policy might send smaller jobs to an idle worker preferentially.

No such policy is currently justified by measurements.

The current design creates the seam without implementing the optimization.

---

# 138. Deferred: Dynamic Worker Count

A future implementation may consider:

```text
navigator.hardwareConcurrency
device memory
mobile constraints
```

when choosing descriptor pool size.

The initial design intentionally uses a fixed pool.

Determinism and simplicity are preferred until production evidence requires adaptation.

---

# 139. Deferred: Cancellation

The current Resource install API does not expose cancellation semantics.

A user navigating away from a Chapter or abandoning a descriptor install does not currently imply cancellation of the underlying Resource installation.

Adding cancellation would require explicit lifecycle semantics and should not be smuggled into the worker pool implementation.

---

# 140. Deferred: Retry

The worker pool must not silently retry failed Resource operations.

Retry policy belongs to higher-level workflows.

Potential future callers may choose:

```text
manual retry
background sync retry
network recovery retry
```

but Resource worker infrastructure reports the operation outcome it actually executed.

---

# 141. Deferred: Persistent Background Queue

Application Bootstrap is started each application lifecycle.

No persistent worker job queue is required for the current bootstrap flow.

Receipts provide Resource freshness.

If background synchronization later requires durable pending jobs, that should be designed separately.

---

# 142. Deferred: Cross-Tab Coordination

Multiple application tabs may theoretically request the same Resources concurrently.

The current exact in-flight dedupe is process/worker-local.

No browser-wide lock is introduced.

If cross-tab duplicate downloads become a real issue, coordination can be considered separately.

---

# 143. Deferred: Full Production Bootstrap Dataset

The development bootstrap payload deliberately uses:

```text
2 Chapters
1 Strong's definition
```

to prove architecture cheaply.

Production seed tooling will publish the full intended datasets.

Bootstrap architecture must not depend on development payload size.

---

# 144. Documentation Impact

This specification refines earlier implementation/design documentation in several areas:

1. `current` is now a first-class Resource install outcome rather than an invisible receipt skip.
2. Application bootstrap results initialize missing Resource Selections.
3. identified failed child Resources may initialize missing selections.
4. application startup defaults exist as provisional non-persisted fallback selections.
5. those fallbacks are not general runtime outage fallbacks.
6. the Resource Worker is planned to become a Coordinator Worker with representation-specific child execution lanes.
7. descriptor worker pooling is an execution optimization, not a Resource architecture change.

ADRs remain authoritative unless explicitly revised.

Where an older implementation document describes an earlier implementation state, this document records the current implementation direction for Application Bootstrap.

---

# 145. Locked Decisions Summary

The following decisions are considered locked for the completion of Application Bootstrap unless implementation evidence reveals a contradiction.

1. Application Bootstrap is Application policy, not generic Resource behavior.
2. Bootstrap uses a normal `PublishedResourceReference`.
3. The current bootstrap Resource ID is `kjvonly/resources/collections/default`.
4. Bootstrap is represented using `descriptors`.
5. Generic descriptor collections remain independent of Application Resource Selection.
6. Application bootstrap may contain at most one default child per selectable Resource Type.
7. Chapter source selection identity is `kjvonly/bible/chapters/kjvs`.
8. Strong's source selection identity is `kjvonly/strongs/definitions/kjvs`.
9. `H7225` is a Strong's Domain object inside the source bundle, not the selected Resource identity.
10. Individual Chapter Resources such as `.../kjvs/1_1` may coexist with the Chapter source bundle.
11. Application startup does not wait for bootstrap completion.
12. Bootstrap failure does not fail `Application.start()`.
13. `handled` and `current` are complete bootstrap outcomes.
14. `unsupported` and `failed` are incomplete installation outcomes.
15. `current` preserves Resource identity even when receipt freshness prevents processing.
16. An identified failed child Resource may still initialize a missing Resource Selection.
17. An identity-less failed child may not initialize a selection.
18. The bootstrap root Resource itself is never treated as a selectable child default.
19. Duplicate child Resource Types are a bootstrap policy error.
20. ResourceSelectionService does not know which references are KJVOnly defaults.
21. ResourceSelectionService maintains established current selections separately from startup fallbacks.
22. Established current selections have precedence over fallback selections.
23. Fallback selections are not persisted merely because they exist.
24. `initializeMissing()` treats fallback-only Resource Types as missing established state.
25. Bootstrap initialization may replace a fallback with an established persisted selection.
26. Restored or explicitly selected current state is preserved against bootstrap initialization.
27. Fallback does not mean automatic runtime substitution when a selected Resource becomes unavailable.
28. Chapter and Strong's KJVOnly source references are current startup fallbacks.
29. First boot must be able to request Genesis 1 before bulk bootstrap installation completes.
30. Resource acquisition remains generic and on demand.
31. Exact concurrent installs of the same root Published Resource are deduplicated.
32. Different Published Resources are not globally serialized.
33. Resource processing remains off the main UI thread.
34. Nostr Resource Discovery remains bridged to main-thread Resource infrastructure.
35. Application continues to see one `ResourceWorkerClient`.
36. The existing outer `install(reference)` API remains stable.
37. `resource.worker.ts` becomes the Resource Coordinator Worker.
38. The Coordinator discovers the root representation before selecting a child worker.
39. One Content Resource Worker is created at Coordinator initialization.
40. Three Descriptor Resource Workers are created at Coordinator initialization.
41. `content` root representations route to the Content Worker.
42. `descriptors` root representations route to the Descriptor Worker Pool.
43. Bootstrap receives no special worker; it routes naturally as `descriptors`.
44. Descriptor pool scheduling begins as idle-worker assignment plus FIFO queue.
45. Exact root in-flight deduplication occurs before child assignment.
46. Child workers begin processing from an already-discovered root `ResourceRepresentation`.
47. Child workers reuse the existing Resource Resolution, decoding, handler, installer, and receipt infrastructure.
48. Descriptor child workers process their assigned root collection through completion rather than bouncing each descriptor child through the Coordinator.
49. No generic Resource `size` field is added for scheduling.
50. No size-aware scheduling is implemented now.
51. No dynamic worker-count policy is implemented now.
52. No automatic Resource operation retry is implemented.
53. No generic application-wide worker pool is introduced.
54. Search and Notes workers remain self-contained subsystem workers.
55. The final worker coordinator/pool slice is the last currently known substantive Application Bootstrap task.

---

# 146. Target End State

The final Application Bootstrap and Resource execution architecture is:

```mermaid
flowchart TD
    A[Application.start] --> B[Restore persisted Resource Selections]
    B --> C[Effective selections: current over startup fallback]
    C --> D[Application becomes usable]

    D --> E[Bootstrap install reference]
    E --> F[ResourceWorkerClient]
    F --> G[Resource Coordinator Worker]

    G --> H[Root Resource Discovery bridge]
    H --> I[Main-thread ResourceDiscovery]
    I --> J[ResourceRepresentation]
    J --> G

    G --> K{representation}

    K -->|content| L[Content Resource Worker]

    K -->|descriptors| M[Descriptor Worker Pool]
    M --> M1[Descriptor Worker 1]
    M --> M2[Descriptor Worker 2]
    M --> M3[Descriptor Worker 3]

    L --> N[Resolution / Decode / Handler / Domain Install / Receipt]

    M1 --> O[Descriptor Resolution / Blossom / Decode / Handler / Domain Install / Receipt]
    M2 --> O
    M3 --> O

    N --> P[ResourceInstallResult]
    O --> P

    P --> G
    G --> F
    F --> Q[Application Bootstrap Policy]

    Q --> R[Collect identified child default references]
    R --> S[Reject duplicate default Resource Types]
    S --> T[ResourceSelectionService.initializeMissing]

    T --> U[Persist established selections only]
```

The latency-sensitive first Chapter path operates simultaneously:

```mermaid
flowchart TD
    A[Fresh Application] --> B[Chapter startup fallback available]
    B --> C[UI requests Genesis 1]
    C --> D[Chapter ResourceLoader]
    D --> E[kjvonly/bible/chapters/kjvs/1_1]
    E --> F[ResourceWorkerClient]
    F --> G[Resource Coordinator Worker]
    G --> H[Discover representation]
    H --> I[content]
    I --> J[Content Resource Worker]
    J --> K[Install Genesis 1]
    K --> L[Chapter available]

    A --> M[Bootstrap request]
    M --> N[Resource Coordinator Worker]
    N --> O[Discover representation]
    O --> P[descriptors]
    P --> Q[Descriptor Worker Pool]
    Q --> R[Install default bundles]

    J -. independent execution lane .- Q
```

The key runtime property is:

```text
large bootstrap descriptor work
    must not block
small user-requested content Resources
```

while the key bootstrap policy property remains:

```text
startup fallback
    ↓
immediate usability

bootstrap advertised defaults
    ↓
initialize missing established selections

persisted user selection
    ↓
remains authoritative
```

---

# 147. Final Bootstrap State

After the remaining Resource Coordinator / child-worker routing slice is implemented and tested, Application Bootstrap should be considered complete for the current architecture.

The resulting system will have:

```text
one application-facing Resource install API

one bootstrap Published Resource reference

generic descriptor-based default discovery/install

durable Resource receipts

explicit handled/current/unsupported/failed outcomes

missing-selection initialization

preserved user selections

provisional first-start fallbacks

immediate individual Chapter acquisition

worker-isolated Resource processing

content latency isolation

bounded descriptor concurrency

a clean seam for later scheduling optimization
```

No additional bootstrap-specific service, Domain model, Resource representation, or background architecture is required at this time.
