# 007 — Resource Interpretation, Validation, and Atomic Installation

## Status

Current implementation specification.

This document records the implementation completed for the inbound Resource lifecycle from decoded Resource content through Bible Chapter installation. It describes the current target design and the concrete TypeScript boundaries introduced during implementation.

The architecture ADRs remain authoritative. This document does not redefine Resource Architecture decisions. It explains how those decisions are being realized in the current application.

---

# Purpose

The purpose of this implementation slice is to establish a clean, testable path from:

```text
Decoded Resource Content
        ↓
Resource-Type Interpretation
        ↓
Candidate Domain Objects
        ↓
Domain Validation
        ↓
Installation Decision
        ↓
Atomic Domain Persistence
        ↓
Resource Installation Provenance
```

The first implemented Resource Type is:

```text
kjvonly/bible/chapters
```

This slice supports both individual Chapter Resources and Bible-version Chapter bundles without making the application dependent on whether the Resource content originally came from inline Nostr event content, Blossom, an archive, or another future Resource Representation provider.

After Resource Resolution and content decoding, the downstream installation path operates on application Resource models rather than transport-specific objects.

---

# Scope

This document covers:

* generic Resource Identifier parsing,
* generic Resource interpretation contracts,
* Bible Chapter Resource interpretation,
* Bible Chapter candidate models,
* generic Resource validation contracts,
* Bible Chapter Domain validation,
* Bible Version identity,
* Chapter identity,
* Resource Installation provenance,
* Domain Store contracts,
* installation transaction contracts,
* atomic multi-store IndexedDB transaction support,
* the Bible Chapter installation transaction adapter,
* Bible Chapter installation policy,
* per-object `modifiedAt` replacement decisions,
* bundle atomicity,
* and the current automated test coverage.

This document does not yet cover:

* automatic discovery roots,
* startup orchestration of installation,
* Resource Type registries,
* generic Resource Type pipelines,
* Paragraph installation,
* Pericope installation,
* Strong's installation,
* Reading Plan installation,
* archive installation,
* publication,
* Outbox behavior,
* user-data synchronization,
* or migration/removal of the legacy sync worker.

Those concerns will be implemented after the first complete Bible Chapter installation slice is proven.

---

# Architectural Context

The inbound Resource lifecycle is:

```text
Nostr / External Content
        ↓
Resource Representation
        ↓
Resource Resolution
        ↓
Verified Resource Content
        ↓
Resource Content Decoding
        ↓
Decoded Resource Content
        ↓
Resource-Type Interpretation
        ↓
Candidate Domain Object
        ↓
Domain Validation
        ↓
Installation Decision
        ↓
Accepted Local Domain Object
        ↓
Persistence
```

The current implementation now reaches through the installation and persistence boundary for Bible Chapters.

The implementation continues to preserve the following distinctions:

```text
Discovery
    ≠ Resolution

Resolution
    ≠ Content Decoding

Content Decoding
    ≠ Domain Interpretation

Domain Interpretation
    ≠ Domain Validation

Domain Validation
    ≠ Installation

Installation
    ≠ Persistence
```

The network proposes state. The application decides whether that state becomes authoritative local Domain state.

---

# Resource Models

The generic decoded Resource model is:

```ts
export interface DecodedResourceContent {
    readonly publisher: string;
    readonly resourceId: string;
    readonly resourceType: string;
    readonly eventId: string;
    readonly modifiedAt: number;
    readonly mediaType: string;
    readonly value: unknown;
}
```

Important properties are preserved all the way through installation:

```text
publisher
resourceId
resourceType
eventId
modifiedAt
```

The decoded `value` is the only field transformed into Resource-Type-specific candidate objects. The Resource metadata remains available for installation provenance and replacement decisions.

---

# Resource Identifier Convention

A Resource Identifier is divided into two conceptual parts:

```text
<namespace>/<domain>/<resource-type>/<resource-type-specific-path...>
```

The first three path segments define the generic Resource Type. Everything after those first three segments is owned by the Resource Type.

Example:

```text
kjvonly/bible/chapters/kjvs/1_1
└──────────────────────┘ └────────┘
      Resource Type         Path
```

The generic Resource layer does not interpret `kjvs` or `1_1` as Bible-specific concepts. It only exposes them as Resource-Type-specific path segments.

---

# Resource Identifier Utility

Current source:

```text
src/lib/resource/utils/resource-identifier.ts
```

The utility exposes:

```ts
export interface ResourceIdentifier {
    readonly resourceType: string;
    readonly path: readonly string[];
}
```

and:

```ts
export function parseResourceIdentifier(
    resourceId: string
): ResourceIdentifier;
```

Convenience functions are also provided:

```ts
export function extractResourceType(
    resourceId: string
): string;

export function extractResourcePath(
    resourceId: string
): readonly string[];
```

For:

```text
kjvonly/bible/chapters/kjvs/1_1
```

the result is:

```ts
{
    resourceType: 'kjvonly/bible/chapters',
    path: [
        'kjvs',
        '1_1'
    ]
}
```

For the Resource Type root:

```text
kjvonly/bible/chapters
```

the result is:

```ts
{
    resourceType: 'kjvonly/bible/chapters',
    path: []
}
```

The generic helper rejects malformed identifiers containing fewer than three segments or empty path segments.

---

# Resource Event Integration

