# Resource Object Installation Specification

## Status

Proposed Implementation Specification

This document records the intended architecture for transforming decoded Resources into installed Domain Objects.

It is written before implementation so the upcoming Resource-Type interpreter, validation, and installation work can be built against a stable reference.

This specification refines implementation details beneath the accepted Resource architecture. It does not replace or redefine the ADRs.

---

# Purpose

A Published Resource is not itself application state.

A Resource may be:

* embedded directly in a Nostr event,
* referenced through Blossom,
* imported from an archive,
* represented as an individual item,
* represented as a bundle,
* or obtained through another future Resource Resolution mechanism.

Regardless of origin, installation must answer the same questions:

1. What Resource Type does this decoded content belong to?
2. How does that Resource Type interpret its local Resource path?
3. Does the Resource produce one Domain Object candidate or many?
4. Are those candidates valid?
5. Should each candidate replace the currently installed Domain Object?
6. How is the accepted Domain Object persisted?
7. Which Resource publication currently provides the provenance for each installed object?

The goal is one repeatable architecture that can be reused by:

* Bible Chapters,
* Strong's data,
* Reading Plans,
* Notes,
* overlays,
* indexes,
* and future Resource Types.

The governing rule remains:

> The network proposes. The application decides.

---

# Scope

This specification defines the intended architecture for:

* Resource-Type-specific routing,
* Resource-Type interpretation,
* individual and bundled Resource handling,
* one-to-many candidate production,
* Domain validation,
* Resource `modifiedAt` propagation,
* installation comparison,
* Domain Object identity creation,
* per-installed-object Resource provenance,
* atomic Domain + provenance persistence,
* a future `ResourceInstallationStore`,
* and repeatable composition of Resource-Type installation pipelines.

This specification assumes the following generic Resource stages already exist:

```text
Resource Discovery
        ↓
Resource Representation
        ↓
Resource Resolution
        ↓
VerifiedResourceContent
        ↓
Resource Content Decoding
        ↓
DecodedResourceContent
```

This specification begins at:

```text
DecodedResourceContent
```

and continues through installation.

It does not define:

* relay behavior,
* rx-nostr mechanics,
* Resource Discovery,
* descriptor fetching,
* Blossom transport,
* archive format,
* Outbox publishing,
* synchronization scheduling,
* UI behavior,
* or final persistence adapter APIs.

---

# High-Level Architecture

The intended inbound lifecycle is:

```text
External Resource Source
    Nostr Content
    Blossom
    Archive
    Future Provider
        ↓
Resource Resolution
        ↓
VerifiedResourceContent
        ↓
Resource Content Decorators
        ↓
DecodedResourceContent
        ↓
Resource-Type Pipeline
        ↓
Interpreter
        ↓
Domain Candidate(s)
        ↓
Validator
        ↓
Validated Candidate(s)
        ↓
Installation Policy
        ↓
Domain Installer
        ↓
Domain Store
        +
Resource Installation Metadata
```

The provider used to obtain Resource content becomes irrelevant after Resource Resolution.

The Resource Type becomes the primary routing concern after generic content decoding.

---

# Core Architectural Principles

## Resource Source Is Irrelevant After Resolution

Once content has become `VerifiedResourceContent`, later stages must not care whether it came from:

* inline Nostr,
* Blossom,
* an archive,
* HTTP,
* or a future provider.

All provider-specific mechanisms converge on the same normalized Resource result.

```text
Nostr ──────┐
Blossom ────┼──→ VerifiedResourceContent
Archive ────┤
Future ─────┘
```

Everything downstream is shared.

---

## Representation and Domain Meaning Are Separate

Representation answers:

> How do I obtain the serialized Resource content?

Resource Type answers:

> What application component understands the decoded content?

For example:

```text
representation:
    content

resourceType:
    kjvonly/bible/chapters
```

and:

```text
representation:
    descriptor

resourceType:
    kjvonly/bible/chapters
```

must eventually enter the same Bible Chapter pipeline after Resolution and content decoding.

---

## Granularity Is a Resource-Type Concern

The generic Resource layer should not introduce flags such as:

```text
isBundle
isIndividual
```

Instead, the Resource Identifier path after the Resource Type is interpreted by the owning Resource Type.

For Bible Chapters:

```text
kjvonly/bible/chapters
└────────────────────┘
     Resource Type
```

Everything after that is the Bible Chapters Resource path.

A different Resource Type may define a different path grammar.

---

# Resource Identifier as a Local Route

The Resource Identifier can be treated similarly to a REST route.

The generic convention is:

```text
namespace/domain/resource-type/...resource-path
```

The first three segments define the Resource Type:

```text
namespace/domain/resource-type
```

The remaining segments form the Resource-Type-specific path.

Example:

```text
kjvonly/bible/chapters/kjvs/1_1
```

becomes:

