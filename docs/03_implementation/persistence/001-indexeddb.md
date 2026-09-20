# IndexedDB Application Database

## Status

Current

---

# Purpose

This document describes the current IndexedDB database used by the KJVOnly.bible
browser application.

The database is shared by Domain persistence, Resource installation, Resource
receipts, the Outbox, and selected native Nostr-event persistence.

The central implementation is:

```text
src/lib/infrastructure/persistence/application.db.ts
```

The database intentionally provides shared transactional storage without
creating one generic Repository abstraction for all Domain behavior.

---

# Database Identity

The current database name is:

```text
kjvonly-application
```

The current schema version is:

```text
3
```

The database is opened through the `idb` package:

```typescript
openDB<ApplicationDBSchema>(...)
```

`getApplicationDB()` lazily opens the database and caches the resulting promise
for the current JavaScript realm.

Conceptually:

```text
first getApplicationDB()
    ↓
openDB(...)
    ↓
cache Promise<ApplicationDB>

later getApplicationDB()
    ↓
reuse cached promise
```

The database is therefore not eagerly opened by a dedicated startup phase.
Concrete services/adapters open it when first needed.

---

# Current Schema

The current schema contains five object stores:

```text
kjvonly-application
├── domain_objects
├── resource_installations
├── resource_receipts
├── outbox
└── nostr_events
```

Each store has a distinct responsibility.

---

# `domain_objects`

`domain_objects` is the shared store for installed/local application Domain
Objects.

Its stored envelope is:

```typescript
interface StoredDomainObject {
    id: string;
    objectType: string;
    objectId: string;
    value: unknown;
}
```

The key path is:

```text
id
```

and IDs are constructed by:

```text
createStoredDomainObjectId(objectType, objectId)
    = `${objectType}:${objectId}`
```

Example:

```text
bible/chapter:<publisher>/kjvs/50_3
```

The store has one index:

```text
objectType
```

This supports Domain queries such as "all Notes" or "all Reading Plan
subscriptions" without creating a separate IndexedDB object store for every
Domain Object type.

The stored envelope is persistence infrastructure. Domain callers normally see
the Domain Object itself through a Domain-facing store such as:

```text
ChapterStore
NotesStore
PlanDefinitionsStore
StrongsStore
```

---

# `resource_installations`

`resource_installations` records object-level Resource revision/state metadata associated with Resource-backed Domain Objects.

The key path is:

```text
id
```

The stored value is:

```text
ResourceInstallation
```

This store answers the object-level Resource-state question:

> Which Resource revision currently backs this Domain Object, and is an incoming
> revision newer than the accepted state?

For externally installed state, `resourceId` can also preserve the Resource provenance that produced the object. Locally authored Resource-backed state uses the same record even before external Resource provenance exists.

`ResourceInstallation` is distinct from a Resource receipt.

Resource revision/state metadata is committed atomically with the Domain Object when accepted Resource-backed state changes. For inbound Resources this is part of Domain installation; for local Resource-backed writes it is committed with the Domain Object and Outbox publication intent.

---

# `resource_receipts`

`resource_receipts` records Resource-level processing receipts.

The key path is:

```text
id
```

The stored value is:

```text
ResourceReceipt
```

Receipts are used by Resource processing to recognize previously processed
Resource publications, especially descriptor-backed content where the receipt
can avoid unnecessary external retrieval.

A receipt does not replace `ResourceInstallation`.

The two records answer different questions:

```text
ResourceReceipt
    = has this Resource publication been processed?

ResourceInstallation
    = which Resource revision currently backs this Domain Object?
```

---

# `outbox`

`outbox` stores durable application publication intents.

The key path is:

```text
id
```

The stored value is:

```text
OutboxEntry
```

The store has an index:

```text
status
```

The current Outbox uses durable pending entries and same-ID overwrite for
last-write-wins coalescing.

Domain write transactions may include both:

```text
domain_objects
outbox
```

so accepted local state and required publication intent are committed together.

Detailed Outbox semantics are documented in:

```text
docs/03_implementation/persistence/004-outbox-implementation.md
```

---

# `nostr_events`

`nostr_events` stores selected application-owned native Nostr events.

The key path is:

```text
key
```

The store has indexes for:

```text
kind
pubkey
[kind, pubkey]
```

The combined index supports lookups such as:

```text
one event of a particular kind for a particular pubkey
```

This store is separate from Resource Domain Objects because these records are
native Nostr application state rather than interpreted Resource content.

---

# Schema Summary

| Store | Key | Indexes | Responsibility |
|---|---|---|---|
| `domain_objects` | `id` | `objectType` | Domain Object persistence |
| `resource_installations` | `id` | — | object-level Resource revision/state metadata |
| `resource_receipts` | `id` | — | Resource processing receipts |
| `outbox` | `id` | `status` | durable publication intent |
| `nostr_events` | `key` | `kind`, `pubkey`, `[kind,pubkey]` | selected native Nostr events |

---

# Why Domain Objects Share One Store

The application does not create one IndexedDB object store per Domain Object
type.

Instead:

```text
Domain Object
    ↓
StoredDomainObject envelope
    ↓
domain_objects
```

The `objectType` discriminator provides the logical partition.

This allows multiple Domains to share the same physical store while preserving
Domain-facing interfaces above the persistence implementation.

