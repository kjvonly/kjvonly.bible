# ADR 08 — Resource Installation Lifecycle

**Status**

Accepted

---

# Problem

Resource Discovery finds available Resource Representations.

Resource Resolution obtains and verifies serialized Resource content and produces a decoded Resource envelope.

The application does not operate directly on Nostr events, serialized payloads, or arbitrary decoded values. Before external information can become accepted application state, the application must establish:

```text
what semantic contract the value satisfies
what Domain Objects it represents
which Domain identities those objects have
whether the incoming Resource revision should replace local state
```

The Resource Boundary therefore needs a stable acceptance transition between:

```text
verified external Resource information
```

and:

```text
accepted local Domain information
```

That transition is Resource Installation.

---

# Decision

Resource Installation is a generic acceptance lifecycle for Resource-backed Domain information.

The normal lifecycle is:

```text
Decoded Resource Envelope
        ↓
dataType + dataVersion
        ↓
Semantic Payload Validation
        ↓
Resource Category / Type
        ↓
Domain Object Construction
        ↓
Candidate Domain Object(s)
        ↓
Per-Object Currentness
        ↓
Atomic Persistence
        ↓
Accepted Local Domain Object(s)
        +
ResourceInstallation state
```

Installation MUST NOT treat successful Discovery, Resolution, decoding, or Nostr replacement as automatic acceptance.

The generic lifecycle separates semantic validation, Domain identity construction, and persistence so that Domains do not need complete custom installation pipelines merely to store Resource-backed Domain Objects.

---

# Decoded Resource Envelope

Installation receives a decoded Resource envelope that preserves the Resource context required after payload decoding.

Conceptually:

```text
publisher
resourceId
Resource Type
modifiedAt
mediaType
dataType
dataVersion
optional Resource metadata
decoded value
```

These fields serve different purposes.

In particular:

```text
resourceId
    = Resource identity component

Resource Type
    = Resource family / Domain factory selection

dataType + dataVersion
    = semantic payload contract

metadata
    = optional Domain-owned Resource-envelope semantics

modifiedAt
    = Resource revision ordering value
```

The Resource Boundary MUST NOT collapse these concepts into one path convention.

---

# Semantic Payload Validation

The decoded Resource value is validated according to its declared:

```text
dataType + dataVersion
```

Semantic payload validation answers:

> **Does this decoded value satisfy the semantic contract it claims to implement?**

A supported datatype handler may validate:

* scalar or object structure,
* required fields,
* collection/bundle shape,
* canonical value constraints,
* or another contract-specific semantic structure.

The datatype layer MUST NOT own:

* Resource identity,
* Domain Object identity,
* generic currentness,
* local persistence,
* Module selection,
* UI behavior,
* or publication.

If no semantic contract handler exists for the exact `dataType + dataVersion`, installation fails before accepted Domain state is written.

---

# Domain Object Construction

After semantic payload validation, the owning Resource Type converts the accepted value into zero, one, or many candidate Domain Objects.

Conceptually:

```text
validated semantic value
+
Resource envelope context
        ↓
Domain Object Factory
        ↓
0..n Domain Object candidates
```

A candidate carries the accepted Domain persistence contract:

```text
objectType
objectId
dataType
dataVersion
value
```

The factory owns:

* Domain Object identity,
* Resource-Type-specific Resource ID interpretation,
* Domain invariants that require Resource context,
* canonical persisted datatype/version,
* and one-to-many or bundle expansion.

The factory receives only semantically validated payload values. Raw unvalidated Resource payloads MUST NOT cross this boundary.

---

# Resource Identity and Domain Identity

Resource identity and Domain Object identity are related but distinct.

Generic Resource infrastructure MUST NOT derive Domain Object IDs from Resource IDs by convention.

The owning Domain factory MAY use Resource context as an input to Domain identity when that relationship belongs to the Domain contract.

For example:

```text
publisher
+
Resource identity namespace
+
Bible chapter reference
        ↓
Bible Chapter Domain Object ID
```

This does not make arbitrary Resource ID segments generically meaningful.

---

# Resource Metadata

A Resource envelope MAY carry protocol-agnostic scalar metadata.

The generic Resource lifecycle transports these values without assigning meaning to individual keys.

An owning Domain MAY require and interpret metadata as part of its Resource contract.

For example, a Bible Chapter Resource may separate:

```text
bibleId
    = identity namespace derived from Resource identity

metadata.version
    = semantic Bible version label
```

Two Resource identities MAY carry the same semantic metadata value. The Resource Boundary MUST NOT require metadata to equal an identifier segment unless that equality is explicitly part of the owning Domain's contract.

---

# Installation Decision and Currentness

Passing semantic and Domain validation does not mean every candidate must overwrite local state.

Currentness is evaluated per candidate Domain Object.

Conceptually:

```text
ResourceInstallation(objectType, objectId)
        ↓
compare incoming Resource modifiedAt
        ↓
missing installation
    → install

incoming modifiedAt > current modifiedAt
    → replace

incoming modifiedAt <= current modifiedAt
    → keep current object
```

This permits one Resource bundle to contain some objects that are newer locally and other objects that should be installed from the incoming Resource.

Currentness is therefore object-level even when acquisition occurs at Resource/bundle granularity.

---

# ResourceInstallation

A Resource-backed Domain Object has associated Resource revision/provenance state.

Conceptually:

```text
ResourceInstallation
    objectType
    objectId
    publisher
    optional resourceId
    optional Resource metadata
    modifiedAt
```

`ResourceInstallation` serves a different purpose from the Domain Object itself.

It may preserve:

* object-level Resource revision ordering,
* publisher association,
* known Resource identity,
* Resource-envelope metadata needed for later reconstruction,
* and archive/export eligibility.

Domain payloads SHOULD NOT duplicate transport/provenance fields merely because the Resource layer needs them later.

Resource metadata in `ResourceInstallation` does not automatically become Domain state and does not participate in currentness unless an explicit contract says otherwise.

---

# Atomic Installation

For the normal generic Domain Object persistence path, accepted Domain Objects and their `ResourceInstallation` records are committed atomically.

Conceptually:

```text
BEGIN TRANSACTION
    for each candidate that wins currentness:
        write Domain Object
        write ResourceInstallation
COMMIT
```

If validation or Domain-object construction fails, no candidate from that Resource is written.

If persistence fails, accepted Domain state and its Resource revision state MUST NOT diverge.

A candidate that is intentionally skipped because local state is newer is not a partial failure.

---

# One Resource May Produce Many Domain Objects

A Resource is not required to map one-to-one to a Domain Object.

Valid relationships include:

```text
one Resource → zero Domain Objects
one Resource → one Domain Object
one Resource → many Domain Objects
```

Examples include:

* a Chapter bundle producing many Chapter objects,
* a definition collection producing individual Definition objects,
* a Resource producing a supporting Domain catalog object plus content objects,
* or an empty valid collection producing no objects.

The persisted Domain Object contract MAY differ from the published Resource datatype contract.

---

# Supporting Domain Objects

A factory MAY produce supporting Domain Objects required by the owning Domain.

Supporting objects that are emitted through the normal candidate contract follow the same normal currentness and ResourceInstallation rules as every other candidate.

The generic lifecycle MUST NOT add one-off persistence modes for a particular Domain's historical behavior.

If an object should not be Resource-backed, it should not be modeled as a normal Resource-backed candidate merely to obtain a persistence side effect.

---

# Generic Path and Specialized Persistence

The generic installer is the default for Resource-backed Domain Objects persisted through the application's general Domain Object store.

A Resource family MAY retain specialized installation when its accepted state has materially different persistence requirements.

The current motivating example is Filesystem:

```text
Filesystem Resource
    ↓
Filesystem Domain validation
    ↓
FilesystemEntry candidates
    ↓
Filesystem-specific installer
    ↓
FILESYSTEM store
+
RESOURCE_INSTALLATIONS
```

Filesystem entries are not persisted through the general Domain Object store. Their store has mount/root/path addressing semantics that are part of the Filesystem Domain.

The existence of a specialized installer MUST be justified by a real persistence/lifecycle difference, not merely because a Resource belongs to a different Domain.

---

# Local Creation and Local Writes

Locally created or modified Domain Objects originate inside application authority and do not pass through inbound Resource Installation before becoming valid local state.

For Resource-backed local state, a Domain-specific local-write transaction MAY atomically maintain:

```text
Domain Object
+
ResourceInstallation revision state
+
Outbox publication intent
```

This is not a second inbound installer.

It is the outbound/local mutation boundary that ensures one local revision is represented consistently in durable Domain state and publication work.

