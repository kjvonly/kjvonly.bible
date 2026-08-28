# Resource Architecture — Strong’s and ApplicationDB 24-Hour Implementation Spec

**Status:** Current implementation handoff  
**Project:** KJVOnly.bible  
**Scope:** Resource Architecture work completed during the latest Strong’s implementation cycle  
**Authority:** Implementation record subordinate to ADRs `0000–0014`  
**Last updated:** 2026-08-27

---

# 1. Purpose

This document records the Resource Architecture implementation work completed during the most recent development cycle.

The primary goal was to implement a second concrete Published Resource type after Bible Chapters:

```text
kjvonly/bible/strongs
```

The Strong’s slice was intentionally implemented concretely rather than through a new generic framework. Its purpose was to prove that the architecture established by Bible Chapters can support another Domain while preserving the same boundaries around discovery, resolution, decoding, interpretation, validation, installation, provenance, and Domain persistence.

The current inbound shape is:

```text
Published Resource
→ Resource Discovery
→ Resource Resolution
→ VerifiedResourceContent
→ Content Decoding
→ DecodedResourceContent
→ Strong's Interpreter
→ StrongsCandidate
→ Strong's Validator
→ ValidatedStrongsCandidate
→ Strong's Installer
→ ApplicationDB
→ Strongs Domain Object
```

The work also validated an important persistence direction: Strong’s can be added without adding a new IndexedDB object store or changing the ApplicationDB schema.

---

# 2. Architectural Baseline Preserved

The implementation continues to honor these boundaries:

```text
Discovery != Resolution
Resolution != Content Decoding
Content Decoding != Interpretation
Interpretation != Domain Validation
Domain Validation != Installation
Installation != Persistence
Resource integrity != Domain validity
Domain Object != Resource
Resource != Nostr Event
```

The network proposes Published Resources.

The application decides what becomes accepted local Domain state.

No ADR changes were required during this cycle.

---

# 3. Generic Resource Rules Reused

All current application Resources continue to use Nostr kind:

```text
37770
```

Published Resource identity remains:

```text
kind + publisher pubkey + d tag
```

The event ID is publication identity, not Resource identity.

Resource Type remains the first three segments of the Resource Identifier:

```text
namespace/domain/resource-type
```

Everything after those first three segments is Resource-Type-specific path data.

Example:

```text
kjvonly/bible/strongs/kjvs/G1
```

becomes:

```text
resourceType:
    kjvonly/bible/strongs

path:
    kjvs/G1
```

The existing generic `parseResourceIdentifier()` utility was reused unchanged.

---

# 4. Generic Content Boundary Reused

The generic pipeline still converges on:

```text
VerifiedResourceContent
```

and then:

```text
DecodedResourceContent
```

after media decoding.

The application Composition Root already registers:

```text
application/json
gzip
hex
```

so a canonical media type such as:

```text
application/json+gzip+hex
```

is fully decoded before Strong’s-specific code receives it.

Strong’s interpretation therefore works against:

```ts
DecodedResourceContent.value: unknown
```

and has no knowledge of whether the content came from inline JSON, compressed content, descriptors, Blossom, or another representation provider.

---

# 5. Generic Interpretation and Validation Contracts Reused

The existing interpretation contract was sufficient:

```ts
export interface ResourceInterpreter<TCandidate> {
    readonly resourceType: string;
    interpret(
        resource: DecodedResourceContent
    ): Iterable<TCandidate>;
}
```

The existing validator contract was also sufficient:

```ts
export interface ResourceValidator<TCandidate, TValidated> {
    validate(candidate: TCandidate): TValidated;
}
```

No changes were required to either generic contract for Strong’s.

This is significant because Strong’s is the second concrete Resource Type exercising those seams.

---

# 6. Strong’s Became Its Own Application Domain

A major decision from this cycle was to move Strong’s out from under Bible ownership and treat it as its own application Domain.

Current ownership:

```text
src/lib/domains/strongs/
```

The reasoning is that Strong’s has its own:

```text
Domain Object
Resource Type
identity
validation
persistence
installation lifecycle
future search/index behavior
future standalone UI/module potential
```

The Bible reader may consume Strong’s, but it does not own it.

This also reinforces a broader ownership rule:

```text
shared use != shared ownership
```

---

# 7. Published Resource Namespace Does Not Dictate Domain Folder Ownership

The Published Resource Type remains:

```text
kjvonly/bible/strongs
```

while local application ownership is:

```text
domains/strongs
```

This is intentional.

Resource namespace and application source-code ownership solve different problems.

The Resource namespace may remain semantically grouped around Bible material without forcing the Strong’s Domain to live under `domains/bible`.

---

# 8. Strong’s Domain Model Boundary

The current Domain model is:

```ts
export interface Strongs {
    id: string;
    number: string;
    originalWord: string;
    partsOfSpeech: string;
    phoneticSpelling: string;
    transliteratedWord: string;
    usageByBook: UsageBy[];
    usageByWord: UsageBy[];
    brownDef: BrownDef | null;
    strongsDef: string;
    thayersDef: ThayersDef | null;
}

export type StrongsContent = Omit<Strongs, 'id'>;
```

The serialization boundary is:

```text
Published Strong's payload
    ↓
StrongsContent
    ↓
installation assigns local identity
    ↓
Strongs Domain Object
```

The local `id` is not part of the Published Resource payload.

---

# 9. Real Payload Shape Decisions

Real payload inspection established these nullable cases:

```text
brownDef = null
thayersDef = null
definitionNode.children = null
```

The validator was designed around those real payloads rather than inventing stricter assumptions.

The recursive definition structure is conceptually:

```ts
interface DefinitionNodeValue {
    text: string;
    children: DefinitionNodeValue[] | null;
}
```

and is implemented with `z.lazy(...)`.

No `.min(1)` constraints were added to descriptive text fields because current payload evidence did not justify those semantics.

---

# 10. Strong’s Resource Contract

Resource Type:

```text
kjvonly/bible/strongs
```

Supported forms:

```text
kjvonly/bible/strongs/{version}
kjvonly/bible/strongs/{version}/{key}
```

Examples:

```text
kjvonly/bible/strongs/kjvs
kjvonly/bible/strongs/kjvs/G1
kjvonly/bible/strongs/kjvs/H1
```

The Resource Type root is rejected:

```text
kjvonly/bible/strongs
```

Paths deeper than `version/key` are rejected.

---

# 11. Strong’s Bundle Shape

The supported bundle shape is:

```json
{
  "G1": { ... },
  "G2": { ... },
  "H1": { ... }
}
```

The version already exists in the Resource Identifier:

```text
kjvonly/bible/strongs/kjvs
```

so bundle keys do not repeat it.

This differs from the current historical Chapter bundle format, whose keys include values such as:

```text
kjvs/1_1
kjvs/1_2
```

Strong’s bundle keys are deliberately simpler:

```text
G1
G2
H1
```

Keys containing `/` are rejected by the interpreter.

---

# 12. Strong’s Identity

Implemented file:

```text
src/lib/domains/strongs/utils/strongs-identity.ts
```

Current helper:

```ts
export function createStrongsId(
    bibleVersionId: string,
    key: string
): string {
    return `${bibleVersionId}/${key}`;
}
```

Identity hierarchy now looks like:

```text
BibleVersion:
    <publisher>/<version>

Chapter:
    <publisher>/<version>/<chapterRef>

Strong's:
    <publisher>/<version>/<key>
```

Example:

```text
publisher/kjvs/G1
```

The identity helper does not validate `G1`/`H1` semantics. Validation owns key validity.

---

# 13. Strong’s Identity Tests

Implemented and passing:

```text
src/lib/domains/strongs/utils/strongs-identity.spec.ts
```

Coverage includes:

```text
creates ID
different keys
different Bible versions
different publishers
Hebrew keys
```

This establishes publisher-scoped and Bible-version-scoped Strong’s Domain identity.

---

# 14. Strong’s Candidate

Implemented file:

```text
src/lib/domains/strongs/resources/definitions/strongs-candidate.ts
```

Contract:

```ts
export interface StrongsCandidate {
    readonly version: string;
    readonly key: string;
    readonly value: unknown;
}
```

The candidate intentionally does not contain:

```text
publisher
local id
provenance
validated content
```

It is the Resource-Type interpretation result, not the installed Domain Object.

---

# 15. Strong’s Interpreter

Implemented file:

```text
src/lib/domains/strongs/resources/definitions/strongs-interpreter.ts
```

Resource Type constant:

```ts
export const STRONGS_RESOURCE_TYPE =
    'kjvonly/bible/strongs';
```

Responsibilities:

```text
verify Resource Type
parse Resource Identifier
verify parsed Resource Type
interpret Resource path
expand bundle entries
produce StrongsCandidate values
```

Individual Resource:

```text
kjvonly/bible/strongs/kjvs/G1
```

produces:

```ts
{
    version: 'kjvs',
    key: 'G1',
    value: resource.value
}
```

Bundle Resource:

```text
kjvonly/bible/strongs/kjvs
```

produces one candidate per bundle property.

---

# 16. Interpreter Boundary Decision

The interpreter checks Resource structure, not Strong’s Domain schema.

It rejects:

```text
wrong resource.resourceType
Resource Identifier Resource Type mismatch
root path
path with too many segments
bundle value that is not an object
null bundle
array bundle
empty bundle key
bundle key containing /
```

It does not validate:

```text
G/H key semantics
content.number
usageByBook
usageByWord
Brown/Thayer definitions
recursive children
```