```text
Resource Type:
    kjvonly/bible/chapters

Resource Path:
    kjvs/1_1
```

Generic Resource code may expose those concepts separately.

Conceptually:

```ts
interface ResourceRoute {
    resourceType: string;
    path: readonly string[];
}
```

This exact interface is not required.

The important rule is:

> Generic Resource code identifies the Resource Type. The owning Resource-Type pipeline interprets the remaining path.

---

# Bible Chapter Route Model

The intended Bible Chapter hierarchy is:

```text
kjvonly/bible/chapters
```

with routes:

```text
/chapters
/chapters/{version}
/chapters/{version}/{chapter}
```

Mapped to Resource Identifiers:

```text
kjvonly/bible/chapters

kjvonly/bible/chapters/kjvs

kjvonly/bible/chapters/kjvs/1_1
```

Intended meanings:

```text
/chapters
    collection root
    may eventually list or describe Bible versions
    published by this publisher

/chapters/{version}
    version-level bundle

/chapters/{version}/{chapter}
    individual Chapter Resource
```

The first implementation only needs:

```text
/{version}
/{version}/{chapter}
```

The collection root is reserved for future design.

---

# Bible Version Identity

Different publishers may publish Resources using the same version names.

Therefore:

```text
kjv
kjvs
```

alone are not sufficient local identities.

A local Bible Version identity must include the publisher.

Conceptually:

```text
BibleVersionId

<publisher>/<version>
```

Examples:

```text
publisherA/kjv
publisherA/kjvs
publisherB/kjv
```

The exact string encoding can be refined later.

The architectural requirement is:

```text
publisher A / kjv
    ≠
publisher B / kjv
```

---

# Chapter Identity

The serialized Chapter payload does not need to contain its local IndexedDB key.

Chapter identity is created during installation.

Conceptually:

```text
ChapterId

<BibleVersionId>/<bookID_chapter>
```

Example:

```text
publisherA/kjvs/1_1
```

The `Chapter` Domain Object may continue carrying:

```ts
id: string
```

because the ID is useful for Domain Store lookup.

The Chapter should not carry Resource transport/provenance fields such as:

* Nostr event ID,
* Resource Identifier,
* Nostr kind,
* media type,
* representation,
* relay,
* or descriptor details.

Those remain Resource installation metadata.

---

# Chapter Content Remains Pure Domain Data

Conceptually:

```ts
interface Chapter {
    id: string;
    number: number;
    bookName: string;
    verses: Record<string, Verse>;
    verseMap: Record<string, string>;
    footnotes: Record<string, string>;
}
```

Only `id` exists for local Domain identity.

Resource provenance must remain separate from the Scripture payload.

---

# Resource modifiedAt

A generic Resource ordering timestamp must survive through installation.

The application will use:

```text
modifiedAt
```

as the generic ordering value.

At the Nostr boundary:

```text
event.created_at
        ↓
ResourceRepresentation.modifiedAt
        ↓
VerifiedResourceContent.modifiedAt
        ↓
DecodedResourceContent.modifiedAt
        ↓
Installation
```

`modifiedAt` does not imply that a specific textual field changed.

A newer Resource may represent:

* text changes,
* schema/model changes,
* metadata changes,
* corrected serialization,
* or another Resource-level update.

The value exists so installation can determine which Resource state should win locally.

---

# Why modifiedAt Must Reach Installation

Suppose an individual Chapter Resource is installed first:

```text
resourceId:
    kjvonly/bible/chapters/kjvs/1_1

modifiedAt:
    100
```

Later the full KJVS bundle arrives:

```text
resourceId:
    kjvonly/bible/chapters/kjvs

modifiedAt:
    200
```

The bundle contains Genesis 1.

Installation compares:

```text
incoming modifiedAt = 200
installed source modifiedAt = 100
```

and replaces Genesis 1.

If the installed Chapter came from a newer individual publication:

```text
installed source modifiedAt = 300
incoming bundle modifiedAt = 200
```

the installed Chapter remains.

The comparison is per installed Domain Object.

---

# Individual Resources as Fast Partial Installation

Individual Chapter Resources exist to reduce initial latency.

Example:

```text
fresh browser
    ↓
user opens Genesis 1
    ↓
full Bible bundle not installed
    ↓
fetch small Genesis 1 Resource
    ↓
validate + install
    ↓
render immediately
    ↓
full bundle may install later
```

The individual Resource is not a separate canonical Bible dataset.

It is another Resource granularity that produces the same installed Domain Object type.

This behavior is an intentional supported use case.

---

# Installed Chapter Storage

Fetched individual Chapters should be written to the normal Chapter Domain Store.

They do not require a separate local cache abstraction.

Once accepted, they are installed Domain Objects.

```text
Individual Resource
        ↓
Installation
        ↓
Chapter Store
```

