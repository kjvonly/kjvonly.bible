# KJVOnly Archive Import / Export Design Specification

**Status:** Proposed
**Archive extension:** `.kjva`
**Archive version:** `1`

---

# Purpose

This specification defines the application-level import and export design for KJVOnly archives.

The archive provides a portable representation of Resource-backed Domain state already accepted by the application.

The design deliberately reuses the existing Resource lifecycle rather than defining a second import lifecycle.

The two primary goals are:

```text
Export
    preserve selected Resource-backed Domain state

Import
    feed archived state back through the same
    interpretation, validation, and installation
    used by externally acquired Resources
```

The archive is intentionally simple.

A `.kjva` archive is a gzip-compressed JSON document containing selected records from:

```text
domain_objects
resource_installations
```

No Nostr events, Outbox entries, Resource receipts, UI state, runtime state, or other application stores are required by the archive format.

---

# Scope

This design covers:

```text
.kjva archive structure
gzip encoding
archive versioning
Domain Object export
Resource Installation export
export selection by Domain Object type
archive structural validation
import freshness prefiltering
conversion back to DecodedResourceContent
reuse of existing Resource handlers
partial import results
local Resource writes and Resource Installation tracking
```

This design does not replace or modify:

```text
Resource Resolution
Resource interpretation
Domain validation
Domain installers
Resource Installation freshness policy
Nostr publication
Outbox processing
Domain schemas
Resource schemas
```

Those existing lifecycles remain authoritative.

---

# Design Principle

The archive does not define another Resource lifecycle.

Import begins at the already-decoded Resource boundary.

Conceptually:

```text
External Resource

Nostr / descriptor / other transport
        ↓
Resource Resolution
        ↓
Resource Content Decoder
        ↓
DecodedResourceContent
        ↓
ResourceHandler
        ↓
Interpreter
        ↓
Validator
        ↓
Installer
```

Archive import joins the same flow here:

```text
.kjva
    ↓
gzip
    ↓
archive validation
    ↓
Domain Object + Resource metadata
    ↓
reconstruct DecodedResourceContent
    ↓
ResourceHandler
    ↓
Interpreter
    ↓
Validator
    ↓
Installer
```

Therefore:

> Archive import MUST NOT directly write imported Domain Objects into the Domain Object store.

The archived Domain Object provides the information from which normal Resource input is reconstructed.

The existing Resource handler remains responsible for turning that information back into accepted Domain state.

---

# Archive Format

A `.kjva` file is:

```text
Archive Object
    ↓
JSON.stringify(...)
    ↓
UTF-8
    ↓
gzip
    ↓
.kjva
```

Version 1 contains exactly three conceptual fields:

```ts
interface KJVOnlyArchiveV1 {
  version: 1;

  domain_objects: Record<string, StoredDomainObject>;

  resource_installations: Record<string, ResourceInstallation>;
}
```

The JSON property names intentionally correspond to the existing IndexedDB object-store names:

```text
domain_objects
resource_installations
```

This keeps the archive representation obvious and avoids inventing another set of archive-specific models.

---

# Example Archive

```json
{
  "version": 1,
  "domain_objects": {
    "notes/note:abc123/user/default/note-1": {
      "id": "notes/note:abc123/user/default/note-1",
      "objectType": "notes/note",
      "objectId": "abc123/user/default/note-1",
      "value": {
        "id": "abc123/user/default/note-1",
        "title": "Example",
        "text": "Example note",
        "html": "<p>Example note</p>",
        "dateCreated": 1789253000,
        "dateUpdated": 1789253175,
        "tags": []
      }
    }
  },

  "resource_installations": {
    "notes/note:abc123/user/default/note-1": {
      "id": "notes/note:abc123/user/default/note-1",
      "objectType": "notes/note",
      "objectId": "abc123/user/default/note-1",
      "publisher": "abc123",
      "modifiedAt": 1789253175
    }
  }
}
```