Those are Domain validation concerns.

---

# 17. Strong’s Interpreter Tests

Implemented and passing:

```text
src/lib/domains/strongs/resources/definitions/strongs-interpreter.spec.ts
```

Coverage:

```text
individual Resource
bundle Resource
version preservation
wrong Resource Type
Resource Identifier Resource Type mismatch
root rejection
too many path segments
bundle must be object
null bundle rejection
array bundle rejection
bundle key containing / rejection
interpreter does not perform Domain schema validation
```

---

# 18. Validated Strong’s Candidate

Implemented file:

```text
src/lib/domains/strongs/resources/definitions/validated-strongs-candidate.ts
```

Contract:

```ts
export interface ValidatedStrongsCandidate {
    readonly version: string;
    readonly key: string;
    readonly content: StrongsContent;
}
```

Boundary:

```text
StrongsCandidate
    value: unknown
        ↓
StrongsValidator
        ↓
ValidatedStrongsCandidate
    content: StrongsContent
```

Installation therefore receives trusted Domain content rather than `unknown` data.

---

# 19. Strong’s Validator

Implemented file:

```text
src/lib/domains/strongs/resources/definitions/strongs-validator.ts
```

Current key pattern:

```ts
/^[GH]\d+$/
```

The validator checks:

```text
number: string
originalWord: string
partsOfSpeech: string
phoneticSpelling: string
transliteratedWord: string
usageByBook: UsageBy[]
usageByWord: UsageBy[]
brownDef: recursive definition | null
strongsDef: string
thayersDef: recursive definition | null
```

Usage entries require:

```ts
{
    text: string;
    href: string[];
    class: string[];
}
```

Definition nodes require:

```ts
{
    text: string;
    children: DefinitionNode[] | null;
}
```

---

# 20. Strong’s Key Consistency Rule

The validator enforces:

```text
candidate.key === content.number
```

Example:

```text
candidate.key = G1
content.number = G2
→ reject
```

This is a Domain consistency rule and intentionally remains outside the interpreter.

The current regex allows values such as `G0`/`H0`. A stricter future pattern could be:

```ts
/^[GH][1-9]\d*$/
```

but that was intentionally not imposed without stronger payload/domain evidence.

---

# 21. Unsupported Serialized Fields

Zod object parsing strips unsupported fields.

This continues the established Chapter rule:

> Unsupported serialized fields are not automatically retained as Domain state.

A Resource may contain additional serialized fields without those fields silently becoming part of the installed `Strongs` object.

---

# 22. Strong’s Validator Tests

Implemented and passing:

```text
src/lib/domains/strongs/resources/definitions/strongs-validator.spec.ts
```

Coverage includes:

```text
valid Greek entry
valid Hebrew entry
version preservation
brownDef = null
thayersDef = null
children = null
recursive definition nodes
invalid key
lowercase key
key without number
key/content number mismatch
non-object content
missing required fields
invalid usage entries
invalid definition children
unsupported fields stripped
```

---

# 23. Shared ApplicationDB Decision

Strong’s was used to prove the new shared persistence direction.

Physical IndexedDB stores:

```text
domain_objects
resource_installations
```

Generic Domain envelope:

```ts
export interface StoredDomainObject {
    readonly id: string;
    readonly objectType: string;
    readonly objectId: string;
    readonly value: unknown;
}
```

Strong’s is stored as:

```text
objectType:
    strongs/definition

objectId:
    publisher/kjvs/G1

id:
    strongs/definition:publisher/kjvs/G1
```

Adding Strong’s required:

```text
NO new object store
NO DB version bump
NO ApplicationDB schema change
```

This is a major success of the current persistence design.

---

# 24. Strong’s Store Contract

Implemented file:

```text
src/lib/domains/strongs/persistence/strongs-store.ts
```

Contract:

```ts
export interface StrongsStore {
    get(id: string): Promise<Strongs | undefined>;
    put(strongs: Strongs): Promise<void>;
}
```

Logical object type:

```ts
export const STRONGS_DEFINITION_OBJECT_TYPE =
    'strongs/definition';
```

A small design correction was made here: `STRONGS_DEFINITION_OBJECT_TYPE` belongs with the Domain persistence contract rather than inside the IndexedDB adapter.

Reason:

```text
strongs/definition
```

is logical application storage identity, not an IndexedDB implementation detail.

---

# 25. IndexedDB Strong’s Store

Implemented file:

```text
src/lib/domains/strongs/persistence/indexeddb-strongs-store.ts
```

The adapter maps `StrongsStore` onto:

```text
ApplicationDB
→ domain_objects
```

using the generic `StoredDomainObject` envelope.

The store intentionally does not write Resource provenance.

Provenance remains an installation concern.

---

# 26. Browser Test Placement Decision

The IndexedDB Strong’s store spec was moved under:

```text
tests/browser
```

