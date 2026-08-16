# ADR 11 — Resource Archives

**Status**

Accepted

---

# Problem

Resources are normally published, discovered, and synchronized through Nostr.

Users also need to move or preserve Resources when live relay or external-storage access is unavailable.

Examples include:

* sharing selected Resources,
* transferring Resources between devices,
* preserving Resources for later restoration,
* and exporting a collection of Resources for backup.

The Resource Boundary therefore needs a portable format that preserves existing Resource identity and serialization without introducing a second Resource model.

---

# Decision

KJVOnly defines a **Resource Archive**.

A Resource Archive is a portable collection of serialized Resources.

It is independent of live Nostr relay access and does not contain Nostr events as its primary archive representation.

Conceptually:

```text id="8n41i5"
Resources
    ↓
Resource Archive
    ↓
Transfer / Preservation
    ↓
Import
    ↓
Resource Installation
```

The archive preserves existing Resource boundaries and serialized Resource content.

It does not define a separate Domain serialization model.

---

# Archive Format

Resource Archives use the file extension:

```text id="qwz4t7"
.kjva
```

A `.kjva` file is a gzip-compressed UTF-8 JSON document.

```text id="p04zvn"
Archive Object
    ↓
UTF-8 JSON
    ↓
gzip
    ↓
.kjva
```

The archive envelope MUST contain a version identifier so that the archive format can evolve independently of individual Resource schemas.

---

# Archive Structure

A Resource Archive contains:

```text id="dshj10"
Resource Archive
├── metadata
└── resources
```

Archive metadata describes the archive itself.

The `resources` collection contains the archived Resource entries.

The archive MUST NOT depend on the application's local IndexedDB schema or another implementation-specific persistence layout.

---

# Resource Entries

Each entry represents one Resource.

An entry MUST preserve enough information to identify and later interpret that Resource.

For a Nostr-published Resource, this includes its Published Resource Identity:

```text id="gkhx43"
kind
publisher public key
Resource Identifier
```

An entry also preserves:

* serialized Resource content,
* media type,
* optional provenance,
* and optional integrity metadata.

Conceptually:

```json id="1v08bh"
{
  "kind": 37770,
  "publisher": "<publisher-pubkey>",
  "resourceId": "kjvonly/bible/chapters/kjv",
  "mediaType": "application/json",
  "content": { }
}
```

The archive envelope determines how serialized content is represented safely within JSON.

Individual Resource schemas remain independent of the archive format.

---

# Serialized Resource Content

Archives carry the serialized content of the Resource rather than the Nostr event that published it.

Therefore:

```text id="5c8yzb"
Nostr Event
    ≠
Archive Entry
```

A Resource originally represented on Nostr through a `descriptor` may still be archived using the verified serialized Resource content obtained through Resource Resolution.

The archive therefore does not need to preserve the original storage provider merely to make that Resource portable.

---

# Self-Contained Portability

A Resource Archive is intended to remain usable without access to the relay or external storage location from which its Resources were originally obtained.

Archived Resource entries SHOULD therefore contain the serialized content required to reconstruct the Resource rather than relying only on external URLs or live descriptor targets.

Provenance MAY preserve information about the original publication or storage source.

That provenance does not replace the archived content.

---

# Resource Boundaries

Archive boundaries follow Resource boundaries.

A Resource containing many Domain Objects remains one archive entry when that is its defined Resource granularity.

For example:

```text id="hyg2j8"
kjvonly/bible/chapters/kjv
```

may contain many chapter records while remaining one Resource entry.

The archive MUST NOT split Resources into separate entries merely because they later produce multiple Domain Objects.

Likewise, multiple independently identifiable Resources MUST NOT be collapsed into one new archive-specific Resource identity.

---

# Export

Export converts selected Resource information into archive entries.

Conceptually:

```text id="03a2bw"
Resource
    ↓
Serialized Resource Content
    ↓
Archive Entry
    ↓
Resource Archive
```

Export MAY include:

* installed Resources,
* locally created Resources intended for external portability,
* user-selected Resources,
* or all exportable Resources available to the workflow.

How accepted Domain information is serialized into a Resource is defined by the applicable Resource contract and owning Domain.

This ADR does not require a `Resource Serializer` architectural component.

---

# Import

Import reverses the archive envelope and feeds each Resource through the normal inbound Resource lifecycle.

```text id="pjnnzj"
.kjva
    ↓
Decompress
    ↓
Validate Archive
    ↓
Resource Entry
    ↓
Serialized Resource Content
    ↓
Domain Interpretation / Validation
    ↓
Resource Installation
```

Archive import MUST NOT bypass Domain validation or Resource Installation.

An archive entry is external Resource information.

Its presence in an archive does not automatically make it accepted local state.

---

# Archive Validation

Before Resource entries are processed, the archive envelope MUST be validated.

Validation includes at least:

* supported archive version,
* valid archive structure,
* valid Resource entry structure,
* and any archive-level integrity information required by that archive version.

Resource-specific validation remains part of the normal Resource lifecycle.

