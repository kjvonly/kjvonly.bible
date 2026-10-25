# Strong's Domain Implementation

## Status

**Status:** Current
**Domain:** Strong's
**Resource Type:** `strongs/definition`
**Domain Object Type:** `strongs/definition`
**Data Type:** `kjvonly.strongs.definition@1`

> **Planned replacement (2026-10-21):** [Multi-format Dictionary editions](../dictionary/002-multi-format-editions.md) defines a single `dictionary/entries/strongs-kjvs` bundle with Bible-derived headword associations and Dictionary-owned chunk retrieval. The current per-definition Strong's Resource, installation, and persistence described below remain **current implementation**, not the target design. Strong's semantic model and public lookup/presentation behavior remain Strong's-owned. No legacy compatibility or migration will be added.

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
StrongsDataTypeHandler
    ↓
StrongsDomainObjectFactory
    ↓
GenericResourceInstaller
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
strongs/definition
```

Two path shapes are supported.

Individual definition:

```text
kjvonly/strongs/definition/<edition>/<key>
```

Bundle:

```text
kjvonly/strongs/definition/<edition>
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

## 6.1 Resource ID

Example:

```text
kjvonly/strongs/definition/<edition>/<key>
```

## 6.2 Source/version identity

The current Domain Object factory scopes Strong's definitions by publisher plus edition:

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

# 7. Semantic Validation

Strong's Resources now use `StrongsDataTypeHandler` for the published Resource contract.

The handler validates the single/bundle semantic shape before any Domain Object factory receives the value.

Archive reconstruction also registers `StrongsDefinitionDataTypeHandler` for the canonical persisted:

```text
strongs/definition@1
```

contract.

This distinction allows a collection Resource to produce individual canonical stored definitions without pretending the published and persisted datatype contracts are identical.

---

# 8. Domain Object Factory

`StrongsDomainObjectFactory` owns Strong's-specific Resource interpretation and Domain identity.

It handles both:

```text
individual Resource → one definition
bundle Resource     → many definitions
```

The factory validates routing/key invariants that require Resource context, including:

```text
G/H Strong's key shape
Resource key/content key consistency
publisher + edition/key identity construction
```

It emits canonical candidates with:

```text
objectType  = strongs/definition
dataType    = kjvonly.strongs.definition
dataVersion = 1
```

---

# 9. Generic Installation

Strong's no longer has a Domain-specific inbound installer, ResourceHandler, or installation transaction.

`GenericResourceInstaller` receives the factory candidates and applies the shared object-level currentness rule.

For each definition:

```text
ResourceInstallation(strongs/definition, objectId)
    ↓
if incoming.modifiedAt <= existing.modifiedAt
    → skip
otherwise
    → write StoredDomainObject
    → write ResourceInstallation
```

The writes occur through `IndexedDBGenericResourceInstallationTransaction` over:

```text
DOMAIN_OBJECTS
RESOURCE_INSTALLATIONS
```

---

# 10. ResourceInstallation Provenance

Each accepted definition has separate Resource state containing:

```text
objectType
objectId
publisher
resourceId
optional Resource metadata
modifiedAt
```

The Strong's object remains transport-agnostic.

---

# 11. Persistence

Strong's definitions are stored in the shared application `DOMAIN_OBJECTS` store under:

```text
objectType = strongs/definition
```

`StrongsStore` remains the Domain-facing read abstraction.

The important separation is:

```text
Domain service/store
    = Strong's read semantics

GenericResourceInstaller
    = inbound Resource persistence/currentness
```

The shared physical database does not create a shared Domain model.

---

# 12. Bundle Semantics

A Strong's bundle may produce many `strongs/definition` candidates.

Currentness remains per definition, so one bundle may:

```text
replace some definitions
skip some already-current definitions
install some missing definitions
```

without a Strong's-specific installer.

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

Strong's was the first migration that exposed several important generic-lifecycle requirements:

1. Resource Type and semantic datatype are independent contracts;
2. one Resource may produce many independently current Domain Objects;
3. Domain Object candidates carry canonical `objectType/dataType/dataVersion`;
4. the generic installer can own persistence/currentness without understanding Strong's Resource ID grammar;
5. archive reconstruction uses the reconstructed publication's payload datatype when re-entering Resource validation;
6. Domain-local reads remain local-first and independent from inbound installation mechanics.

---

# 17. Current Generic Boundary

The current split is:

```text
ResourceDataTypeHandler
    = semantic payload validation

StrongsDomainObjectFactory
    = Strong's identity + Resource-context invariants

GenericResourceInstaller
    = currentness + persistence + ResourceInstallation

StrongsService / StrongsStore
    = Domain-facing reads
```

The old Strong's Interpreter/Validator/Installer/ResourceHandler stack has been removed.

---

# 18. Failure Boundaries

The Strong's pipeline rejects:

- incorrect Resource Types,
- malformed Strong's Resource IDs,
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
StrongsDataTypeHandler
StrongsDefinitionDataTypeHandler
StrongsDomainObjectFactory
Generic Resource installation
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
