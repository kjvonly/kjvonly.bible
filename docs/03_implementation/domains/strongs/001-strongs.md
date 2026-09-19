# Strong's Domain Implementation

## Status

**Status:** Current
**Domain:** Strong's
**Resource Type:** `kjvonly/strongs/definitions`
**Domain Object Type:** `strongs/definition`

---

# 1. Purpose

This document describes the current Strong's Domain implementation.

Strong's was the second concrete Domain used to prove that the Resource architecture was not Bible-Chapter-specific.

The implementation deliberately reuses the generic Resource lifecycle while keeping Strong's interpretation, validation, identity, persistence, and read behavior inside the Strong's Domain.

The current path is:

```text
Published Strong's Resource
    ↓
Resource resolution / decoding
    ↓
StrongsInterpreter
    ↓
StrongsValidator
    ↓
StrongsInstaller
    ↓
Strongs + ResourceInstallation
    ↓
IndexedDB
    ↓
StrongsService
    ↓
Strong's UI / Bible references
```

---

# 2. Domain Ownership

Strong's is its own application Domain.

It is not implemented inside the Bible Domain merely because Strong's definitions are commonly reached from Bible words.

The durable ownership rule is:

```text
Bible
    owns Bible text and Bible navigation

Strong's
    owns Strong's definition identity, validation,
    persistence, installation, and read behavior
```

The Resource namespace does not dictate source-folder ownership.

---

# 3. Resource Contract

The Resource Type is:

```text
kjvonly/strongs/definitions
```

Two path shapes are supported.

Individual definition:

```text
kjvonly/strongs/definitions/<edition>/<key>
```

Bundle:

```text
kjvonly/strongs/definitions/<edition>
```

The `<edition>` value is the version/edition scope used by the selected Strong's dataset.

A bundle value is an object keyed by Strong's key.

The Resource root with no edition path is not a valid terminal Strong's definition Resource.

---

# 4. Strong's Keys

Current Strong's keys must match:

```text
^[GH]\d+$
```

Examples:

```text
G1
G3056
H1
H430
```

Bundle keys may not contain `/`.

The key is validated independently from the serialized content, then checked against the content's own `number` field.

---

# 5. Domain Model

The installed `Strongs` Domain Object contains:

```text
id
number
originalWord
partsOfSpeech
phoneticSpelling
transliteratedWord
usageByBook
usageByWord
brownDef
strongsDef
thayersDef
```

The recursive Brown/Thayer definition nodes contain text and optional children.

Usage entries contain:

```text
text
href[]
class[]
```

The installed object remains free of Resource publication metadata.

---

# 6. Identity

Strong's identity has three distinct layers that must not be conflated.

## 6.1 Resource identity

Example:

```text
kjvonly/strongs/definitions/<edition>/<key>
```

## 6.2 Source/version identity

The current installer scopes Strong's definitions by publisher plus edition using the same publisher/version identity shape used by Bible version identity:

```text
<publisher>/<edition>
```

## 6.3 Domain Object identity

The installed Strong's ID is:

```text
<sourceId>/<key>
```

Constructed by:

```text
createStrongsId(sourceId, key)
```

With the current source identity this becomes conceptually:

```text
<publisher>/<edition>/<key>
```

The Domain Object ID is not the Nostr event ID and is not the Resource ID.

---

# 7. Interpretation

`StrongsInterpreter` verifies the Resource Type and parses the Resource identifier.

For an individual Resource:

```text
path = [edition, key]
```

it produces:

```text
StrongsCandidate {
    version: edition,
    key,
    value
}
```

For a bundle:

```text
path = [edition]
```

it creates one candidate per object entry.

Interpretation verifies routing structure only. It does not treat unvalidated serialized content as accepted Strong's Domain data.

---

# 8. Validation

`StrongsValidator` owns Strong's Domain validation.

It validates:

1. key shape (`G...` or `H...`),
2. full serialized Strong's content structure,
3. recursive definition-node structure,
4. usage structures,
5. and key consistency.

The key-consistency rule is:

```text
candidate.key === content.number
```

A Resource route claiming one Strong's key cannot silently contain a different Strong's definition.

The result is a `ValidatedStrongsCandidate`.

---

# 9. Installation

`StrongsInstaller` receives decoded Resource metadata plus validated candidates.

All candidates in one Resource installation must belong to one edition/version.

The installer calculates the publisher-scoped source identity and then installs each accepted candidate independently inside one Strong's installation transaction.

The transaction exposes narrow stores for:

```text
strongs
resourceInstallations
```

---

# 10. Installation Replacement Policy

Replacement is per Strong's definition.

For each candidate the installer reads the existing provenance for:

```text
objectType = strongs/definition
objectId = <strongsId>
```

If:

```text
incoming.modifiedAt <= existing.modifiedAt
```

that definition is skipped.

Otherwise the Strong's object and its `ResourceInstallation` record are written atomically.

This gives bundle installation mixed freshness semantics: newer entries can replace older installed definitions while entries already sourced from equally new or newer publications remain unchanged.

---

# 11. ResourceInstallation Provenance

Each accepted definition has a separate provenance record containing:

```text
objectType
objectId
publisher
resourceId
modifiedAt
```

The provenance answers which Resource publication installed the accepted definition.

The Strong's object itself remains transport-agnostic.

---

# 12. Persistence

