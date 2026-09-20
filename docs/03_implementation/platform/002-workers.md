# Worker Implementation

## Status

Current.

## Purpose

This document describes how KJVOnly.bible uses browser workers and the PWA Service Worker.

Workers are used where work benefits from isolation from the main Svelte/UI thread, where a long-lived in-memory projection is useful, or where a library already provides a worker-oriented execution model.

The current application does **not** have one global worker subsystem. Instead, each worker boundary has an explicit owner, message contract, and lifecycle appropriate to its responsibility.

The most important ownership rule is:

```text
Application
    = main browser runtime composition root

Worker
    = separate composition root

ApplicationContext
    = Svelte-facing main-thread capability surface
```

A worker does not consume `ApplicationContext`.

When a worker needs a Domain service or helper, it constructs the worker-local dependency graph explicitly or receives the required data through messages.

---

# 1. Worker Inventory

The current browser application uses these worker families:

```text
Resource workers
    resource.worker.ts
    resource-content.worker.ts
    resource-descriptor.worker.ts

Bible search worker
    kjvsearch.worker.ts

Notes search worker
    kjvnotes.worker.ts

Reading Plans projection worker
    kjvplans.worker.ts

Nostr verification worker
    verification.worker.ts

PWA Service Worker
    src/service-worker.js
```

These workers solve different problems and should not be collapsed into one abstraction merely because they all use browser worker APIs.

---

# 2. Main Design Rules

## 2.1 Workers are separate composition roots

The main `Application` object owns the browser application's primary runtime graph.

A Web Worker runs in another JavaScript execution context and cannot use Svelte context or application-owned object identity directly.

Therefore:

```text
main thread
    owns main-thread services

worker
    owns worker-local services/state
```

For example, a helper may exist both:

```text
Application
    → main-thread instance

Worker
    → worker-local instance
```

This is preferable to recreating a module-level singleton merely so both environments can reach the same exported object.

---

## 2.2 Message boundaries are explicit APIs

Main-thread and worker code communicate through explicit message contracts.

Prefer discriminated request/response types such as:

```ts
type WorkerRequest =
    | { action: 'initialize'; ... }
    | { action: 'search'; ... };
```

or:

```ts
type WorkerMessage =
    | { type: 'initialized'; ... }
    | { type: 'result'; ... }
    | { type: 'error'; ... };
```

Do not treat worker messages as untyped bags.

The Reading Plans worker boundary was specifically tightened during the cleanup phase to remove `any` and open-ended message payloads.

---

## 2.3 Workers receive accepted Domain data

Workers that build search indexes or display projections normally receive already accepted Domain data from the main application rather than querying arbitrary remote state themselves.

An explicit refresh operation may reload accepted durable state from IndexedDB inside the worker when another worker has changed that state and the worker owns the derived projection being rebuilt. This is still local accepted state; it is not Resource discovery or remote acquisition.

Examples:

```text
NotesSearchRuntime
    → accepted Note[]
    → Notes worker

PlansPubSubService
    → accepted PlanSubscription[] + PlanProgress[] on initialization
    → Reading Plans worker

Archive import refresh
    → Plans/Notes main-thread owner sends refresh command
    → owning worker reloads accepted IndexedDB state
    → rebuilds its derived projection

SearchRuntime
    → installed BibleSearchIndex
    → Bible search worker
```

This keeps Resource acquisition, Domain acceptance, and worker projection responsibilities separate.

---

## 2.4 Worker-local state is derived state unless explicitly persistent

The search and Reading Plans workers primarily maintain in-memory runtime state.

Persistent Domain state continues to live behind the application's persistence boundaries.

A worker should not become a second hidden source of truth for Domain state.

---

## 2.5 Concrete worker entrypoints may import implementation code

A worker entrypoint is composition wiring.

It may intentionally import concrete Domain implementations when constructing its local dependency graph.

This is the same exception used by the main `Application` composition root.

Do not force worker composition through public barrels if that would create cycles or obscure concrete dependencies.

---

# 3. Resource Worker Architecture

The Resource Worker is the most substantial worker subsystem.

Its high-level topology is:

```text
Application / ResourceLoader
    ↓
ResourceWorkerClient
    ↓
Resource Coordinator Worker
    ├── Content Worker
    └── Descriptor Worker Pool
            ├── Descriptor Worker 1
            ├── Descriptor Worker 2
            └── Descriptor Worker 3
```

The coordinator entrypoint is:

```text
src/lib/resource/worker/resource.worker.ts
```

---

## 3.1 Main-thread ResourceWorkerClient

The main thread owns `ResourceWorkerClient`.

Browser construction uses:

```text
createBrowserResourceWorkerClient(...)
```

The client is responsible for:

```text
request IDs
pending install promises
message correlation
worker error handling
messageerror handling
worker termination
disposal/failure state
main-thread strategy bridging
main-thread Resource Discovery bridging
```

A Resource install therefore appears to ordinary application code as an asynchronous call even though multiple workers may participate underneath it.

---

## 3.2 Why Resource Discovery remains on the main thread

The Resource Coordinator Worker does not directly own the application's Nostr transport.

Nostr Resource Discovery remains on the main thread.

Conceptually:

```text
Resource Coordinator Worker
    → discovery request message
    → ResourceWorkerClient
    → ResourceDiscovery
    → NostrClient
    → ResourceRepresentation
    → response message
    → Resource Coordinator Worker
```

This preserves the existing transport ownership:

```text
NostrClient
    = main-thread infrastructure
```

The worker does not create a second independent Nostr client merely because resolution work runs off-thread.

---

## 3.3 Resource Coordinator responsibilities

The Resource Coordinator constructs:

```text
ResourceWorkerDiscovery
ResourceWorkerStrategyResolver
ResourceChildWorkerClient
ResourceDescriptorWorkerPool
ResourceWorkerProcessorRouter
ResourceService
```

`ResourceService` owns exact Published Resource in-flight install deduplication and root discovery coordination.

Once a `ResourceRepresentation` is available, the coordinator routes processing by representation type.

---

## 3.4 Content Worker

The content worker handles direct content representations.

It owns the worker-side content processing composition needed for:

```text
content decoding
Resource handler dispatch
Domain interpretation
Domain validation
Domain installation
Resource receipts / installation results
```

Only one content worker is currently created by the coordinator.

---

## 3.5 Descriptor Worker Pool

Descriptor-backed Resource resolution uses a small pool of descriptor workers.

The coordinator currently creates three descriptor workers.

This allows descriptor resolution work to proceed without serializing all descriptor trees through one worker instance.

Descriptor workers participate in:

```text
descriptor decoding
recursive descriptor resolution
cycle detection
strategy dispatch
content retrieval
Domain installation
```

---

## 3.6 Main-thread Resource resolution strategies

Not every Resource resolution strategy can or should execute entirely inside a worker.

The worker can request that a main-thread strategy resolve a descriptor.

Conceptually:

```text
Descriptor Worker
    ↓ strategy-resolve request
Resource Coordinator
    ↓
ResourceWorkerClient
    ↓
main-thread ResourceResolutionStrategy
    ↓
strategy result / error
    ↓
Descriptor Worker
```

This is especially important for Nostr-backed resolution because the shared Nostr transport remains on the main thread.

---

## 3.7 Resource worker error boundary

Worker errors are serialized across the message boundary.

`ResourceWorkerClient` treats terminal worker failure as a client lifecycle event:

```text
active
    → failed
or
active
    → disposed
```

On terminal failure it:

```text
removes listeners
terminates the Worker
rejects pending installs
clears pending requests
retains the terminal error
```

Do not silently recreate the Resource worker after a terminal failure unless a deliberate recovery policy is introduced.

---

# 4. Bible Search Worker

Bible search is isolated behind:

```text
SearchRuntime
    ↓
kjvsearch.worker.ts
```

`SearchRuntime` is the main-thread owner of the search worker protocol.

It receives a `BibleSearchIndexService` dependency and lazily loads the selected installed search index.

---

## 4.1 Initialization

For each selected Resource source, `SearchRuntime`:

```text
loads BibleSearchIndex from Domain storage
    ↓
deduplicates readiness by Resource source
    ↓
posts init request
    ↓
worker initializes SearchIndexRuntime
    ↓
worker posts initialized / initialization-failed
```

The runtime remembers initialized index IDs so the same index is not repeatedly initialized.