A Resource Installation originating from an externally acquired Resource may additionally contain:

```json
{
  "resourceId": "kjvonly/notes/entries/user/note-1"
}
```

The exact existing persisted record is exported.

---

# Why Records Are Keyed By ID

IndexedDB stores records by their IDs.

The archive mirrors this directly:

```text
domain_objects
    record-id → StoredDomainObject

resource_installations
    record-id → ResourceInstallation
```

Although each stored value also contains its own `id`, retaining both is useful.

The key provides direct lookup.

The stored `id` provides validation.

Archive validation can therefore require:

```text
map key === record.id
```

This helps detect malformed or corrupted archives.

---

# Domain Object Record

The archive stores the existing `StoredDomainObject` representation.

Conceptually:

```ts
interface StoredDomainObject {
  readonly id: string;

  readonly objectType: string;

  readonly objectId: string;

  readonly value: unknown;
}
```

The archive does not define another Domain Object schema.

The `value` is the same accepted Domain Object value already stored by the application.

For example:

```text
StoredDomainObject
    id
    objectType
    objectId
    value
```

where `value` may be:

```text
Chapter
Note
BibleTextMarkup
PlanSubscription
PlanProgress
Paragraphs
Pericopes
Strong's
...
```

The owning Domain continues to define the actual value schema.

---

# Resource Installation Record

Version 1 uses the existing Resource Installation record as the Resource-state metadata associated with a stored Domain Object.

Conceptually:

```ts
interface ResourceInstallation {
  readonly id: string;

  readonly objectType: string;

  readonly objectId: string;

  readonly publisher: string;

  readonly resourceId?: string;

  readonly modifiedAt: number;
}
```

The current implementation requires `resourceId`.

The local-write work described by this specification may make it optional.

The important archive fields are:

```text
objectType
objectId
publisher
modifiedAt
```

`resourceId`, when present, records the Resource identity associated with an externally acquired installation.

For locally authored Resource-backed state, it may be absent.

A missing `resourceId` therefore means:

```text
the Domain Object was locally created
rather than installed from an external Resource
```

This distinction does not change the Domain Object itself.

---

# Resource Installation Naming

The existing `ResourceInstallation` name originated when these records were only created during Resource installation.

With this design the record has a broader responsibility.

It describes the Resource-related state associated with a Domain Object, regardless of whether the current Domain Object originated from:

```text
an external Resource
an archive
or a local Resource-backed write
```

A future rename may therefore be appropriate.

Possible names include:

```text
ResourceObjectState
ResourceObjectRecord
ResourceState
```

Renaming is not required for implementation of this design.

The archive design depends on the semantics of the record, not its current class name.

---

# Archive Source Of Truth

`resource_installations` is the source of truth for which archived Domain Objects represent importable Resource-backed state.

Conceptually:

```text
resource_installations
        ↓
installation.id
        ↓
domain_objects[installation.id]
        ↓
import candidate
```

A Domain Object appearing without a corresponding Resource Installation does not independently become an import candidate.

This is important because `domain_objects` may also contain derived or supporting objects that are recreated by installers.

For example:

```text
Bible Chapter installer
    ↓
Chapter
    +
BibleVersion
```

The Chapter has Resource state.

The supporting BibleVersion does not necessarily represent an independently importable Resource.

Using the Resource Installation collection as the worklist prevents derived Domain records from accidentally becoming archive Resources.

---

# Export

Export creates an archive from selected Resource-backed Domain state.

The basic flow is:

```text
selected object types
        ↓
Resource Installation records
        ↓
matching Domain Object records
        ↓
archive object
        ↓
JSON
        ↓
gzip
        ↓
.kjva
```

Export does not encode the Domain Object back through the Resource transport pipeline.

The archive contains the accepted persisted Domain state and its associated Resource metadata.

---

# Export Selection

Users must be able to select which kinds of application data are exported.

Example UI categories include:

