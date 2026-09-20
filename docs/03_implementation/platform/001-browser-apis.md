# Browser APIs

**Status:** Current  
**Area:** `client/kjvonly-pwa`

## Purpose

KJVOnly.bible is a browser-first offline-capable application and deliberately uses several browser APIs directly.

This document records which browser APIs are part of the current implementation, who owns them, and the boundary rules that keep browser-only behavior out of Node-safe application/domain modules.

This is not a catalog of every DOM call. It documents the browser capabilities that affect architecture, persistence, workers, testing, and public API boundaries.

## Browser-First Runtime

The client application is rendered and executed in the browser.

The runtime owns browser capabilities such as:

```text
DOM
localStorage
IndexedDB
Web Workers
Service Worker / Cache Storage
navigator.storage
Clipboard
File / download APIs
window navigation
```

Browser dependency is acceptable where it is intentional.

The important rule is to keep those dependencies behind browser-facing composition and UI/infrastructure boundaries rather than allowing them to leak accidentally into Node-safe public barrels.

## Application Bootstrap Boundary

The concrete `Application` composition root is constructed by:

```text
src/routes/+layout.svelte
```

That route is the application bootstrap boundary.

It is the only normal runtime location that should import the concrete `Application` class directly.

Startup browser work includes:

```text
persistent-storage request
authentication attempt
Application.start()
render-ready gating
Application.stop() on teardown
```

The concrete `Application` is deliberately not exported through the normal `$lib/application` contract barrel because lower-level modules also consume application contracts from that barrel.

## Public Browser/UI Boundaries

Browser/Svelte presentation exports are separated from Node-safe contract exports.

Current convention:

```text
$lib/application
    = application contracts/capabilities safe for ordinary imports

$lib/application/ui
    = Svelte/browser presentation exports

$lib/domains/<domain>
    = Node-safe Domain API

$lib/domains/<domain>/ui
    = browser/Svelte presentation API
```

This separation was introduced after a root barrel accidentally caused Node tests to load Svelte/Quill code and fail because `document` was unavailable.

Do not collapse browser-only UI exports back into Node-safe root barrels.

## DOM APIs

Browser-facing Svelte components and application UI helpers use the DOM directly for behaviors such as:

```text
scroll positioning
element lookup
editor mounting
file-input creation
download link creation
reading element dimensions
```

Examples use APIs such as:

```text
document.getElementById()
document.createElement()
document.body.appendChild()
```

These calls belong in browser-facing code.

A lower-level model, Domain contract, or Node-safe public barrel should not evaluate DOM-dependent code merely by being imported.

## Persistent Storage Request

During application bootstrap, `+layout.svelte` checks the browser Storage API:

```text
navigator.storage.persisted()
navigator.storage.persist()
```

The request is best-effort.

Application startup does not fail merely because persistent storage is unavailable or denied.

The goal is to reduce the chance that offline application data is evicted under storage pressure.

See `platform/003-browser-storage.md` for the storage model itself.

## localStorage

`localStorage` is used for small application/runtime preferences rather than primary Domain data.

Current examples include:

```text
Settings
Workspace persistence
Resource selections
authentication/login state
last Bible location
```

Ownership should remain explicit.

For example, Settings persistence belongs to `SettingsService`; Svelte Settings controls should not become separate localStorage owners.

Do not use `localStorage` for large Resource/Domain datasets that belong in IndexedDB.

## IndexedDB

IndexedDB is the primary durable browser database for installed Domain Objects, Resource provenance, Resource receipts, native Nostr events, and Outbox entries.

Application/database ownership and schema details are documented in:

```text
persistence/001-indexeddb.md
persistence/002-store-implementation.md
```

Workers may open the same application database when their responsibility requires it.

ApplicationContext is not a cross-worker dependency-injection mechanism.

## Web Workers

The application uses Web Workers for CPU/isolation-heavy or independently coordinated responsibilities including:

```text
Resource processing
Resource descriptor resolution
Bible search
Notes search
Reading Plans projection/pub-sub
Nostr event verification
```

Workers are separate composition roots.

They receive explicit messages/data and construct the local dependencies they need.