A later bundle may update the same Chapter records when the incoming Resource is newer.

---

# Bundle Payload Shape

A Bible bundle may remain a keyed object/map.

Example:

```json
{
    "kjvs/1_1": {
        "number": 1,
        "bookName": "Genesis",
        "verses": {},
        "verseMap": {},
        "footnotes": {}
    },

    "kjvs/1_2": {
        "number": 2,
        "bookName": "Genesis",
        "verses": {},
        "verseMap": {},
        "footnotes": {}
    }
}
```

The bundle does not need to be repackaged into an array.

Serialized representation and pipeline cardinality are separate concerns.

The interpreter may enumerate the map with logic equivalent to:

```ts
Object.entries(bundle)
```

---

# Generic Interpretation Contract

A Resource Type interpreter converts one decoded Resource into zero or more Domain candidates.

Conceptually:

```ts
interface ResourceInterpreter<TCandidate> {
    readonly resourceType: string;

    interpret(
        resource: DecodedResourceContent
    ): Iterable<TCandidate>;
}
```

The exact name and return type may change.

The architectural contract is:

```text
one decoded Resource
    → zero, one, or many candidates
```

---

# Why Iterable Is Appropriate

An `Iterable<TCandidate>` allows one-or-many output without requiring the serialized Resource itself to be an array.

Examples:

```text
Individual Chapter Resource
    → yield one candidate
```

```text
Bible bundle map
    → enumerate map entries
    → yield many candidates
```

The decoded Resource content can remain:

* an object,
* map,
* array,
* or another structure

depending on the Resource Type.

---

# Bible Chapter Candidate

The interpreter should not manufacture a fully trusted `Chapter`.

The decoded value remains untrusted Domain content.

A candidate only needs Resource-Type-specific route context plus the decoded value.

Conceptually:

```ts
interface BibleChapterCandidate {
    version: string;
    chapterRef: string;
    value: unknown;
}
```

Example:

```ts
{
    version: "kjvs",
    chapterRef: "1_1",
    value: {
        number: 1,
        bookName: "Genesis",
        ...
    }
}
```

The candidate does not need:

```text
id
publisher
eventId
modifiedAt
```

Those remain on the outer Resource operation until installation.

---

# Individual Chapter Interpretation

Input:

```text
Resource Type:
    kjvonly/bible/chapters

Resource Path:
    kjvs/1_1

Decoded value:
    Genesis 1 object
```

Interpreter behavior:

```text
validate route structure
        ↓
version = kjvs
chapterRef = 1_1
        ↓
yield one BibleChapterCandidate
```

The interpreter does not validate the Chapter schema.

---

# Bundle Interpretation

Input:

```text
Resource Type:
    kjvonly/bible/chapters

Resource Path:
    kjvs

Decoded value:
    {
        "kjvs/1_1": {...},
        "kjvs/1_2": {...},
        ...
    }
```

Interpreter behavior:

```text
validate route structure
        ↓
enumerate decoded map
        ↓
for each entry:
    derive version/chapter route
    yield BibleChapterCandidate
```

After interpretation, downstream stages no longer need to know whether the candidate came from:

* an individual Resource,
* a bundle,
* Blossom,
* an archive,
* or inline Nostr content.

---

# Granularity Disappears After Interpretation

This is a core design objective.

Before interpretation:

```text
Individual Resource
Bundle Resource
```

After interpretation:

```text
BibleChapterCandidate
BibleChapterCandidate
BibleChapterCandidate
...
```

Everything downstream operates on candidates.

```text
Individual Resource ─┐
                     ├─→ Candidate(s) → Validation → Installation
Bundle Resource ─────┘
```

No bundle-specific validator or installer should be required.

---

# Domain Validation

Interpretation answers:

> What Domain concept is this decoded value intended to represent?

Validation answers:

> Does this candidate actually satisfy the Domain model?

For Bible Chapters, validation may check:

* value is an object,
* `number` is valid,
* `bookName` is valid,
* `verses` is valid,
* `verseMap` is valid,
* `footnotes` is valid,
* verse structures are valid,
* word structures are valid,
* candidate route agrees with candidate content where required,
* and other Bible invariants.

Only validation earns a trusted Domain-specific type.

```text
BibleChapterCandidate
        ↓
BibleChapterValidator
        ↓
ValidatedChapterContent
```

---

# Validated Chapter Content

Conceptually:

```ts
interface ValidatedChapterContent {
    number: number;
    bookName: string;
    verses: Record<string, Verse>;
    verseMap: Record<string, string>;
    footnotes: Record<string, string>;
}
```

It still does not require the local Chapter `id`.

That identity is created during installation.

---

# Resource-Type Pipeline

After generic Resource content decoding, each Resource Type has a repeatable pipeline:

```text
Interpreter
        ↓
Validator
        ↓
Installation Policy
        ↓
Domain Installer
        ↓
Installation Metadata
```