Concurrent initialization requests for the same index share a pending initialization promise.

---

## 4.2 Searching

Once an index is ready:

```text
SearchService
    → SearchRuntime.search(...)
    → worker search request
    → SearchIndexRuntime.search(...)
    → SearchResultResponse
    → SearchRuntime result handler
    → SearchService subscribers
```

Search results include the matching Bible location references and basic elapsed-time/count statistics.

---

## 4.3 Worker state

The Bible search worker keeps initialized search indexes in worker memory.

It does not discover Resources itself and does not query application persistence directly.

The main thread explicitly provides the accepted `BibleSearchIndex` object.

The worker protocol also supports resetting its initialized indexes. A completed Archive import of Bible Search Index state invalidates the main-thread `SearchRuntime` cache and resets worker indexes; the next search reloads whichever Resource source is currently selected through the normal `BibleSearchIndexService` path.

---

# 5. Notes Search Worker

Notes search uses:

```text
NotesSearchRuntime
    ↓
kjvnotes.worker.ts
```

The worker owns an in-memory FlexSearch document plus a worker-local map of indexed Notes.

---

## 5.1 Initialization

The main thread initializes the worker with accepted Notes:

```text
NotesService / Notes runtime
    → Note[]
    → NotesSearchRuntime.initialize(...)
    → worker
```

The worker rebuilds its in-memory search document from that accepted state.

The worker also supports an explicit `refresh` command for cross-worker persistence changes such as Archive import. For that operation the Notes worker reads accepted Notes from its IndexedDB store itself and rebuilds the FlexSearch projection off the main thread.

---

## 5.2 Incremental updates

The main thread can send explicit mutations:

```text
put Note
remove Note
```

The worker updates its derived search state and publishes the changed Notes collection projection.

The worker is not the durable Notes store.

---

## 5.3 Search indexes

Notes can be searched by the configured FlexSearch fields, including values such as:

```text
title
text
tags
book/chapter
Bible location reference
```

Bible location parsing required by the Notes index is worker-local composition, not access through `ApplicationContext`.

---

# 6. Reading Plans Worker

Reading Plans uses:

```text
PlansPubSubService
    ↓
kjvplans.worker.ts
```

The worker derives display/navigation `Sub` projections from accepted persisted Reading Plans state.

The main thread owns `PlansPubSubService` through `Application` / `ApplicationContext`.

The worker itself is a separate composition root.

---

## 6.1 Inputs

Initialization provides:

```text
booknamesById
PlanSubscription[]
PlanProgress[]
```

The worker derives:

```text
Sub projections
completed reading indexes
next reading index
percent complete
```

This is derived runtime state, not a second persistence model.

---

## 6.2 Incremental updates

The main thread can send commands for:

```text
get all subscriptions
put subscription
put progress
refresh
```

The worker updates the affected in-memory projection and republishes the subscriptions projection.

`refresh` is intentionally argument-free. The main thread only signals that persisted accepted state may have changed. The worker reloads current Plan Subscription and Plan Progress state from IndexedDB itself, rebuilds its derived projection, and republishes the subscriptions state.

---

## 6.3 Typed message contract

The Reading Plans worker boundary uses explicit command/response types.

Do not regress it to:

```ts
postMessage(message: unknown)
```

or subscriber callbacks accepting `any`.

The message protocol is part of the worker boundary and should remain type-checked on both sides.

---

# 7. Nostr Verification Worker

Nostr signature/event verification uses the worker supplied through the RxNostr crypto integration.

The browser client creates it through:

```text
createBrowserVerificationClient()
```

which creates:

```text
verification.worker.ts
```

and wraps it in RxNostr's `VerificationServiceClient`.

The verification client is then supplied to the browser Nostr client composition.

---

## 7.1 Lifecycle

The Nostr client composition owns the verification client's lifecycle.

It starts the verification service when constructing the Nostr client and disposes it with the transport composition.

The verification worker therefore remains an infrastructure implementation detail rather than an `ApplicationContext` capability.

---

# 8. PWA Service Worker

`src/service-worker.js` is different from the application Web Workers described above.

Its purpose is application-shell/network caching for the PWA.

It does not participate in Domain or Resource worker composition.

---

## 8.1 Precache behavior

The Service Worker caches:

```text
SvelteKit build assets
static files
```

but deliberately excludes:

```text
/.nojekyll
*.json
*.json.gz
```

Resource/Data JSON is therefore not treated as immutable application-shell precache content.

---

## 8.2 Activation

On activation, caches from older application versions are deleted.

The current deployment cache name is derived from the SvelteKit service-worker version.

---

## 8.3 Fetch behavior

Only GET requests participate in the caching flow.

Requests under:

```text
/v1
```

are bypassed.

For known build/static assets:

```text
cache first
```

For other eligible GET requests:

```text
network first
    ↓ on successful 200 response
cache response
    ↓ on network failure
fall back to cache
```

This Service Worker strategy is separate from Domain Resource installation and IndexedDB persistence.

Do not confuse PWA cache availability with installed Resource/Domain state.

---

# 9. Worker Message Ownership

Worker message types should live near the boundary they describe.

Examples include:

```text
resource/worker/resource-worker-message.ts
resource/worker/resource-child-worker-message.ts
resource/worker/resource-worker-strategy-message.ts

domains/bible/workers/search/search-worker-message.ts

domains/notes/runtime/search/notes-search-worker-message.ts

Reading Plans worker command/response contract
```

The message type belongs to the worker protocol, not to a generic global event model.

---

# 10. Data Transfer Rules

Prefer sending explicit serializable data across worker boundaries.

Do not send:

```text
service instances
Svelte state
ApplicationContext
open IndexedDB transaction objects
live Nostr client objects
functions
```

Workers should receive values required to perform their work and return explicit results or errors.

---

# 11. Main Thread vs Worker Responsibility

A useful ownership table is:

| Concern | Main thread | Worker |
| --- | --- | --- |
| Svelte/UI state | yes | no |
| ApplicationContext | yes | no |
| Nostr transport | yes | normally no |
| Resource root discovery | bridge/transport | coordinator requests it |
| Resource content processing | orchestration | yes |
| Resource descriptor processing | orchestration | yes |
| Bible search index retrieval | yes | no |
| Bible search execution | receives results | yes |
| Notes durable persistence | yes | no |
| Notes search projection | orchestration | yes |
| Reading Plans durable persistence | yes | no |
| Reading Plans derived `Sub` projection | orchestration | yes |
| Nostr crypto verification | client lifecycle | yes |
| PWA HTTP/cache interception | no | Service Worker |

---

# 12. Worker Construction

Workers should normally be created behind a runtime/client factory rather than directly in Svelte components.

Current examples include:

```text
createBrowserResourceWorkerClient()
SearchRuntime default worker factory
NotesSearchRuntime default worker factory
createPlansWorker()
createBrowserVerificationClient()
```

Svelte consumers should receive the owning runtime/service from `ApplicationContext` or a Domain API rather than construct workers directly.

---

# 13. Browser and Test Environments

Worker construction must account for environments where browser globals are unavailable.

For example, Reading Plans worker construction deliberately returns no worker when `window` is unavailable, allowing Application construction to remain safe in Node/build test environments.

Worker-owning classes should expose interfaces/ports that can be replaced with deterministic fakes in unit tests.

Examples include:

```text
ResourceWorkerPort
SearchWorkerPort
NotesSearchWorkerPort
PlansWorkerPort
```

Tests should exercise message routing and lifecycle behavior through those ports rather than requiring real browser workers for ordinary unit coverage.

Use browser tests when the browser worker boundary itself is the subject under test.

---

# 14. Error Handling

Worker protocols should return explicit failure messages where recoverable request-level failure is expected.

Examples:

```text
Resource install-error
Resource child process-error
Bible search initialization-failed
Resource strategy-resolve-error
```

Unexpected worker-level errors belong to the worker client's lifecycle/error boundary.

Do not convert every worker crash into a successful empty result.

---

# 15. Disposal

Long-lived workers owned by application infrastructure should have an explicit disposal path where the surrounding service has a lifecycle.

`ResourceWorkerClient` and the Nostr verification client are examples with explicit lifecycle/disposal behavior.

Shorter-lived Domain worker runtimes currently rely on their owning page/application lifetime unless an explicit teardown API exists.

If those runtimes gain recreation or hot-swapping behavior later, add explicit termination/disposal rather than leaving orphaned workers alive.