The Nostr Resource event mapper previously contained a private `extractResourceType()` helper. That generic responsibility now belongs to:

```text
src/lib/resource/utils/resource-identifier.ts
```

The Resource event layer imports the generic helper instead of defining Resource Identifier structure itself.

This keeps Nostr event mapping focused on:

* validating Resource event kind,
* extracting Resource tags,
* validating Resource classification,
* validating representation,
* mapping event metadata,
* and creating `ResourceRepresentation`.

It no longer owns generic Resource Identifier parsing.

---

# Generic Resource Interpreter

Current source:

```text
src/lib/resource/interpretation/resource-interpreter.ts
```

Contract:

```ts
import type {
    DecodedResourceContent
} from '$lib/resource/models/resource.model';

export interface ResourceInterpreter<
    TCandidate
> {
    readonly resourceType:
        string;

    interpret(
        resource:
            DecodedResourceContent
    ): Iterable<TCandidate>;
}
```

The interpreter is deliberately synchronous. Interpretation operates on already-decoded local Resource content. Network retrieval, external content fetching, decompression, and media decoding occur before this boundary.

The return type is `Iterable<TCandidate>` because one Resource may produce zero, one, or many candidates. This allows individual Resources and bundles to converge on the same downstream candidate model.

---

# Bible Chapter Resource Type

The Bible Chapter Resource Type is:

```text
kjvonly/bible/chapters
```

The currently supported Resource paths are:

```text
kjvonly/bible/chapters/{version}
kjvonly/bible/chapters/{version}/{chapterRef}
```

Examples:

```text
kjvonly/bible/chapters/kjvs
kjvonly/bible/chapters/kjvs/1_1
```

The Resource Type root:

```text
kjvonly/bible/chapters
```

is reserved for future semantics but is not currently accepted by the Chapter interpreter.

---

# Bible Chapter Candidate

Current source:

```text
src/lib/domains/bible/resources/chapters/bible-chapter-candidate.ts
```

Model:

```ts
export interface BibleChapterCandidate {
    readonly version:
        string;

    readonly chapterRef:
        string;

    readonly value:
        unknown;
}
```

The candidate is intentionally untrusted. It does not contain a local Domain ID, publisher, event ID, `modifiedAt`, persistence information, or Resource Installation metadata.

Those values remain on the outer `DecodedResourceContent`. The candidate only contains the Resource-Type interpretation necessary to validate a possible Chapter.

---

# Bible Chapter Interpreter

Current source:

```text
src/lib/domains/bible/resources/chapters/bible-chapter-interpreter.ts
```

The interpreter implements:

```ts
ResourceInterpreter<BibleChapterCandidate>
```

and declares:

```ts
export const BIBLE_CHAPTER_RESOURCE_TYPE =
    'kjvonly/bible/chapters';
```

The interpreter validates Resource structure. It does not validate Chapter schema.

## Individual Chapter Interpretation

For:

```text
resourceId:
    kjvonly/bible/chapters/kjvs/1_1
```

the Resource path is:

```text
[
    "kjvs",
    "1_1"
]
```

The interpreter emits one candidate:

```ts
{
    version: 'kjvs',
    chapterRef: '1_1',
    value: resource.value
}
```

The actual Chapter content remains `unknown`.

## Bundle Interpretation

For:

```text
resourceId:
    kjvonly/bible/chapters/kjvs
```

the decoded content is expected to be an object map.

Example:

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

The interpreter enumerates `Object.entries(value)` and produces the same candidate shape used for individual Resources.

The bundle is not converted into a different serialized representation. The interpreter merely enumerates its logical entries.

## Bundle Structural Validation

The Bible Chapter interpreter currently enforces:

* the Resource Type must be `kjvonly/bible/chapters`,
* individual paths must contain exactly two Resource-Type-specific segments,
* bundle paths must contain exactly one Resource-Type-specific segment,
* bundle content must be a non-array object,
* bundle entry keys must have exactly two segments,
* entry version must be present,
* Chapter reference must be present,
* and the bundle entry version must match the Resource route version.

Example:

```text
Resource:
    kjvonly/bible/chapters/kjvs

Bundle entry:
    kjv/1_1
```

is rejected.

The mismatch is considered malformed Resource structure. It is not a Chapter Domain schema error.

## Interpretation Does Not Perform Domain Validation

This is intentionally valid at the interpretation stage:

```json
{
    "kjvs/1_1": "not-a-chapter"
}
```

The interpreter can still produce:

```ts
{
    version: 'kjvs',
    chapterRef: '1_1',
    value: 'not-a-chapter'
}
```

The next lifecycle stage decides whether that value is actually valid Chapter content.

---

# Generic Resource Validator

Current source:

```text
src/lib/resource/validation/resource-validator.ts
```

Contract:

```ts
export interface ResourceValidator<
    TCandidate,
    TValidated
> {
    validate(
        candidate:
            TCandidate
    ): TValidated;
}
```

Validation is synchronous. At this stage the application already has decoded local values. Validation does not perform network access or persistence.

---

# Chapter Content Model

The current Domain Chapter model includes:

```ts
export interface Chapter {
    id: string;
    number: number;
    bookName: string;
    verses: {
        [verseNumber: string]: Verse;
    };
    verseMap: {
        [verseNumber: string]: string;
    };
    footnotes: {
        [key: string]: string;
    };
}
```