Examples:

```text
BibleChapterInterpreter
        ↓
BibleChapterValidator
        ↓
ChapterInstallationPolicy
        ↓
ChapterInstaller
```

Later:

```text
BibleStrongsInterpreter
        ↓
BibleStrongsValidator
        ↓
StrongsInstallationPolicy
        ↓
StrongsInstaller
```

Later:

```text
ReadingPlanInterpreter
        ↓
ReadingPlanValidator
        ↓
ReadingPlanInstallationPolicy
        ↓
ReadingPlanInstaller
```

The composition shape is repeatable even though Domain semantics differ.

---

# Generic Pipeline Coordinator

A generic coordinator may eventually compose these stages.

Conceptually:

```ts
ResourceTypePipeline<
    TCandidate,
    TValidated
>
```

with dependencies resembling:

```text
ResourceInterpreter<TCandidate>

ResourceValidator<
    TCandidate,
    TValidated
>

ResourceInstallationPolicy<TValidated>

ResourceInstaller<TValidated>
```

The exact interfaces are intentionally not fixed yet.

The goal is explicit, repeatable composition rather than one large switch-based service or service locator.

---

# Resource Type Selection

The Resource Type selects the pipeline.

Example:

```text
kjvonly/bible/chapters
    → Bible Chapter pipeline

kjvonly/bible/strongs
    → Strong's pipeline

kjvonly/plans/readings
    → Reading Plan pipeline
```

A registry/selector may be introduced when multiple concrete pipelines exist.

The first pipeline should not require a large generic framework before a second use case proves what needs to generalize.

---

# Batch Validation Before Installation

Interpretation may produce many candidates.

For a bundle:

```text
1 Resource
    → many Chapter candidates
```

The intended semantics are:

```text
interpret candidates
        ↓
validate all candidates
        ↓
prepare installation decisions
        ↓
apply accepted changes atomically
```

A malformed bundle must not leave a partially installed replacement state.

The implementation may stream or batch internally, but externally the Resource installation must preserve the required atomicity.

---

# Installation Input

Installation is the stage where Resource provenance and validated Domain content meet.

```text
Resource Source Context
    publisher
    resourceId
    eventId
    modifiedAt

        +

Validated Candidate

        ↓

Installation
```

Before installation, candidates do not need to duplicate Resource provenance.

---

# Installation Decision

The installer must determine whether each candidate should replace the current installed object.

Conceptually:

```text
incoming Resource modifiedAt
        +
installed object's current source modifiedAt
        ↓
Installation Policy
```

Baseline behavior:

```text
no installed object
    → install

incoming modifiedAt > installed source modifiedAt
    → replace

incoming modifiedAt <= installed source modifiedAt
    → keep existing object
```

A Domain-specific policy may add further rules later.

Replacement policy must not be buried inside Resource Resolution or content decoding.

---

# Per-Object Replacement

Replacement is evaluated per Domain Object.

Example:

```text
incoming bundle modifiedAt = 200
```

Current local objects:

```text
Genesis 1
    source modifiedAt = 300

Exodus 1
    source modifiedAt = 100
```

Results:

```text
Genesis 1
    200 < 300
    → keep existing

Exodus 1
    200 > 100
    → replace
```

A locally installed Bible may therefore contain Chapters whose current provenance points to different Resource publications.

That is valid.

---

# Why Resource-Level Installed Status Is Insufficient

A record such as:

```text
kjvonly/bible/chapters/kjvs
    installed = true
```

cannot answer:

> Which Resource publication currently produced Genesis 1?

Genesis 1 may still come from a newer individual Resource.

Therefore replacement decisions require provenance at the installed Domain Object level.

---

# Installed Object Provenance

Persistent metadata must record the current Resource source for each installed Domain Object.

Conceptually:

```text
InstalledObjectSource

object:
    domain store/type
    object id

source:
    publisher
    resourceId
    eventId
    modifiedAt
```

Example:

```text
object:
    store = chapters
    id = publisherA/kjvs/1_1

source:
    publisher = publisherA
    resourceId =
        kjvonly/bible/chapters/kjvs/1_1
    eventId = AAA
    modifiedAt = 100
```

Later bundle installation may update the same metadata record:

```text
source:
    publisher = publisherA
    resourceId =
        kjvonly/bible/chapters/kjvs
    eventId = BBB
    modifiedAt = 200
```

---

# ResourceInstallationStore

A future generic metadata store should track installed-object Resource provenance.

Working name:

```text
ResourceInstallationStore
```

This is preferred over `ResourceStore` because the store does not contain Resource payload content.

Its responsibility is local installation metadata.

The final schema is intentionally deferred.

---

# Minimum Information Requirement

Regardless of physical schema, the application must be able to answer:

> For this installed Domain Object, what Resource publication currently produced it?

Minimum information:

```text
Domain Object Reference
    store/type
    objectId

Current Resource Source
    publisher
    resourceId
    eventId
    modifiedAt
```

Possible later metadata:

* installedAt,
* Resource kind,
* media type,
* content hash,
* representation,
* status,
* diagnostics,
* processing counts,
* and other bookkeeping.

Those are not required yet.

---

# Provenance Record Identity

A useful conceptual key is:

```text
store/type + objectId
```

Example:

```text
chapters:publisherA/kjvs/1_1
```

When another Resource wins replacement, the provenance record is upserted.

There is no required sequence of:

```text
delete old provenance
        ↓
temporary gap
        ↓
insert new provenance
```

The current-source record is simply replaced atomically.

---

# Secondary Resource Lookup

The installation metadata store may later expose indexes such as:

```text
publisher
resourceId
eventId
```

This would allow both:

```text
Domain Object
    → current Resource source
```

and:

```text
Resource
    → installed objects currently sourced from it
```

The physical IndexedDB schema is not fixed by this specification.

---

# Resource-Level Installation Metadata

A Resource-level record may also become useful for questions such as:

* Was this Resource processed?
* When was it last processed?
* Did validation fail?
* How many objects were accepted?
* How many were skipped because local state was newer?

However, Resource-level metadata must not replace per-object provenance.

---

# Meaning of Bundle Installation

A bundle can be processed successfully even when some candidates are not applied because newer local objects already exist.

Example:

```text
bundle processed successfully

Genesis 1
    skipped because existing source newer

Exodus 1
    replaced

Leviticus 1
    inserted
```

Therefore a future Resource-level state should not imply:

> Every current object is sourced from this bundle.

Possible terminology may include:

```text
processedAt
appliedCount
skippedCount
```

rather than a single simplistic `installed` boolean.

Exact fields are deferred.

---

# BibleVersion Store

The BibleVersion Store remains a Bible Domain concern.

It answers:

> Which Bible collection does this Chapter belong to?

Conceptually:

```ts
interface BibleVersion {
    id: string;
    publisher: string;
    version: string;
}
```

Example:

```text
id:
    publisherA/kjvs

publisher:
    publisherA

version:
    kjvs
```

Possible future fields:

* display name,
* language,
* description,
* model/schema version,
* Resource path prefix,
* and other Bible metadata.

---

# BibleVersion Store vs ResourceInstallationStore

The stores answer different questions.

```text
BibleVersion Store
    What Bible collection/version exists locally?

Chapter Store
    What Chapter content is installed?

ResourceInstallationStore
    Which Resource publication currently produced
    each installed Chapter?
```

Keeping them separate prevents Resource metadata from contaminating Domain objects.

---

# Installation Creates Domain Identity

The interpreter should not create the final Chapter `id`.

The validator should not create the final Chapter `id`.

Installation has the required identity context:

```text
publisher
version
chapterRef
```

Therefore installation creates:

```text
BibleVersionId =
    <publisher>/<version>
```

and:

```text
ChapterId =
    <BibleVersionId>/<chapterRef>
```

This is the correct stage because the ID is local Domain Store identity.

---

# Atomic Installation

Domain Object persistence and Resource provenance persistence must remain consistent.

The application must never expose:

```text
new Chapter
+
old Resource provenance
```

or:

```text
old Chapter
+
new Resource provenance
```

Accepted changes must therefore be atomic across:

* Domain Store writes,
* Resource installation/provenance writes,
* and related BibleVersion metadata updates that belong to the same installation operation.

---

# IndexedDB Transaction Strategy

If these stores live in one IndexedDB database, installation should use one transaction spanning the required object stores.

Conceptually:

```text
BEGIN TRANSACTION

read installed object provenance

compare modifiedAt

if incoming wins:
    write/update Domain Object
    upsert ResourceInstallation metadata
    ensure required Domain metadata exists

COMMIT
```

If the transaction aborts:

```text
none of the changes become visible
```

If it commits:

```text
all accepted changes become visible together
```

---

# Write-Ahead Log

A custom write-ahead log is not required merely to coordinate normal IndexedDB writes when IndexedDB transactions already provide the needed atomicity.

A WAL should only be introduced if a later requirement cannot be satisfied by the persistence mechanism.

Do not duplicate transaction guarantees preemptively.

---

# Installation as Decorator-Like Composition

The Resource-Type pipeline has a decorator-like composition style:

```text
interpret
    ↓
validate
    ↓
decide
    ↓
install
    ↓
track provenance
```

These stages should not be forced into the same interface as Resource Content Decorators.

Their semantics differ:

```text
content decoding
    one → one

interpretation
    one → zero/many

validation
    candidate → valid candidate or reject

installation
    validated candidates → local mutation
```