```text
Notes
Bible Text Markups
Reading Plans
Bible Chapters
Paragraphs
Pericopes
Bible Book Names
Bible Search Indexes
Strong's
```

Selection is implemented using Domain `objectType`.

Conceptually:

```ts
interface ArchiveExportSelection {
  readonly objectTypes: ReadonlySet<string>;
}
```

Application-facing labels may group several object types.

For example:

```text
Reading Plans
    ↓
reading-plan/subscription
reading-plan/progress
```

The archive itself does not need to preserve these UI groupings.

They are an Application/UI concern.

---

# Recommended Default Export Selection

The normal user-facing export experience should prioritize user-created state.

Conceptually:

```text
selected by default

Notes
Bible Text Markups
Reading Plan Subscriptions
Reading Plan Progress
```

Large redistributable/reference datasets such as Bible Chapters or Strong's may be available as selectable export categories but do not need to be selected by default.

The exact default selection is an Application/UI decision and is not encoded into the archive format.

---

# Export Algorithm

Export begins with Resource Installation records rather than independently scanning every Domain Object.

For each Resource Installation:

```text
installation
    ↓
is installation.objectType selected?
    ↓ yes
domain_objects[installation.id]
    ↓
archive pair
```

The exported maps therefore contain matching records:

```text
domain_objects[id]
resource_installations[id]
```

The two maps should normally contain the same set of keys.

If an installation exists without a corresponding Domain Object, export should report the inconsistent record rather than fabricating Domain state.

Export should not repair or mutate persistence as a side effect.

---

# Export Does Not Use Outbox

The Outbox is transient publication state.

It is not archive state.

Therefore:

```text
OUTBOX
    ✗ not exported
```

A locally created Resource-backed Domain Object must be exportable even when its publication remains pending or has never reached a relay.

That requirement is why local Resource writes must also create/update the Resource Installation record.

---

# Local Resource Writes

The existing local write transaction currently persists:

```text
DOMAIN_OBJECTS
+
OUTBOX
```

Resource-backed local writes will be changed to persist:

```text
DOMAIN_OBJECTS
+
RESOURCE_INSTALLATIONS
+
OUTBOX
```

in the same transaction.

Conceptually:

```text
local Domain change
        ↓
prepare ResourcePublication intent
        ↓
assign Resource modifiedAt
        ↓
transaction
    ├── Domain Object
    ├── Resource Installation
    └── Outbox entry
```

This ensures the archive sees local Resource-backed state regardless of network publication status.

---

# Local Write modifiedAt

A local Resource revision must receive its `modifiedAt` when the local Resource-backed change is committed.

It MUST NOT receive a new `modifiedAt` merely because it is exported.

Therefore:

```text
local write time
    → modifiedAt assigned

archive export time
    → modifiedAt unchanged
```

The same Resource revision timestamp should also be used by publication transport where applicable.

For Nostr:

```text
Resource Installation.modifiedAt
        =
ResourcePublication revision timestamp
        =
Nostr event.created_at
```

This preserves one revision timestamp across local persistence and external publication.

---

# Successful Publication

Successful publication does not create a new Domain revision.

Therefore successful Outbox publication should continue to mean:

```text
publish
    ↓
accepted by publication strategy
    ↓
remove / complete Outbox entry
```

It does not need to generate a new Resource Installation revision.

The Resource Installation already describes the local Resource revision committed with the Domain Object.

---

# External Resource Installation

External Resources continue to follow the existing lifecycle.

Conceptually:

```text
external Resource
    ↓
DecodedResourceContent
    ↓
Resource Handler
    ↓
Interpreter
    ↓
Validator
    ↓
Installer
    ↓
DOMAIN_OBJECTS
+
RESOURCE_INSTALLATIONS
```

No lifecycle behavior changes because archives exist.

---

# Archive Import

Archive import consists of two layers.

The first layer understands the archive.

The second layer is the existing Resource lifecycle.