Examples of object types include concepts such as:

```text
bible/chapter
bible/version
bible/paragraphs
bible/pericopes
bible/text-markup
bible/search-index
notes/note
reading-plans/definition
reading-plans/subscription
reading-plans/progress
strongs/...
```

The exact Domain Object type constants remain owned by their Domains.

---

# Persistence Identity

Domain Object persistence uses two identity layers:

```text
objectType
objectId
```

combined into the IndexedDB key:

```text
${objectType}:${objectId}
```

This persistence key must not be confused with:

* Nostr event IDs,
* Resource IDs,
* Resource receipt IDs,
* or the semantic `objectId` alone.

The Domain still owns the meaning of `objectId`.

---

# Database Access

Concrete adapters receive a database provider rather than importing a global
open database object.

Typical constructor:

```typescript
constructor(
    private readonly getDB:
        () => Promise<ApplicationDB>
) {}
```

Application composition passes:

```text
getApplicationDB
```

The Resource Worker composition does the same in its own runtime.

This provides a small dependency seam for tests while retaining one concrete
browser database implementation.

---

# Main-Thread and Worker Use

The same named IndexedDB database is used from both the main browser thread and
Workers.

Conceptually:

```text
Main Application
    ↓
getApplicationDB()
    ↓
kjvonly-application

Resource Worker
    ↓
getApplicationDB()
    ↓
kjvonly-application
```

Because browser Workers have separate JavaScript realms, the module-level
`databasePromise` is cached per realm, not globally across every realm.

IndexedDB itself coordinates access to the underlying shared database.

---

# Read/Write Pattern

Simple store adapters use direct database operations:

```text
await db.get(...)
await db.put(...)
await db.delete(...)
await db.getAllFromIndex(...)
```

Examples include:

```text
IndexedDBChapterStore
IndexedDBNotesStore
IndexedDBPlanDefinitionsStore
IndexedDBResourceReceiptStore
IndexedDBNostrEventsStore
IndexedDBOutboxStore
```

These adapters are appropriate when the operation concerns one logical store
operation and does not need a larger atomic unit.

---

# Atomic Multi-Store Transactions

Installation and local write paths use explicit `readwrite` transactions when
multiple records must change atomically.

Examples:

```text
Bible Resource installation
    → domain_objects
    + resource_installations

Notes local write
    → domain_objects
    + outbox

Reading Plan subscription/progress write
    → domain_objects
    + outbox

native Nostr event write
    → nostr_events
    + outbox
```

The transaction implementation creates narrow store views over the IndexedDB
transaction and passes those views into Domain/application operations.

This pattern is documented in:

```text
docs/03_implementation/persistence/002-store-implementation.md
```

---

# Transaction Failure Handling

Transaction implementations use the same general structure:

```text
open readwrite transaction
    ↓
construct transaction-scoped store views
    ↓
run operation
    ↓
await transaction.done
```

On failure:

```text
operation throws
    ↓
attempt transaction.abort()
    ↓
await transaction.done defensively
    ↓
rethrow original operation error
```

Preserving the original Domain/application error is intentional.

---

# Schema Upgrade Behavior

The current database version is `3`.

The current `upgrade()` implementation is intentionally simple. It creates a
known object store when that store does not already exist.

Conceptually:

```text
if store missing
    → create store
    → create that store's initial indexes
```

The implementation does not currently contain a version-by-version migration
pipeline or data transformation framework.

An important consequence is:

> Index creation is currently coupled to object-store creation. The upgrade
> code does not separately add a missing index to an already-existing store.

Therefore, future schema changes that modify an existing store must add an
explicit migration step rather than assuming the current create-if-missing
logic is sufficient.

Do not increment `DATABASE_VERSION` without defining the required upgrade path
for existing installations.

---

# What Does Not Belong in `application.db.ts`

`application.db.ts` defines the physical shared database schema and low-level
identity helpers.

It should not absorb:

* Domain interpretation,
* Domain validation,
* Resource installation policy,
* Outbox processing policy,
* Nostr publication logic,
* Resource resolution,
* search behavior,
* or Svelte state.

Those responsibilities sit above the persistence layer.

---

# Testing

Persistence tests generally use one of two approaches.

## Store adapter tests

Concrete IndexedDB adapters verify:

```text
put/get/delete behavior
object-type partitioning
index-backed lookup
```

## Transaction tests

Transaction tests verify:

```text
correct stores are opened
Domain + provenance writes are atomic
Domain + Outbox writes are atomic
operation errors abort the transaction
new writes are not partially committed
```

Do not replace these tests with mocks that bypass the transaction semantics the
implementation exists to guarantee.

---

# Implementation Rules

1. `application.db.ts` owns the physical IndexedDB schema.
2. Domains own Domain Object meaning and object-type constants.
3. Concrete persistence adapters may import `application.db.ts` directly.
4. Do not expose the concrete database through `ApplicationContext`.
5. Use Domain-facing store interfaces above IndexedDB.
6. Use explicit transactions when multiple durable records form one accepted
   operation.
7. Keep Resource receipts and Resource installations conceptually distinct.
8. Treat schema-version increments as real migrations, not bookkeeping.
9. Do not create a generic repository layer that erases Domain-specific
   persistence semantics.
