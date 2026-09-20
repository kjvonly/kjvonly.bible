# Bible Text Markup Implementation

**Status:** Current
**Domain:** Bible
**Application object type:** `bible/text-markup`
**Resource type:** `kjvonly/overlays/text-markup`

---

# Purpose

Bible Text Markup stores user-visible formatting applied to Bible words/verses.

It replaced the old Reader "annotations" concept for visual markup such as:

```text
background highlights
text colors
underline / decoration classes
```

The central distinction is:

> Text Markup is a Bible Domain Object, while its external Resource belongs to the overlay namespace.

Thus:

```text
Application objectType
    bible/text-markup

Resource Type
    kjvonly/overlays/text-markup
```

These names are intentionally different.

---

# Scope

This document covers:

- Text Markup Domain Object shape,
- Domain identity,
- Resource identity,
- default Resource selection,
- read/install behavior,
- validation and installation,
- local writes and Outbox publication,
- local subscriber propagation,
- Reader integration,
- whole-verse/word markup behavior,
- relationship to Settings/paragraph/pericope overlays,
- current synchronization boundary,
- testing and extension rules.

---

# Domain Model

```ts
interface BibleTextMarkup {
    readonly id: string;
    readonly chapterRef: string;
    readonly markings: BibleTextMarkupMap;
}
```

The markings map is conceptually:

```text
verse number
    ↓
word index
    ↓
{ class: string[] }
```

Example:

```json
{
  "id": "<publisher>/kjvs/50_3",
  "chapterRef": "50_3",
  "markings": {
    "2": {
      "1": {
        "class": ["bg-highlighta"]
      }
    }
  }
}
```

The class array permits multiple CSS classes for one marked word.

---

# Verse / Word Semantics

Verse keys are canonical positive integer strings.

Word indexes are canonical non-negative integer strings.

Word index:

```text
0
```

is valid.

The Reader uses word index `0` for verse-level/verse-number editing behavior.

---

# Application Identity

Text Markup application identity is:

```text
<publisher>/<name>/<chapterRef>
```

Created by:

```text
createBibleTextMarkupId(
    publisher,
    name,
    chapterRef
)
```

Example:

```text
<user-pubkey>/kjvs/50_3
```

The `name` normally corresponds to the selected Bible text/version source name used for the markup collection.

The application ID does not include the Resource Type or Nostr event ID.

---

# Resource Identity

Text Markup uses:

```text
Resource Type
    kjvonly/overlays/text-markup
```

A selected source represents a named collection:

```text
kjvonly/overlays/text-markup/<name>
```

An individual chapter Resource is:

```text
kjvonly/overlays/text-markup/<name>/<chapterRef>
```

The Resource publisher supplies the Domain identity's publisher segment.

---

# Default Text Markup Selection

Text Markup is user-owned by default.

`createDefaultBibleTextMarkupSelection()` receives:

```text
current user publisher
selected Bible Chapter Resource
```

It extracts the Chapter Resource's source name and builds:

```text
publisher = current user
resourceId = kjvonly/overlays/text-markup/<chapter-source-name>
```

This means Text Markup defaults follow the Bible text source name while remaining owned by the current user.

A default Text Markup selection is created only when a current user publisher exists. Signed-out Bible reading intentionally has no user-owned Text Markup selection.

The relationship is intentional:

```text
Bible Chapter source
    app-publisher / kjvs

Text Markup source
    user-publisher / kjvs
```

---

# Module Resource Selection

The Bible module includes Text Markup in its Resource-selection model, but the user-owned selection is optional when there is no authenticated user.

Selection is stored in:

```text
Buffer.resourceSelections
```

Reader code that only reads Bible text uses a non-throwing lookup for Text Markup. Signed-out reading therefore renders normally with empty markup instead of treating the missing user-owned selection as a Resource error.

When restoring a persisted Buffer, authentication-dependent selections are reconciled for the current session. A persisted Text Markup selection is discarded first; if a current user exists, the default Text Markup selection is rebuilt for that user and the selected Bible version/source. If no user exists, Text Markup remains absent.

`BibleTextMarkupService` receives only a resolved `PublishedResourceReference` when one exists.

The service does not know about Pane/Buffer mechanics.

---

# Resource Content

An individual Text Markup Resource's `value` is the markings map only.

It does not duplicate:

```text
Domain id
publisher
name
chapterRef
```

Those values are derived from Resource identity.

Outbound media type is:

```text
application/json+gzip+hex
```

Representation is:

```text
content
```

---

# Inbound Resource Pipeline

```text
Decoded Resource
    ↓
BibleTextMarkupInterpreter
    ↓
BibleTextMarkupValidator
    ↓
BibleTextMarkupInstaller
    ↓
BibleTextMarkup Domain Object
    + ResourceInstallation
```

The generic Resource layer handles resolution/decoding/dispatch.

The Bible Domain owns identity, validation, install policy, and persistence mapping.

---

# Interpreter

The Text Markup interpreter accepts Resource identity under:

```text
kjvonly/overlays/text-markup
```

