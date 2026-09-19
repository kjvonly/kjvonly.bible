# Store and Transaction Implementation

## Status

Current

---

# Purpose

This document describes how KJVOnly.bible implements persistence boundaries
above the shared IndexedDB database.

The application deliberately separates:

```text
Domain-facing store contract
    ↓
concrete IndexedDB adapter
```

and, for atomic operations:

```text
Domain/application transaction contract
    ↓
concrete IndexedDB transaction
    ↓
transaction-scoped store views
```

This keeps IndexedDB mechanics out of Domain behavior without introducing a
large generic repository framework.

Related documents:

```text
docs/03_implementation/persistence/001-indexeddb.md
docs/03_implementation/persistence/004-outbox-implementation.md
docs/03_implementation/resources/004-resource-installation.md
docs/03_implementation/resources/006-resource-publication.md
```

---

# Core Rule

The persistence boundary follows this rule:

> Domain behavior depends on the narrow operations it needs. IndexedDB adapters
> implement those operations. The Domain does not receive raw `IDBDatabase`,
> object stores, or transactions.

For example:

```text
ChapterService
    ↓
ChapterStore
    ↓
IndexedDBChapterStore
    ↓
application.db
```

The service knows that Chapters can be retrieved.

It does not know:

```text
domain_objects
objectType index
IndexedDB key paths
IDB transactions
```

---

# Store Contracts

Each Domain owns interfaces describing the persistence operations required by
that Domain.

Examples include:

```text
Bible
    ChapterStore
    BibleVersionStore
    BibleParagraphsStore
    BiblePericopesStore
    BibleTextMarkupStore
    BibleSearchIndexStore
    BibleBooknamesStore

Notes
    NotesStore

Reading Plans
    PlanDefinitionsStore
    PlanSubscriptionsStore
    PlanProgressStore

Strong's
    StrongsStore
```

Application/Resource/infrastructure concerns have their own contracts, such as:

```text
OutboxStore
ResourceInstallationStore
ResourceReceiptStore
NostrEventsStore
ResourceSelectionStore
```

These interfaces are intentionally small.

A store should expose the operations the caller actually needs rather than a
universal CRUD API.

---

# Concrete IndexedDB Adapters

Concrete adapters live near the persistence boundary they implement.

Typical naming:

```text
IndexedDBChapterStore
IndexedDBNotesStore
IndexedDBPlanDefinitionsStore
IndexedDBResourceReceiptStore
IndexedDBNostrEventsStore
IndexedDBOutboxStore
```

A normal adapter receives:

```typescript
() => Promise<ApplicationDB>
```

and resolves the database only when an operation is performed.

Example shape:

```typescript
class IndexedDBExampleStore
    implements ExampleStore {

    constructor(
        private readonly getDB:
            () => Promise<ApplicationDB>
    ) {}

    async get(id: string) {
        const db = await this.getDB();
        // translate persistence record → Domain value
    }
}
```

The Application composition root or Worker composition root supplies
`getApplicationDB`.

---

# Domain Object Envelope

Most Domain-facing IndexedDB adapters map between a Domain Object and the
shared `StoredDomainObject` envelope.

Conceptually:

```text
Domain Object
    ↓
{
    id: `${objectType}:${objectId}`,
    objectType,
    objectId,
    value: Domain Object
}
    ↓
domain_objects
```

On reads, the adapter returns:

```text
stored.value
```

as the Domain-specific type.

This translation belongs in the persistence adapter, not in Svelte or Domain
services.

---

# Object-Type Partitioning

Domain Object types share one IndexedDB object store.

The `objectType` index supports collection-style reads.

For example, `IndexedDBNotesStore.getAll()` performs conceptually:

```text
domain_objects
    ↓
objectType index
    ↓
NOTE_OBJECT_TYPE
    ↓
map StoredDomainObject.value → Note
```

Reading Plan definition/subscription/progress stores follow the same pattern
for their respective object types.

---

# Simple Stores vs Transaction-Scoped Stores

There are two persistence shapes in the current codebase.

## Simple store adapter

Use a normal adapter when an operation can be performed independently.

Examples:

```text
read one Chapter
list Notes
read a ResourceReceipt
read an Outbox entry
```

Flow:

```text
caller
    ↓
store interface
    ↓
IndexedDB adapter
    ↓
getApplicationDB()
    ↓
single database operation
```

## Transaction-scoped stores

Use a transaction contract when multiple writes together form one accepted
operation.

Examples:

```text
install Domain Object
    + installation provenance

write user Note
    + Outbox publication intent

write Reading Plan progress
    + Outbox publication intent
```

Flow:

```text
Domain/Application operation
    ↓
Transaction.run(operation)
    ↓
open IndexedDB transaction
    ↓
construct narrow store views bound to transaction
    ↓
operation(stores)
    ↓
commit or abort as one unit
```

---

# Installation Transaction Contracts

Resource installation uses the generic transaction shape:

```typescript
interface InstallationTransaction<TStores> {
    run<TResult>(
        operation:
            (stores: TStores) => Promise<TResult>
    ): Promise<TResult>;
}
```

Each Domain defines the exact store bundle required for one Resource Type.

Example:

```text
BibleChapterInstallationStores
    ├── chapters: ChapterStore
    ├── bibleVersions: BibleVersionStore
    └── resourceInstallations: ResourceInstallationStore
```

The concrete `IndexedDBBibleChapterInstallationTransaction` opens:

```text
domain_objects
resource_installations
```

in one `readwrite` transaction and exposes transaction-bound implementations of
those three logical stores.

The installer can therefore reason in Domain/store terms while IndexedDB still
guarantees atomicity.

---

# Local Write Transaction Contracts

User-owned publishable Domain state follows the same pattern.

For example, Notes defines a write-store bundle conceptually like:

```text
NotesWriteStores
    ├── notes
    │   ├── put
    │   └── delete
    └── outbox
        └── put
```

The concrete IndexedDB transaction opens:

```text
domain_objects
outbox
```

Then the Domain operation can atomically perform:

```text
local Note write/delete
    +
publication intent enqueue
```

This guarantees that accepted local state cannot be committed while the
required publication intent is forgotten.

Reading Plan subscriptions/progress and native Nostr-event writes use the same
architectural pattern with their own store bundles.

---

# Why Transaction-Scoped Store Views Exist

The transaction implementation does not pass raw IndexedDB object stores to the
Domain operation.

Instead it adapts them into the same narrow persistence concepts used elsewhere.

This provides three benefits.

## 1. Domain code remains persistence-mechanism agnostic

The operation sees:

```text
chapters.put(...)
resourceInstallations.put(...)
```

not:

```text
IDBObjectStore.put(...)
```

## 2. Atomicity is explicit

Every store view in the bundle is backed by the same IndexedDB transaction.

## 3. Tests can exercise the transaction contract

Tests can verify both the logical operation and its atomic persistence boundary.

---

# Store Contracts Are Not Services

A persistence store is intentionally narrow.

It should not accumulate:

* Resource discovery,
* validation,
* synchronization,
* UI notifications,
* navigation,
* publication retry policy,
* or Domain workflow.

Those responsibilities belong to higher-level Domain/application services.

For example:

```text
NotesService
    = Notes behavior

NotesStore
    = Notes persistence operations

IndexedDBNotesStore
    = concrete persistence adapter
```

Do not turn `NotesStore` into a second Notes service.

---

# Application Composition

Concrete persistence implementations are selected by composition roots.

Main-thread example:

```text
Application
    ↓
new IndexedDBChapterStore(getApplicationDB)
    ↓
new ChapterService(...)
```

Worker example:

```text
Resource Worker composition
    ↓
new IndexedDB...Transaction(getApplicationDB)
    ↓
Domain Resource installer/handler
```

This is why direct imports of concrete persistence adapters from composition
code are legitimate.

The implementation is being wired intentionally; this is not a public Domain
API leak.

---

# Concrete Persistence Imports

Domain persistence adapters currently import the physical database definition
from:

```text
$lib/infrastructure/persistence/application.db
```

That direct import is intentional.

A broad `$lib/infrastructure` public barrel would make this concrete dependency
less clear without improving the architecture.

