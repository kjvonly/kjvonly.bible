# ADR 11 — Resource Archives

**Status**

Accepted

---

# Problem

Resources are normally published, discovered, and synchronized through the Resource Boundary.

Users also need to move or preserve accepted Resource-backed information when live relay or external-storage access is unavailable.

Examples include:

* sharing selected user-created information,
* transferring accepted information between devices,
* preserving information for later restoration,
* and exporting selected Resource-backed information for backup.

The Resource Boundary therefore needs a portable format that can reconstruct Resource candidates without introducing a second Domain validation or Installation lifecycle.

---

# Decision

KJVOnly defines a **Resource Archive**.

A Resource Archive is a portable, normalized representation of accepted Resource-backed Domain state.

It is independent of live Nostr relay access and does not preserve Nostr events, transport encoding, or original Resource packaging as its primary archive representation.

Conceptually:

```text id="71tmrg"
Accepted Resource-Backed Domain State
    ↓
Resource Archive
    ↓
Transfer / Preservation
    ↓
Import
    ↓
Reconstruct Resource Candidate
    ↓
Normal Domain Validation / Installation
```

The archive does not define a separate Domain model.

The archive does not make archived information authoritative merely because it was previously accepted elsewhere.

---

# Archive Format

Resource Archives use the file extension:

```text id="mr4c9l"
.kjva
```

A `.kjva` file is a gzip-compressed UTF-8 JSON document.

```text id="zpn0u8"
Archive Object
    ↓
UTF-8 JSON
    ↓
gzip
    ↓
.kjva
```

The archive envelope MUST contain a version identifier so that the archive format can evolve independently of individual Domain and Resource schemas.

---

# Archive Contents

A Resource Archive contains selected accepted Resource-backed Domain information together with the Resource metadata required to reconstruct inbound Resource candidates.

Conceptually:

```text id="csik45"
Resource Archive
├── archive version
├── accepted Domain Objects
└── Resource association / revision metadata
```

The archive therefore preserves the information required to answer:

```text id="81u1u0"
Which Domain Object is this?

Which publisher is associated with it?

Which Resource revision does it represent?

How can the owning Domain reconstruct
its Resource representation?
```

The archive does not need to preserve transport details that are no longer required after Resource content has already been accepted by the application.

---

# Normalized Archive Representation

A Resource Archive is normalized around accepted Domain Objects rather than the original transport packaging of a Resource.

For example, one externally acquired Resource may install many Domain Objects.

After acceptance, those Domain Objects may be archived independently when the owning Domain can reconstruct valid Resource candidates for them.

Therefore:

```text id="a2uwkt"
Original Resource Packaging
    ≠
Required Archive Packaging
```

The archive preserves accepted Resource-backed meaning, not the byte-for-byte representation or grouping through which that meaning originally arrived.

---

# Resource Identity

The archive MUST preserve or reconstruct enough information for the owning Domain to produce the Resource identity required by normal inbound processing.

Resource identity may be derived from:

* the accepted Domain Object identity,
* its publisher association,
* applicable Resource metadata,
* and the owning Domain's Resource contract.

The archive does not need to persist Nostr kind merely to reconstruct a Domain Resource candidate.

Transport-specific identity is applied again when information is later published through that transport.

---

# Resource Revision

Archived Resource-backed state MUST preserve the revision ordering value associated with the accepted Domain Object.

That value is reused during import so normal Installation freshness rules can determine whether archived information is newer than accepted local state.

Export MUST NOT generate a new Resource revision merely because an archive is being created.

Therefore:

```text id="bl3x86"
Archive Creation Time
    ≠
Resource Revision Time
```

Archive creation does not make an older Domain Object newer.

---

# Locally Authored Resource-Backed State

Resource-backed Domain information may exist locally before or without successful external publication.

Such information MAY still be exported when the application has enough Resource association and revision information to reconstruct its Resource candidate.

Archive portability therefore does not depend on successful relay publication.

Publication state and archive eligibility are separate concerns.

---

# Export Selection

Export MAY contain all exportable Resource-backed Domain information or a user-selected subset.

Typical selections may include:

* Notes,
* Bible text markups,
* Reading Plan subscriptions and progress,
* Bible content,
* Strong's information,
* or other Resource-backed Domain types.

Selection is an application concern.

Selecting a subset does not create new Resource identity or Domain schemas.

---

# Export

Export collects selected accepted Resource-backed Domain information and the Resource metadata needed to reconstruct it later.

Conceptually:

```text id="mgvypj"
Accepted Resource-Backed Domain State
    ↓
Select Exportable Information
    ↓
Archive Representation
    ↓
Resource Archive
```

Export does not need to reconstruct Nostr events or transport encodings.

It also does not need to preserve whether accepted information originally arrived inline, through a descriptor, from external storage, or as part of a larger Resource bundle.

---

# Import

Import reverses the archive envelope and reconstructs normal decoded Resource input for the owning Domain.

```text id="zkj1ca"
.kjva
    ↓
Decompress
    ↓
Validate Archive
    ↓
Archived Domain Information
    +
Resource Metadata
    ↓
Reconstruct Decoded Resource Input
    ↓
Domain Interpretation / Validation
    ↓
Resource Installation
```

Archive import MUST NOT directly accept archived Domain information merely because it came from a previously accepted archive record.

Imported information MUST pass through the same Domain interpretation, validation, freshness, and Installation rules as equivalent externally acquired decoded Resource content.

