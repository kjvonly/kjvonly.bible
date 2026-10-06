# Bible Chapter Implementation

## Status

**Status:** Current
**Domain:** Bible
**Resource Type:** `bible/chapter`
**Published data type:** `kjvonly.bible.chapter@1`
**Canonical Chapter object type:** `bible/chapter`
**Canonical Chapter data type:** `kjvonly.bible.chapter@1`

---

# 1. Purpose

This document describes the current Bible Chapter implementation after migration to the generic Resource installation lifecycle.

The current inbound path is:

```text
Published Bible Chapter Resource
    ↓
Resource Resolution / decoding
    ↓
BibleChapterDataTypeHandler
    ↓
BibleChapterDomainObjectFactory
    ↓
BibleVersion + Chapter candidate(s)
    ↓
GenericResourceInstaller
    ↓
DOMAIN_OBJECTS + RESOURCE_INSTALLATIONS
    ↓
ChapterService
    ↓
Bible Reader
```

The previous Chapter-specific inbound stack has been removed:

```text
BibleChapterInterpreter
BibleChapterValidator
BibleChapterInstaller
BibleChapterResourceHandler
BibleChapterInstallationTransaction
```

Reusable Bible validation remains in generic-era Chapter validation code where it is still required.

---

# 2. Core Identity Decision

The most important current rule is:

```text
bibleId
    ≠
semantic Bible version label
```

Historically one path segment was called `version` and served two roles:

```text
Resource / Domain identity namespace
+
semantic Bible version name
```

Those roles are now separated.

The current conceptual model is:

```text
Resource identity component
    → bibleId

Resource metadata.version
    → semantic Bible version label
```

The two values MAY be equal, but equality is not required and is not validated.

For example:

```text
bibleId = kjvs
metadata.version = kjvs
```

is valid, and so is:

```text
bibleId = bible-a
metadata.version = King James Version
```

Two different Resource identities may publish the same `metadata.version` value.

---

# 3. Resource Contract

Resource Type:

```text
bible/chapter
```

Published datatype:

```text
kjvonly.bible.chapter@1
```

Required Resource metadata:

```text
version = <non-empty semantic version label>
```

Current source constants:

```text
BIBLE_CHAPTER_RESOURCE_TYPE
BIBLE_CHAPTER_DATA_TYPE
BIBLE_CHAPTER_DATA_VERSION
BIBLE_CHAPTER_VERSION_METADATA_KEY
```

Source:

```text
src/lib/domains/bible/resources/chapters/bible-chapter-resource.ts
```

---

# 4. Resource ID Grammar

`resourceType` and `resourceId` are separate contracts. Generic Resource infrastructure treats `resourceId` as opaque; the Bible Domain owns the Chapter Resource ID grammar.

Current Chapter Resource IDs are:

```text
individual:
kjvonly/bible/chapter/<bibleId>/<chapterRef>

bundle/source:
kjvonly/bible/chapter/<bibleId>
```

Example:

```text
kjvonly/bible/chapter/kjvs/1_1
```

The Resource ID segments after `kjvonly/bible/chapter` are Bible-owned identity:

```text
kjvs
    = bibleId identity namespace

1_1
    = chapterRef
```

The `kjvonly/bible/chapter` Resource ID namespace does not define Resource Type; Resource Type is carried independently as `bible/chapter`.

---

# 5. Chapter Reference

A Chapter reference has the form:

```text
<bookId>_<chapter>
```

Examples:

```text
1_1
43_3
66_22
```

`chapterRef` remains Bible Domain semantics and is validated by the Chapter factory's invariant layer.

The reference must:

```text
match ^(\d+)_(\d+)$
```

and the chapter number encoded in the reference must equal:

```text
ChapterContent.number
```

Verse map/object keys are also validated as positive canonical integer strings whose key matches each Verse object's `number`.

---

# 6. Domain Identity

The current Domain identity remains tied to publisher + `bibleId`, not `metadata.version`.

Conceptually:

```text
Bible identity
    = <publisher>/<bibleId>

Chapter identity
    = <publisher>/<bibleId>/<chapterRef>
```

Current helpers are historically named:

```text
createBibleVersionId(publisher, version)
createChapterId(bibleVersionId, chapterRef)
```

The helper parameter/property names still say `version`, but for Chapter Resource identity the value passed there is now semantically the `bibleId` identity namespace.

This is an implementation naming debt, not a reason to reconnect identity to `metadata.version`.

Example:

```text
publisher = abc123
bibleId   = bible-a
chapterRef = 1_1

BibleVersion/Bible identity:
abc123/bible-a

Chapter identity:
abc123/bible-a/1_1
```

---

# 7. BibleVersion Domain Object

The current supporting model remains named `BibleVersion`:

```ts
interface BibleVersion {
    readonly id: string;
    readonly publisher: string;
    readonly version: string;
}
```

Its fields now represent two distinct concepts:

```text
id
    = publisher + bibleId identity

version
    = semantic label from Resource metadata.version
```

Example:

```ts
{
    id: 'abc123/bible-a',
    publisher: 'abc123',
    version: 'King James Version'
}
```

This supporting object gives the Bible Domain a catalog entry containing the semantic label without forcing Chapter payloads to duplicate it.

---

# 8. Chapter Domain Object

The installed Chapter contains Chapter content plus local Domain identity.

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

The Chapter intentionally does not carry:

```text
semantic Bible version label
publisher as a separate field
Resource ID
Resource metadata
Nostr event metadata
media type
representation
```

The Chapter does not need to know which human-readable Bible version label it belongs to in order to represent Chapter content.

That separation is deliberate.

---

# 9. Structural Datatype Validation

Source:

```text
src/lib/domains/bible/resources/chapters/bible-chapter-data-type-handler.ts
```

`BibleChapterDataTypeHandler` validates the published `kjvonly.bible.chapter@1` payload.

It accepts either:

```text
one ChapterContent
```

or:

```text
Record<string, ChapterContent>
```

for a bundle.

The datatype handler validates structural semantics such as:

```text
positive Chapter number
non-empty bookName
Verse shape
Word shape
verseMap shape
footnotes shape
bundle value shape
```

It deliberately does not interpret:

```text
Resource identity
bibleId
chapterRef
metadata.version
```

Those require Resource context and belong to the Domain Object factory.

---

# 10. Stored Chapter Semantic Contract

Accepted Chapter Domain Objects retain the semantic datatype:

```text
objectType  = bible/chapter
dataType    = kjvonly.bible.chapter
dataVersion = 1
```

`objectType` identifies the application object kind. `dataType + dataVersion` identifies the stored value's semantic contract. They are intentionally different fields.

Archive reconstruction creates a canonical `ResourcePublication` and uses that publication's `dataType + dataVersion` when the reconstructed Resource re-enters semantic validation. There is no separate object-type datatype compatibility handler.

---

# 11. BibleChapterDomainObjectFactory

Source:

```text
src/lib/domains/bible/resources/chapters/bible-chapter-domain-object-factory.ts
```

The factory receives:

```text
validated Chapter Resource value
+
ResourceDomainObjectFactoryContext
```

The Resource context includes:

```text
publisher
resourceId
resourceType
modifiedAt
mediaType
dataType
dataVersion
metadata
```

The factory owns:

```text
bibleId extraction
metadata.version requirement
individual vs bundle interpretation
chapterRef extraction
Bible-specific reference/Verse invariants
BibleVersion identity
Chapter identity
candidate construction
```

---

# 12. Semantic Version Metadata

The factory requires:

```text
resource.metadata.version
```

to exist and contain a non-empty string.

If missing or empty:

```text
Bible Chapter Resource metadata requires a non-empty version.
```

The factory does not compare this value with `bibleId`.

That is intentional.

Resource identity and semantic labeling are separate contracts.

---

# 13. Individual Chapter Resource

For an individual Resource, the Bible-owned Resource ID parses to:

```text
path = [bibleId, chapterRef]
```

The validated payload must be one `ChapterContent`.

The factory validates the Chapter reference and creates Domain identity from:

```text
publisher
+
bibleId
+
chapterRef
```

---

# 14. Bundle Resource

For a bundle Resource, the Bible-owned Resource ID parses to:

```text
path = [bibleId]
```

Bundle entries currently use:

```text
<bibleId>/<chapterRef>
```

Example:

```text
kjvs/1_1
kjvs/1_2
```

The factory requires each bundle entry's `bibleId` to match the Resource's `bibleId` identity namespace.

This is an identity consistency rule.

It is not a comparison against `metadata.version`.

A bundle with no Chapter entries returns no candidates and therefore creates no `BibleVersion`/Chapter objects.

---

# 15. Factory Output

For a non-empty accepted Chapter Resource, the factory emits:

```text
1 bible/version candidate
+
1..n bible/chapter candidates
```

The `bible/version` candidate is:

```text
objectType  = bible/version
objectId    = <publisher>/<bibleId>
dataType    = kjvonly.bible.version
dataVersion = 1
value       = BibleVersion {
    id: <publisher>/<bibleId>,
    publisher,
    version: metadata.version
}
```

Each Chapter candidate is:

```text
objectType  = bible/chapter
objectId    = <publisher>/<bibleId>/<chapterRef>
dataType    = kjvonly.bible.chapter
dataVersion = 1
value       = Chapter
```

---

# 16. No Special BibleVersion Installation Mode

`bible/version` is a normal Resource-backed candidate.