It converts Resource path/content into Text Markup candidates containing the collection name, chapter reference, and markings value.

Identity shape is validated from Resource path rather than trusted from payload data.

---

# Validation

`BibleTextMarkupValidator` validates the nested marking shape.

Important constraints include:

```text
canonical verse keys
canonical word-index keys
class arrays
valid nested object structure
```

The validated candidate contains a normalized chapter reference and markings map ready for installation.

---

# Installation

`BibleTextMarkupInstaller` derives Domain identity from:

```text
Resource publisher
+ Resource collection name
+ chapterRef
```

It writes:

```text
BibleTextMarkup Domain Object
ResourceInstallation provenance
```

atomically through the Text Markup installation transaction.

## Freshness policy

The installer reads the current `ResourceInstallation` for the Text Markup application ID.

If:

```text
incoming modifiedAt <= current ResourceInstallation.modifiedAt
```

the candidate is skipped.

A newer Resource replaces the accepted Text Markup and writes the new `ResourceInstallation` atomically.

This object-level freshness behavior is used by normal Resource installation and Archive import. Broader synchronization/conflict policy remains a separate concern.

---

# Persistence

Accepted Text Markup is stored in the shared:

```text
domain_objects
```

store under:

```text
objectType = bible/text-markup
objectId = BibleTextMarkup.id
```

The concrete store is:

```text
IndexedDBBibleTextMarkupStore
```

Inbound installation also records `ResourceInstallation` revision/provenance state.

Local writes use a separate write transaction that spans:

```text
domain_objects
resource_installations
outbox
```

The write transaction allocates a monotonic local `modifiedAt`, stores it in `ResourceInstallation`, and attaches the same revision to the queued Resource publication intent.

---

# BibleTextMarkupService

`BibleTextMarkupService` is application-owned and exposed through `ApplicationContext`.

It coordinates:

```text
local-first reads
Resource fallback loading
local writes
Resource-publication mapping
Outbox wakeup
same-markup subscribers
```

It does not own Resource selection or synchronization policy.

---

# Read Flow

`get(source, bibleLocationRef)` first reduces the Bible location to chapter scope:

```text
bookID_chapter
```

Then it derives the Text Markup application ID from:

```text
source.publisher
source collection name
chapterRef
```

Read flow:

```text
local store lookup
    ↓ hit
return accepted Text Markup

local miss
    ↓
ResourceLoader.load(source, chapterRef)
    ↓
Resource Worker resolution/install
    ↓
if not found
    return empty Text Markup object
    ↓
if found
    reread local store
    ↓
return installed Text Markup
```

A missing published markup Resource is normal.

The service returns an empty object with the correct identity/chapter rather than treating no markup as an error.

If the Resource layer reports success but no Domain Object was installed, the service throws because the installation contract was violated.

---

# Local Write Flow

`put(textMarkup)` performs:

```text
BibleTextMarkupResourcePublication.create()
    ↓
ONE IndexedDB transaction
    ├── store Text Markup Domain Object
    ├── create/update ResourceInstallation revision state
    └── store Outbox publication intent
    ↓ transaction commit
notify same-markup subscribers
    ↓
Outbox wake
```

Local subscribers are notified only after durable local commit.

---

# Resource Publication Mapping

`BibleTextMarkupResourcePublication` parses the Domain identity:

```text
<publisher>/<name>/<chapterRef>
```

and verifies that:

```text
textMarkup.chapterRef
```

matches the chapter in the ID.

It publishes:

```text
publisher
resourceType = kjvonly/overlays/text-markup
resourceId = kjvonly/overlays/text-markup/<name>/<chapterRef>
representation = content
mediaType = application/json+gzip+hex
value = markings
```

Resource identity is therefore derived from accepted Domain identity rather than passed independently by UI code.

---

# Local Subscription Model

`BibleTextMarkupService` supports subscriptions scoped to one Text Markup application ID.

A subscriber provides:

```text
subscriber ID
textMarkup ID
onChange callback
```

Re-subscribing the same subscriber ID replaces the previous subscription.

After a successful local `put()`, only subscribers for the same Text Markup ID are notified.

`refresh()` supports cross-worker persistence reconciliation. It reloads only Text Markup IDs that currently have live subscribers and republishes accepted values through the same `notify(...)` path. Application composition calls this after Archive import handles Text Markup Resources.

This is local UI propagation.

It is not remote Resource synchronization.

---

# Reader Integration

The Reader owns a mutable UI copy of the active chapter's Text Markup.

On chapter/version change, the chapter component resets old chapter state before loading the new chapter.

That reset is important because otherwise stale markup from the previous chapter could render against new Bible text.

Current flow:

```text
Bible location/version changes
    ↓
reset chapter state
reset Text Markup
unsubscribe old Text Markup
    ↓
resolve selected Text Markup Resource
    ↓
BibleTextMarkupService.get()
    ↓
copy accepted Text Markup into Svelte state
    ↓
subscribe to that Text Markup ID
```

Subscriber callbacks replace the local UI copy with the accepted updated markup.

---

# Editing

The Edit action remains visible when signed out for UI consistency. Attempting to enter Text Markup editing without a current Text Markup selection shows:

```text
Login first
```

No anonymous publisher or synthetic Text Markup source is created.

The Reader edit controls modify the UI copy of the Text Markup map.

Markup modes currently use CSS-class families such as:

```text
text-highlight*
bg-highlight*
decoration-highlight*
```

The word component creates missing nested verse/word entries as edits are made.

Whole-verse editing uses word index `0` behavior defined by the Reader editing model.

Saving performs a deep copy and calls:

```text
BibleTextMarkupService.put()
```

Closing/canceling rereads accepted Text Markup through the service and discards unsaved UI edits.

---

# Relationship to Paragraphs and Pericopes

Text Markup, Paragraphs, and Pericopes are all Bible overlays but they have different ownership/lifecycle.

```text
Paragraphs / Pericopes
    reference overlays selected by Resource context

Text Markup
    writable user-owned overlay
```

The Reader loads all of them per chapter, but Settings controls only Paragraph/Pericope visibility.

Recent cleanup made Paragraph/Pericope Settings subscribers consume the published Settings snapshot directly and guards async loads against stale completion after the setting is disabled or the Bible location changes.

Text Markup has its own service subscription model and is not toggled by those Settings flags.

---

# Resource Worker Composition

The Resource Worker composes:

```text
BibleTextMarkupInterpreter
BibleTextMarkupValidator
BibleTextMarkupInstaller
BibleTextMarkupResourceHandler
```

The main application owns the Svelte-facing `BibleTextMarkupService` and write transaction/publication mapper.

Inbound installation and local writes therefore meet at the same accepted Domain Object store but are composed at different boundaries.

---

# Synchronization Boundary

Current Text Markup behavior supports:

```text
explicit Resource load/install
local accepted writes
outbound Resource publication
```

It does not implement a complete remote synchronization/conflict policy.

Normal reads do not continuously enumerate remote publishers.

A future synchronization design may add broader discovery/conflict behavior, but it should build on the existing `ResourceInstallation.modifiedAt` freshness rule rather than restoring the old unconditional-skip behavior.

---

# Legacy Annotation Boundary

The historical Reader "annotations" runtime was removed from the active implementation.

Do not reintroduce old annotation-specific persistence/Nostr paths.

Text Markup is the current visual-markup Domain model.

There is no automatic migration of legacy annotation data in the current phase.

---

# Application Composition

`Application` constructs:

```text
IndexedDBBibleTextMarkupStore
ResourceLoader
IndexedDBBibleTextMarkupWriteTransaction
BibleTextMarkupResourcePublication
BibleTextMarkupService
```

`BibleTextMarkupService` is exposed through `ApplicationContext`.

Application composition also registers it as a consumer of generic Archive import-completion events. When Text Markup Resources were actually handled, `refresh()` reloads currently subscribed Text Markup IDs and notifies live readers.

Svelte components consume that application-owned instance.

The Resource Worker independently composes the inbound handler/validator/installer path.

---

# Testing

Current tests cover:

```text
Domain identity/model behavior
default Resource selection
Resource source parsing
interpreter
validator
installer
Resource handler
service local-first read behavior
service writes/subscribers
write transaction
Resource publication mapping
```

Reader/browser behavior should additionally verify that chapter changes do not retain stale markup state.

---

# Architectural Invariants

1. Text Markup belongs to the Bible Domain but uses the overlay Resource namespace.
2. Application identity is `<publisher>/<name>/<chapterRef>`.
3. Resource identity is `kjvonly/overlays/text-markup/<name>/<chapterRef>` plus publisher.
4. Resource payload contains markings, not duplicated identity fields.
5. Text Markup is chapter-scoped.
6. Reads are local-first and may explicitly load the selected Resource on miss.
7. Missing published markup is a normal empty state.
8. Inbound installation is freshness-aware through `ResourceInstallation.modifiedAt`.
9. Local writes persist Domain state + ResourceInstallation revision state + Outbox intent atomically.
10. Local subscribers are notified after durable commit.
11. Archive/import reconciliation may refresh only currently subscribed Text Markup IDs.
12. User-owned Text Markup selection is absent when signed out and rebuilt against the current user during workspace restore.
13. Resource selection lives on the Buffer; the service receives only `PublishedResourceReference` when one exists.
14. Legacy annotation runtime must not be recreated.

---

# Important Files

```text
src/lib/domains/bible/models/bible-text-markup.model.ts
src/lib/domains/bible/persistence/bible-text-markup-*.ts
src/lib/domains/bible/resources/text-markup/
src/lib/domains/bible/services/bible-text-markup.service.ts
src/lib/domains/bible/modules/reader/chapter/

src/lib/application/runtime/application.ts
src/lib/application/runtime/application-context.ts
```

---

# Final Mental Model

```text
selected user Text Markup source
    ↓
chapter-scoped Domain identity
    ↓
local-first accepted Text Markup
    ↓
Reader editing
    ↓
atomic Domain Object + ResourceInstallation + Outbox write
    ↓
local subscriber refresh
    +
outbound Resource publication
```
