# KJVOnly.bible Resource Architecture — 24-Hour Implementation Spec

**Period covered:** August 26–27, 2026  
**Status:** Implementation record / handoff specification  
**Scope:** Resource content decoding, Bible Chapter interpretation/validation/installation, IndexedDB atomicity, end-to-end relay installation, application read-path integration, service composition, relay authentication restoration, and gzip stream regression work.

---

# Purpose

This document records the implementation work completed during the last approximately 24 hours on the KJVOnly.bible Resource Architecture.

The goal of the work was to move from a mostly-composed Resource stack to a complete, concrete Bible Chapter vertical slice that can:

1. discover a Published Resource,
2. resolve its representation,
3. decode its serialized content,
4. interpret Bible Chapter Resource routes,
5. validate Domain content,
6. install Chapters atomically with provenance,
7. read installed Chapters through Domain-facing services,
8. acquire a missing Chapter through the Resource pipeline,
9. authenticate to the relay with the application signer,
10. and expose the resulting Chapter to the application without using the legacy `chapters.nostr.ts` cache/fetch path.

The implementation intentionally remains concrete for Bible Chapters. No generic Resource-Type registry, generic installer framework, repository framework, or Unit of Work abstraction was introduced.

---

# Architectural Constraints Preserved

The work continued to preserve the established architecture:

```text
Published Resource
    ↓
Resource Discovery
    ↓
Resource Resolution
    ↓
VerifiedResourceContent
    ↓
Resource Content Decoding
    ↓
DecodedResourceContent
    ↓
Resource-Type Interpretation
    ↓
Candidate Domain Content
    ↓
Domain Validation
    ↓
Validated Candidate
    ↓
Installation
    ↓
Domain Store
    ↓
Application
```

The following separations remain explicit:

```text
Discovery
    ≠ Resolution

Resolution
    ≠ Content Decoding

Content Decoding
    ≠ Domain Interpretation

Domain Interpretation
    ≠ Domain Validation

Validation
    ≠ Installation

Installation
    ≠ Persistence abstraction

Domain Object
    ≠ Resource

Resource
    ≠ Nostr Event

Published Resource Identity
    ≠ Event ID
```

The application continues to treat Nostr as a first-class transport rather than introducing an unnecessary generic REST/RPC transport abstraction.

---

# High-Level Result

The main result of the implementation period is a working Bible Chapter Resource path with this shape:

```text
Nostr Relay
    ↓
RxNostrResourceClient
    ↓
ResourceDiscovery
    ↓
ResourceResolver
    ↓
VerifiedResourceContent
    ↓
ResourceContentDecoder
    ↓
BibleChapterResourceService
    ↓
BibleChapterResourceHandler
    ↓
BibleChapterInterpreter
    ↓
BibleChapterValidator
    ↓
BibleChapterInstaller
    ↓
IndexedDB transaction
    ├── chapters
    ├── bible_versions
    └── resource_installations
```

The application read path was then connected to that installation path:

```text
Bible / Verse UI
    ↓
ChapterService
    ↓
ChapterStore
    ↓
local hit?
    ├── yes → return Chapter
    └── no
         ↓
       ChapterResourceLoader
         ↓
       BibleChapterResourceService.install(...)
         ↓
       Resource pipeline
         ↓
       ChapterStore reread
         ↓
       return installed Chapter
```

This replaces the old conceptual dependency:

```text
ChapterService
    ↓
chapters.nostr.ts
    ↓
offlineApi.cacheHitThenFetch(...)
```

for the migrated Chapter read path.

---

# 1. Resource Content Decorator Pipeline

The Resource content decorator model was completed far enough to support the actual Bible Resource media type.

The canonical transformation chain is:

```text
application/json+gzip+hex
```

Composition is:

```text
Hex(
    Gzip(
        Json(
            Base
        )
    )
)
```

Decode direction:

```text
hex string
    ↓
hex bytes
    ↓
gzip decompression
    ↓
JSON parsing
    ↓
unknown application value
```

Encode direction is the inverse:

```text
application value
    ↓
JSON serialization
    ↓
gzip compression
    ↓
hex encoding
```

The builder interprets media-type tokens in order and composes decorators rather than embedding special cases into `ResourceContentDecoder`.

## ResourceContentDecorator Contract

```ts
export interface ResourceContentDecorator {
    encode(
        value: unknown
    ): Promise<unknown>;

    decode(
        value: unknown
    ): Promise<unknown>;
}
```

## Registered Decorators

The Application Composition Root registers:

```text
application/json
gzip
hex
```

This lets `ResourceContentDecoder` stay generic.

---

# 2. Hex Resource Content Decorator

The Hex decorator was implemented and tested.

Behavior:

```text
encode
    Uint8Array
        ↓
    lowercase hexadecimal string

decode
    hexadecimal string
        ↓
    Uint8Array
```

Validation includes:

```text
input must be string on decode
hex length must be even
characters must be valid hexadecimal
```

The decorator does not know anything about Bible Chapters or Nostr events.

---

# 3. Gzip Resource Content Decorator

The Gzip decorator was implemented using browser-native:

```text
CompressionStream('gzip')
DecompressionStream('gzip')
```

Encoding accepts:

```text
string
or
Uint8Array
```

Strings are converted with `TextEncoder`.

Decoding accepts:

```text
Uint8Array
```

The decoded bytes are passed inward to the next decorator.

## Initial Implementation

The first implementation manually used:

```text
stream.writable.getWriter()
writer.write(...)
writer.close()
Response(stream.readable).arrayBuffer()
```

This passed small unit tests.