A validated Chapter Resource does not yet have local persistence identity.

Therefore the Bible Domain distinguishes:

```ts
export type ChapterContent =
    Omit<
        Chapter,
        'id'
    >;
```

Conceptually:

```text
ChapterContent
    valid Bible Chapter data
    no local persistence identity

Chapter
    installed Domain Object
    ChapterContent + id
```

The local Chapter ID is created during installation.

---

# Validated Bible Chapter Candidate

Current source:

```text
src/lib/domains/bible/resources/chapters/validated-bible-chapter-candidate.ts
```

Model:

```ts
export interface ValidatedBibleChapterCandidate {
    readonly version:
        string;

    readonly chapterRef:
        string;

    readonly content:
        ChapterContent;
}
```

The trust boundary is visible in the type system:

```text
before validation:
    value: unknown

after validation:
    content: ChapterContent
```

---

# Bible Chapter Validator

Current source:

```text
src/lib/domains/bible/resources/chapters/bible-chapter-validator.ts
```

The implementation uses Zod for structural validation.

The Chapter schema validates:

```text
number
bookName
verses
verseMap
footnotes
```

The nested Verse schema validates:

```text
number
words
text
```

The nested Word schema validates:

```text
text
class
href
emphasis
```

Word `class` and `href` may be `string[]` or `null`.

The validator does not currently perform exhaustive Bible metadata validation such as canonical verse counts or book-name lookup.

## Chapter Reference Validation

The validator verifies the Resource-derived Chapter reference.

Expected shape:

```text
<bookId>_<chapterNumber>
```

Example:

```text
1_1
43_3
```

The Chapter number encoded in the Resource path must match `content.number`.

Example:

```text
chapterRef:
    1_2

content.number:
    1
```

is rejected.

## Verse Consistency Validation

Each verse map key must:

* represent a positive integer,
* use canonical decimal formatting,
* and match the nested Verse `number`.

Example:

```json
{
    "verses": {
        "1": {
            "number": 2
        }
    }
}
```

is rejected.

Likewise `"01"` is rejected as a non-canonical verse key.

The validator does not yet require `verses`, `verseMap`, and `footnotes` to have identical key sets. Only invariants currently needed by the Domain are enforced.

## Unknown Serialized Fields

The current validator behavior strips unsupported object fields from validated Chapter content through the Zod object schema.

A test currently covers legacy/extra serialized data such as `blockElements`. The Chapter Domain does not currently own that field. Paragraph and Pericope data remain separate concerns and will be handled by their own Resource Types and validators.

---

# Domain Identity

Publisher identity is part of local Bible identity.

Two publishers may both publish:

```text
kjv
kjvs
```

Therefore local Domain IDs cannot use only the version name.

## Bible Version Identity

Current source:

```text
src/lib/domains/bible/utils/bible-identity.ts
```

Helper:

```ts
export function createBibleVersionId(
    publisher: string,
    version: string
): string {
    return `${publisher}/${version}`;
}
```

Conceptually:

```text
BibleVersionId =
    <publisher>/<version>
```

Example:

```text
abc123/kjvs
```

## Chapter Identity

Helper:

```ts
export function createChapterId(
    publisher: string,
    version: string,
    chapterRef: string
): string {
    return `${createBibleVersionId(
        publisher,
        version
    )}/${chapterRef}`;
}
```

Conceptually:

```text
ChapterId =
    <publisher>/<version>/<chapterRef>
```

Example:

```text
abc123/kjvs/1_1
```

The Chapter ID is a local Domain identity. It is not Resource provenance. It is created during installation.

---

# Bible Version Model

Current source:

```text
src/lib/domains/bible/models/bible-version.model.ts
```

Model:

```ts
export interface BibleVersion {
    readonly id:
        string;

    readonly publisher:
        string;

    readonly version:
        string;
}
```

The old installation code stored only `{ id: version }`. The new model preserves publisher-scoped identity explicitly.

Future Bible Version metadata may be added without changing Chapter identity semantics.

---

# Domain Store Contracts

The new installation path does not directly call generic IndexedDB methods from Domain installation logic. Small persistence contracts define what the Domain needs.

## ChapterStore

Current source:

```text
src/lib/domains/bible/persistence/chapter-store.ts
```

Contract:

```ts
export interface ChapterStore {
    get(
        id: string
    ): Promise<
        Chapter |
        undefined
    >;

    put(
        chapter:
            Chapter
    ): Promise<void>;
}
```

The contract does not expose IndexedDB store names, transactions, key paths, Nostr, bundles, or Resource representations.

## BibleVersionStore

Current source:

```text
src/lib/domains/bible/persistence/bible-version-store.ts
```

Contract:

```ts
export interface BibleVersionStore {
    get(
        id: string
    ): Promise<
        BibleVersion |
        undefined
    >;

    put(
        bibleVersion:
            BibleVersion
    ): Promise<void>;
}
```

Only current installation requirements are represented. Additional operations such as `getAll`, `delete`, or `findByPublisher` will be added only when real use cases require them.

---

# Resource Installation Provenance

Installing a Resource must preserve enough information to answer:

```text
Which Published Resource currently supplied this Domain Object?
```

A Resource-level installed flag is insufficient because:

* one Resource may install many Domain Objects,
* individual Resources and bundles may overlap,
* some bundle candidates may be newer than current state,
* some may be older,
* and per-object replacement decisions are required.