```text
Archive-specific

.kjva
    ↓
decompress
    ↓
parse JSON
    ↓
validate archive structure
    ↓
choose import workset
    ↓
reconstruct DecodedResourceContent


Existing Resource lifecycle

DecodedResourceContent
    ↓
ResourceHandler
    ↓
Interpreter
    ↓
Validator
    ↓
Installer
```

The boundary between the two is `DecodedResourceContent`.

---

# Import Workset

The archived `resource_installations` collection defines the initial import workset.

Conceptually:

```ts
let workset = Object.values(archive.resource_installations);
```

For each archived installation:

```text
look up local Resource Installation by id
```

If there is no local installation:

```text
candidate remains in workset
```

If a local installation exists:

```text
archive.modifiedAt > local.modifiedAt
    → candidate remains

archive.modifiedAt <= local.modifiedAt
    → remove candidate from workset
```

This is an import optimization.

It prevents obviously stale archive records from unnecessarily reaching Domain processing.

It is not a replacement for existing installer policy.

The actual installer remains authoritative.

---

# Import Does Not Delete Local Resource Installations

The import filtering described above is entirely in memory.

For example:

```text
archive installation list

A
B
C
D

local comparison

A → stale
B → newer
C → missing locally
D → stale

remaining in-memory workset

B
C
```

No local IndexedDB record is deleted during this filtering.

Removing an entry means only:

```text
do not process this archive candidate
```

---

# Matching Domain Objects

For every Resource Installation remaining in the workset, the importer looks up:

```text
archive.domain_objects[installation.id]
```

The entry is invalid if the matching Domain Object does not exist.

The importer should also verify:

```text
installation.id
    ===
domainObject.id

installation.objectType
    ===
domainObject.objectType

installation.objectId
    ===
domainObject.objectId
```

This prevents mismatched metadata from being used to construct Resource input.

---

# Reconstructing Resource Content

The stored Domain Object is not necessarily identical to the Resource JSON accepted by its Resource handler.

For example, a Domain Object may contain application identity fields that are not part of Resource content.

Therefore the importer does not simply use:

```text
DecodedResourceContent.value =
    storedDomainObject.value
```

for every Domain.

Instead it reuses the existing Domain-to-Resource preparation logic.

Conceptually:

```text
Stored Domain Object
        ↓
existing Domain → Resource preparation
        ↓
ResourcePublication-like representation
        ↓
publisher
resourceType
resourceId
value
```

The archive does not define an archive-specific mapper.

The same conversion used to prepare a Domain Object for Resource publication is reused.

This provides the canonical Resource identity and Resource content for that Domain Object.

---

# Why Publication Preparation Is Reused

The current publication implementations already perform transformations such as:

```text
Note
    ↓
remove Domain-only id
    ↓
Notes Resource value
```

and:

```text
BibleTextMarkup
    ↓
extract publisher/name/chapter from id
    ↓
Resource value = markings
```

These transformations are Domain Resource responsibilities.

Archive import should not duplicate them.

Therefore:

```text
Domain → Resource conversion
```

is a reusable Domain Resource capability with at least two consumers:

```text
Resource publication
Archive reconstruction
```

This is not an archive-specific mapping layer.

---

# Resource Identity Reconstruction

Archive import does not need to preserve original transport packaging.

The canonical Resource identity can be reconstructed from the Domain Object identity through the owning Domain's existing Resource conversion.

For example:

```text
Domain Object

bible/text-markup:
<publisher>/kjvs/10_13

        ↓

canonical Resource

publisher:
<publisher>

resourceType:
kjvonly/overlays/text-markup

resourceId:
kjvonly/overlays/text-markup/kjvs/10_13
```

This also means an object originally installed from a bundle may later be imported as an independently reconstructed Resource.

That is intentional.

The archive represents accepted Resource-backed Domain state rather than the original transport packaging.

---

# Original resourceId

An externally installed Resource Installation may retain an original `resourceId`.

For example:

```text
resourceId:
kjvonly/bible/chapters/kjvs
```