## Production Failure Discovered

The first real Chapter retrieval exposed a silent hang at:

```ts
await writer.write(
    toArrayBuffer(
        value
    )
);
```

No exception was thrown.

The operation simply never continued.

## Root Cause

The implementation was awaiting the writable side before beginning to consume the readable side.

Conceptually:

```text
writer.write(...)
    ↓
transform produces output
    ↓
readable-side backpressure builds
    ↓
write waits for readable consumption
    ↓
code waits for write before creating reader
    ↓
deadlock / permanently pending Promise
```

The small original tests did not produce enough data to reliably expose the backpressure condition.

## Attempted `pipeThrough()` Rewrite

A direct `ReadableStream<Uint8Array>.pipeThrough(new CompressionStream(...))` rewrite was attempted because it naturally consumes the transform concurrently.

TypeScript DOM typings then produced an incompatibility between:

```text
ReadableWritablePair<Uint8Array<...>, Uint8Array<...>>
```

and the `CompressionStream` writable type:

```text
WritableStream<BufferSource>
```

Rather than add casts around the DOM type mismatch, the implementation returned to the manual writer API while fixing the actual ordering problem.

## Final Stream Pattern

The corrected pattern is:

```ts
const resultPromise =
    new Response(
        stream.readable
    ).arrayBuffer();

const writer =
    stream.writable
        .getWriter();

await writer.write(
    toArrayBuffer(
        value
    )
);

await writer.close();

const buffer =
    await resultPromise;
```

The critical rule is:

> Begin consuming `stream.readable` before awaiting `writer.write()`.

This is used for both compression and decompression.

## ArrayBuffer Conversion

A copy into a real `ArrayBuffer` remains useful:

```ts
function toArrayBuffer(
    value: Uint8Array
): ArrayBuffer {
    const buffer =
        new ArrayBuffer(
            value.byteLength
        );

    new Uint8Array(
        buffer
    ).set(
        value
    );

    return buffer;
}
```

This avoids TypeScript / DOM compatibility issues around:

```text
ArrayBufferLike
SharedArrayBuffer
BufferSource
BlobPart
```

## Gzip Regression Tests

The gzip spec was expanded beyond tiny `"hello"` cases.

The new intended coverage includes:

```text
small string encode
small byte encode
gzip decode
small string round trip
small bytes round trip
unsupported encode input
non-byte decode input
invalid gzip bytes
large encode without stream backpressure deadlock
large decode without stream backpressure deadlock
```

The large tests deliberately use content much larger than the original fixtures.

They also cross-check the decorator with independent native stream helpers rather than only testing:

```text
decorator.encode()
    ↓
decorator.decode()
```

The intended cross-check is:

```text
decorator.encode()
    ↓
independent decompression helper
```

and:

```text
independent compression helper
    ↓
decorator.decode()
```

### Current Verification Status

The final writer/read ordering rewrite and expanded large-payload spec were produced at the end of the implementation period.

They should be treated as:

```text
implemented / ready to run
```

rather than as a user-confirmed final pass until the updated suite and real Chapter retrieval are rerun.

---

# 4. Generic Resource Model Refinement

The generic Resource content model now carries the metadata required for installation decisions.

Important types include:

```ts
export interface PublishedResourceReference {
    publisher: string;
    resourceId: string;
}
```

```ts
export interface VerifiedResourceContent {
    readonly publisher: string;
    readonly resourceId: string;
    readonly resourceType: string;
    readonly eventId: string;
    readonly modifiedAt: number;
    readonly mediaType: string;
    readonly content: SerializedResourceContent;
}
```

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

The generic ordering timestamp is:

```text
modifiedAt
```

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
installation comparison
```

`modifiedAt` means publication-state recency.

It does not necessarily mean a literal textual edit to a Domain Object.

---

# 5. Resource Identifier Utility

Generic Resource Identifier parsing was centralized.

Source:

```text
src/lib/resource/utils/resource-identifier.ts
```

Model:

```ts
export interface ResourceIdentifier {
    readonly resourceType: string;
    readonly path: readonly string[];
}
```

Parser:

```text
first 3 segments
    → Resource Type

remaining segments
    → Resource-Type-specific path
```

Example:

```text
kjvonly/bible/chapters/kjvs/1_1
```

becomes:

```ts
{
    resourceType:
        'kjvonly/bible/chapters',

    path: [
        'kjvs',
        '1_1'
    ]
}
```

The generic Resource layer does not interpret `kjvs` or `1_1`.

That interpretation belongs to the Bible Chapter Resource Type.

---

# 6. Bible Chapter Resource Routes

Bible Chapter Resource Type:

```text
kjvonly/bible/chapters
```

Supported routes:

```text
kjvonly/bible/chapters/{version}
kjvonly/bible/chapters/{version}/{chapterRef}
```

Examples:

```text
kjvonly/bible/chapters/kjvs
kjvonly/bible/chapters/kjvs/1_1
```

Meaning:

```text
/{version}
    → version-level bundle Resource

/{version}/{chapterRef}
    → individual Chapter Resource
```

The root:

```text
kjvonly/bible/chapters
```

remains reserved for future semantics.

No generic Resource flag such as:

```text
isBundle
isIndividual
```

was added.

Granularity is inferred by the owning Resource-Type interpreter.

---

# 7. ChapterContent

The serialized Chapter payload intentionally excludes local persistence identity.

Conceptually:

```ts
export type ChapterContent =
    Omit<
        Chapter,
        'id'
    >;