The composition pattern may be repeated without collapsing distinct contracts.

---

# Installation Tracking Decorator

Resource provenance tracking is cross-cutting and may later be implemented using a Decorator-style installer.

Conceptually:

```text
ResourceTrackingInstaller
        ↓ wraps
DomainInstaller
```

Its responsibility may include:

```text
install accepted Domain Objects
        +
update ResourceInstallationStore
```

Any such decorator must participate in the same installation transaction as the wrapped Domain installer.

Otherwise this invalid state becomes possible:

```text
Domain Object committed
Resource provenance update failed
```

Transaction ownership must therefore be explicit.

---

# Installation Context

A future pipeline may require shared installation context.

Conceptually:

```ts
interface InstallationContext {
    resource: ResourceSourceContext;
    transaction: InstallationTransaction;
}
```

This is not yet a required API.

Its purpose would be to let:

* Domain installation,
* Resource provenance tracking,
* Domain metadata updates,
* and future installation decorators

participate in one atomic operation.

---

# Batch Installation Semantics

Individual Resource:

```text
1 Resource
    → 1 candidate
    → validate
    → installation transaction
```

Bundle Resource:

```text
1 Resource
    → N candidates
    → validate N
    → determine N decisions
    → coordinated installation transaction
```

No separate bundle-specific installer is required.

---

# Failure Before Installation

If:

* interpretation fails,
* candidate validation fails,
* bundle structure is invalid,
* or another pre-installation requirement fails,

current installed state remains unchanged.

No partially interpreted Resource becomes authoritative.

---

# Failure During Installation

If the atomic installation transaction fails:

```text
previous installed Domain state remains authoritative
```

The application must not expose partially committed Resource results.

Failure metadata may later be recorded separately, but it must not replace the last valid installed state.

---

# Archive Installation

Archive import must not create a separate Domain installation pipeline.

An archive should recover enough normalized Resource context to produce:

```text
VerifiedResourceContent
```

including:

```text
publisher
resourceId
eventId
modifiedAt
mediaType
content
```

Then:

```text
archive
    ↓
VerifiedResourceContent
    ↓
same content decoder
    ↓
same interpreter
    ↓
same validator
    ↓
same installer
```

Archive import time must not automatically replace original Resource ordering.

Original Resource provenance should be preserved where the archive contains it.

---

# Blossom Installation

Blossom behaves the same after Resolution.

```text
descriptor
    ↓
Blossom fetch
    ↓
verify content
    ↓
VerifiedResourceContent
    ↓
same content decorators
    ↓
same Resource-Type pipeline
```

There should be no Blossom-specific Domain installer.

---

# Inline Nostr Installation

Inline event content also enters the same pipeline:

```text
Nostr event.content
    ↓
ContentRepresentationResolver
    ↓
VerifiedResourceContent
    ↓
content decorators
    ↓
Resource-Type pipeline
```

There should be no inline-Nostr-specific Domain installer.

---

# Canonical Media Type

Published JSON Resources should use canonical MIME naming:

```text
application/json
```

not:

```text
json
```

For current compressed/hex Bible Resources:

```text
application/json+gzip+hex
```

Encoding:

```text
Domain value
    ↓ JSON
JSON bytes/text
    ↓ gzip
compressed bytes
    ↓ hex
hex string
```

Decoding:

```text
hex string
    ↓ hex decode
gzip bytes
    ↓ gzip decompress
JSON bytes
    ↓ JSON parse
decoded value
```

This remains generic Resource content behavior before Resource-Type interpretation.

---

# Content Decorator Reuse

The same decorator chain must work for:

* individual Chapters,
* Bible bundles,
* Blossom payloads,
* archive payloads,
* Strong's data,
* Reading Plans,
* and future Resource Types.

Example:

```text
application/json+gzip+hex

Hex(
    Gzip(
        Json(
            Base
        )
    )
)
```

The content layer does not know what the decoded JSON means.

---

# Example: Individual Genesis 1

Resource:

```text
publisher:
    publisherA

resourceId:
    kjvonly/bible/chapters/kjvs/1_1

modifiedAt:
    100

mediaType:
    application/json+gzip+hex
```

Decoded value:

```json
{
    "number": 1,
    "bookName": "Genesis",
    "verses": {},
    "verseMap": {},
    "footnotes": {}
}
```

Interpreter:

```text
version = kjvs
chapterRef = 1_1

yield one candidate
```

Validation:

```text
candidate
    → ValidatedChapterContent
```

Installation:

```text
BibleVersionId =
    publisherA/kjvs

ChapterId =
    publisherA/kjvs/1_1
```

Provenance:

```text
object:
    chapters
    publisherA/kjvs/1_1

source:
    publisherA
    kjvonly/bible/chapters/kjvs/1_1
    event AAA
    modifiedAt 100
```

---

# Example: Later KJVS Bundle