There is no special candidate mode such as:

```text
derived-if-absent
```

and no special generic installer branch for Bible catalog objects.

Both `bible/version` and `bible/chapter` follow the same generic rules:

```text
load ResourceInstallation
compare incoming modifiedAt
write if newer/missing
skip if equal/older
```

This keeps the generic installer uniform.

If multiple Chapter Resources target the same `bible/version` object, normal Resource currentness determines which accepted Resource revision supplies that object.

---

# 17. Generic Persistence

Bible Chapter installation uses:

```text
GenericResourceInstaller
```

and:

```text
IndexedDBGenericResourceInstallationTransaction
```

The transaction writes:

```text
DOMAIN_OBJECTS
+
RESOURCE_INSTALLATIONS
```

There is no Chapter-specific inbound installation transaction anymore.

For every candidate that wins currentness:

```text
StoredDomainObject
+
ResourceInstallation
```

are committed atomically.

---

# 18. Chapter Currentness

Currentness is per accepted Domain Object.

For a Chapter:

```text
ResourceInstallation(
    objectType = bible/chapter,
    objectId   = <publisher>/<bibleId>/<chapterRef>
)
```

is compared with the incoming Resource's `modifiedAt`.

If:

```text
incoming.modifiedAt <= current.modifiedAt
```

that candidate is skipped.

This allows bundle and individual Resources to overlap safely at the Domain Object level.

A newer individual Chapter can replace one Chapter that originally arrived in a bundle without requiring every Chapter in the bundle to be replaced.

---

# 19. BibleVersion Currentness

Because `bible/version` is now a normal candidate, it also receives its own:

```text
ResourceInstallation(
    objectType = bible/version,
    objectId   = <publisher>/<bibleId>
)
```

The same incoming `modifiedAt` comparison applies.

There is no special "only if missing" persistence behavior.

This means the semantic label can update when a newer Resource for the same `bibleId` is accepted.

---

# 20. ResourceInstallation Metadata

When Chapter Resource metadata is present, the generic installer preserves it on each written `ResourceInstallation`.

For Chapters this means:

```text
metadata.version
```

is stored as Resource provenance/reconstruction information.

It does not participate in Chapter identity or object-level currentness.

This is useful because the Chapter Domain Object intentionally does not duplicate the semantic version label.

Archive reconstruction can therefore recover the Resource-envelope semantic metadata without changing the Chapter model.

---

# 21. Archive Reconstruction

`BibleChapterResourcePublication` reconstructs the canonical individual Resource shape from a Chapter Domain Object.

Because the Chapter itself does not know the semantic Bible version label, the publication builder has an identity-derived fallback:

```text
metadata.version = bibleId
```

for older/local object contexts that do not provide better provenance.

During Archive import, however, the importer prefers:

```text
installation.metadata
```

over:

```text
publication.metadata
```

Therefore a Chapter originally installed with:

```text
bibleId = bible-a
metadata.version = King James Version
```

can be reconstructed with the original semantic label instead of incorrectly assuming:

```text
version = bible-a
```

This is the current reason ResourceInstallation metadata is preserved.

---

# 22. Read Path

`ChapterService` remains local-first.

Conceptually:

```text
ChapterService.get(source, bibleLocationRef)
    ↓
parse selected Chapter Resource source
    ↓
obtain identity namespace from source
    ↓
extract chapterRef from BibleLocationReference
    ↓
construct Chapter Domain ID
    ↓
read ChapterStore
        ↓ missing
ResourceLoader.load(source, chapterRef)
        ↓
Resource pipeline installs Chapter
        ↓
read ChapterStore again
```

If local Chapter state already exists, no Resource load is needed.

If Resource acquisition reports success but the expected Chapter is still absent, the service throws rather than fabricating data.

---

# 23. Current ChapterService Naming Debt

`ChapterService` and `bible-identity.ts` still contain names such as:

```text
version
BibleVersionId
extractBibleVersion
```

for the identity namespace historically called version.

In current Chapter Resource semantics, the value extracted from the selected Resource ID is the `bibleId` identity component.

It must not be confused with:

```text
resource.metadata.version
```

which is the semantic Bible version label.

The current refactor intentionally avoided a broad downstream rename because Domain lookup behavior did not need to change.

Future cleanup may rename identity-oriented helpers once the Resource ID/source migration is addressed.

---

# 24. Module Resource Selection

The Bible Module still selects a version/source-level Chapter Resource reference.

The source identity allows `ChapterService`/`ResourceLoader` to request an individual Chapter by appending `chapterRef` while retaining bundle fallback behavior.

This is why the current compatibility Resource ID shape remains in place even though the architecture no longer treats classification prefixes or semantic version values as generically encoded in Resource ID segments.

