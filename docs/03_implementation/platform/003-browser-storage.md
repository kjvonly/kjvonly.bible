# Browser Storage

## Status

Current

---

# Purpose

This document describes how the KJVOnly.bible browser application uses the
browser's storage facilities and how responsibility is divided between them.

The application does not treat browser storage as one generic persistence
mechanism. Different browser APIs are used for different classes of state:

```text
IndexedDB
    = durable application/domain data

localStorage
    = small synchronous preferences, bootstrap selections, and UI/runtime state

Cache Storage
    = PWA application shell and network response cache

StorageManager.persist()
    = best-effort request to reduce browser eviction risk
```

The important design rule is:

> Storage technology is an implementation detail owned by the capability that
> persists the state. Svelte components should not become generic persistence
> coordinators.

Related implementation documents:

```text
docs/03_implementation/persistence/001-indexeddb.md
docs/03_implementation/persistence/002-store-implementation.md
docs/03_implementation/persistence/004-outbox-implementation.md
docs/03_implementation/platform/005-application-startup.md
docs/03_implementation/runtime/001-root-runtime.md
```

---

# Scope

This document covers:

* IndexedDB,
* `localStorage`,
* Cache Storage,
* the Service Worker cache,
* persistent-storage requests,
* current browser-storage ownership,
* startup and restoration behavior,
* and storage-related implementation rules.

This document does not define:

* Domain Object schemas,
* Resource installation policy,
* Outbox publication semantics,
* Resource receipt semantics,
* worker message protocols,
* synchronization,
* or backup/export behavior.

Those concerns are documented separately.

---

# Storage Overview

The current browser application uses three durable browser storage systems.

```text
Browser
├── IndexedDB
│   └── kjvonly-application
│       ├── domain_objects
│       ├── resource_installations
│       ├── resource_receipts
│       ├── outbox
│       └── nostr_events
│
├── localStorage
│   ├── settings
│   ├── pane
│   ├── resourceSelections
│   ├── lastBibleLocationReference
│   ├── saved Nostr login
│   └── NIP-46 client secret
│
└── Cache Storage
    └── versioned Service Worker cache
```

These stores have different semantics and should not be collapsed into a
single abstraction merely because they are all browser persistence.

---

# IndexedDB

IndexedDB stores durable application state that benefits from:

* structured records,
* indexes,
* asynchronous reads/writes,
* transactions,
* atomic multi-store operations,
* and access from both the main thread and Workers.

The shared application database is defined in:

```text
src/lib/infrastructure/persistence/application.db.ts
```

The database is currently named:

```text
kjvonly-application
```

IndexedDB owns the durable records for:

```text
Domain Objects
Resource installation provenance
Resource receipts
Outbox publication intents
selected native Nostr events
```

Domain-specific adapters and transaction implementations use the same
application database while exposing narrower Domain-facing interfaces.

The schema and transaction patterns are documented in:

```text
docs/03_implementation/persistence/001-indexeddb.md
docs/03_implementation/persistence/002-store-implementation.md
```

---

# `localStorage`

`localStorage` is used only for small state that is naturally represented as a
single synchronous value and does not require IndexedDB transactions.

Current uses include the following.

## Settings

`SettingsService` owns persistence under:

```text
settings
```

The persisted value is normalized when it is read and before it is written.

Svelte Settings UI does not own storage directly. It interacts with the
application-owned `SettingsService`.

---

## Workspace Pane Tree

`PaneService` persists the Workspace tree under:

```text
pane
```

The stored value is not a raw runtime `Pane` object. The Pane tree is first
converted to the explicit persisted shape through:

```text
serializePane()
    ↓
serializeBuffer()
```

Restoration reverses that process through:

```text
restorePane()
    ↓
restoreBuffer()
```

Transient runtime state such as `pane.toggle` is intentionally not persisted.

The persisted Buffer contains the stable state required to reconstruct the
module instance:

```text
key
componentName
bag
resourceSelections
```

---

## Resource Selections

`LocalStorageResourceSelectionStore` persists current Resource selections under:

```text
resourceSelections
```

Only established current selections are persisted.

Application-provided fallback selections are deliberately excluded so a
fallback cannot become a durable user/current selection simply because the
application started.

On restoration, persisted values are parsed through the Resource-selection
contract before being accepted.

---

## Last Bible Location

The Bible reader currently stores the most recent Bible location under:

```text
lastBibleLocationReference
```

This is lightweight navigation convenience state rather than a Domain Object.

---

## Authentication Restoration

`NostrAuthenticationStrategy` receives a `Storage`-like dependency from the
Application composition root and persists authentication restoration state.

Current keys include:

```text
${VITE_APP_NAME}:login
${VITE_APP_NAME}:login:bunker:client-seckey
```

The saved login value may represent:

```text
NIP-07
bunker://...
nsec...
npub...
```