may have originally represented a bundle containing many chapters.

The archive preserves that Resource Installation record because it is existing provenance.

However, import does not need to reconstruct that original bundle.

The Domain Object's normal Resource preparation can reconstruct a canonical single-object Resource such as:

```text
kjvonly/bible/chapters/kjvs/10_13
```

where supported by the Resource contract.

Therefore:

```text
ResourceInstallation.resourceId
```

is not required to be the Resource ID used for reconstructed archive input.

It remains useful provenance describing how the accepted object originally entered the application.

---

# Local Resource Objects

A locally authored Resource-backed Domain Object may have a Resource Installation with no original `resourceId`.

For example:

```json
{
  "id": "bible/text-markup:publisher/kjvs/10_13",
  "objectType": "bible/text-markup",
  "objectId": "publisher/kjvs/10_13",
  "publisher": "publisher",
  "modifiedAt": 1789253175
}
```

Archive import reconstructs its canonical Resource identity from the Domain Object.

Therefore absence of `resourceId` does not prevent import.

---

# Constructing DecodedResourceContent

Once Domain-to-Resource preparation succeeds, archive import constructs the existing Resource input.

Conceptually:

```ts
const decoded: DecodedResourceContent = {
  publisher: publication.publisher,

  resourceType: publication.resourceType,

  resourceId: publication.resourceId,

  modifiedAt: installation.modifiedAt,

  value: publication.value,
};
```

The current `DecodedResourceContent` interface also carries `mediaType`.

The archive does not need to persist `mediaType`, because the archive already contains decoded JSON.

If the current implementation still requires the field during the first implementation slice, it may be supplied from the normal Resource preparation result.

No archive-specific media type is required.

A later cleanup may remove transport decoding metadata from `DecodedResourceContent` if it has no post-decoding consumers.

That cleanup is not required by the archive format itself.

---

# Resource Handler Dispatch

After reconstruction, import uses the existing Resource handler registry.

Conceptually:

```text
decoded.resourceType
        ↓
ResourceHandler
        ↓
interpret()
        ↓
validate()
        ↓
install()
```

There is no Archive Resource Handler.

There is no Archive Installer.

There is no Archive Domain Validator.

Archive handling stops once valid `DecodedResourceContent` has been constructed.

---

# Validation

Archive import has two distinct validation stages.

Archive structural validation checks the envelope and relationships between the two persisted record maps.

Resource validation remains entirely owned by the existing Resource lifecycle.

Archive structural validation includes:

```text
supported archive version

domain_objects is an object

resource_installations is an object

map key equals record.id

required record fields exist

matching Domain Object exists for each imported Resource Installation

objectType agrees between paired records

objectId agrees between paired records

modifiedAt is a valid numeric value

publisher is present
```

After this stage, normal Resource validation still occurs.

Passing archive validation does not imply that the Resource content is valid.

---

# No Archive-Specific Domain Validation

The archive must not validate individual Note, Chapter, Text Markup, Plan, or Strong's schemas itself.

For example:

```text
archive parser
    ✗ does not validate Note schema

Note ResourceHandler
    ✓ validates Note schema
```

This ensures malformed imported data receives exactly the same Domain validation as equivalent externally acquired Resource data.

---

# Freshness

Archive import does not define a new conflict-resolution policy.

The archive's Resource Installation `modifiedAt` is the Resource revision timestamp supplied to the existing lifecycle.

The importer may use it to prefilter stale candidates:

```text
archive <= local
    → skip archive work
```

but existing Domain installer behavior remains authoritative.

Therefore:

```text
archive import freshness
    =
existing Resource installation freshness
```

No archive-specific Last-Write-Wins policy is introduced.

---

# Independent Import

Each archived Resource-backed Domain Object can be processed independently.

Conceptually:

```text
A → handled
B → validation failure
C → stale
D → handled
```

Failure of B does not require rollback of unrelated A and D.

The import operation should produce a result describing each candidate.