Therefore installation provenance is tracked per installed Domain Object.

---

# ResourceInstallation Model

Current source:

```text
src/lib/resource/installation/resource-installation.ts
```

Model:

```ts
export interface ResourceInstallation {
    readonly id:
        string;

    readonly objectType:
        string;

    readonly objectId:
        string;

    readonly publisher:
        string;

    readonly resourceId:
        string;

    readonly eventId:
        string;

    readonly modifiedAt:
        number;
}
```

Meaning:

```text
objectType + objectId
    identify the installed local Domain Object

publisher + resourceId + eventId + modifiedAt
    identify the Published Resource state that supplied it
```

## Resource Installation Identity

Helper:

```ts
export function createResourceInstallationId(
    objectType: string,
    objectId: string
): string {
    return `${objectType}:${objectId}`;
}
```

Example:

```text
objectType:
    bible/chapter

objectId:
    publisher/kjvs/1_1

id:
    bible/chapter:publisher/kjvs/1_1
```

The generated `id` is primarily the persistence key. The meaningful logical identity remains `objectType + objectId`.

---

# ResourceInstallationStore

Current source:

```text
src/lib/resource/installation/resource-installation-store.ts
```

Contract:

```ts
export interface ResourceInstallationStore {
    get(
        objectType: string,
        objectId: string
    ): Promise<
        ResourceInstallation |
        undefined
    >;

    put(
        installation:
            ResourceInstallation
    ): Promise<void>;
}
```

The store contract uses logical identity. Persistence adapters own construction of the physical storage key.

---

# Installation Replacement Policy

Current Bible Chapter policy uses Resource `modifiedAt`.

Baseline decision:

```text
no existing installation
    → install

incoming.modifiedAt
    >
existing.modifiedAt
    → replace

incoming.modifiedAt
    <=
existing.modifiedAt
    → keep existing
```

This decision is made per installed Domain Object.

## Mixed Bundle Replacement

A bundle does not replace every Chapter merely because the bundle is newer than some local state.

Example:

```text
incoming bundle modifiedAt:
    200

Genesis 1 installed:
    300
    → keep existing

Genesis 2 installed:
    100
    → replace

Exodus 1:
    missing
    → install
```

The result is valid. A successful bundle installation may intentionally skip individual entries whose installed provenance is newer or equal.

Skipping is an installation decision. It is not an installation failure.

---

# Atomic Installation Unit

The atomic installation unit is:

```text
one decoded and validated Resource
```

not:

```text
one Domain Object
```

Therefore:

```text
individual Chapter Resource
    → one candidate
    → one transaction

Chapter bundle Resource
    → many candidates
    → one transaction
```

This is a central implementation rule.

---

# Validation Before Persistence

A full Resource is interpreted and validated before opening the persistence transaction.

Conceptually:

```text
DecodedResourceContent
        ↓
Interpreter
        ↓
Candidate[]
        ↓
validate all candidates
        ↓
ValidatedCandidate[]
        ↓
BEGIN TRANSACTION
```

If Chapter 847 in a bundle is invalid:

```text
1     valid
2     valid
...
846   valid
847   invalid
```

installation stops before any IndexedDB transaction is opened. Nothing from that Resource becomes local Domain state.

---

# Why the Transaction Does Not Begin Earlier

The transaction is intentionally not opened during:

* Resource Resolution,
* descriptor fetching,
* Blossom downloading,
* gzip decompression,
* hex decoding,
* JSON parsing,
* interpretation,
* or Domain schema validation.

IndexedDB transactions have an active lifecycle. A transaction may auto-commit when no IndexedDB requests remain pending and control is yielded to unrelated asynchronous work.

Therefore the transaction callback should only perform:

```text
IndexedDB reads
synchronous installation decisions
IndexedDB writes
```

Awaiting requests issued through the active IndexedDB transaction is expected.

Awaiting unrelated work such as `fetch()`, network requests, compression, decoding, or schema loading inside the transaction callback is not allowed by the installation design.

---

# Installation Transaction Contract

Current source:

```text
src/lib/resource/installation/installation-transaction.ts
```

Contract:

```ts
export interface InstallationTransaction<
    TStores
> {
    run<TResult>(
        operation:
            (
                stores: TStores
            ) => Promise<TResult>
    ): Promise<TResult>;
}
```

The contract expresses:

```text
open transaction
    ↓
provide transaction-scoped stores
    ↓
run installation operation
    ↓
commit on success
rollback on failure
```

It does not expose IndexedDB types to higher layers.

---

# Bible Chapter Installation Stores

Current source:

```text
src/lib/domains/bible/resources/chapters/bible-chapter-installation-stores.ts
```

Contract:

```ts
export interface BibleChapterInstallationStores {
    readonly chapters:
        ChapterStore;

    readonly bibleVersions:
        BibleVersionStore;

    readonly resourceInstallations:
        ResourceInstallationStore;
}
```

Type alias:

```ts
export type BibleChapterInstallationTransaction =
    InstallationTransaction<
        BibleChapterInstallationStores
    >;
```

These stores represent the entire atomic write set for a Bible Chapter Resource.

---

# Physical IndexedDB Stores

The current physical database already contains Bible and application stores.

The new installation slice adds:

```text
resource_installations
```