because it exercises actual IndexedDB behavior.

The tests passed.

This established a useful testing rule:

```text
ordinary Domain/unit behavior
    → normal Vitest specs

real IndexedDB behavior
    → tests/browser
```

The browser environment remains authoritative for transaction semantics.

---

# 27. Resource Installation Provenance Reused

The existing generic provenance model was reused unchanged:

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

For Strong’s:

```text
objectType:
    strongs/definition

objectId:
    publisher/kjvs/G1
```

The installation record remains separate from the Domain Object.

No Strong’s-specific sync/provenance model was introduced.

---

# 28. Replacement Rule Reused

Strong’s uses the same provenance-based replacement rule as Chapters:

```text
no provenance
    → install

incoming.modifiedAt > current.modifiedAt
    → replace

incoming.modifiedAt <= current.modifiedAt
    → keep existing
```

The `StrongsStore` is not consulted for freshness.

`resource_installations` is authoritative for replacement decisions.

---

# 29. Strong’s Installation Store Set

Implemented file:

```text
src/lib/domains/strongs/resources/definitions/strongs-installation-stores.ts
```

Contract:

```ts
export interface StrongsInstallationStores {
    readonly strongs: StrongsStore;
    readonly resourceInstallations: ResourceInstallationStore;
}

export type StrongsInstallationTransaction =
    InstallationTransaction<StrongsInstallationStores>;
```

The complete Strong’s atomic write set is therefore:

```text
StrongsStore
+
ResourceInstallationStore
```

Unlike Chapter installation, Strong’s does not need to create a `BibleVersion` Domain Object as part of this operation.

---

# 30. Strong’s Installation Transaction

Implemented file:

```text
src/lib/domains/strongs/persistence/strongs-installation-transaction.ts
```

Concrete implementation:

```text
IndexedDBStrongsInstallationTransaction
```

It opens one physical transaction across:

```text
domain_objects
resource_installations
```

Inside that transaction it exposes:

```text
StrongsStore
ResourceInstallationStore
```

Both operate on the same IndexedDB transaction.

This establishes the intended atomic persistence unit:

```text
Strong's Domain Object write
+
Resource Installation provenance write
=
same transaction
```

---

# 31. Strong’s Installation Transaction Test

A browser-level transaction spec was written for the Strong’s adapter.

Its intended coverage is:

```text
transaction-scoped Strong's store
transaction-scoped ResourceInstallationStore
Domain Object + provenance commit together
rollback together when callback fails
callback result propagation
```

The generic IndexedDB infrastructure already proves underlying multi-store commit/rollback behavior. The Strong’s adapter test verifies correct participation in that mechanism.

---

# 32. Strong’s Installer

Implemented file:

```text
src/lib/domains/strongs/resources/definitions/strongs-installer.ts
```

Input:

```text
DecodedResourceContent
+
readonly ValidatedStrongsCandidate[]
```

The Resource supplies provenance:

```text
publisher
resourceId
eventId
modifiedAt
```

The candidate supplies trusted Domain data:

```text
version
key
StrongsContent
```

The installer creates local identity, performs replacement decisions, constructs the Domain Object, and writes Domain state plus provenance.

---

# 33. Installer Preconditions

Empty candidate collection:

```text
→ return
→ do not open transaction
```

Mixed Bible versions in one candidate collection:

```text
→ reject before transaction
```

The interpreter should already prevent this in normal flow, but the installer protects its own invariant independently.

---

# 34. Strong’s Local Identity During Installation

For:

```text
resource.publisher = publisher
candidate.version = kjvs
candidate.key = G1
```

installation derives:

```text
BibleVersionId:
    publisher/kjvs

StrongsId:
    publisher/kjvs/G1
```

The local ID is created only at installation.

The Resource payload remains free of local persistence identity.

---

# 35. Installed Strong’s Domain Object

Accepted candidate content becomes:

```ts
const strongs: Strongs = {
    ...candidate.content,
    id: strongsId
};
```

This preserves the same pattern established by Chapters:

```text
validated serialized content
+
derived local identity
=
installed Domain Object
```

---

# 36. Strong’s Provenance Record

Accepted candidates also create:

```ts
ResourceInstallation {
    id: createResourceInstallationId(
        'strongs/definition',
        strongsId
    ),
    objectType: 'strongs/definition',
    objectId: strongsId,
    publisher: resource.publisher,
    resourceId: resource.resourceId,
    eventId: resource.eventId,
    modifiedAt: resource.modifiedAt
}
```

The Domain Object and provenance are written in the same transaction.

---

# 37. Bundle Replacement Semantics

A single Strong’s bundle may contain a mix of accepted and skipped candidates.

Example:

```text
incoming Resource modifiedAt = 200

G1 current modifiedAt = 300
    → skip

G2 has no provenance
    → install

H1 current modifiedAt = 100
    → replace
```