Resource:

```text
publisher:
    publisherA

resourceId:
    kjvonly/bible/chapters/kjvs

modifiedAt:
    200
```

Decoded value:

```json
{
    "kjvs/1_1": {
        "number": 1,
        "bookName": "Genesis"
    },

    "kjvs/1_2": {
        "number": 2,
        "bookName": "Genesis"
    }
}
```

Interpreter yields:

```text
kjvs / 1_1
kjvs / 1_2
...
```

For Genesis 1:

```text
incoming modifiedAt = 200
installed source modifiedAt = 100

→ replace
```

The Chapter retains the same local ID:

```text
publisherA/kjvs/1_1
```

Its current provenance changes to:

```text
resourceId:
    kjvonly/bible/chapters/kjvs

modifiedAt:
    200
```

---

# Example: Newer Individual Chapter Wins

Installed Genesis 1:

```text
source:
    kjvonly/bible/chapters/kjvs/1_1

modifiedAt:
    300
```

Incoming bundle:

```text
resourceId:
    kjvonly/bible/chapters/kjvs

modifiedAt:
    200
```

Decision:

```text
200 <= 300
```

Result:

```text
keep installed Genesis 1
```

Other bundle candidates may still be accepted if their current sources are older.

---

# Repeatable Resource-Type Organization

A standard conceptual organization is encouraged:

```text
domains/
    bible/
        resources/
            chapters/
                chapter-interpreter
                chapter-validator
                chapter-installation-policy
                chapter-installer

            strongs/
                strongs-interpreter
                strongs-validator
                strongs-installation-policy
                strongs-installer
```

Exact directories are not fixed.

The important property is the repeated conceptual stages.

---

# Composition Root

The Application Composition Root should create and wire:

```text
Generic Resource Services
    ResourceClient
    ResourceDiscovery
    ResourceResolver
    ResourceContentDecoder

Resource-Type Pipelines
    Bible Chapter pipeline
    Strong's pipeline
    Reading Plan pipeline
    ...

Installation Infrastructure
    Domain Stores
    ResourceInstallationStore
    transaction mechanism
```

Dependencies are pushed downward.

Pipelines should not locate global services dynamically.

---

# Potential Pipeline Registry

When multiple Resource-Type pipelines exist, the application may introduce:

```text
resourceType
    ↓
ResourceTypePipeline
```

Conceptually:

```ts
interface ResourceTypePipeline {
    readonly resourceType: string;

    process(
        resource: DecodedResourceContent
    ): Promise<unknown>;
}
```

The exact contract should be designed after multiple pipelines prove the shared requirements.

Do not build a complex framework solely for the first Bible Chapter implementation.

---

# Installation Tracking Is Cross-Cutting

Resource provenance tracking is shared by all Resource Types.

It should not be separately reimplemented in:

```text
ChapterInstaller
StrongsInstaller
ReadingPlanInstaller
```

Instead, provenance tracking should be composed around or beneath Domain installation through reusable installation infrastructure.

The exact Decorator/coordinator design belongs to the installation implementation phase.

---

# Domain Installers Remain Domain-Owned

The actual Domain write remains Domain-owned.

Examples:

```text
ChapterInstaller
    knows Chapter identity and Chapter Store semantics

StrongsInstaller
    knows Strong's identity and Strong's Store semantics
```

Generic Resource infrastructure must not know every Domain's persistence schema.

---

# Installation Policy Ownership

A simple `modifiedAt` comparison is expected to be broadly reusable.

However, the policy must remain composable because a future Domain may require additional rules.

Conceptually:

```text
Default:
    newer modifiedAt wins

Domain:
    may add additional acceptance rules
```

Do not place replacement policy in Resolution or content decoding.

---

# Local Authority

The application renders from installed Domain Stores.

Resource installation metadata supports:

* provenance,
* replacement decisions,
* diagnostics,
* and Resource relationships.

It is supporting metadata, not application-facing Domain content.

```text
Application
    ↓
Domain Service
    ↓
Domain Store
    ↓
Installed Domain Object
```

---

# Raw Resource Payload Retention

Installed Resource payloads do not need to be retained as duplicate raw blobs after they have produced accepted Domain Objects unless a later feature explicitly requires that.

Prefer:

```text
Domain Objects
+
Resource provenance metadata
```

over:

```text
Domain Objects
+
duplicate raw bundle
+
duplicate individual payloads
```

This keeps persistence focused on application-ready state.

---

# Future Resource Schema Evolution

A newer `modifiedAt` may represent a Resource schema/model change rather than a textual change.

For example, a Bible Chapter schema may gain:

```text
new Chapter field
new Verse field
new Word metadata
```

A newer Resource publication can reinstall the corresponding Domain Objects using the newer model.

This is why `modifiedAt` is Resource-generic.

---

# Future Root Collection Resource