Possible application-level results may include:

```text
installed
skipped-current
unsupported
invalid
failed
```

Exact result naming can be decided during implementation.

---

# Import Side Effects

Archive import installs accepted Resource state locally.

It does not automatically enqueue imported objects for network publication.

Therefore:

```text
archive import
    ↓
Domain Object
Resource Installation

NOT automatically

Outbox publication
```

Import and publication remain separate operations.

This prevents importing a backup from unexpectedly publishing all of its contents to Nostr.

---

# Store Selection

Version 1 includes only:

```text
domain_objects
resource_installations
```

The following stores are not exported:

```text
resource_receipts
outbox
nostr_events
```

Application settings, runtime layout, panes, buffers, discovery configuration, transient caches, and browser state are also outside the archive.

---

# Resource Receipts

Resource receipts are runtime bookkeeping about processing attempts.

They are not necessary to reconstruct accepted Resource-backed Domain state.

Therefore:

```text
RESOURCE_RECEIPTS
    ✗ excluded
```

Imported Resources may naturally create new receipts as they pass through the normal Resource processing lifecycle.

---

# Outbox

Outbox entries describe pending publication work rather than accepted Resource-backed Domain state.

Therefore:

```text
OUTBOX
    ✗ excluded
```

The local-write Resource Installation change ensures pending unpublished Domain state remains exportable without preserving Outbox work.

---

# Nostr Events

Raw Nostr events are transport/infrastructure data.

They are not required by the archive.

Therefore:

```text
NOSTR_EVENTS
    ✗ excluded
```

The archive does not need:

```text
kind
event id
tags
signature
relay
descriptor
```

to reconstruct accepted Resource-backed Domain state.

---

# Resource Kind

Resource kind is a Nostr boundary concern.

The application currently uses Resource kind:

```text
37770
```

for Resource publication.

The archive does not store it.

When an imported Domain Object is later published, normal Nostr Resource publication assigns the appropriate Resource kind.

---

# Media Type

The archive contains JSON that has already crossed the Resource content decoding boundary.

It therefore does not preserve Resource transport encoding such as:

```text
application/json+gzip+hex
```

The archive itself is:

```text
JSON
+
gzip
```

Resource media type remains relevant to external Resource transport but is not part of the `.kjva` persistence format.

---

# Bundles

The archive does not preserve original Resource bundle boundaries.

For example, an external Resource may originally contain:

```text
kjvonly/bible/chapters/kjvs
    ↓
many chapter objects
```

After installation the application has individual persisted Domain Objects and Resource Installation records.

The archive stores those accepted records individually.

Import reconstructs canonical Resource input for each archived Domain Object.

Conceptually:

```text
original bundle
    ↓
installation
    ↓
Chapter A
Chapter B
Chapter C
    ↓
archive
    ↓
three Resource-backed archive records
```

The original bundle structure is not required.

---

# Archive Normalization

This means the archive is a normalized representation of accepted Resource-backed Domain state.

It is not a byte-for-byte preservation of the Resource as originally transported.

The lifecycle is:

```text
external Resource
    ↓
normal application acceptance
    ↓
accepted Domain state
    ↓
.kjva
    ↓
reconstructed Resource input
    ↓
normal application acceptance
```

This is deliberate.

---

# Reading Plans

Reading Plans are part of the archive/import-export scope.

Before Reading Plan archives can fully round-trip, the remaining inbound Resource lifecycle work for user-owned plan data must be completed.

The intended round-trip includes:

```text
Plan Definitions where selected
Plan Subscriptions
Plan Progress
```

Plan subscriptions and progress already have outbound Resource preparation.

Their inbound interpretation/validation/installation support must be completed so archive import can use the same Resource lifecycle as external acquisition.

No archive-specific Reading Plan importer should be created.

---

# Application Ownership

Import/export is an Application capability.

The Application should own the long-lived import/export service.

Svelte should consume that service through the normal ApplicationContext capability boundary where required.

