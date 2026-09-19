# Bible Chapter Implementation

## Status

**Status:** Current
**Domain:** Bible
**Resource Type:** `kjvonly/bible/chapters`
**Domain Object Type:** `bible/chapter`

---

# 1. Purpose

This document describes the current Bible Chapter implementation from Resource identity through local read behavior.

Bible Chapters were the first concrete vertical slice used to prove the Resource architecture against a real Domain. The durable design decisions from that implementation remain important because they establish the pattern reused by later Resource-backed Domain types.

The current Chapter path is:

```text
Published Bible Chapter Resource
    ↓
Resource resolution / decoding
    ↓
BibleChapterInterpreter
    ↓
BibleChapterValidator
    ↓
BibleChapterInstaller
    ↓
Chapter + BibleVersion + ResourceInstallation
    ↓
IndexedDB
    ↓
ChapterService
    ↓
Bible Reader
```

The important ownership rule is:

```text
Resource layer
    = transport, decoding, generic handler dispatch

Bible Domain
    = chapter route meaning, validation, identity,
      installation policy, persistence contract, read semantics
```

---

# 2. Resource Contract

The Resource Type is:

```text
kjvonly/bible/chapters
```

The interpreter supports two Resource path shapes.

Individual chapter:

```text
kjvonly/bible/chapters/<version>/<chapterRef>
```

Example:

```text
kjvonly/bible/chapters/kjv/1_1
```

Bundle:

```text
kjvonly/bible/chapters/<version>
```

A bundle value is an object whose entries identify chapters belonging to that version.

The selected module Resource normally points at the version-level Resource identity. `ResourceLoader` can then load a requested chapter by appending the chapter reference while retaining bundle fallback behavior.

---

# 3. Chapter Reference

A chapter reference is:

```text
<bookId>_<chapter>
```

Examples:

```text
1_1
43_3
73_22
```

The chapter reference is Domain location information. It is not the installed Domain Object ID by itself.

The Bible Domain combines publisher, version, and chapter reference to construct local identity.

---

# 4. Bible Version Identity

A Bible version is publisher-scoped.

The local Bible Version ID is:

```text
<publisher>/<version>
```

Constructed by:

```text
createBibleVersionId(publisher, version)
```

This means two publishers may publish resources with the same textual version name without colliding in local storage.

The installed `BibleVersion` model contains:

```text
id
publisher
version
```

The Bible Version is Domain state. It is distinct from Resource publication metadata.

---

# 5. Chapter Identity

The installed Chapter ID is:

```text
<bibleVersionId>/<chapterRef>
```

or equivalently:

```text
<publisher>/<version>/<bookId>_<chapter>
```

Constructed by:

```text
createChapterId(bibleVersionId, chapterRef)
```

Example:

```text
<publisher>/kjv/1_1
```

The Chapter object does not contain Nostr event IDs, Resource kinds, descriptor metadata, or transport information.

Resource identity and Domain Object identity remain separate.

---

# 6. Chapter Content

The serialized Chapter content contains Domain data such as:

```text
number
bookName
verses
verseMap
footnotes
```

Each Verse contains:

```text
number
words
text
```

Each Word contains:

```text
text
class
href
emphasis
```

The installed Chapter adds only its local Domain `id` to the validated content.

---

# 7. Interpretation

`BibleChapterInterpreter` owns the Resource-path interpretation rules.

It first verifies:

```text
resource.resourceType === kjvonly/bible/chapters
```

For an individual Resource:

```text
path = [version, chapterRef]
```

it produces one candidate:

```text
BibleChapterCandidate {
    version,
    chapterRef,
    value
}
```

For a bundle Resource:

```text
path = [version]
```

it interprets each bundle entry into a candidate.

Bundle entries must identify the same version as the Resource path. A bundle entry cannot silently switch versions.

Interpretation establishes Resource route meaning. It does not decide whether the Chapter content is valid Domain data.

---

# 8. Validation

`BibleChapterValidator` owns Chapter Domain validation.