The route:

```text
kjvonly/bible/chapters
```

may later represent the Bible versions available from a publisher.

Conceptually:

```text
publisher:
    publisherA

resource:
    kjvonly/bible/chapters

content:
    kjv
    kjvs
    ...
```

That Resource may eventually produce BibleVersion candidates rather than Chapter candidates.

The exact design is deferred.

The route namespace is reserved.

---

# Deferred Implementation Decisions

The following details are intentionally unresolved:

* exact TypeScript names for interpreter/validator/installer interfaces,
* whether interpreter output is `Iterable`, array, generator, or another collection,
* exact `ResourceTypePipeline` generics,
* exact ResourceInstallationStore schema,
* exact IndexedDB object-store names,
* exact indexes,
* exact BibleVersion model,
* exact string encoding of local IDs,
* exact transaction wrapper API,
* exact Resource-level processing status,
* exact error hierarchy,
* exact pipeline registry mechanism,
* cancellation and progress reporting for large bundles,
* and whether Resource-level processing metadata lives in the same or a separate store from per-object provenance.

These should be settled when implementation requirements make them concrete.

---

# Stable Implementation Constraints

The following points should be treated as constraints unless implementation reveals a genuine conflict.

1. Resource providers converge on `VerifiedResourceContent`.

2. Resource source does not affect downstream Domain installation logic.

3. Resource content decoding remains generic across Resource Types.

4. Canonical JSON media type is `application/json`.

5. `modifiedAt` travels from Resource publication context through installation.

6. The first three Resource Identifier segments define Resource Type.

7. Remaining Resource Identifier segments form a Resource-Type-specific route.

8. Generic Resource infrastructure does not own a bundle flag.

9. Bible Chapter routes distinguish a version bundle from an individual Chapter by path shape.

10. Bundle content may remain a keyed object/map.

11. A Resource Type interpreter may produce zero, one, or many candidates.

12. Granularity disappears after interpretation.

13. Validation occurs after interpretation and before installation.

14. Domain Object ID is created during installation when local identity context is available.

15. Chapter Domain Objects remain free of Resource provenance metadata.

16. Different publishers using the same version name remain independently addressable locally.

17. Individual Chapter Resources are valid partial installations for low-latency access.

18. Bundle installation may replace individually installed Chapters when the incoming Resource is newer.

19. Replacement is evaluated per installed Domain Object.

20. Per-object current Resource provenance must be persisted.

21. Resource-level installation status alone is insufficient.

22. Resource installation provenance is generic cross-cutting application metadata.

23. Domain Object writes and provenance writes must be atomic.

24. IndexedDB transactions should be preferred before inventing a custom WAL.

25. ResourceInstallationStore stores metadata, not raw Resource payloads.

26. Resource installation tracking should be reusable across Resource Types.

27. Domain installers remain Domain-owned.

28. The Resource-Type pipeline should be explicitly composed from reusable stages rather than implemented as one large service.

---

# Reference Flow

The intended architecture is:

```text
Nostr / Blossom / Archive / Future Provider
        ↓
Resource Resolution
        ↓
VerifiedResourceContent
    publisher
    resourceId
    eventId
    modifiedAt
    mediaType
    serialized content
        ↓
Resource Content Decorators
        ↓
DecodedResourceContent
        ↓
Resource-Type Pipeline
        ↓
Interpreter
    one Resource
        → zero/many candidates
        ↓
Validator
    candidate
        → validated candidate
        ↓
Installation Policy
    incoming modifiedAt
        vs
    installed source modifiedAt
        ↓
Domain Installer
        ↓
Domain Store
        +
ResourceInstallationStore
        ↓
Authoritative Local Domain State
```

For Bible Chapters:

```text
kjvonly/bible/chapters/kjvs/1_1
    → one candidate

kjvonly/bible/chapters/kjvs
    → many candidates

both
    ↓
same validator
    ↓
same installation policy
    ↓
same Chapter installer
    ↓
same provenance tracking
```

---

# Big Takeaway

Resource installation is a normalized pipeline.

The location and representation of serialized content are resolved first.

The generic content layer removes encoding and serialization concerns.

The Resource Type then interprets the decoded value into zero or more Domain candidates.

Candidates are validated before they may affect local state.

Installation creates local Domain identity, compares the incoming Resource's `modifiedAt` against the currently installed object's Resource provenance, and writes accepted Domain state together with updated provenance atomically.

Individual and bundled Resources are not separate installation architectures.

They are different Resource paths and granularities that converge on the same Domain candidate pipeline.

The intended design is:

```text
source-independent
representation-independent
granularity-independent after interpretation
Domain-owned at interpretation/validation/install
generic for Resource provenance and orchestration
atomic at local persistence
```

This document should be used as the implementation reference for the upcoming Resource-Type interpreter, validation, and installation work.