The Bible DB version is bumped so the missing store is created during IndexedDB upgrade.

The relevant installation stores are now:

```text
chapters
bible_versions
resource_installations
```

All three exist in the same physical IndexedDB database. This allows one IndexedDB transaction to span the entire Chapter installation operation.

---

# Generic IndexedDB Transaction Support

Current source:

```text
src/lib/infrastructure/persistence/idb.db.ts
```

A transaction-scoped infrastructure interface was introduced:

```ts
export interface IndexedDBTransaction {
    getValue(
        tableName: string,
        id: string
    ): Promise<any>;

    putValue(
        tableName: string,
        value: object
    ): Promise<any>;
}
```

Only operations needed by the current installation path are exposed.

## runReadWriteTransaction

The base IndexedDB adapter now exposes:

```ts
public async runReadWriteTransaction<TResult>(
    tableNames: string[],
    operation:
        (
            transaction:
                IndexedDBTransaction
        ) => Promise<TResult>
): Promise<TResult>
```

The method:

1. requires the database to be open,
2. opens one `readwrite` transaction over all requested stores,
3. provides transaction-scoped `getValue()` and `putValue()` helpers,
4. runs the callback,
5. waits for `tx.done`,
6. returns the callback result only after commit,
7. aborts the transaction if the callback throws,
8. preserves the original error.

This is the infrastructure primitive that establishes true bundle atomicity.

---

# Atomicity Guarantee

For a bundle:

```text
BEGIN

write Chapter 1
write provenance 1

write Chapter 2
write provenance 2

write Chapter 3
write provenance 3

...

COMMIT
```

If any operation fails:

```text
BEGIN

Chapter 1     written
provenance 1  written
Chapter 2     written

Chapter 3 write throws

ABORT
```

none of those changes become committed persistent state.

The Resource installation either completes or does not happen.

---

# Replacement of Legacy Completeness Checks

The legacy sync worker installed bundle entries through independent writes. Completeness therefore could not be inferred from transaction success.

The new transaction design makes application-level row-count checks unnecessary for installation atomicity.

The database itself establishes:

```text
transaction committed
    → installation completed

transaction aborted / application terminated
    → installation did not commit
```

If the browser closes midway through an uncommitted bundle transaction, partial writes do not become accepted local state. The Resource may be processed again later.

---

# Browser Transaction Test

A real browser-level test verifies `runReadWriteTransaction()` against actual browser IndexedDB behavior.

The test uses the project's existing:

```text
Vitest Browser Mode
Playwright
Chromium
```

rather than mocking IndexedDB.

The browser test proves:

* writes to multiple stores commit together,
* writes to multiple stores roll back when the callback throws,
* transaction-scoped reads can observe writes made earlier in the same transaction,
* and the method returns its callback result after commit.

This test establishes the infrastructure atomicity guarantee used by all higher installation layers.

---

# Bible Chapter Installation Transaction Adapter

Current source:

```text
src/lib/domains/bible/persistence/bible-chapter-installation-transaction.ts
```

Implementation:

```text
IndexedDBBibleChapterInstallationTransaction
```

implements:

```text
BibleChapterInstallationTransaction
```

The adapter opens one physical transaction over:

```text
chapters
bible_versions
resource_installations
```

Inside that transaction it exposes:

```text
ChapterStore
BibleVersionStore
ResourceInstallationStore
```

All three contracts delegate to the same underlying `IndexedDBTransaction`.

## Transaction-Scoped Store Adapters

The current implementation defines the transaction-scoped store adapters inline.

Conceptually:

```text
IDBTransaction
    ├── ChapterStore
    ├── BibleVersionStore
    └── ResourceInstallationStore
```

This avoids introducing unnecessary concrete classes before another use case proves they are useful.

`ResourceInstallationStore.get()` accepts `objectType + objectId`. The IndexedDB adapter converts that logical identity into the generated persistence key with `createResourceInstallationId()`.

---

# Bible Chapter Installer

Current source:

```text
src/lib/domains/bible/resources/chapters/bible-chapter-installer.ts
```

The installer receives:

```ts
DecodedResourceContent
```

plus:

```ts
readonly ValidatedBibleChapterCandidate[]
```

The decoded Resource supplies provenance. The validated candidate array supplies trusted Domain content.

## Bible Chapter Object Type

The current logical Resource Installation object type is:

```ts
export const BIBLE_CHAPTER_OBJECT_TYPE =
    'bible/chapter';
```

This is deliberately not the physical IndexedDB store name. Logical installation identity should not depend on storage-engine naming.

## Installer Preconditions

The installer returns immediately for an empty candidate array. No transaction is opened.

All candidates in a single Resource must belong to the same Bible version. If mixed versions are supplied, the installer throws before opening the transaction.

The interpreter should already prevent this during normal execution. The installer check protects its own invariant.

## Bible Version Installation

For a non-empty candidate collection, the installer derives:

```text
BibleVersionId =
    publisher/version
```

It checks the transaction-scoped `BibleVersionStore`.

If the Bible Version does not exist:

```ts
{
    id: bibleVersionId,
    publisher: resource.publisher,
    version
}
```

is inserted.

If the Bible Version already exists, the installer does not overwrite it. This avoids accidentally replacing richer Bible Version metadata that may be added in the future.

## Per-Chapter Installation Decision