```

Serialized Resource content contains Chapter data such as:

```text
number
bookName
verses
verseMap
footnotes
```

It does not need:

```text
id
eventId
publisher
resourceId
modifiedAt
representation
relay
```

Local Chapter identity is created during installation.

---

# 8. Generic Resource Interpreter Contract

A generic interpreter contract was introduced:

```text
src/lib/resource/interpretation/resource-interpreter.ts
```

```ts
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

Interpretation is synchronous by design because it operates on already-decoded local content.

Network retrieval, decompression, hex decoding, and JSON parsing all occur before this boundary.

---

# 9. BibleChapterCandidate

The Chapter interpreter produces an intentionally untrusted candidate:

```ts
export interface BibleChapterCandidate {
    readonly version: string;
    readonly chapterRef: string;
    readonly value: unknown;
}
```

It does not contain:

```text
publisher
eventId
modifiedAt
local Chapter id
installation metadata
storage information
```

Those remain on the outer `DecodedResourceContent`.

---

# 10. BibleChapterInterpreter

The Bible Chapter interpreter was implemented for:

```text
resourceType =
    kjvonly/bible/chapters
```

## Individual Chapter Resource

For:

```text
kjvonly/bible/chapters/kjvs/1_1
```

it produces:

```ts
{
    version:
        'kjvs',

    chapterRef:
        '1_1',

    value:
        resource.value
}
```

## Bundle Resource

For:

```text
kjvonly/bible/chapters/kjvs
```

the decoded value is expected to be a keyed object map.

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

Each entry becomes the same `BibleChapterCandidate` shape used for an individual Chapter.

This means:

```text
bundle
vs
individual
```

disappears after interpretation.

## Interpreter Validation

The interpreter checks Resource structure, including:

```text
correct Resource Type
supported path length
bundle is object
bundle is not array
bundle key shape is version/chapterRef
bundle key version matches route version
```

It does not validate the Chapter schema.

---

# 11. Generic ResourceValidator Contract

A small generic validation boundary was introduced:

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

This keeps interpretation separate from Domain validity.

---

# 12. ValidatedBibleChapterCandidate

Validated Chapter content is represented as:

```ts
export interface ValidatedBibleChapterCandidate {
    readonly version: string;
    readonly chapterRef: string;
    readonly content: ChapterContent;
}
```

At this point:

```text
value: unknown
```

has become:

```text
content: ChapterContent
```

---

# 13. BibleChapterValidator

Bible Chapter Domain validation was implemented using Zod.

Validated structures include:

```text
Word
Verse
ChapterContent
```

Required Word semantics:

```text
text: string
class: string[] | null
href: string[] | null
emphasis: boolean
```

Required Verse semantics:

```text
number: positive integer
words: Word[]
text: string
```

Required ChapterContent semantics:

```text
number: positive integer
bookName: non-empty string
verses: record
verseMap: record<string, string>
footnotes: record<string, string>
```

Additional invariants:

```text
chapterRef matches /^(\d+)_(\d+)$/
chapter number in chapterRef matches content.number
verse keys are canonical positive integers
verse key matches nested verse.number
```

Unsupported serialized fields are not retained as trusted Chapter Domain content.

---

# 14. Publisher-Scoped Bible Identity

A bare Bible version string is not a complete local identity.

Different publishers may both publish:

```text
kjv
kjvs
```

Therefore:

```text
BibleVersionId =
    <publisher>/<version>
```

Examples:

```text
publisherA/kjvs
publisherB/kjvs
```

These are distinct installed Bible Versions.

---

# 15. Publisher-Scoped Chapter Identity

Chapter identity derives from Bible Version identity:

```text
ChapterId =
    <publisher>/<version>/<chapterRef>
```

Example:

```text
publisherA/kjvs/1_1
```

Helpers were introduced for BibleVersion and Chapter IDs.

This identity is created during installation and is not serialized inside the Resource payload.

---

# 16. BibleVersion Domain Model

The installed Bible Version model is:

```ts
export interface BibleVersion {
    readonly id: string;
    readonly publisher: string;
    readonly version: string;
}
```

The current UI still uses a bare version string such as:

```text
kjvs
```

That UI migration was explicitly deferred.

The storage model is already publisher-scoped.

---

# 17. ResourceInstallation Provenance Model

A generic provenance model was introduced:

```ts
export interface ResourceInstallation {
    readonly id: string;
    readonly objectType: string;
    readonly objectId: string;
    readonly publisher: string;
    readonly resourceId: string;
    readonly eventId: string;
    readonly modifiedAt: number;
}
```

Persistence identity is:

```text
objectType:objectId
```

Example:

```text
objectType =
    bible/chapter

objectId =
    publisher/kjvs/1_1

id =
    bible/chapter:publisher/kjvs/1_1
```

The generated string is only the persistence key.

---

# 18. Why Provenance Is Per Domain Object

A Resource bundle may install many Chapters.

Later an individual Chapter Resource may update one of those Chapters.

Therefore Resource-level installation state alone is insufficient.

Example:

```text
Genesis 1
    ← individual Resource @ modifiedAt 300

Genesis 2
    ← bundle Resource @ modifiedAt 200

Exodus 1
    ← bundle Resource @ modifiedAt 200
```

The application needs per-Chapter provenance to decide which incoming publication wins.

---

# 19. ResourceInstallationStore

Generic contract:

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

Baseline synchronization rule:

```text
no installed provenance
    → install

incoming.modifiedAt > current.modifiedAt
    → replace

incoming.modifiedAt <= current.modifiedAt
    → keep current
```

Skipping an older or equal Resource is a successful installation decision.

---

# 20. Domain Store Contracts