The important boundary is:

```text
Domain service
    → Domain store interface

concrete persistence adapter
    → application.db
```

not "every source file imports only from a root barrel."

---

# Resource Receipt Store

`ResourceReceiptStore` is a Resource-layer persistence contract.

`IndexedDBResourceReceiptStore` implements it with the shared
`resource_receipts` object store.

It remains a concrete Resource persistence implementation and is intentionally
not forced through the public `$lib/resource` root API when doing so would
create undesirable dependency cycles through `application.db`.

This is an example of architecture taking precedence over cosmetic import
uniformity.

---

# Outbox Store

`OutboxStore` exposes the operations required by `OutboxProcessor`:

```text
get
put
listByStatus
deleteIfCurrent
```

`IndexedDBOutboxStore` implements those operations against the shared `outbox`
object store.

`deleteIfCurrent()` is more than a generic delete. It performs a transactionally
checked delete so a completed older publication cannot remove a newer
same-ID pending publication.

This illustrates why store contracts should model the persistence semantics the
caller actually needs instead of exposing generic CRUD only.

---

# Nostr Event Store

`NostrEventsStore` is the persistence contract for selected application-owned
native Nostr events.

Its IndexedDB implementation supports:

```text
get by key
get by [kind, pubkey]
put
```

The combined IndexedDB index is hidden behind the store interface.

Consumers do not need to know the physical index name.

---

# Resource Selection Store

`ResourceSelectionStore` is different from the IndexedDB-backed stores above.

Its current concrete implementation is:

```text
LocalStorageResourceSelectionStore
```

This is intentional because Resource selections are a small application
configuration snapshot rather than a transactional collection of Domain
Objects.

The store contract allows `ResourceSelectionService` to remain independent of
that browser-storage choice.

---

# Error and Abort Behavior

Concrete IndexedDB transaction implementations preserve the operation error.

General pattern:

```typescript
try {
    const result = await operation(stores);
    await transaction.done;
    return result;
} catch (error) {
    try {
        transaction.abort();
    } catch {
        // transaction may already be inactive
    }

    try {
        await transaction.done;
    } catch {
        // preserve original operation error
    }

    throw error;
}
```

The caller therefore sees the original Domain/application failure rather than a
secondary abort error.

---

# Testing Strategy

Persistence tests should be targeted at the boundary being implemented.

## Store adapter tests

Verify:

```text
record key construction
put/get/delete
objectType partitioning
indexed lookup
Domain value translation
```

## Transaction tests

Verify:

```text
correct object stores participate
all required writes share one transaction
success commits
failure aborts
no partial accepted state remains
```

## Higher-level service tests

Mock or fake the Domain store contract when the test is about Domain behavior
rather than IndexedDB mechanics.

This prevents persistence implementation details from leaking upward into every
service test.

---

# Adding a New Persisted Domain Type

For a new Domain Object type, prefer this sequence:

```text
1. define Domain Object identity
2. define a narrow Domain store interface
3. implement IndexedDB adapter using domain_objects when appropriate
4. add objectType constant/index usage as needed
5. if Resource-installed, define installation store bundle + transaction
6. if locally publishable, define write store bundle + Outbox transaction
7. compose the concrete adapter/transaction in Application or Worker root
8. add focused persistence tests
```

Do not add a new physical IndexedDB object store by default.

Use a separate physical store only when its storage/index/transaction semantics
are materially different from ordinary Domain Objects.

---

# Implementation Rules

1. Domain behavior depends on Domain-facing store contracts.
2. IndexedDB mechanics stay in concrete persistence adapters/transactions.
3. Store contracts should be narrow and semantic, not generic CRUD bags.
4. Use transaction-scoped store views for atomic multi-record operations.
5. Do not pass raw IndexedDB stores/transactions into Domain behavior.
6. Composition roots choose concrete persistence implementations.
7. Concrete persistence code may import `application.db` directly.
8. Do not create a broad infrastructure barrel merely to hide concrete wiring.
9. Do not create a generic repository framework that erases Domain ownership.
10. Test persistence semantics at the persistence boundary and Domain behavior
    above that boundary separately.
