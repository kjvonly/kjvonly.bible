# Application Persistence

**Status**

Implementation Design — Extracted from Retired Domain Storage ADR

---

# Purpose

This document preserves the useful implementation guidance from the retired **Domain Storage Model** ADR.

Persistence no longer exists as a mandatory Resource Boundary layer.

Instead:

> The owner of application state determines how that state is persisted.

This document describes the existing implementation direction of Domain-oriented persistence, IndexedDB-backed browser storage, indexes, migrations, and query APIs.

---

# Persistence Principle

The application persists application information rather than treating raw Nostr events as its primary local data model.

Conceptually:

```text
Domain
    ↓
Accepted Domain State
    ↓
Domain-Owned Persistence
    ↓
IndexedDB / Storage Engine
```

Transport representations may still be cached or retained for technical purposes.

They do not replace the Domain model as application state.

---

# Ownership

Persistence should follow application ownership.

For example:

```text
Bible Domain
    → Bible persistence

Notes Domain
    → Notes persistence

Reading Plans Domain
    → Reading Plans persistence
```

A shared physical database does not imply shared semantic ownership.

---

# Domain Store Pattern

The old architecture called the persistence abstraction a **Domain Store**.

That remains a useful implementation pattern, but it is not a mandatory architectural abstraction.

A Domain Store may provide:

* durable storage,
* retrieval,
* querying,
* indexes,
* transactions,
* and migrations

for state owned by a Domain.

Other implementations may use repositories or another persistence API.

---

# Domain Persistence Responsibilities

The old Domain Storage ADR assigned each Domain responsibility for:

* its persisted object schemas,
* serialization,
* indexes,
* migrations,
* and query APIs.

That direction remains useful.

Domain-specific persistence details should remain close to the Domain that gives the data meaning.

---

# Encapsulation

One Domain should not manipulate another Domain's physical storage directly.

Prefer:

```text
Consumer
    ↓
Owning Domain Public API
    ↓
Domain Persistence
```

over:

```text
Consumer
    ↓
Another Domain's IndexedDB Store
```

This allows storage layouts to change without becoming cross-application contracts.

---

# IndexedDB

For the browser/PWA implementation, IndexedDB is the natural persistence mechanism.

A practical structure may use:

```text
IndexedDB Database
    ├── Bible-related stores
    ├── Notes-related stores
    ├── Reading Plan-related stores
    ├── application metadata
    ├── Resource installation metadata
    └── Outbox
```

The exact object-store organization should be determined by actual query and transaction requirements.

The architecture does not require one physical object store per Domain.

---

# Shared Database, Separate Ownership

Multiple owners may use the same IndexedDB database.

This is acceptable.

```text
Shared IndexedDB
    ≠
Shared semantic ownership
```

Ownership is determined by application responsibility, not by the physical database containing the record.

---

# Persisted Domain Objects

Accepted Domain Objects may be persisted directly or transformed into persistence records optimized for local storage.

A persistence record is not automatically the Domain Object itself.

Conceptually:

```text
Domain Object
    ↓
Persistence Mapping
    ↓
IndexedDB Record
```

The application may reconstruct Domain Objects through repositories or Domain APIs.

---

# Resource Provenance

Externally derived Domain information may need provenance retained alongside persisted state.

Useful provenance includes:

```text
publisher public key
Resource Identifier
source publication event id
Published Resource Identity
```

This supports:

* diagnostics,
* updates,
* synchronization,
* uninstallation,
* and source display.

Event ID remains publication metadata.

---

# Resource Installation Metadata

Persistence may retain Resource-specific local metadata such as:

```text
Published Resource Identity
installation status
accepted publication event id
installed timestamp
provenance
```

This is local metadata.

It does not modify external Resource Identity.

---

# Indexes

Indexes belong to the owner whose queries they support.

Examples may include:

* Bible reference lookup,
* Notes lookup,
* reading-plan state,
* installation metadata lookup,
* Outbox status,
* and search-related derived indexes.

A physical IndexedDB index should be introduced because a query requires it, not merely because an architecture diagram calls for an index.

---

# Derived Data

Derived state may be persisted when recomputation is expensive or offline behavior benefits from it.

Examples include:

* search indexes,
* lookup indexes,
* cached transformations,
* or computed navigation structures.

Derived persistence does not automatically become a Resource.

The owning Domain determines whether the data is authoritative, derived, or disposable.

---

# Migrations

Each persistent schema must have an evolution strategy.

A migration may be required when:

* record shape changes,
* an index changes,
* an object store changes,
* ownership boundaries change,
* or derived data must be rebuilt.

Domain-specific migrations should remain localized where practical.

---

# Transaction Boundaries

Transactions should follow consistency requirements.

Examples include:

```text
atomic Resource installation

accepted local change
+
Outbox publication intent

multi-record Domain update

installation metadata
+
accepted Domain state
```

The transaction boundary should preserve the invariant being implemented.

It should not be based purely on directory structure.

---

# Resource Installation

Installation acceptance and persistence remain distinct concepts, but an implementation may combine them in one atomic transaction.

For example:

```text
Candidates Validated
        ↓
Begin IndexedDB Transaction
        ↓
Persist Accepted Domain State
        ↓
Persist Installation Metadata
        ↓
Commit
```

A failed transaction leaves previous accepted state unchanged.

---

# Outbox Persistence

The Outbox should be treated as durable application work.

Pending publication entries should survive:

* browser reload,
* application restart,
* connectivity loss,
* and failed relay attempts.

Where an accepted local change requires publication, persistence should prevent the Domain change and required Outbox intent from becoming durably inconsistent.

---

# Query APIs

Persistence should expose queries needed by the owning Domain rather than leaking IndexedDB mechanics to callers.

Examples:

```text
get by Domain identifier

list by Domain grouping

find installed Resource provenance

load pending Outbox entries

query updated records
```

The exact API should be designed around actual Domain behavior.

---

# Caching

Caching is different from accepted Domain persistence.

A cache may contain:

* Resource Representations,
* resolved blobs,
* relay results,
* or derived values.

Cached state should have explicit eviction/reconstruction semantics.

Do not treat the presence of a cached external Resource as proof that it has been installed or accepted.

---

# Storage Independence

Most application behavior should remain unaware of the physical storage engine.

A repository or persistence adapter may isolate:

```text
Domain behavior
    ↓
Persistence API
    ↓
IndexedDB
```

This makes testing and future storage evolution easier without turning the adapter into an architectural owner.

---

# Potential Organization

A practical code organization might resemble:

```text
domains/
    bible/
        persistence/
    notes/
        persistence/
    plans/
        persistence/

infrastructure/
    indexeddb/

resource/
    installation-metadata/
    outbox/
```

Exact folders remain implementation detail.

The important rule is that technical storage reuse does not erase application ownership.

---

# Testing

Persistence tests should cover:

* durable round trips,
* migrations,
* transaction rollback,
* atomic Resource installation,
* Outbox durability,
* index correctness,
* and handling of corrupted or missing records where applicable.

Domain persistence tests should verify Domain-relevant invariants rather than only IndexedDB calls.

---

# Big Takeaway

The useful principle from the retired Domain Storage ADR remains:

> Persist application information according to the owner that gives it meaning, not according to the protocol that transported it.

IndexedDB, repositories, object stores, indexes, migrations, and transactions implement that principle.

They are implementation mechanisms rather than a separate architectural layer.