---

# 16. Adding a New Worker

When introducing a new worker:

1. identify why the work belongs off the main thread,
2. define an explicit typed request/response protocol,
3. create a main-thread owner/runtime/client,
4. make worker construction testable through a port/factory,
5. treat the worker entrypoint as a separate composition root,
6. inject/construct worker-local dependencies explicitly,
7. send accepted serializable Domain data rather than hidden global state,
8. define request-level error behavior,
9. define worker-level failure/lifecycle behavior,
10. add focused unit tests for the protocol owner,
11. add browser tests only where the real Worker boundary matters.

Do not create a worker merely to move code into another file.

---

# 17. Anti-Patterns

Avoid:

```text
Svelte component
    → new Worker(...)
```

when a runtime/application service should own that worker.

Avoid:

```text
Worker
    → ApplicationContext
```

Workers are separate composition roots.

Avoid:

```text
Worker
    → hidden module-level mutable singleton
```

when the worker can construct the dependency explicitly.

Avoid:

```text
message: any
```

for stable worker protocols.

Avoid making the Resource worker create its own unrelated Nostr transport merely because Nostr-backed Resource resolution is needed.

Avoid treating the PWA Service Worker cache as Domain persistence.

---

# 18. Important Files

Resource workers:

```text
src/lib/resource/worker/resource.worker.ts
src/lib/resource/worker/resource-content.worker.ts
src/lib/resource/worker/resource-descriptor.worker.ts
src/lib/resource/worker/resource-worker-client.ts
src/lib/resource/worker/resource-child-worker-client.ts
src/lib/resource/worker/resource-descriptor-worker-pool.ts
src/lib/resource/worker/resource-worker-discovery.ts
src/lib/resource/worker/resource-worker-strategy-resolver.ts
src/lib/resource/worker/resource-worker-message.ts
src/lib/resource/worker/resource-child-worker-message.ts
```

Bible search:

```text
src/lib/domains/bible/runtime/search/search-runtime.ts
src/lib/domains/bible/workers/kjvsearch.worker.ts
src/lib/domains/bible/workers/search/search-worker-message.ts
src/lib/domains/bible/workers/search/search-index-runtime.ts
```

Notes search:

```text
src/lib/domains/notes/runtime/search/notes-search-runtime.ts
src/lib/domains/notes/runtime/search/notes-search-worker-message.ts
src/lib/domains/notes/workers/kjvnotes.worker.ts
```

Reading Plans:

```text
src/lib/domains/reading-plans/services/plansPubSub.service.ts
src/lib/domains/reading-plans/workers/kjvplans.worker.ts
```

Nostr verification:

```text
src/lib/infrastructure/nostr/verification-client.ts
src/lib/infrastructure/nostr/verification.worker.ts
src/lib/infrastructure/nostr/client/create-nostr-client.ts
```

PWA Service Worker:

```text
src/service-worker.js
```

---

# 19. Related Documentation

Read this document together with:

```text
docs/03_implementation/platform/005-application-startup.md

docs/03_implementation/resources/001-resource-transport.md
docs/03_implementation/resources/004-resource-installation.md
docs/03_implementation/resources/005-resource-lifecycle-content.md

docs/03_implementation/runtime/001-root-runtime.md
docs/03_implementation/runtime/006-runtime-services.md

docs/03_implementation/010-domain-implementation-map.md
docs/03_implementation/011-target-code-organization.md
```

The current source remains authoritative if older historical documents disagree.


# Ephemeral Archive Worker

KJVOnly Archive import/export uses a dedicated Worker that exists only for one requested operation.

```text
import/export request
    ↓
create Archive Worker
    ↓
perform one bounded job
    ↓
return result
    ↓
terminate Worker
```

The Archive Worker composes archive codec/validation, IndexedDB archive reads, Domain-to-Resource reconstruction, and the shared `createContentResourceProcessor()` implementation.

Archive import/export byte buffers are transferred across the worker boundary when possible rather than copied with structured clone.

It does not route archive work through the long-lived `ResourceWorkerClient`.

This keeps the normal Resource Worker protocol focused on application Resource acquisition while still reusing the same decoded-content handlers and installers.

See:

```text
03_implementation/archive/001-kjvonly-archive.md
```