The application service coordinates:

```text
selection
export
archive parsing
import orchestration
result reporting
```

The Domain and Resource layers continue to own:

```text
Domain → Resource preparation
Resource interpretation
Resource validation
Resource installation
```

---

# Browser Responsibilities

Browser-specific file interaction should remain at the UI/application browser boundary.

Examples include:

```text
selecting a .kjva file
reading the Blob/ArrayBuffer
triggering file download
```

The core archive encoder/decoder should operate on data or bytes rather than constructing hidden DOM elements internally.

This replaces the legacy ImporterService/ExporterService pattern that directly manipulates `<input>` and `<a>` elements.

---

# Suggested Components

The exact names may change during implementation, but the responsibilities should remain approximately:

```text
Application

ArchiveService
    export(selection)
    import(bytes)


Archive format

ArchiveEncoder
    Archive Object → gzip bytes

ArchiveDecoder
    gzip bytes → validated Archive Object


Persistence access

ArchiveStoreReader
    read selected Resource Installations
    read matching Domain Objects


Resource reconstruction

existing Domain → Resource preparation
    Domain Object → canonical Resource input


Existing Resource lifecycle

ResourceHandler registry
Interpreter
Validator
Installer
```

There should not be an archive-specific implementation inside each Domain if the Domain already has the required Resource preparation logic.

---

# Important Types

Conceptually:

```ts
interface KJVOnlyArchiveV1 {
  readonly version: 1;

  readonly domain_objects: Readonly<Record<string, StoredDomainObject>>;

  readonly resource_installations: Readonly<
    Record<string, ResourceInstallation>
  >;
}
```

Export selection:

```ts
interface ArchiveExportSelection {
  readonly objectTypes: ReadonlySet<string>;
}
```

Import source pair:

```ts
interface ArchivedResourceObject {
  readonly domainObject: StoredDomainObject;

  readonly installation: ResourceInstallation;
}
```

The latter is an in-memory implementation model.

It does not need to appear in the serialized archive.

---

# Archive Invariants

Version 1 should maintain the following invariants:

```text
The archive is gzip-compressed JSON.

The archive contains a version.

The archive contains domain_objects.

The archive contains resource_installations.

Resource Installations define the import workset.

Every importable Resource Installation has a matching Domain Object.

Paired records have the same id.

Paired records have the same objectType.

Paired records have the same objectId.

modifiedAt comes from Resource state.

Export never generates a new modifiedAt.

Archive import never writes Domain Objects directly.

Archive import reconstructs DecodedResourceContent.

Normal Resource handlers perform Domain validation.

Normal installers remain authoritative for acceptance/freshness.

Outbox entries are not archived.

Nostr events are not archived.

Resource receipts are not archived.

Archive import does not automatically publish imported Resources.

Export selection is based on objectType.

Original bundle boundaries are not preserved.

Original transport encoding is not preserved.
```

---

# High-Level Export Flow

```text
User
    ↓
select export categories
    ↓
Application Archive Service
    ↓
selected objectTypes
    ↓
RESOURCE_INSTALLATIONS
    ↓
matching DOMAIN_OBJECTS
    ↓
{
    version,
    domain_objects,
    resource_installations
}
    ↓
JSON
    ↓
gzip
    ↓
.kjva
```

---

# High-Level Import Flow

```text
.kjva
    ↓
gzip decompress
    ↓
JSON parse
    ↓
archive structure validation
    ↓
RESOURCE_INSTALLATIONS archive map
    ↓
compare local modifiedAt
    ↓
remove stale/current entries
from in-memory workset
    ↓
matching DOMAIN_OBJECTS
    ↓
Domain → Resource preparation
    ↓
DecodedResourceContent
    ↓
ResourceHandler
    ↓
Interpreter
    ↓
Validator
    ↓
Installer
    ↓
DOMAIN_OBJECTS
+
RESOURCE_INSTALLATIONS
```

---