`ChapterStore` and `BibleVersionStore` were defined as Domain contracts and do not expose IndexedDB types.

The Chapter store exposes:

```text
get(id)
put(chapter)
```

The BibleVersion store exposes:

```text
get(id)
put(bibleVersion)
```

---

# 21. IndexedDB Schema Change

The Bible database was bumped and a generic provenance store was added:

```text
resource_installations
```

The Bible Chapter installation transaction writes across:

```text
chapters
bible_versions
resource_installations
```

---

# 22. Atomic Installation Unit

A central implementation rule was established:

> One decoded and validated Published Resource is one installation transaction.

Therefore:

```text
individual Chapter Resource
    → one candidate
    → one transaction
```

and:

```text
Chapter bundle Resource
    → many candidates
    → one transaction
```

The atomic unit is one Resource, not one Domain Object.

---

# 23. Validation Before Transaction

All Resource candidates are interpreted and validated before any IndexedDB installation transaction begins.

```text
DecodedResourceContent
    ↓
Interpreter
    ↓
Candidate[]
    ↓
validate all
    ↓
ValidatedCandidate[]
    ↓
BEGIN TRANSACTION
```

If one candidate in a bundle is invalid, no candidate from that Resource is installed.

---

# 24. Why Network / Decoding Work Is Outside IndexedDB Transactions

Transaction callbacks do not perform:

```text
relay requests
fetch()
descriptor retrieval
Blossom download
gzip compression/decompression
hex decoding
JSON parsing
schema loading
Resource interpretation
Domain schema validation
```

Transaction callbacks perform:

```text
IndexedDB reads
synchronous installation decisions
IndexedDB writes
```

This protects IndexedDB transaction lifetime and avoids accidental auto-commit.

---

# 25. Generic InstallationTransaction Contract

A generic transaction seam was introduced:

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

This hides IndexedDB mechanics from the Domain installer.

---

# 26. BibleChapterInstallationStores

The complete atomic store set for Chapter installation is:

```text
ChapterStore
BibleVersionStore
ResourceInstallationStore
```

All are supplied by one Bible Chapter installation transaction.

---

# 27. IndexedDB Transaction Infrastructure

`idb.db.ts` gained a transaction-scoped interface and:

```text
runReadWriteTransaction(...)
```

Behavior:

```text
open readwrite transaction
    ↓
provide scoped get/put adapter
    ↓
run callback
    ↓
await tx.done
    ↓
return callback result
```

On failure the transaction is aborted when possible and the original error is preserved.

---

# 28. Real Browser IndexedDB Tests

Real browser IndexedDB tests prove:

```text
multi-store writes commit together
multi-store writes roll back together
read-after-write works inside one transaction
callback results return after commit
```

This browser test is the authoritative atomicity proof.

---

# 29. Lazy BibleDB Provider

The Bible database remains lazily created:

```ts
getBibleDB(): Promise<BibleDB>
```

Persistence adapters receive:

```ts
() => Promise<BibleDB>
```

so the Composition Root does not become asynchronous only to obtain IndexedDB.

---

# 30. IndexedDBBibleChapterInstallationTransaction

A concrete adapter opens one physical transaction across:

```text
CHAPTERS
BIBLE_VERSIONS
RESOURCE_INSTALLATIONS
```

Inside that one transaction it exposes transaction-scoped:

```text
ChapterStore
BibleVersionStore
ResourceInstallationStore
```

All three operate on the same underlying IndexedDB transaction.

---

# 31. BibleChapterInstaller

The Domain installer was implemented.

Logical object type:

```text
bible/chapter
```

It receives:

```text
DecodedResourceContent
+
ValidatedBibleChapterCandidate[]
```

Installer rules:

```text
empty candidates
    → no transaction

mixed Bible versions
    → reject before transaction

missing BibleVersion
    → create publisher/version Domain Object

existing BibleVersion
    → preserve

missing provenance
    → install Chapter

incoming modifiedAt newer
    → replace Chapter

incoming modifiedAt equal or older
    → skip Chapter
```

Accepted content becomes:

```ts
const chapter: Chapter = {
    ...candidate.content,
    id: chapterId
};
```

The Chapter and ResourceInstallation provenance are written atomically.

---

# 32. BibleChapterResourceHandler

A concrete handler composes:

```text
DecodedResourceContent
    ↓
BibleChapterInterpreter
    ↓
materialize candidates
    ↓
BibleChapterValidator
    ↓
validate every candidate
    ↓
BibleChapterInstaller
```

No installation transaction begins until the entire Resource has been interpreted and all candidates validate.

No generic `ResourceTypePipeline` abstraction was introduced.

---

# 33. BibleChapterResourceService

A higher-level inbound Resource service was introduced.

Dependencies:

```text
ResourceDiscovery
ResourceResolver
ResourceContentDecoder
BibleChapterResourceHandler
```

Input:

```ts
PublishedResourceReference
```

Flow:

```text
reference
    ↓
ResourceDiscovery.get(...)
    ↓
missing?
    ├── yes → false
    └── no
         ↓
       ResourceResolver.resolve(...)
         ↓
       VerifiedResourceContent[]
         ↓
       for each content
           ↓
       decode
           ↓
       handle/install
```

Return semantics:

```text
false
    → Published Resource not discovered

true
    → Resource discovered and all resolved content processed

throw
    → processing failure
```

Resolved contents are processed sequentially.

---

# 34. Descriptor Transaction Boundary

A critical rule was clarified:

> Each descriptor is transactional independently.

For `representation = descriptors`:

```text
descriptor A
    → resolve
    → decode
    → handle
    → transaction A
    → commit

descriptor B
    → resolve
    → decode
    → handle
    → transaction B
```

There is no transaction spanning the entire descriptor collection.

If A commits and B later fails, A remains installed.

This differs from one Chapter bundle Resource, where many candidates still share one transaction.

---

# 35. Vertical Browser Installation Test

A browser integration test uses fakes only at Discovery and Resolution, while using real:

```text
ResourceContentDecoder
BibleChapterInterpreter
BibleChapterValidator
BibleChapterInstaller
IndexedDB transaction adapter
browser IndexedDB
```

Covered cases:

```text
valid bundle installs completely

invalid candidate in bundle
    → installs nothing

multiple resolved descriptor contents
    → commit independently
```

---

# 36. Full Relay-to-IndexedDB End-to-End Test

A major milestone used the real `Application`.

The test publishes a real kind `37770` Bible Chapter Resource to the local relay, then calls:

```text
application.context
    .bibleChapterResourceService
    .install(...)
```

It verifies real IndexedDB state:

```text
Chapter exists
BibleVersion exists
ResourceInstallation exists
provenance references publication event ID
```

The user confirmed this test passed.

This proves:

```text
Nostr relay
→ ResourceClient
→ ResourceDiscovery
→ ResourceResolver
→ ResourceContentDecoder
→ BibleChapterResourceService
→ Interpreter
→ Validator
→ Installer
→ IndexedDB
```

and proves the Composition Root wiring for the inbound path.

---

# 37. Read-Side Migration Began

Legacy `ChapterService` depended on:

```text
chapterApi
→ chapters.nostr.ts
→ offlineApi.cacheHitThenFetch(...)
```

and swallowed failures into `newChapter()`.

The new path separates:

```text
local miss
Resource not found
Resource processing failure
installation invariant failure
```

instead of collapsing them into one empty Chapter result.

---

# 38. Normal IndexedDB ChapterStore Adapter

A normal non-transaction-scoped ChapterStore adapter was introduced for ordinary Domain reads.

This is separate from the transaction-scoped ChapterStore used during Resource installation.

The same Domain contract is reused in two persistence contexts.

---

# 39. ChapterService Refactor

`ChapterService` was rewritten with constructor injection.

Temporary dependencies:

```text
default publisher
ChapterStore
ChapterResourceLoader
```

Current UI-compatible API:

```ts
get(
    version: string,
    bibleLocationRef: string
): Promise<Chapter>
```

Behavior:

```text
normalize location to chapterRef
    ↓
create publisher/version/chapterRef ChapterId
    ↓
ChapterStore.get(...)
    ↓
hit?
    ├── yes → return
    └── no
         ↓
       ChapterResourceLoader.load(...)
         ↓
       false?
         ├── yes → Resource-not-found error
         └── no
              ↓
            ChapterStore.get(...)
              ↓
            missing?
              ├── yes → installation invariant error
              └── no → return Chapter
```

A local miss is now an acquisition opportunity, not an error.

---

# 40. ChapterResourceLoader Seam

Contract:

```ts
export interface ChapterResourceLoader {
    load(
        publisher: string,
        version: string,
        chapterRef: string
    ): Promise<boolean>;
}
```

Its job is:

> Make the requested Chapter locally available if a Published Resource can provide it.

It does not return the Chapter.

The Chapter is always reread from `ChapterStore`.

---

# 41. BibleChapterResourceLoader

The concrete loader delegates to `BibleChapterResourceService`.

On miss it first tries:

```text
kjvonly/bible/chapters/{version}/{chapterRef}
```

Then falls back to:

```text
kjvonly/bible/chapters/{version}
```

This makes Resource granularity invisible to `ChapterService`.

---

# 42. `chapters.nostr.ts` Removed from the New Chapter Read Graph

The legacy file still exists, but the migrated Chapter read path no longer requires it.

The new graph is:

```text
ChapterService
    ↓
ChapterStore

on miss
    ↓
ChapterResourceLoader
    ↓
BibleChapterResourceService
    ↓
generic Resource pipeline
```

Legacy callers can be migrated later.

---

# 43. VerseService Refactor

`VerseService` previously imported a file-level ChapterService singleton.

A temporary attempt to call `useApplicationContext()` from the plain `.ts` service caused:

```text
getContext(...) can only be used during component initialisation
```

The correct design is constructor injection:

```text
VerseService
    → ChapterService
```

The Composition Root constructs both.

---

# 44. Composition Root Principle Became Concrete

The service graph now follows:

```text
Application
    ↓
IndexedDBChapterStore
    ↓
BibleChapterResourceLoader
    ↓
ChapterService
    ↓
VerseService
```

The important distinction is:

```text
who uses a service
    ≠
who constructs a service
```

Svelte consumes already-composed services.

Plain TypeScript services receive collaborators through constructors.

Tests can instantiate controlled graphs directly.

---

# 45. Svelte Context Boundary

The practical rule is:

```text
Svelte component
    → may call useApplicationContext()

plain TypeScript service
    → must not call useApplicationContext()

Application Composition Root
    → constructs and connects long-lived dependencies
```

`ApplicationContext` is a UI delivery boundary, not a general service locator.

---

# 46. Temporary Publisher Injection

The UI still uses a bare value such as:

```text
kjvs
```

The full installed identity is:

```text
publisher/kjvs
```

Bible Version UI migration was intentionally postponed.

For now the application publisher is injected into `ChapterService` at composition time.

This keeps the temporary assumption in one place.

---

# 47. ChapterService Test Matrix