For each validated candidate the installer creates:

```text
ChapterId =
    publisher/version/chapterRef
```

It then reads:

```text
ResourceInstallation(
    objectType = bible/chapter,
    objectId = ChapterId
)
```

If no provenance exists, install.

If incoming Resource `modifiedAt` is newer, install.

If incoming Resource `modifiedAt` is equal or older, skip.

The Chapter Store itself is not used as the version comparison source. The provenance record is authoritative for replacement decisions.

## Creating the Installed Chapter

When a candidate is accepted:

```ts
const chapter: Chapter = {
    ...candidate.content,
    id: chapterId
};
```

The local identity is added only at installation.

This preserves the distinction:

```text
serialized Chapter content
    ≠
installed Chapter Domain identity
```

## Creating Resource Installation Provenance

For each accepted Chapter:

```ts
{
    id:
        createResourceInstallationId(
            BIBLE_CHAPTER_OBJECT_TYPE,
            chapterId
        ),

    objectType:
        BIBLE_CHAPTER_OBJECT_TYPE,

    objectId:
        chapterId,

    publisher:
        resource.publisher,

    resourceId:
        resource.resourceId,

    eventId:
        resource.eventId,

    modifiedAt:
        resource.modifiedAt
}
```

is written in the same transaction as the Chapter.

This guarantees Chapter state and Chapter provenance cannot diverge because of an interrupted installation.

---

# Bundle Installation Algorithm

Conceptually:

```text
validatedCandidates[]
        ↓
verify one Bible version
        ↓
BEGIN TRANSACTION
        ↓
ensure BibleVersion
        ↓
for each candidate:
    derive ChapterId
        ↓
    load installed provenance
        ↓
    compare modifiedAt
        ↓
    if incoming wins:
        write Chapter
        write provenance
    else:
        skip
        ↓
COMMIT
```

The entire candidate set participates in one transaction.

---

# Important Bundle Semantics

Atomicity and per-object replacement are separate rules.

Atomicity means:

```text
all accepted writes from this Resource commit together
```

Per-object replacement means:

```text
some candidates may intentionally produce no write
```

Therefore this is valid:

```text
bundle modifiedAt = 200

Chapter A local modifiedAt = 300
    skip

Chapter B local modifiedAt = 100
    replace

Chapter C missing
    install

transaction commits
```

The bundle has been processed successfully even though not every entry overwrote local state.

---

# Legacy Sync Worker Comparison

The legacy sync worker currently performs Chapter bundle installation roughly as:

```text
download gzip
    ↓
decompress
    ↓
JSON.parse
    ↓
Object.entries
    ↓
assign key to chapter.id
    ↓
independent IndexedDB writes
    ↓
record Bible version
```

Useful semantics preserved by the new design include:

* bundle expansion,
* local Domain object creation,
* persistent Chapters,
* and installed Bible Version tracking.

Responsibilities removed from the installer include:

* downloading,
* gzip handling,
* JSON decoding,
* Resource path interpretation,
* schema validation,
* and transport details.

The new design also replaces independent writes with a single atomic Resource installation transaction.

---

# User Data Persistence Is Separate

The legacy `offline.nostr.ts` code combines local user-data persistence, gzip/hex encoding, Nostr publication, synced/unsynced stores, and offline fallback.

That flow belongs to the outbound/local-first synchronization path. It should not be reused as the inbound Published Resource installer.

Conceptually the two directions are:

```text
Published Resource
    ↓
resolve
    ↓
decode
    ↓
interpret
    ↓
validate
    ↓
install
    ↓
Domain Store
```

and:

```text
Application edits Domain Object
    ↓
persist locally
    ↓
Outbox
    ↓
publish Resource
```

The two paths meet around Domain state. They do not need one combined persistence service.

---

# Current Source Layout

The implementation added or refined the following source files:

```text
src/lib/

    resource/

        utils/
            resource-identifier.ts
            resource-identifier.spec.ts

        interpretation/
            resource-interpreter.ts

        validation/
            resource-validator.ts

        installation/
            resource-installation.ts
            resource-installation.spec.ts
            resource-installation-store.ts
            installation-transaction.ts

        models/
            resource.model.ts

        nostr/
            resource-event.ts
            resource-event.spec.ts

    domains/

        bible/

            models/
                bible.model.ts
                bible-version.model.ts

            utils/
                bible-identity.ts
                bible-identity.spec.ts

            persistence/
                chapter-store.ts
                bible-version-store.ts
                bible.db.ts
                bible-chapter-installation-transaction.ts
                bible-chapter-installation-transaction.spec.ts

            resources/

                chapters/
                    bible-chapter-candidate.ts
                    bible-chapter-interpreter.ts
                    bible-chapter-interpreter.spec.ts
                    validated-bible-chapter-candidate.ts
                    bible-chapter-validator.ts
                    bible-chapter-validator.spec.ts
                    bible-chapter-installation-stores.ts
                    bible-chapter-installer.ts
                    bible-chapter-installer.spec.ts

    infrastructure/

        persistence/
            idb.db.ts

tests/

    browser/
        idb.db.spec.ts
```

---

# Current Test Coverage

## Resource Identifier

Tests prove:

* Resource Type extraction,
* Resource path extraction,
* empty root path support,
* preservation of additional Resource-Type-specific segments,
* rejection of identifiers with fewer than three segments,
* rejection of empty Resource Type segments,
* rejection of empty Resource path segments.