Validation includes the serialized shape and cross-field consistency.

The current schema requires:

```text
chapter.number
chapter.bookName
chapter.verses
chapter.verseMap
chapter.footnotes
```

Word and Verse structures are also validated.

The validator additionally verifies:

1. `chapterRef` has the form `<bookId>_<chapter>`.
2. the chapter number in `chapterRef` matches `content.number`.
3. every Verse map key is a positive canonical integer string.
4. each Verse object's `number` matches its Verse map key.

The output is a `ValidatedBibleChapterCandidate`.

No persistence begins until interpretation and validation have completed.

---

# 9. Installation

`BibleChapterInstaller` accepts:

```text
DecodedResourceContent
+ validated Chapter candidates
```

All candidates in one install operation must belong to the same Bible version.

Installation runs through `BibleChapterInstallationTransaction`.

The transaction exposes narrow stores for:

```text
chapters
bibleVersions
resourceInstallations
```

The installer does not receive the entire database.

---

# 10. Atomicity

The IndexedDB implementation uses one read/write transaction spanning:

```text
domain_objects
resource_installations
```

Within that transaction the installer may write:

```text
BibleVersion
Chapter
ResourceInstallation
```

This preserves the core installation invariant:

> Accepted Domain state and the provenance that explains its Resource installation are committed atomically.

Network requests, Resource resolution, decoding, interpretation, and validation occur outside that IndexedDB transaction.

The transaction is intentionally short-lived and persistence-focused.

---

# 11. Installation Replacement Policy

Replacement is decided per installed Chapter, not only per Resource.

For each candidate the installer looks up the current `ResourceInstallation` for:

```text
objectType = bible/chapter
objectId = <chapterId>
```

If an installation already exists and:

```text
incoming.modifiedAt <= existing.modifiedAt
```

that Chapter is skipped.

Otherwise the Chapter and its installation provenance are replaced atomically.

This per-object rule is important for bundles. One bundle can contain Chapters whose currently installed provenance differs.

A newer individual Chapter can replace one Chapter previously installed from a bundle without requiring the entire bundle to be replaced.

---

# 12. ResourceInstallation Provenance

Each installed Chapter records provenance separately from the Chapter object.

The record includes:

```text
objectType
objectId
publisher
resourceId
modifiedAt
```

Its ID is derived by:

```text
createResourceInstallationId(
    'bible/chapter',
    chapterId
)
```

This answers:

```text
Which Resource publication installed the currently accepted Chapter?
```

It does not make transport metadata part of the Chapter model.

---

# 13. Bible Version Installation

Before installing Chapters, the installer ensures the publisher-scoped `BibleVersion` exists.

If absent it creates:

```text
BibleVersion {
    id,
    publisher,
    version
}
```

This gives the Bible Domain a local catalog of installed versions independently from the individual Chapter objects.

---

# 14. Read Path

`ChapterService` implements the Domain-facing local-first read path.

Conceptually:

```text
ChapterService.get(source, bibleLocationRef)
    ↓
parse selected Chapter Resource source
    ↓
extract chapterRef
    ↓
construct BibleVersion ID
    ↓
construct Chapter ID
    ↓
read ChapterStore
```

If the Chapter exists locally, it is returned immediately.

If it is missing:

```text
ChapterService
    ↓
ResourceLoader.load(source, chapterRef)
    ↓
Resource pipeline installs Chapter
    ↓
ChapterService reads ChapterStore again
```

If the Resource cannot be found, the service throws a Resource-not-found error.

If the Resource path reports success but the expected Chapter is still absent, it throws an installation error rather than returning fabricated data.

---

# 15. Selected Resource Source

`ChapterService` receives a `PublishedResourceReference`.

It validates that the selected source belongs to:

```text
kjvonly/bible/chapters
```

and that the selected source path identifies exactly one Bible version.

The service does not consult global mutable Resource selection itself.

Module Resource selection is captured on the Buffer and resolved before the Domain service call.

This preserves the boundary:

```text
Pane / Buffer / module selection mechanics
    ✕ ChapterService

PublishedResourceReference
    ✓ ChapterService
```

---

# 16. Module Resource Selection

The Bible Module requires Chapter Resources as part of a larger Resource context.

Current Bible requirements include:

```text
Bible Chapters
Paragraphs
Pericopes
Booknames
Strong's definitions
Text Markup
Notes
```

The Module Resource-selection contributor builds that snapshot when a Bible Buffer is created.

The Chapter service therefore receives the explicit selected Chapter source rather than deriving the source from `BibleMode.bibleVersion` or another UI field.

---

# 17. Relationship to Paragraphs and Pericopes

Paragraphs and Pericopes are separate Bible Resource Types and separate Domain Objects.

They are not embedded into Chapter persistence.

At render time the Reader combines:

```text
Chapter text
+ Paragraph metadata
+ Pericope metadata
+ Text Markup
```

This keeps canonical Bible text independent from presentation overlays and structural metadata.

---

# 18. Relationship to Search

Bible Search uses a separately published prebuilt search index.

A search result identifies Bible locations. The Reader then obtains the Chapter through the normal Chapter service path.

The Chapter service does not own search indexing or search result routing.

---

# 19. Relationship to Strong's

Strong's definitions are a separate Domain and Resource Type.

Bible Words may contain `href` values that reference Strong's keys, but the Chapter object does not embed Strong's definitions.

The Reader resolves Strong's information through the Strong's Domain using its selected Resource source.

---

# 20. Failure Boundaries

The Chapter pipeline fails explicitly when:

- the Resource Type is wrong,
- the Resource path shape is invalid,
- a bundle has invalid entry routing,
- serialized Chapter content is malformed,
- a Chapter reference disagrees with the serialized chapter number,
- Verse keys disagree with Verse numbers,
- one installation operation mixes Bible versions,
- a missing Resource cannot be acquired,
- or Resource acquisition completes without installing the expected Chapter.

No partially validated Chapter should become accepted local state.

---

# 21. Testing

Focused tests cover the concrete boundaries separately.

Important test areas include:

```text
BibleChapterInterpreter
BibleChapterValidator
BibleChapterInstaller
BibleChapterResourceHandler
IndexedDBBibleChapterInstallationTransaction
ChapterService
Bible identity helpers
browser Resource installation
relay-backed Resource acquisition
```

Tests should prefer Domain-facing service paths when the intent is application integration coverage.

Concrete Resource/infrastructure tests may still construct lower-level implementations directly when those implementations are the subject under test.

---

# 22. Important Invariants

## 22.1 Publisher scopes the version

```text
BibleVersion ID = publisher/version
```

## 22.2 Chapter identity is Domain identity

```text
Chapter ID = publisher/version/chapterRef
```

It is not a Nostr event ID or Resource ID.

## 22.3 Resource provenance is separate

`ResourceInstallation` stores publication provenance. Chapter content remains Domain data.

## 22.4 Replacement is per Chapter

Bundle publication does not make freshness an all-or-nothing bundle decision.

## 22.5 Validation precedes persistence

Malformed candidate content is rejected before the installation transaction begins.

## 22.6 The read path is local-first

Network/resource acquisition occurs only when the expected Chapter is absent locally.

## 22.7 Resource selection is explicit

`ChapterService` receives a `PublishedResourceReference`; it does not know Pane or Buffer mechanics.

---

# 23. Related Documents

```text
docs/03_implementation/resources/002-resource-selection.md
docs/03_implementation/resources/004-resource-installation.md
docs/03_implementation/resources/005-resource-lifecycle-content.md
docs/03_implementation/persistence/001-indexeddb.md
docs/03_implementation/persistence/002-store-implementation.md
docs/03_implementation/persistence/003-search-indexes.md
docs/03_implementation/domains/bible/001-text-markup.md
```

This document should remain focused on the concrete Bible Chapter vertical slice rather than re-documenting the generic Resource pipeline.