The NIP-46 client secret is also persisted so a bunker connection can be
restored.

This is current implementation behavior, not a general recommendation to put
arbitrary security-sensitive application state in `localStorage`.

Authentication owns the interpretation and lifecycle of these values.

---

# `sessionStorage`

The current application does not use `sessionStorage` as an application
persistence mechanism.

Do not introduce it merely to create another storage tier. Add it only when a
state value genuinely needs tab/session lifetime semantics that are not served
by runtime memory or the current durable stores.

---

# Cache Storage and the Service Worker

The PWA Service Worker is implemented in:

```text
src/service-worker.js
```

It owns Cache Storage usage independently from application/domain persistence.

The Service Worker creates a versioned cache:

```text
cache-${version}
```

where `version` comes from SvelteKit's Service Worker build metadata.

During installation it pre-caches the application build and static files,
except:

```text
/.nojekyll
*.json
*.json.gz
```

JSON Resource/data files are intentionally excluded from the static asset
pre-cache so application Resource data is not silently pinned by the shell
cache.

During activation, older application caches are removed.

For fetches:

```text
GET known static asset
    → cache

other GET
    → network first
    → cache successful 200 response
    → cached fallback when offline

/v1...
    → bypass Service Worker cache handling

non-GET
    → bypass Service Worker cache handling
```

Cache Storage therefore supports the PWA/network layer. It is not the Domain
Object database and must not be treated as Resource installation state.

---

# Persistent Storage Request

The root browser lifecycle makes a best-effort request for persistent browser
storage in:

```text
src/routes/+layout.svelte
```

The flow is:

```text
navigator.storage.persisted()
    ↓
already persistent?
    ├── yes → nothing to do
    └── no
        ↓
    navigator.storage.persist()
```

Failure or denial does not block application startup.

This is an eviction-risk hint to the browser. It does not replace persistence,
backup, synchronization, or Resource publication.

---

# Storage Ownership

The current ownership model is intentionally distributed by capability.

```text
SettingsService
    → Settings localStorage

PaneService
    → Workspace localStorage

ResourceSelectionService + ResourceSelectionStore
    → Resource-selection localStorage

NostrAuthenticationStrategy
    → authentication localStorage

Domain persistence adapters
    → IndexedDB Domain Objects

Resource installation
    → IndexedDB Resource installations

Resource processing
    → IndexedDB Resource receipts

Outbox
    → IndexedDB publication intents

Nostr event persistence
    → IndexedDB selected Nostr events

Service Worker
    → Cache Storage
```

There is no application-wide generic "BrowserStorageService" because these
stores have materially different semantics and ownership.

---

# Main Thread and Worker Access

IndexedDB can be accessed from multiple browser execution contexts.

The main Application composition root injects `getApplicationDB` into concrete
persistence adapters.

The Resource Worker composition root also uses `getApplicationDB` for
installation and receipt persistence.

Each JavaScript realm has its own module instance and therefore its own cached
`databasePromise`, while all realms open the same named browser database.

Workers do not reach through `ApplicationContext` to obtain browser storage.
They compose the persistence dependencies they need in their own runtime.

---

# What Should Go Where?

Use this decision rule.

## Use runtime memory when

* the state is transient,
* it should disappear on reload,
* or persistence would create incorrect semantics.

Examples include:

```text
pane.toggle
subscriptions
in-flight Resource installation promises
worker in-memory search indexes
```

## Use `localStorage` when

* the value is small,
* synchronous startup/restoration is useful,
* there is one logical value per key,
* and no atomic multi-record transaction is required.

## Use IndexedDB when

* the state is structured or numerous,
* indexed lookup is required,
* transactions matter,
* Domain state must be committed atomically with provenance or Outbox state,
* or Workers need access.

## Use Cache Storage when

* the state is an HTTP response/application asset,
* and the Service Worker owns offline delivery semantics.

---

# Failure Semantics

Storage failure is handled at the owning boundary.

Examples:

```text
invalid Settings JSON
    → Settings defaults

missing Workspace localStorage
    → initialize default Workspace

invalid IndexedDB transaction operation
    → transaction aborts
    → original operation error propagates

failed Outbox publication
    → durable pending entry remains

persistent-storage request denied
    → startup continues
```

Do not create one generic recovery policy for all browser storage.

---

# Implementation Rules

1. Do not let ordinary Svelte components become generic persistence owners.
2. Persist Domain Objects through Domain-facing stores/transactions.
3. Use IndexedDB transactions when multiple durable records must change
   atomically.
4. Keep transient runtime fields out of persisted Workspace shapes.
5. Validate/normalize serialized localStorage data on restoration.
6. Keep Service Worker caching separate from Domain/Resource persistence.
7. Workers are separate composition roots and receive/construct their own
   persistence dependencies.
8. Do not add a storage abstraction merely to hide which persistence semantics
   are actually required.