Module Resource selection does not need access to the semantic version label to identify the Chapter Domain object.

---

# 25. Relationship to Paragraphs and Pericopes

Chapter text remains separate from structural overlays.

Conceptually:

```text
Chapter
+ Paragraph metadata
+ Pericope metadata
+ Text Markup
    ↓
Bible presentation
```

Paragraphs and Pericopes now also use the generic datatype/factory installer path.

The Chapter Domain Object remains canonical Scripture content rather than absorbing presentation structure.

---

# 26. Relationship to Search

Bible Search Index is also migrated to the generic installer.

Search indexes remain separate Resource-backed Domain Objects and are not embedded into Chapter values.

Chapter installation does not construct or mutate Search Index state.

---

# 27. Relationship to Strong's

Strong's definitions are independent Resource-backed Domain Objects installed through the same generic lifecycle.

Chapter words may reference Strong's information, but Chapter installation does not own Strong's definition installation semantics.

---

# 28. Failure Boundaries

Chapter installation can fail because of:

```text
unsupported dataType/dataVersion
invalid Chapter structural payload
missing/empty metadata.version
invalid Resource ID shape for the Chapter contract
bundle entry bibleId mismatch
invalid chapterRef
chapterRef/content.number mismatch
invalid Verse key
Verse key/Verse.number mismatch
persistence failure
```

All semantic/factory validation occurs before the generic transaction begins.

Persistence errors abort the generic installation transaction.

---

# 29. Testing

Current tests should cover at least:

```text
BibleChapterDataTypeHandler
BibleChapterDomainObjectFactory
Generic Resource installation with Chapters
real Worker installation
relay integration
archive reconstruction/round trip
ChapterService local-first behavior
```

Important assertions include:

```text
metadata.version is required
bibleId and metadata.version may differ
Domain ID uses bibleId
BibleVersion.value.version uses metadata.version
bundle identity is consistent
invalid Chapter references fail before persistence
bible/version receives normal ResourceInstallation state
Chapter ResourceInstallation preserves metadata
```

Relay/Worker test fixtures must publish/provide:

```text
version
```

metadata because that is now part of the Chapter Resource contract.

---

# 30. Important Invariants

## 30.1 `bibleId` is identity

```text
publisher + bibleId
```

forms the Bible identity namespace used by installed Chapter IDs.

## 30.2 `metadata.version` is semantics

The human/semantic Bible version label comes from Resource metadata.

It is not required to equal `bibleId`.

## 30.3 Chapter payload does not know the semantic version

The Chapter remains reusable Bible content with local identity.

Resource-envelope semantics remain outside the Chapter value.

## 30.4 Chapter reference semantics remain strict

`chapterRef` remains Bible-owned structured location identity and is validated against Chapter content.

## 30.5 Generic installation owns persistence/currentness

There is no Bible Chapter-specific inbound installer or transaction.

## 30.6 BibleVersion is a normal candidate

No special `derived-if-absent` or other one-off generic persistence mode exists.

## 30.7 ResourceInstallation metadata is provenance/reconstruction state

It does not alter Chapter identity or currentness.

## 30.8 Read path remains local-first

The Domain service checks accepted local Chapter state before Resource loading.

---

# 31. Current Source Organization

```text
src/lib/domains/bible/resources/chapters/
├── bible-chapter-resource.ts
├── bible-chapter-data-type-handler.ts
├── bible-chapter-data-type-handler.spec.ts
├── bible-chapter-domain-object-factory.ts
├── bible-chapter-domain-object-factory.spec.ts
├── bible-chapter-validation.ts
└── bible-chapter-resource-publication.ts
```

Generic persistence lives under:

```text
src/lib/resource/data-types/
src/lib/resource/domain-objects/
src/lib/resource/installation/
```

The old Chapter-specific inbound interpreter/installer/handler/transaction files have been removed.

---

# 32. Related Documents

```text
docs/02_resource-boundary/01-domain-resource-model.md
docs/02_resource-boundary/04-nostr-resource-identity.md
docs/02_resource-boundary/08-resource-installation-lifecycle.md
docs/02_resource-boundary/11-resource-archives.md

docs/03_implementation/resources/004-resource-installation.md
docs/03_implementation/archive/001-kjvonly-archive.md
```

---

# 33. Summary

The current Chapter design separates three concepts that historical code had conflated:

```text
Resource Type
    = bible/chapter

bibleId
    = Resource/Domain identity namespace

metadata.version
    = semantic Bible version label
```

The Chapter itself remains concerned with Chapter content and its Domain identity.

The semantic version label belongs to Resource/Bible catalog context, not the Chapter payload.

Installation is now performed through the same generic datatype/factory/currentness/persistence lifecycle used by the rest of the normal Resource-backed codebase.