The new ChapterService spec was designed to prove:

```text
store hit
    → return Chapter
    → do not load Resource

store miss
    → load Resource
    → reread store
    → return installed Chapter

Resource not found
    → throw

Resource says success but Chapter absent
    → invariant error

Resource load failure
    → propagate

location containing verse data
    → normalize to chapterRef
```

---

# 48. BibleChapterResourceLoader Test Matrix

The loader spec was designed to prove:

```text
individual found
    → return true

individual missing + bundle found
    → return true

both missing
    → return false

processing failure
    → propagate
```

---

# 49. Relay Authentication Failure Found Through Real Read Path

The Chapter miss flow reached the real relay with the expected filter:

```text
kinds:
    [37770]

authors:
    [application publisher]

#d:
    [kjvonly/bible/chapters/kjvs/1_1]
```

An equivalent `nak req --auth` returned the event.

The application failed with:

```text
auth-required:
only authenticated users can read from this relay
```

This proved the filter was correct and the missing piece was NIP-42 signer state.

---

# 50. Resource Client Was Already Auth-Capable

No new auth state machine was required.

The Resource Client already configures rx-nostr with:

```text
signer
authenticator: auto
```

So the intended flow is:

```text
relay AUTH challenge
    ↓
rx-nostr auto authenticator
    ↓
configured NostrSigner
    ↓
signed AUTH event
    ↓
relay
```

The signer simply had not been restored from persisted application login state.

---

# 51. NostrSigner Already Supported `useNsec`

`NostrSigner` supports `nip07`, `nsec`, and `nip46`.

For this migration only nsec restoration is required.

`useNsec()` decodes and validates the nsec then delegates to secret-key configuration.

---

# 52. Login Restoration Ownership

Ownership remains:

```text
Application / login layer
    → persisted login choice
    → localStorage restoration

NostrSigner
    → active signing mechanics

ResourceClient / rx-nostr
    → NIP-42 challenge mechanics
```

Neither NostrSigner nor ResourceClient should become a localStorage session service.

---

# 53. Temporary nsec Startup Restoration

The legacy app stores login under a namespaced `login` localStorage key.

The startup migration is:

```text
Application.start()
    ↓
read persisted login
    ↓
plain nsec?
    ├── yes → nostrSigner.useNsec(...)
    └── no → ignore for this phase
```

Current supported case:

```text
nsec1...
```

Deferred cases:

```text
anonymous_<nsec>
NIP-07 restoration
NIP-46 restoration
npub read-only login
```

The Resource Client does not need reconstruction because it already holds the same long-lived signer object.

---

# 54. Application Startup Sequence Relevant to Auth

The relevant startup flow is:

```text
new Application(config)
    ↓
construct NostrSigner
    ↓
construct ResourceClient with same signer object
    ↓
construct Resource / Domain graph
    ↓
Application.start()
    ↓
restore signer state
    ↓
configure default relays
    ↓
application ready
```

Later `useNsec()` configuration updates the signer already referenced by rx-nostr.

---

# 55. Auth Failure Was a Useful Vertical-Slice Proof

The auth failure showed the new read path had already reached:

```text
Svelte Chapter request
    ↓
ChapterService
    ↓
local IndexedDB miss
    ↓
ChapterResourceLoader
    ↓
BibleChapterResourceService
    ↓
ResourceDiscovery
    ↓
RxNostrResourceClient
    ↓
relay
```

The failure occurred precisely at the relay auth boundary.

---

# 56. Final Intended Chapter Miss Flow

```text
Bible component requests:
    version = kjvs
    location = 1_1_5

        ↓

ChapterService:
    chapterRef = 1_1

        ↓

ChapterId:
    <publisher>/kjvs/1_1

        ↓

ChapterStore.get(...)

        ↓

MISS

        ↓

BibleChapterResourceLoader

        ↓

try individual:
    kjvonly/bible/chapters/kjvs/1_1

        ↓

ResourceDiscovery

        ↓

relay NIP-42 challenge

        ↓

rx-nostr authenticator:auto

        ↓

NostrSigner with restored nsec

        ↓

Resource event

        ↓

ResourceResolver

        ↓

VerifiedResourceContent

        ↓

Hex decode if declared

        ↓

Gzip decode if declared

        ↓

JSON decode

        ↓

BibleChapterInterpreter

        ↓

BibleChapterValidator

        ↓

BibleChapterInstaller

        ↓

one IndexedDB transaction:
    chapters
    bible_versions
    resource_installations

        ↓

ChapterService rereads ChapterStore

        ↓

Chapter returned

        ↓

VerseService extracts requested verse
```

---

# 57. Tests Confirmed Passing During the Period

Explicitly reported passing during the work:

```text
Resource Identifier specs
Bible Chapter interpreter specs
Bible Chapter validator specs
Bible identity specs
ResourceInstallation specs
real browser IndexedDB transaction specs
Bible Chapter installation transaction adapter specs
Bible Chapter installer specs
Bible Chapter Resource handler specs
Bible Chapter Resource service specs
vertical browser Resource installation tests
full real relay-to-IndexedDB Bible Chapter test
```

The relay test is the strongest completed proof because it exercises the real Composition Root and real transport through actual local persistence.

---

# 58. Tests Added / Expanded but Awaiting Final Re-Verification

The most recent runtime fixes should still be rerun:

```text
ChapterService spec
BibleChapterResourceLoader spec
gzip-resource-content-decorator spec with large payloads
real Chapter miss from UI through authenticated relay
```

nsec startup restoration should be tested by reloading with the existing legacy localStorage login.