All decisions occur inside the one transaction belonging to the incoming Resource.

Atomicity does not mean every candidate must overwrite local state.

It means the resulting accepted-state changes commit together.

---

# 38. Strong’s Installer Tests

Implemented:

```text
src/lib/domains/strongs/resources/definitions/strongs-installer.spec.ts
```

Coverage:

```text
new Strong's installation
provenance creation
newer Resource replacement
older Resource skip
equal modifiedAt skip
mixed install/skip bundle behavior
one transaction for entire Resource
empty candidate collection avoids transaction
mixed versions rejected before transaction
```

These tests intentionally mirror Chapter invariants without introducing a generic installer framework.

---

# 39. Strong’s Resource Handler

Implemented:

```text
src/lib/domains/strongs/resources/definitions/strongs-resource-handler.ts
```

Flow:

```text
DecodedResourceContent
    ↓
interpret
    ↓
materialize candidates
    ↓
validate all
    ↓
install
```

The handler guarantees that all candidate validation completes before installation begins.

This preserves the Resource atomicity boundary.

---

# 40. Validation Before Transaction

The important ordering is:

```text
DecodedResourceContent
    ↓
StrongsInterpreter
    ↓
StrongsCandidate[]
    ↓
validate every candidate
    ↓
ValidatedStrongsCandidate[]
    ↓
StrongsInstaller
    ↓
BEGIN TRANSACTION
```

If candidate `G2` fails after `G1` has validated:

```text
G1 valid
G2 invalid
→ throw
→ installer never called
→ no persistence begins
```

This prevents partial bundle installation caused by validation failure.

---

# 41. Handler Dependency Boundary Fix

A useful TypeScript issue surfaced during handler tests.

The handler originally depended directly on:

```ts
StrongsInstaller
```

The test fake was rejected because `StrongsInstaller` contains a private `transaction` member. That made the concrete class nominally incompatible with a structurally equivalent fake.

The dependency was corrected to a narrow behavioral contract:

```ts
export interface StrongsResourceInstaller {
    install(
        resource: DecodedResourceContent,
        candidates: readonly ValidatedStrongsCandidate[]
    ): Promise<void>;
}
```

The resulting dependency direction is:

```text
StrongsResourceHandler
    ↓ depends on
StrongsResourceInstaller
    ↑ implemented by
StrongsInstaller
```

This is a better boundary regardless of testing because the handler only needs `install()` behavior, not concrete transaction state.

---

# 42. Strong’s Resource Handler Tests

Implemented and passing:

```text
src/lib/domains/strongs/resources/definitions/strongs-resource-handler.spec.ts
```

Coverage:

```text
interpret → validate → install
all interpreted candidates are validated
interpretation failure prevents installation
validation failure prevents installation
empty candidate collection reaches installer
```

The validation-failure case is the key proof that persistence stays downstream of complete Resource validation.

---

# 43. Constructor Injection Remains the Pattern

No DI framework was introduced.

Dependencies continue to be supplied explicitly through constructors.

Production application-scoped construction belongs in:

```text
src/lib/application/runtime/application.ts
```

Tests construct fakes and controlled instances directly.

This remains consistent with the established Composition Root design.

---

# 44. ApplicationDB Is Now Proving Cross-Domain Storage

The current direction can be represented as:

```text
domain_objects

    objectType = bible/chapter
        publisher/kjvs/1_1
        publisher/kjvs/1_2

    objectType = strongs/definition
        publisher/kjvs/G1
        publisher/kjvs/G2
        publisher/kjvs/H1
```

This is preferable to creating:

```text
chapters store
strongs store
notes store
plans store
...
```

for every new Domain Object type.

The Domain still receives a strongly typed store contract while physical storage remains generic.

---

# 45. Three Different Identity Layers Remain Separate

For a Strong’s entry there are several identities with different purposes.

Published Resource identity:

```text
publisher + kind + d
```

Domain Object identity:

```text
publisher/kjvs/G1
```

Stored envelope identity:

```text
strongs/definition:publisher/kjvs/G1
```

Publication event identity:

```text
eventId
```

These should not collapse into one concept.

---

# 46. Publisher and Version Scoping

Strong’s Domain identity includes both publisher and Bible version.

Therefore:

```text
publisherA/kjvs/G1
publisherB/kjvs/G1
```

are different objects.

And:

```text
publisher/kjv/G1
publisher/kjvs/G1
```

are different objects.

This preserves future flexibility without assuming all Strong’s resources are globally identical across versions or publishers.

---

# 47. Provenance Remains Cross-Cutting

No Strong’s-specific provenance type was introduced.

The generic `ResourceInstallation` model remains the cross-cutting source of:

```text
publisher
Resource Identifier
event ID
modifiedAt
```

for the currently accepted publication behind a Domain Object.