---

# Independent Entry Processing

Resource entries are processed independently unless an applicable Resource dependency requires coordination.

Failure to import one independent Resource MUST NOT automatically prevent unrelated Resources from being processed.

An import may therefore produce partial success.

For example:

```text id="cf2eut"
Resource A → installed
Resource B → validation failure
Resource C → installed
```

The caller SHOULD receive enough information to identify failed entries.

---

# Resource Dependencies

If an archived Resource depends on another Resource, normal Resource Installation dependency rules apply.

The archive itself does not create a second dependency model.

A required dependency may:

* exist elsewhere in the same archive,
* already exist locally,
* or be obtainable through another Resource Boundary mechanism.

Installation determines whether the dependency requirements are satisfied.

---

# Local Authority

An archive is a Resource transport mechanism.

It is not automatically authoritative application state.

Therefore:

> **The archive proposes. The application decides.**

Imported Resource information must satisfy the same Domain validation and Installation rules as equivalent information obtained through Nostr.

---

# Existing Local State

This ADR does not define a separate archive conflict-resolution algorithm.

If imported Resource information corresponds to already accepted local information, the normal Installation and, where applicable, Multi-Device Synchronization policies determine whether the imported state replaces the local state.

Resource Archives MUST NOT introduce:

* a separate Last-Write-Wins rule,
* archive-specific revisions,
* automatic merging,
* or conflict-copy identity.

---

# Provenance

Archive entries MAY preserve provenance from their original Resource publication.

Useful provenance may include:

```text id="hsy6te"
publisher public key
Resource Identifier
source event id
```

The event ID identifies the source publication.

It does not become the identity of the archive entry or define a new Resource revision.

Import SHOULD preserve applicable provenance when constructing candidate Domain information.

---

# Integrity

An archive MAY contain archive-level or per-Resource integrity metadata.

Integrity metadata verifies that archived bytes have not changed.

It does not replace:

* Domain validation,
* Resource Installation,
* or publisher identity semantics.

Where Resource content already has a defined integrity value, an archive SHOULD preserve it where practical.

---

# Archive Versioning

The archive envelope has its own version.

That version governs:

* archive metadata,
* entry structure,
* content encoding within the JSON envelope,
* and archive-level features.

It does not define versions of individual Resources.

Resource schemas evolve according to their own Resource and Domain contracts.

Therefore:

```text id="hpf53s"
Archive Version
    ≠
Resource Version
```

Changing the archive envelope does not create a different Published Resource.

---

# Resource Archives Are Not Application Backups

A Resource Archive contains Resources.

It does not automatically contain every piece of local application state.

Examples of information that MUST NOT be added merely because a user wants a complete application backup include:

* Runtime state,
* arbitrary UI settings,
* local-only preferences,
* Discovery Root configuration,
* installation bookkeeping,
* transient caches,
* and pending Outbox work.

Such information may only appear in a Resource Archive when it deliberately has a Resource representation under the Domain Resource Model.

A whole-application backup is a separate application concern.

---

# Offline Behavior

Creating or importing a Resource Archive MUST NOT require live relay access when all required Resource content is already locally available.

Likewise, Resources successfully imported and installed from an archive remain usable offline.

Archive portability therefore complements rather than replaces the Nostr Resource lifecycle.

---

# Specification Invariants

A compatible implementation MUST preserve these rules:

```text id="5n29l7"
A Resource Archive contains Resources,
not arbitrary application state.

.kjva is a gzip-compressed UTF-8 JSON archive.

The archive envelope is versioned.

Resource boundaries are preserved.

Archived Resources carry serialized Resource content.

Nostr events are not the archive's primary data model.

Import uses normal Domain validation
and Resource Installation.

Archive presence does not imply local authority.

Independent Resource entries may partially succeed.

Archive versioning does not create
Resource versioning.

Whole-application backup is a separate concern.
```

---

# Scope

This ADR defines:

* Resource Archives,
* the `.kjva` format,
* archive envelope versioning,
* Resource entries,
* preservation of Resource boundaries,
* serialized Resource content in archives,
* Resource export,
* Resource import,
* independent entry processing,
* archive provenance,
* and archive portability.

It does not define:

* arbitrary application backup,
* Runtime or UI-state backup,
* Resource serialization schemas,
* Resource Discovery,
* Resource Resolution,
* Domain validation rules,
* Resource Installation mechanics,
* synchronization policy,
* Outbox persistence,
* or local storage layout.

Those concerns belong to their corresponding Resource Boundary, Application Architecture, or implementation specifications.

---

# Big Takeaway

A Resource Archive makes Resources portable without requiring live Nostr infrastructure.

```text id="ug4twt"
Resource
    ↓
Serialized Resource Content
    ↓
.kjva Archive
    ↓
Transfer / Preserve
    ↓
Import
    ↓
Resource Installation
```

It preserves the existing Resource model rather than inventing another one.

> **Archive Resources as Resources; do not turn the Resource Archive into a dump of the entire application.**