Therefore Domain-specific files named `*-write-transaction` may remain appropriate even after Domain-specific inbound Resource installers have been removed.

---

# ResourceReceipt vs ResourceInstallation

Resource-level processing and object-level installation are separate concerns.

A Resource receipt answers questions such as:

```text
Has this Resource revision already been resolved/processed?
```

A `ResourceInstallation` answers:

```text
Which Resource revision is associated with this accepted Domain Object?
```

One Resource may produce many Domain Objects and therefore many `ResourceInstallation` records while having one Resource-level processing receipt.

Neither record replaces the other.

---

# Installation Sources

Installation is independent of how decoded Resource content entered the boundary.

It may originate through:

* Resource Discovery and Resolution,
* direct Resource references,
* Resource Archives,
* application bootstrap,
* synchronization,
* or another compatible Resource source.

Archive reconstruction should re-enter the same semantic validation, Domain Object construction, currentness, and persistence lifecycle rather than directly writing archived Domain payloads.

---

# Installing Another Publication

A Published Resource may have multiple addressable-event publications over time.

Receiving another publication does not bypass validation or object-level currentness.

Published Resource replacement identity determines which external Resource is being updated.

`modifiedAt` and accepted local ResourceInstallation state determine whether each produced Domain Object should be replaced.

Installation MUST NOT invent an additional generic semantic "version" from Resource ID segments.

---

# Different Published Resources

Different Resource IDs under the same publisher/kind identify different Published Resources.

Those Resources MAY still produce candidates targeting the same Domain Object identity if the owning Domain contract allows it.

In that case the normal object-level currentness rules determine accepted local state.

The Resource Boundary does not need to prohibit two independently addressed Resources from carrying the same Domain metadata or targeting the same Domain identity.

---

# Uninstallation

Uninstallation removes locally accepted state according to the owning Domain's rules.

This ADR does not require a generic inverse of Resource installation.

Uninstallation does not alter:

* the Published Resource,
* its Nostr identity,
* publisher identity,
* or the existence of external publications.

---

# Installation Failure

Installation fails when required information cannot be validly and atomically accepted.

Examples include:

* unsupported `dataType + dataVersion`,
* semantic payload validation failure,
* unsupported Resource Type,
* Domain factory invariant failure,
* required dependency failure,
* or persistence failure.

Failure MUST leave previously accepted state unchanged for the affected atomic installation operation.

---

# Offline-First Behavior

Installation operates on decoded Resource content that may already be locally available.

It MUST NOT require a live relay connection merely to validate and persist content that has already completed the required Resource acquisition steps.

Once installed, loss of network connectivity does not invalidate accepted local state.

---

# Specification Invariants

A compatible implementation MUST preserve these rules:

```text
Resource identity, Resource Type,
and semantic datatype are distinct.

Decoded Resource values are validated by
dataType + dataVersion before Domain construction.

Domain factories own Domain identity and may
produce zero, one, or many Domain Objects.

Generic installation owns normal object-level
currentness and atomic persistence.

Resource metadata is transported generically
but interpreted by owning Domains.

ResourceInstallation is separate from Domain data.

Specialized inbound installers require a real
persistence/lifecycle difference.

Local-write transactions are not inbound installers.

Resolved content is not automatically accepted.
```

---

# Scope

This ADR defines:

* semantic Resource validation before acceptance,
* Domain Object candidate construction,
* Domain identity ownership,
* generic object-level currentness,
* ResourceInstallation association,
* atomic accepted-state persistence,
* one-to-many Resource installation,
* the specialized-persistence exception,
* and the distinction between inbound installation and local writes.

It does not define:

* Resource Discovery,
* Resource Resolution,
* Nostr Resource Identity,
* concrete datatype schemas,
* Domain-specific identity formats,
* persistence technologies,
* archive encoding,
* publication,
* or synchronization conflict policy.

---

# Big Takeaway

The default inbound Resource acceptance path is:

```text
Decoded Resource
    ↓
validate declared semantic datatype
    ↓
construct Domain-owned identities and values
    ↓
apply generic object-level currentness
    ↓
atomically persist Domain state + Resource state
```

The generic Resource layer owns the repeatable lifecycle.

Domains own meaning and identity.

Specialized installation remains appropriate only where accepted state truly has different persistence requirements.