They do not reach through Svelte `ApplicationContext`.

Worker APIs and message-contract rules are documented in:

```text
platform/002-workers.md
```

## Service Worker and Cache Storage

The PWA Service Worker is separate from application/domain Workers.

Its responsibility is browser-level asset/request caching for offline application startup.

It uses Service Worker request events, URL inspection, and Cache Storage.

Do not confuse Service Worker cache ownership with IndexedDB Domain persistence or Resource installation.

See:

```text
platform/003-browser-storage.md
```

## Clipboard

Bible/search UI can write copied text using:

```text
navigator.clipboard.writeText(...)
```

Clipboard use is a presentation action and belongs in browser-facing UI code.

Domain services should provide the data/formatting behavior they own; the browser clipboard side effect belongs at the UI/application edge.

## File Import / Download APIs

KJVOnly Archive import/export keeps browser file side effects at the application UI edge.

The Archive Import view selects a `.kjva` file and converts the selected browser `File` into bytes before calling the Application-owned Archive service.

The Archive Export view receives encoded archive bytes from the Archive service and performs the browser download.

The archive codec, Worker, importer, exporter, Resource reconstruction, and Domain installation code do not create DOM `<input>` or `<a>` elements.

See:

```text
03_implementation/archive/001-kjvonly-archive.md
```

## `window` Navigation

Application composition may provide browser navigation callbacks such as opening external URLs with `window.open(...)`.

Where practical, pass browser effects into lower-level code as explicit callbacks/capabilities rather than causing Domain code to depend directly on `window`.

## URL API

The standard `URL` API is used in both main-thread and Worker/infrastructure code for:

```text
worker module URLs
Resource URLs
Nostr/Blossom resolution
Service Worker request inspection
```

`URL` itself is not treated as a presentation-only API; it is a portable web-platform primitive available in Worker contexts as well.

## Browser APIs and Tests

Node tests should not accidentally import modules that evaluate browser-only dependencies.

Keep tests separated by what they are trying to prove:

```text
unit tests
    → Node-safe contracts/services where possible

browser tests
    → DOM, Svelte, IndexedDB/browser integration, real Worker behavior
```

A `document is not defined` failure in an otherwise Node-focused service test is usually evidence of an import-boundary problem, not a reason to mock the entire browser globally.

The Application/UI split was specifically strengthened because a root barrel pulled Quill/Svelte browser code into Node tests.

## Browser API Ownership Rules

Use these rules when adding browser behavior:

1. **Svelte presentation effect**
   - keep it in browser/UI code.

2. **Application lifecycle/browser capability**
   - compose it in Application/bootstrap infrastructure.

3. **Persistence implementation**
   - keep browser database details in persistence adapters/infrastructure.

4. **Worker responsibility**
   - treat the Worker as its own composition root and communicate explicitly.

5. **Domain behavior**
   - do not make Domain services depend on `document`, `window`, or Svelte context merely because the caller is a browser application.

## Module Evaluation Rule

A particularly important rule is:

> Importing a Node-safe contract module must not itself execute browser-only code.

That means avoiding dependency chains like:

```text
Node-safe root index
    ↓
Svelte component
    ↓
browser-only package
    ↓
document/window at module evaluation
```

If an export is inherently browser/Svelte-specific, place it behind the appropriate `/ui` boundary or concrete browser implementation path.

## Capability Detection

Not every browser capability is guaranteed.

Where an API is optional, detect it before use when practical.

Current persistent-storage startup code follows this pattern:

```text
if navigator.storage.persist is unavailable
    → continue without persistent-storage request
```

A missing optional browser optimization should not become an application-startup failure unless the capability is actually required for correctness.

## Summary

The browser is the application platform, but browser dependencies are still owned deliberately.

```text
bootstrap / UI
    → DOM, clipboard, navigation, storage request

persistence adapters
    → IndexedDB / localStorage ownership

Workers
    → explicit browser Worker boundaries

Service Worker
    → offline asset/request caching

Domain code
    → remains independent from incidental DOM/Svelte mechanics
```

The goal is not to avoid browser APIs. The goal is to make browser-only behavior obvious, testable, and contained behind the correct boundary.