Strong's definitions are stored in the shared application IndexedDB rather than a Strong's-specific database.

The Domain-facing store contract is `StrongsStore`:

```text
get(id)
put(strongs)
```

The IndexedDB adapter stores Strong's Domain Objects in the shared `domain_objects` store using:

```text
objectType = strongs/definition
```

Installation provenance is stored separately in `resource_installations`.

The Strong's installation transaction spans the required stores atomically.

This was an important architecture proof: multiple Domains can share the physical Application database without sharing Domain models or persistence contracts.

---

# 13. Read Path

`StrongsService` implements local-first lookup.

Conceptually:

```text
StrongsService.get(source, key)
    ↓
validate selected Strong's Resource source
    ↓
extract edition
    ↓
construct Strong's Domain Object ID
    ↓
StrongsStore.get(id)
```

If found locally, the definition is returned immediately.

If missing:

```text
StrongsService
    ↓
ResourceLoader.load(source, key)
    ↓
Resource pipeline installs definition
    ↓
StrongsStore.get(id) again
```

If Resource acquisition cannot find the definition, the service throws.

If acquisition reports success but the expected definition is still not installed, the service also throws rather than returning fabricated state.

---

# 14. Resource Selection

The Strong's Module has a Domain-owned Resource-selection contributor.

Its current requirements include:

```text
Strong's definitions
Bible Chapters
Bible Search
Bible Booknames
```

This reflects the Strong's UI behavior: definition browsing/search can require Bible location and display context in addition to the definition dataset itself.

The contributor builds the Resource snapshot when the Module Buffer is created.

`StrongsService` receives the selected `PublishedResourceReference`; it does not query Pane/Buffer mechanics or global mutable selection state.

---

# 15. Bible Integration

Bible Word content may contain `href` references that point to Strong's keys.

The Bible Domain does not own Strong's definition persistence.

At interaction time the UI resolves the selected Strong's source and asks the Strong's Domain for the requested definition.

The dependency direction stays explicit:

```text
Bible UI interaction
    → Strong's Domain API
```

rather than embedding definition data inside Chapter objects.

---

# 16. Why Strong's Was Architecturally Important

The Strong's implementation proved several Resource-architecture decisions beyond the original Chapter vertical slice.

It demonstrated that:

1. `ResourceInterpreter` and `ResourceValidator` are reusable contracts without a giant generic Resource-Type framework.
2. Domain-specific installers remain clearer than one universal installer.
3. Domain identity rules can differ while sharing generic Resource provenance.
4. the shared Application database can host multiple Domain object types.
5. `ResourceInstallation` can remain cross-cutting without polluting Domain models.
6. the local-first `ResourceLoader` service pattern applies beyond Bible Chapters.
7. Resource namespace and source-code Domain ownership are separate concerns.

---

# 17. Deliberate Non-Generalization

The implementation does not introduce a universal Domain repository or one generic Resource installer that attempts to understand every Domain type.

Instead, the generic Resource layer supplies stable contracts:

```text
ResourceInterpreter
ResourceValidator
ResourceHandler
InstallationTransaction
ResourceInstallation
ResourceLoader
```

The Strong's Domain supplies concrete meaning and policy.

That division has remained the preferred architecture as additional Resource types were implemented.

---

# 18. Failure Boundaries

The Strong's pipeline rejects:

- incorrect Resource Types,
- malformed Resource paths,
- unsupported root Resources,
- malformed bundle shapes,
- bundle keys containing `/`,
- invalid Strong's key patterns,
- malformed serialized definition content,
- content whose `number` disagrees with the Resource key,
- mixed-edition candidates in one install operation,
- missing Resources,
- and acquisition that fails to install the expected definition.

Validation happens before accepted Domain state is written.

---

# 19. Testing

The implementation has focused tests around:

```text
Strong's identity
StrongsInterpreter
StrongsValidator
StrongsInstaller
StrongsResourceHandler
Strong's installation transaction
StrongsService
Module Resource-selection contributor
browser Resource installation
relay-backed Resource acquisition
```

Tests should distinguish Domain behavior from concrete infrastructure integration.

---

# 20. Important Invariants

## 20.1 Strong's is a separate Domain

It is not a subfolder implementation detail of Bible.

## 20.2 Identity is publisher/edition scoped

Equivalent textual keys from different selected datasets do not collide.

## 20.3 Route key and content key must agree

```text
candidate.key === content.number
```

## 20.4 Domain objects do not contain publication metadata

Publication provenance lives in `ResourceInstallation`.

## 20.5 Replacement is per definition

Bundle freshness does not force an all-or-nothing overwrite.

## 20.6 Reads are local-first

Resource acquisition occurs only after a local miss.

## 20.7 Resource context is explicit

The Domain service receives the selected source rather than consulting runtime Pane/Buffer mechanics.

---

# 21. Related Documents

```text
docs/03_implementation/resources/002-resource-selection.md
docs/03_implementation/resources/004-resource-installation.md
docs/03_implementation/resources/005-resource-lifecycle-content.md
docs/03_implementation/persistence/001-indexeddb.md
docs/03_implementation/persistence/002-store-implementation.md
docs/03_implementation/domains/bible/002-chapters.md
```

This document should remain focused on the concrete Strong's Domain vertical slice rather than duplicating the generic Resource lifecycle.