## Bible Chapter Interpreter

Tests prove:

* individual Resource → one candidate,
* bundle Resource → many candidates,
* candidate values remain unvalidated,
* wrong Resource Type is rejected,
* Resource Type root is rejected,
* paths with too many segments are rejected,
* non-object bundle content is rejected,
* arrays are rejected as bundle content,
* malformed bundle entry keys are rejected,
* bundle entry keys with too many segments are rejected,
* bundle version mismatches are rejected.

## Bible Chapter Validator

Tests prove:

* valid Chapter content is accepted,
* candidate version and Chapter reference are preserved,
* non-object content is rejected,
* Chapter number is required,
* non-empty book name is required,
* malformed Chapter references are rejected,
* Chapter reference number must match content number,
* invalid verse keys are rejected,
* verse key must match nested verse number,
* invalid Word content is rejected,
* nullable Word `class` is accepted,
* nullable Word `href` is accepted,
* unsupported serialized fields are not retained as Chapter Domain content.

## Resource Installation Identity

Tests prove:

* stable installation IDs,
* different object types produce distinct IDs,
* different Domain objects produce distinct IDs,
* publisher-scoped Domain object IDs produce distinct installation IDs.

## Bible Domain Identity

Tests prove:

* publisher-scoped Bible Version IDs,
* different publishers produce different Bible Version IDs,
* different Bible versions produce different IDs,
* publisher-scoped Chapter IDs,
* Chapter IDs derive from Bible Version identity,
* different Chapters produce different IDs,
* different publishers produce different Chapter IDs,
* different Bible versions produce different Chapter IDs.

## IndexedDB Transaction Infrastructure

Real browser tests prove:

* multi-store commit,
* multi-store rollback on callback failure,
* transaction-scoped read-after-write,
* callback result propagation after commit.

This is the authoritative atomicity test.

## Bible Chapter Installation Transaction Adapter

Unit tests prove:

* required physical object stores are included,
* transaction-scoped `ChapterStore` behavior,
* transaction-scoped `BibleVersionStore` behavior,
* transaction-scoped `ResourceInstallationStore` behavior,
* correct Resource Installation key creation,
* callback result propagation.

The adapter tests do not re-prove IndexedDB rollback. That behavior is already covered by the browser infrastructure test.

## Bible Chapter Installer

Tests prove:

* new Chapter installation,
* Bible Version creation,
* existing Bible Version preservation,
* Resource Installation provenance creation,
* newer Resource replacement,
* older Resource skip,
* equal `modifiedAt` skip,
* mixed bundle install/skip behavior,
* one transaction per Resource,
* empty candidate collection avoids transaction creation,
* mixed-version candidates are rejected before transaction creation.

---

# Current Invariants

The following rules are now implemented or directly represented by tests.

## Resource Identity

```text
Resource Type =
    first three Resource Identifier segments
```

## Resource Path

```text
Resource path =
    everything after the Resource Type
```

## Bible Version Identity

```text
publisher + version
```

## Chapter Identity

```text
publisher + version + chapterRef
```

## Resource Installation Identity

```text
objectType + objectId
```

## Installation Replacement

```text
newer modifiedAt wins
older or equal modifiedAt does not replace
```

## Bundle Atomicity

```text
one Resource
    =
one installation transaction
```

## Candidate Validation

```text
all candidates validated
before persistence begins
```

## Provenance Atomicity

```text
Domain Object write
+
Resource Installation provenance write
=
same transaction
```

## Transport Independence

```text
installation does not know
whether content came from
Nostr inline content,
Blossom,
archive,
or another provider
```

---

# Design Decisions Intentionally Deferred

The implementation deliberately does not yet introduce:

```text
ResourceTypePipeline
ResourceTypeRegistry
InstallerRegistry
generic Domain installer framework
generic Repository framework
generic UnitOfWork framework
```

The current abstractions exist because concrete behavior now requires them.

Further generalization should wait until additional Resource Types demonstrate genuinely shared behavior.

---

# Potential Future Resource Type Pipeline

Once another Resource Type is implemented, the current concrete flow may justify a composition abstraction such as:

```text
Interpreter
    ↓
Validator
    ↓
Installation Policy
    ↓
Installer
```

A future generic Resource Type pipeline could coordinate:

```text
DecodedResourceContent
        ↓
interpret
        ↓
materialize candidates
        ↓
validate all
        ↓
open installation transaction
        ↓
install candidates
```

This abstraction should not be introduced merely because the architecture contains named stages. It should be introduced only after the next Resource Type shows that the orchestration is actually shared.

---

# Error Semantics

The current design relies mostly on normal thrown errors.

Important failure categories include:

```text
invalid Resource Identifier
invalid Resource Type
invalid Resource path
malformed bundle structure
Domain schema validation failure
Domain consistency failure
persistence failure
transaction failure
```

A giant custom error hierarchy is not currently required.

Errors should preserve enough context to identify the failed Resource operation.

---

# Performance Considerations

A Bible-version bundle may contain a large number of Chapters.

Current installation behavior performs per-candidate provenance reads and accepted writes within one transaction.

This is acceptable for the first correct implementation. Potential optimization should be driven by measurement.

Examples that may later be considered include:

* bulk provenance reads,
* bulk Chapter writes,
* indexed provenance lookup,
* transaction-local caching,
* or specialized store adapters.

None of those should weaken the atomic Resource installation guarantee.

---

# Concurrency Semantics

The physical IndexedDB `readwrite` transaction scopes:

```text
chapters
bible_versions
resource_installations
```

for the duration of one Resource installation.

Concurrent operations touching the same scoped stores are coordinated by IndexedDB.

The application should still avoid placing unrelated asynchronous work inside the transaction. The transaction exists to protect local accepted-state persistence. It is not a lock around network or Resource processing work.

---

# Application Shutdown During Installation

If the browser or application terminates during an active bundle installation before the IndexedDB transaction commits:

```text
partial accepted state must not remain committed
```

On a future application session the Resource may simply be processed again.

No application-level write-ahead log is currently required.

No row-count recovery mechanism is required to determine whether the bundle installation completed.

IndexedDB transaction atomicity provides the required persistence guarantee.

---

# Installation and Local Authority

A successfully decoded and validated Resource is still not authoritative local state.

Authority changes only when the installation policy accepts the candidate and the transaction commits.

Therefore:

```text
resolved
    ≠ installed

decoded
    ≠ installed

valid
    ≠ installed

new Resource event
    ≠ automatic replacement
```

The installation decision remains explicit.

---

# Relationship Between Domain Object and Provenance

An installed Chapter answers:

```text
What Chapter does the application use?
```

The Resource Installation record answers:

```text
Which Published Resource state supplied this Chapter?
```

These are separate models with separate responsibilities.

The Chapter Domain Object should not accumulate transport-specific fields such as:

```text
eventId
resourceId
Nostr kind
representation
relay
Blossom URL
```

Resource provenance stays in the Resource installation layer.

---

# Relationship Between Bible Version and Resource Installation

`BibleVersion` identifies an installed publisher/version combination.

It does not replace per-Chapter Resource provenance.

A Bible version may legally contain Chapters whose current accepted states came from different Resources.

Example:

```text
BibleVersion:
    publisher/kjvs

Genesis 1 provenance:
    individual Resource @ 300

Genesis 2 provenance:
    bundle Resource @ 200

Exodus 1 provenance:
    bundle Resource @ 200
```

This is expected.

---

# Relationship Between Bundle and Domain Collection

A Chapter bundle is a Resource publication granularity.

It does not become a permanent bundle Domain Object.

After interpretation:

```text
bundle vs individual Resource
```

disappears from Chapter candidate shape.

After installation the application simply has:

```text
BibleVersion
Chapters
Resource provenance
```

The application does not need to preserve the original bundle as a Chapter Domain concept.

---

# Current Migration Direction

The old runtime path still exists while the new Resource path is being implemented.

The intended migration is:

```text
legacy sync worker
    downloads and installs static data

        ↓ gradually replaced by

Resource Discovery
    ↓
Resource Resolution
    ↓
Content Decoding
    ↓
Resource Interpretation
    ↓
Domain Validation
    ↓
Atomic Installation
```

The old implementation remains useful as evidence for existing application behavior. It should not dictate the ownership boundaries of the new implementation.

---

# Next Implementation Step

The current Bible Chapter installer is now implemented and unit tested.

The next useful step is to compose the pieces into one end-to-end Bible Chapter Resource handler.

Conceptually:

```text
DecodedResourceContent
        ↓
BibleChapterInterpreter
        ↓
BibleChapterCandidate[]
        ↓
BibleChapterValidator
        ↓
ValidatedBibleChapterCandidate[]
        ↓
BibleChapterInstaller
        ↓
IndexedDB
```

This orchestration should first be implemented concretely for Bible Chapters.

Only after that should the implementation consider whether a reusable generic Resource Type pipeline has clearly emerged.

---

# Expected First Complete Slice

The first complete application-facing Resource installation proof should be:

```text
discover Bible Chapter Resource
        ↓
resolve Resource
        ↓
decode application/json+gzip+hex
        ↓
interpret Chapter Resource
        ↓
validate all Chapter candidates
        ↓
install atomically
        ↓
read Chapter from Domain Store
        ↓
application receives Chapter Domain Object
```

That slice will establish the concrete model for later Resource Types.

---

# Summary

The current implementation has moved Bible Chapter installation from a legacy transport-and-storage routine into a layered Resource lifecycle.

The important result is not merely that Chapters can be written to IndexedDB.

The implementation now establishes explicit boundaries for:

```text
Resource Identifier structure
Resource-Type interpretation
Domain validation
Domain identity
installation policy
provenance
persistence
transaction atomicity
```

The core installation rule is:

> One resolved and validated Resource is one atomic installation unit.

For a Chapter bundle, every accepted Chapter write and its Resource provenance participate in the same IndexedDB transaction.

Individual candidates may still be skipped when their currently installed provenance is newer or equal.

Thus bundle atomicity and per-object replacement policy work together without conflict.

The implementation no longer needs to infer whether a bundle finished installing by examining row counts. IndexedDB transaction commit is the installation completion boundary.

The resulting system is:

* transport-independent after Resource Resolution,
* explicit about Domain trust boundaries,
* publisher-aware,
* provenance-aware,
* atomic across bundle installation,
* testable without live Nostr for core behavior,
* and ready for the first complete end-to-end Bible Resource installation slice.