# Local Write Flow

```text
Domain mutation
    ↓
Domain Resource publication preparation
    ↓
modifiedAt
    ↓
IndexedDB transaction
    ├── DOMAIN_OBJECTS
    ├── RESOURCE_INSTALLATIONS
    └── OUTBOX
    ↓
Outbox wakeup
    ↓
publication
```

This is the primary persistence change required to make locally created Resource-backed state reliably exportable.

---

# Architectural Impact

This design intentionally changes the previous Resource Archive direction.

The earlier Resource Archive ADR described archives as preserving:

```text
original Resource boundaries
serialized Resource content
```

and explicitly avoided depending on:

```text
application persistence layout
Resource Installation bookkeeping
```

This design instead defines `.kjva` as a normalized snapshot of accepted Resource-backed Domain state:

```text
StoredDomainObject
+
ResourceInstallation
```

That change is intentional.

The architecture documentation should therefore be revised rather than attempting to force the implementation to satisfy both models.

The revised architectural principle becomes:

> A KJVOnly archive preserves accepted Resource-backed Domain state and re-enters the normal Resource lifecycle at decoded Resource content.

This still preserves the most important safety boundary:

> Archive data is not trusted application state merely because it came from an archive.

It must still pass normal Domain interpretation, validation, and installation.

---

# Implementation Sequence

A practical implementation sequence is:

1. Revise the Resource Archive ADR to describe the normalized two-store archive model.

2. Broaden Resource Installation semantics so Resource-backed local writes create/update a record in the same transaction as Domain Object + Outbox.

3. Add the Resource revision timestamp to Resource publication intent so local Resource Installation `modifiedAt` and Nostr `created_at` represent the same revision.

4. Finish Reading Plan Subscription and Progress inbound Resource handling.

5. Implement archive model validation.

6. Implement archive encoding and decoding:
   JSON → gzip and gzip → JSON.

7. Implement export persistence reads and object-type filtering.

8. Reuse/generalize Domain → Resource publication preparation where required for archive reconstruction.

9. Implement archive import workset filtering using Resource Installation IDs and `modifiedAt`.

10. Feed reconstructed `DecodedResourceContent` through existing Resource handlers.

11. Replace the legacy ImporterService and ExporterService UI path.

12. Add browser tests for `.kjva` export/import round trips.

---

# Testing Expectations

The implementation should eventually cover:

```text
archive gzip round trip

unsupported archive version

malformed gzip

malformed JSON

missing domain_objects

missing resource_installations

map key / record id mismatch

installation with missing Domain Object

objectType mismatch

objectId mismatch

export selection filtering

local Resource-backed object export

externally installed object export

pending-Outbox local object export

stale archive Resource skipped

newer archive Resource reaches ResourceHandler

Domain validation failure remains rejected

one invalid entry does not prevent unrelated valid entries

Note round trip

Text Markup round trip

Reading Plan Subscription round trip

Reading Plan Progress round trip

optional Bible Chapter round trip

archive import does not create Outbox publication
```

The authoritative acceptance tests should demonstrate that archive-imported content passes through the same Domain Resource handler and validator used by equivalent externally acquired content.

---

# Final Model

The complete design reduces to:

```text
PERSISTED RESOURCE-BACKED STATE

StoredDomainObject
        +
ResourceInstallation
        ↓
      .kjva
```

Export:

```text
selected Resource Installations
        ↓
matching Domain Objects
        ↓
JSON
        ↓
gzip
```

Import:

```text
gzip
    ↓
JSON
    ↓
Resource Installations
    ↓
freshness workset
    ↓
matching Domain Objects
    ↓
normal Domain → Resource preparation
    ↓
DecodedResourceContent
    ↓
existing Resource lifecycle
```

Local writes:

```text
Domain Object
+
Resource Installation
+
Outbox
```

The archive therefore remains a small feature built primarily by composing capabilities the application already has rather than introducing another persistence, validation, or Resource model.