This prevents every Domain from creating its own parallel synchronization metadata model.

---

# 48. Domain Object Remains Free of Publication Metadata

The installed `Strongs` object does not need fields such as:

```text
eventId
resourceId
modifiedAt
```

Those belong to provenance.

The Domain Object represents application-facing Strong’s content.

The Resource Installation record represents where that accepted content came from.

---

# 49. Candidate Remains Free of Resource-Level Metadata

`StrongsCandidate` also does not carry publisher or event metadata.

Those are available from `DecodedResourceContent` when installation needs them.

This prevents Resource-level metadata from being duplicated into every bundle candidate.

---

# 50. No Generic Resource-Type Framework Yet

Despite the similarity between Chapters and Strong’s, the implementation still intentionally avoids:

```text
ResourceTypePipeline
ResourceTypeRegistry
InstallerRegistry
generic Domain installer framework
generic repository framework
generic UnitOfWork framework
```

The Strong’s slice should first be completed end-to-end.

Only then should Chapter and Strong’s code be compared for genuinely identical repetition.

---

# 51. Why Genericization Is Still Deferred

Bible Chapters and Strong’s already reveal meaningful differences.

Bible Chapter installation includes concerns such as:

```text
BibleVersion creation
chapterRef semantics
historical bundle keys containing version/chapterRef
```

Strong’s includes:

```text
G/H key semantics
simple bundle keys
no BibleVersion creation during installation
strongs/definition logical object type
```

The architecture may contain the same conceptual stages without every implementation detail being generic.

Evidence comes before extraction.

---

# 52. Likely Future Abstraction Candidate

The strongest likely genericization candidate is the higher-level Resource Service flow:

```text
PublishedResourceReference
    ↓
discover
    ↓
resolve
    ↓
for each VerifiedResourceContent
    ↓
decode
    ↓
handle
```

Bible Chapters already implement this flow.

Strong’s Resource Service is the next step.

Once both concrete services exist, their code can be compared directly.

---

# 53. Handler Genericization Is Also Deferred

The current handler pattern is similar:

```text
interpret
materialize
validate all
install
```

That may eventually justify a generic handler abstraction.

It should not be extracted until the completed Chapter and Strong’s handlers are compared for actual semantic equivalence.

---

# 54. Persistence Repetition to Watch

The second Domain also reveals repeated low-level persistence operations around:

```text
StoredDomainObject envelope creation
createStoredDomainObjectId(...)
ResourceInstallationStore transaction adaptation
createResourceInstallationId(...)
```

These may justify small focused helpers later.

They do not currently justify a repository framework.

---

# 55. Current Strong’s Source Layout

Implemented/current files:

```text
src/lib/domains/strongs/

    models/
        strongs.model.ts

    utils/
        strongs-identity.ts
        strongs-identity.spec.ts

    persistence/
        strongs-store.ts
        indexeddb-strongs-store.ts
        strongs-installation-transaction.ts

    resources/
        definitions/
            strongs-candidate.ts
            strongs-interpreter.ts
            strongs-interpreter.spec.ts
            validated-strongs-candidate.ts
            strongs-validator.ts
            strongs-validator.spec.ts
            strongs-installation-stores.ts
            strongs-installer.ts
            strongs-installer.spec.ts
            strongs-resource-handler.ts
            strongs-resource-handler.spec.ts
```

Real IndexedDB specs belong under:

```text
tests/browser/
```

---

# 56. Completed Test Status

Reported passing during this cycle:

```text
strongs-identity.spec.ts
strongs-interpreter.spec.ts
strongs-validator.spec.ts
IndexedDB Strong's store browser spec
strongs-installer.spec.ts
strongs-resource-handler.spec.ts
```

A Strong’s installation transaction browser spec was also written to exercise `domain_objects + resource_installations` together.

The generic browser transaction infrastructure already provides the authoritative proof of IndexedDB multi-store atomicity.

---

# 57. Current Strong’s Vertical Slice Status

Completed:

```text
Domain ownership decision
Strong's model boundary
Resource Type contract
identity
identity tests
candidate
interpreter
interpreter tests
validated candidate
validator
validator tests
store contract
IndexedDB store
browser store tests
installation store set
IndexedDB installation transaction
installation transaction browser coverage
installer
installer tests
Resource handler
Resource handler tests
```

Still to complete:

```text
Strong's Resource Service
Resource Service tests
vertical browser Resource installation test
real relay → ApplicationDB test
Resource loader
read-side StrongsService
Composition Root wiring
ApplicationContext exposure if needed
final Chapter-vs-Strong's abstraction review
```

---

# 58. Immediate Next Step — Strong’s Resource Service

Next file:

```text
src/lib/domains/strongs/resources/definitions/strongs-resource-service.ts
```

Expected flow:

```text
PublishedResourceReference
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
      for each resolved content
         ↓
      ResourceContentDecoder.decode(...)
         ↓
      StrongsResourceHandler.handle(...)
```

Expected dependencies:

```text
ResourceDiscovery
ResourceResolver
ResourceContentDecoder
StrongsResourceHandler
```

The service should not know Strong’s schema, IndexedDB mechanics, replacement rules, or local identity construction.

---

# 59. Expected Resource Service Semantics

The Strong’s Resource Service should likely mirror the already-proven Chapter service semantics:

```text
false
    → Published Resource not discovered

true
    → Resource discovered and all resolved content processed

throw
    → Resource processing failure
```

Resolved contents should remain sequential unless concrete evidence requires parallelism.

For `descriptors`, each resolved descriptor remains independently transactional because each reaches the handler/install path separately.

---

# 60. Resource Service Tests

Next test file after the service:

```text
src/lib/domains/strongs/resources/definitions/strongs-resource-service.spec.ts
```

Expected coverage:

```text
missing Resource returns false
discovered Resource resolves
resolved content is decoded
decoded content is handled
success returns true
multiple resolved contents process
content decoding failure propagates
handler failure propagates
```

Only behavior that genuinely matches the Chapter service should be copied.

---

# 61. Vertical Browser Installation Test

After Resource Service unit tests, add a browser integration test using real:

```text
ResourceContentDecoder
StrongsInterpreter
StrongsValidator
StrongsInstaller
IndexedDBStrongsInstallationTransaction
ApplicationDB
browser IndexedDB
```

Discovery and Resolution may initially be faked.

The test should prove:

```text
valid Strong's bundle
    → all entries installed

invalid candidate anywhere in bundle
    → no Domain Objects installed from that Resource

accepted Domain Object
+
ResourceInstallation
    → persisted together
```

---

# 62. Real Relay-to-ApplicationDB Test

After the vertical browser test, add the Strong’s equivalent of the completed Bible Chapter relay test.

Target proof:

```text
local Nostr relay
→ ResourceClient
→ ResourceDiscovery
→ ResourceResolver
→ ResourceContentDecoder
→ StrongsResourceService
→ StrongsInterpreter
→ StrongsValidator
→ StrongsInstaller
→ ApplicationDB
```

Verify at minimum:

```text
Strong's Domain Object exists
publisher/version/key identity is correct
ResourceInstallation exists
provenance eventId matches the actual publication
modifiedAt is preserved
```

This will prove the entire inbound Strong’s path with no fake transport layer.

---

# 63. Strong’s Resource Loader

After inbound installation is proven, add the read-side acquisition seam.

Expected file:

```text
src/lib/domains/strongs/resources/definitions/strongs-resource-loader.ts
```

Its responsibility should be:

> Make the requested Strong’s Domain Object locally available if a Published Resource can provide it.

The loader should not return the Domain Object itself.

The Domain service should reread the local store after acquisition.

---

# 64. Strong’s Read-Side Service

Expected file:

```text
src/lib/domains/strongs/services/strongs.service.ts
```

Target flow:

```text
Strong's local ID
    ↓
StrongsStore.get(...)
    ↓
hit?
    ├── yes → return
    └── no
         ↓
      StrongsResourceLoader.load(...)
         ↓
      StrongsStore.get(...) again
         ↓
      found?
        ├── yes → return
        └── no → explicit not-found / installation invariant failure
```

A local miss should be treated as an acquisition opportunity.

The new service should avoid collapsing all failures into `newStrongs()` unless UI compatibility temporarily requires that behavior at a higher boundary.

---

# 65. Composition Root Wiring

Once the Resource Service and read-side service exist, wire the production graph in:

```text
src/lib/application/runtime/application.ts
```

Expected shape:

```text
Application
├── shared ResourceDiscovery
├── shared ResourceResolver
├── shared ResourceContentDecoder
├── IndexedDBStrongsInstallationTransaction
├── StrongsInstaller
├── StrongsInterpreter
├── StrongsValidator
├── StrongsResourceHandler
├── StrongsResourceService
├── IndexedDBStrongsStore
├── StrongsResourceLoader
└── StrongsService
```

Only application-facing capabilities should be exposed through `ApplicationContext`.

Internal validators, transaction adapters, and other construction details should remain private to the Composition Root unless another layer has a real reason to consume them.

---

# 66. Architecture Proof So Far

The Resource Architecture now has two concrete Domain Resource implementations:

```text
                        Generic Resource Infrastructure
                                  │
                         DecodedResourceContent
                                  │
                ┌─────────────────┴─────────────────┐
                │                                   │
                ▼                                   ▼
       Bible Chapter Domain                  Strong's Domain
          Interpreter                          Interpreter
          Validator                            Validator
          Installer                            Installer
                │                                   │
                └──────────────┬────────────────────┘
                               │
                        ApplicationDB
```