---

# Archive Validation

Before archived information is processed, the archive envelope MUST be validated.

Archive validation includes at least:

* supported archive version,
* valid archive structure,
* valid relationships between archived Domain information and its Resource metadata,
* and any archive-level integrity rules defined by that archive version.

Archive validation does not replace Domain validation.

Resource-specific meaning remains owned by the applicable Domain Resource contract.

---

# Independent Entry Processing

Archived Resource-backed Domain Objects are processed independently unless an applicable Domain dependency requires coordination.

Failure to import one independent object MUST NOT automatically prevent unrelated objects from being processed.

An import may therefore produce partial success.

For example:

```text id="v7z9o8"
Object A → installed
Object B → validation failure
Object C → already current
Object D → installed
```

The caller SHOULD receive enough information to identify failed or skipped entries.

---

# Resource Dependencies

If reconstructed Resource information depends on another Resource or accepted Domain capability, normal Resource Installation dependency rules apply.

The archive itself does not create a second dependency model.

A required dependency may:

* exist elsewhere in the same archive,
* already exist locally,
* or be obtainable through another Resource Boundary mechanism.

Installation determines whether the dependency requirements are satisfied.

---

# Local Authority

An archive is a portability mechanism.

It is not automatically authoritative application state.

Therefore:

> **The archive proposes. The application decides.**

Imported information must satisfy the same Domain validation and Installation rules as equivalent information obtained through another Resource Boundary source.

---

# Existing Local State

This ADR does not define a separate archive conflict-resolution algorithm.

If archived information corresponds to already accepted local information, the normal Resource revision and Installation rules determine whether the imported state replaces the local state.

Resource Archives MUST NOT introduce:

* a separate Last-Write-Wins rule,
* archive-specific revisions,
* automatic merging,
* or conflict-copy identity.

An implementation MAY prefilter archive entries that are already known to be current or older, but normal Installation policy remains authoritative.

---

# Provenance

Archive metadata MAY preserve Resource provenance that remains useful after acceptance.

Useful provenance may include:

```text id="k2vyyt"
publisher public key
original Resource Identifier
```

Provenance helps describe where accepted Resource-backed state came from.

It does not make archived information authoritative and does not create a new Resource revision.

---

# Integrity

An archive MAY contain archive-level integrity metadata.

Integrity metadata verifies that archived bytes have not changed.

It does not replace:

* Domain validation,
* Resource Installation,
* Resource revision ordering,
* or publisher identity semantics.

---

# Archive Versioning

The archive envelope has its own version.

That version governs:

* archive structure,
* archive-level metadata,
* and archive-level features.

It does not define versions of individual Resources or Domain Objects.

Resource schemas evolve according to their own Resource and Domain contracts.

Therefore:

```text id="rlg69w"
Archive Version
    ≠
Resource Version
```

Changing the archive envelope does not create a different Resource revision.

---

# Resource Archives Are Not Whole-Application Backups

A Resource Archive contains selected Resource-backed Domain state.

It does not automatically contain every piece of local application state.

Examples of information that MUST NOT be added merely because a user wants a complete application backup include:

* Runtime state,
* arbitrary UI settings,
* local-only preferences,
* Discovery Root configuration,
* transient caches,
* and pending publication work.

Resource-related metadata needed to reconstruct and compare archived Resource candidates is part of the archive model.

Unrelated local implementation bookkeeping is not.

A whole-application backup is a separate application concern.

---

# Offline Behavior

Creating or importing a Resource Archive MUST NOT require live relay access when all required Resource-backed information is already locally available.

Likewise, Resources successfully imported and installed from an archive remain usable offline.

Archive portability therefore complements rather than replaces the Nostr Resource lifecycle.

---

# Specification Invariants

A compatible implementation MUST preserve these rules:

```text id="yz6h2t"
A Resource Archive contains selected
Resource-backed Domain state,
not arbitrary application state.

.kjva is a gzip-compressed UTF-8 JSON archive.

The archive envelope is versioned.

The archive preserves the Resource revision
associated with accepted Domain state.

Export does not create a newer revision.

Original transport packaging and encoding
need not be preserved.

Import reconstructs decoded Resource input.

Import uses normal Domain validation
and Resource Installation.

Archive presence does not imply local authority.

Independent archived objects may partially succeed.

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
* normalized accepted Resource-backed Domain state in archives,
* preservation of Resource revision information,
* selective Resource export,
* Resource reconstruction during import,
* normal validation and Installation on import,
* independent entry processing,
* applicable Resource provenance,
* and archive portability.

It does not define:

* arbitrary application backup,
* Runtime or UI-state backup,
* Domain schemas,
* Resource serialization schemas,
* Resource Discovery,
* network Resource Resolution,
* Domain validation rules,
* Resource Installation mechanics,
* synchronization policy,
* Outbox persistence,
* or local storage layout.

Those concerns belong to their corresponding Resource Boundary, Application Architecture, or implementation specifications.

---

# Big Takeaway

A Resource Archive makes accepted Resource-backed Domain state portable without requiring live Nostr infrastructure or preservation of its original transport packaging.

```text id="57zdrq"
Accepted Resource-Backed Domain State
    ↓
.kjva Archive
    ↓
Transfer / Preserve
    ↓
Reconstruct Resource Candidate
    ↓
Normal Validation / Installation
```

> **Archive accepted Resource-backed state; re-enter through the normal Resource acceptance boundary.**