---

# 59. Current Source Layout Added or Refined

```text
src/lib/

    resource/
        models/
            resource.model.ts

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

        content/
            gzip-resource-content-decorator.ts
            gzip-resource-content-decorator.spec.ts
            hex-resource-content-decorator.ts
            hex-resource-content-decorator.spec.ts
            resource-content-decorator-builder.ts
            resource-content-decoder.ts

    domains/
        bible/
            models/
                bible.model.ts
                bible-version.model.ts

            utils/
                bible-identity.ts
                bible-identity.spec.ts

            persistence/
                bible.db.ts
                chapter-store.ts
                bible-version-store.ts
                indexeddb-chapter-store.ts
                bible-chapter-installation-transaction.ts
                bible-chapter-installation-transaction.spec.ts

            services/
                chapter.service.ts
                chapter.service.spec.ts
                verse.service.ts
                chapter-resource-loader.ts

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
                    bible-chapter-resource-handler.ts
                    bible-chapter-resource-handler.spec.ts
                    bible-chapter-resource-service.ts
                    bible-chapter-resource-service.spec.ts
                    bible-chapter-resource-loader.ts
                    bible-chapter-resource-loader.spec.ts

    infrastructure/
        persistence/
            idb.db.ts

        nostr/
            nostr-signer.ts
            resource-client.ts
            rx-nostr-resource-client.ts

    application/
        runtime/
            application.ts
            application-context.ts

tests/
    browser/
        idb.db.spec.ts
        bible-chapter-resource-installation.spec.ts
        bible-chapter-resource-relay.spec.ts
```

Exact placement of recently-written specs should follow the current local repository tree if it differs from this handoff list.

---

# 60. Resulting Application Object Graph

```text
Application

├── NostrSigner
│
├── ResourceClient
│     └── same NostrSigner
│
├── ResourceDiscovery
│     └── ResourceClient
│
├── ResourceResolver
│
├── ResourceContentDecoratorBuilder
│     ├── Json
│     ├── Gzip
│     └── Hex
│
├── ResourceContentDecoder
│
├── Bible Chapter interpretation / validation / install graph
│
├── BibleChapterResourceHandler
│
├── BibleChapterResourceService
│     ├── ResourceDiscovery
│     ├── ResourceResolver
│     ├── ResourceContentDecoder
│     └── BibleChapterResourceHandler
│
├── IndexedDBChapterStore
│     └── getBibleDB
│
├── BibleChapterResourceLoader
│     └── BibleChapterResourceService
│
├── ChapterService
│     ├── temporary application publisher
│     ├── IndexedDBChapterStore
│     └── BibleChapterResourceLoader
│
└── VerseService
      └── ChapterService
```

Svelte receives selected top-level capabilities through `ApplicationContext`.

---

# 61. Important Service Lifetime Rule Established

Application-scoped services are constructed by the Composition Root, not by the components that use them.

This does not mean only Svelte components may use services.

Services may depend on services.

The rule is about construction ownership:

```text
Application Composition Root
    → constructs production graph

Svelte components
    → consume graph through context

plain TypeScript services
    → receive dependencies through constructors

tests
    → construct controlled instances directly
```

---

# 62. Legacy Behavior Intentionally Left Alone

## Bible Version UI

Still uses:

```text
kjvs
```

rather than:

```text
<publisher>/kjvs
```

The Domain persistence model is already publisher-scoped.

## Bible Version Deletion / Uninstall

The legacy delete path does not yet account for publisher-scoped BibleVersion, Chapters, provenance, or atomic uninstall.

## `chapters.nostr.ts`

The file still exists. The new Chapter read graph should simply stop depending on it.

## Login Modes

Only plain persisted nsec restoration is required for this migration. NIP-07, NIP-46, anonymous login, and read-only login remain separate work.

---

# 63. Anti-Patterns Avoided

The implementation deliberately did not introduce:

```text
generic ResourceTypePipeline
ResourceTypeRegistry
InstallerRegistry
generic Repository framework
generic UnitOfWork
DI framework
service locator
parallel Resource Clients per Domain
Svelte context reads from plain TypeScript services
transport-specific fields on Chapter Domain Objects
Nostr access inside ChapterStore
network fetches inside IndexedDB transactions
```

---

# 64. Current Core Invariants

## Resource Type

```text
Resource Type =
    first 3 Resource Identifier segments
```

## Resource Path

```text
Resource path =
    all remaining segments
```

## Published Resource Identity

```text
kind
+
publisher
+
resourceId / d
```

## Bible Version Identity

```text
publisher
+
version
```

## Chapter Identity

```text
publisher
+
version
+
chapterRef
```

## Resource Installation Identity

```text
objectType
+
objectId
```

## Replacement Rule

```text
newer modifiedAt wins
older or equal modifiedAt does not replace
```

## Resource Atomicity

```text
one decoded + validated Resource
    =
one installation transaction
```

## Descriptor Atomicity

```text
one descriptor
    =
one independently processed Resource
    =
one transaction
```

## Candidate Validation

```text
all candidates validate
before transaction begins
```

## Provenance Atomicity

```text
Domain Object write
+
ResourceInstallation write
    =
same transaction
```

## Local Read Authority

```text
Domain Store
    =
authoritative local application state
```

---

# 65. Error Semantics After the Read Refactor

## Local Miss

```text
ChapterStore returns undefined
```

Meaning:

```text
Chapter is not currently installed
```

Action:

```text
attempt Resource acquisition
```

## Published Resource Missing

```text
ResourceDiscovery returns no Resource
```

Result:

```text
ChapterService Resource-not-found error
```

## Resource Processing Failure

Examples:

```text
relay failure
resolution failure
integrity failure
hex failure
gzip failure
JSON failure
interpretation failure
schema validation failure
installation failure
```

Result:

```text
original failure propagates
```

## Successful Resource Processing but Missing Chapter

Result:

```text
installation invariant error
```

This prevents a hidden empty-Chapter fallback from masking a broken pipeline.

---

# 66. Why the New Read Seam Is Important

The new Chapter read path establishes a reusable application pattern:

```text
read local authoritative Domain state
    ↓
if absent
    ↓
ask acquisition capability to make it available
    ↓
read Domain state again
```

The Domain-facing service does not need to know relay, auth, representation, descriptor, gzip, hex, event parsing, or installation transaction details.

---

# 67. Resource Granularity Independence Is Now Real

The application requests:

```text
give me Chapter 1_1
```

The loader can satisfy it from:

```text
individual 1_1 Resource
```

or:

```text
kjvs bundle Resource
```

After installation, the application simply reads the publisher-scoped ChapterId.

---

# 68. Transport Independence Is Preserved

The installer operates on `DecodedResourceContent`.

It does not know whether serialized content came from:

```text
inline Nostr
descriptor
Blossom
archive
future provider
```

All providers converge before interpretation and installation.

---

# 69. Provenance Remains Separate from Domain Data

Installed Chapter answers:

```text
What Chapter does the application use?
```

ResourceInstallation answers:

```text
Which Published Resource state supplied this Chapter?
```

Chapter does not accumulate transport-specific metadata.

---

# 70. Bundle Is Not a Domain Object

A Chapter bundle is publication granularity.

After interpretation and installation it becomes:

```text
BibleVersion
Chapters
per-Chapter ResourceInstallation provenance
```

The application does not preserve a bundle Domain concept.

---

# 71. Important Bugs Found by the Real Vertical Slice

## Missing Runtime Signer Restoration

ResourceClient could do NIP-42, but NostrSigner had never been restored from persisted nsec.

## Gzip Backpressure Deadlock

Small tests passed, but real Chapter content stalled because the transform output was not consumed until after awaiting the write.

These failures validate the need for real relay/browser vertical testing in addition to unit tests.

---

# 72. Recommended Immediate Verification Sequence

## Step 1 — Gzip spec

Run the updated large-payload gzip spec.

## Step 2 — Broader Resource suite

Ensure the stream rewrite did not change media decoding semantics.

## Step 3 — Reload with persisted nsec

Confirm `Application.start()` restores the plain nsec.

## Step 4 — Force a Chapter local miss

Expected:

```text
ChapterStore miss
→ individual Resource lookup
→ NIP-42 authenticated relay read
→ decode
→ install
→ ChapterStore reread
→ Chapter returned
```

## Step 5 — Inspect persistence

Verify:

```text
chapters
bible_versions
resource_installations
```

## Step 6 — Reload/offline read

The installed Chapter should return directly from ChapterStore without Resource acquisition.

---

# 73. Suggested Next Work After Verification

After the real Chapter miss path passes:

```text
migrate remaining direct Chapter/Verse callers
remove remaining dependency on legacy chapters.nostr.ts
update implementation docs with read/acquisition path
refactor Bible Version identity in UI
design atomic Bible Version uninstall
migrate another Resource Type
```

Do not introduce a generic Resource-Type registry until a second Resource Type demonstrates genuinely shared behavior.

---

# 74. End State of the Period

At the beginning of the period, Resource client/content foundations existed but Bible Chapter installation and application-facing reads were not yet a complete production path.

By the end, the application has concrete implementations for:

```text
Resource route interpretation
Domain validation
publisher-scoped identity
per-object Resource provenance
multi-store atomic installation
bundle atomicity
descriptor independence
real browser persistence
real relay-to-IndexedDB installation
Domain Store read adapters
local-miss Resource acquisition
constructor-injected Domain services
Composition Root service lifetime
relay signer restoration
large-content gzip stream handling
```

The key application pattern is now:

```text
Application asks for Domain data
    ↓
local Domain Store first
    ↓
missing data triggers Published Resource acquisition
    ↓
Resource pipeline validates and installs
    ↓
Domain Store becomes authoritative
    ↓
application reads the Domain Object
```

The application remains a Domain application.

Nostr and Resource Architecture sit beneath the Domain boundary and supply missing or updated authoritative local Domain state.

---

# Big Takeaway

The last 24 hours converted the Resource Architecture from a collection of correct layers into a real application path.

The completed model is:

```text
Relay / Provider
    ↓
Published Resource
    ↓
Discovery
    ↓
Resolution
    ↓
Verified serialized content
    ↓
generic content decoding
    ↓
Resource-Type interpretation
    ↓
Domain validation
    ↓
atomic installation
    ↓
authoritative Domain Store
    ↓
Domain-facing service
    ↓
Svelte Module
```

For Bible Chapters:

```text
ChapterService.get(...)
    ↓
publisher-scoped ChapterStore lookup
    ↓
MISS
    ↓
BibleChapterResourceLoader
    ↓
individual Resource
    or
version bundle Resource
    ↓
NIP-42 authenticated Resource discovery
    ↓
decode
    ↓
interpret
    ↓
validate
    ↓
install Chapter + provenance atomically
    ↓
reread ChapterStore
    ↓
Chapter
    ↓
VerseService / Bible Module
```

The architectural seams now have concrete runtime meaning rather than existing only as documentation.

That is the primary accomplishment of this implementation period.