The generic Resource layer did not need to learn Strong’s semantics.

The Strong’s Domain did not need to reimplement discovery, resolution, decoding, provenance, or IndexedDB infrastructure.

This is the central architectural result of the cycle.

---

# 67. Invariants Confirmed

The current implementation reinforces:

```text
Resource Type = first three Resource Identifier segments
Resource path = remaining segments

Published Resource publisher
    → participates in local Domain identity

Published payload
    → contains no local Domain id

local Domain id
    → created during installation

Domain Object
    !=
ResourceInstallation provenance

newer modifiedAt wins
older/equal modifiedAt does not replace

one decoded + validated Resource
    =
one installation transaction

all candidates validate
before persistence begins

Domain Object write
+
provenance write
    =
same transaction

Domain Store contract
    !=
physical object store

new Domain Object type
    does not require
new IndexedDB schema
```

---

# 68. Ownership Confirmed

Resource infrastructure owns:

```text
Published Resource representation
Nostr Resource conversion
Discovery
Resolution
verification
content decoding
generic Resource Identifier parsing
generic provenance model
generic transaction seam
```

Strong’s Domain owns:

```text
Strong's Resource path meaning
bundle semantics
candidate type
Strong's schema
key validity
identity composition
installation mapping
Domain store contract
read-side Domain behavior
```

IndexedDB infrastructure owns:

```text
physical database
transactions
commit/rollback behavior
object stores
```

Execution in a worker later would not change these ownership boundaries.

---

# 69. Important Non-Decisions

This cycle intentionally did not introduce or finalize:

```text
ResourceTypePipeline
ResourceTypeRegistry
InstallerRegistry
generic Domain installer framework
generic repository framework
generic UnitOfWork framework
custom error hierarchy
bulk Strong's persistence optimization
parallel resolved-content processing
strict non-zero G/H key regex
full cleanup of Strong's popup/UI types
```

These remain future decisions only if implementation evidence justifies them.

---

# 70. Strong’s Popup/UI Types

The existing `strongs.model.ts` still contains popup-oriented types such as:

```text
StrongsPopups
searchPopup
newStrongsPopups()
```

They were left alone during this Resource work.

They can be separated later as a Domain/UI cleanup without affecting the Resource architecture.

---

# 71. Performance and Correctness

Strong’s bundles may eventually be large.

The current implementation favors correctness and explicit behavior over optimization.

Potential future optimizations include:

```text
bulk provenance reads
transaction-local caching
bulk Domain Object writes
specialized indexes
```

None should weaken:

```text
one Resource
=
one atomic accepted-state transaction
```

---

# 72. Concurrency and Shutdown

Strong’s installation uses an IndexedDB `readwrite` transaction spanning:

```text
domain_objects
resource_installations
```

No network, JSON decoding, gzip handling, Resource interpretation, or Domain schema validation should occur inside that transaction.

If the browser terminates before commit:

```text
partial accepted Strong's state
must not remain committed
```

The Resource can simply be processed again later.

No separate write-ahead log is currently required.

---

# 73. Exact Next Implementation Sequence

Continue in this order:

```text
1. strongs-resource-service.ts
2. strongs-resource-service.spec.ts
3. Strong's browser Resource-installation integration test
4. Strong's real relay → ApplicationDB integration test
5. strongs-resource-loader.ts
6. strongs-resource-loader.spec.ts
7. strongs.service.ts
8. strongs.service.spec.ts
9. wire Strong's graph into application.ts
10. expose application-facing Strong's capability through ApplicationContext if needed
11. run full browser/relay integration
12. compare completed Chapter and Strong's slices
13. extract only proven common orchestration
```

---

# 74. Handoff Summary

During this cycle Strong’s moved from an existing application model into a concrete Resource Architecture vertical slice with its own Domain ownership and tested boundaries.

Completed architectural pieces now include:

```text
Strong's Domain ownership
Strong's Resource Type contract
publisher/version/key identity
candidate boundary
interpreter
validator
validated candidate
Domain store contract
generic ApplicationDB persistence
installation store set
atomic Strong's + provenance transaction
installer
Resource handler
unit/browser test coverage
```

The implementation reused:

```text
generic Resource models
generic Resource Identifier parsing
generic content decoding
generic provenance
generic installation transaction concepts
shared ApplicationDB
shared domain_objects store
shared resource_installations store
```

without introducing:

```text
new physical Strong's database schema
new application DB version
new provenance model
new Resource architecture
new transport abstraction
new DI framework
new generic Domain framework
```

The immediate next task is `strongs-resource-service.ts`.

Once the Resource Service, browser integration, relay integration, loader, read-side service, and Composition Root wiring are complete, the Strong’s slice will be a full second end-to-end Resource Type. At that point the Chapter and Strong’s implementations should be compared for small, evidence-based abstractions rather than generalized in advance.
