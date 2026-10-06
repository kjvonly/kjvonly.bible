# Resource Lifecycle and Content

## Status

Current

---

# Purpose

This document describes the current inbound Resource lifecycle used by the KJVOnly.bible client.

It documents the path from an application-facing `PublishedResourceReference` to installed Domain Objects and Resource processing receipts.

The current implementation is no longer centered on the historical `ResourceClient` abstraction.

Instead, the lifecycle is split across:

```text
Application / Domain Service
    ↓
ResourceLoader or ResourceWorkerClient
    ↓
Resource Worker Coordinator
    ↓
main-thread ResourceDiscovery
    ↓
ResourceRepresentation
    ↓
representation-specific Resource processing
    ↓
VerifiedResourceContent
    ↓
ResourceContentDecoder
    ↓
DecodedResourceContent
    ↓
special ResourceHandler OR GenericResourceInstaller
    ↓
semantic datatype validation
    ↓
Domain Object factory
    ↓
object-level installation
    ↓
Domain Object + ResourceInstallation
    ↓
ResourceReceipt
```

The central implementation rule is:

> **Transport discovers and retrieves Resources; semantic handlers validate payloads; Domains define identity/meaning; generic installation persists normal accepted Domain Objects.**

This document focuses on inbound acquisition and installation.

Outbound publication is documented separately.

---

# Scope

This document covers the current implementation of:

* `PublishedResourceReference`,
* `ResourceLoader`,
* `ResourceWorkerClient`,
* Resource Worker coordination,
* main-thread Resource Discovery,
* Nostr Resource event conversion,
* `ResourceRepresentation`,
* direct `content` representation resolution,
* `descriptors` representation resolution,
* descriptor decoding and validation,
* descriptor recursion and cycle protection,
* Nostr and Blossom descriptor strategies,
* Resource receipt checks,
* `VerifiedResourceContent`,
* media-type driven content decoding,
* gzip and hex decoding,
* JSON decoding,
* `DecodedResourceContent`,
* Resource Handler dispatch,
* Domain interpretation,
* Domain validation,
* Domain installation,
* Resource-backed Domain Object revision/state metadata,
* Resource processing receipts,
* Resource install outcomes,
* individual-Resource to bundle fallback,
* in-flight install deduplication,
* Worker ownership,
* and the public Resource API.

This document does **not** define:

* outbound Outbox publication semantics,
* Resource-selection policy,
* Domain-specific schemas in detail,
* synchronization scheduling,
* UI ownership,
* or Nostr account/authentication behavior.

Those responsibilities have separate implementation documents or Domain-specific implementations.

---

# Architectural Position

The Resource lifecycle sits between transport-facing Resource publication and Domain-facing local state.

Conceptually:

```text
External publication
    ↓
Resource transport/discovery
    ↓
Resource representation
    ↓
Resource resolution
    ↓
Resource content decoding
    ↓
Domain interpretation
    ↓
Domain validation
    ↓
Domain installation
    ↓
Application-visible Domain state
```

The layers remain intentionally distinct.

```text
Discovery
    ≠ Resolution

Resolution
    ≠ Content decoding

Content decoding
    ≠ Domain interpretation

Domain interpretation
    ≠ Domain validation

Domain validation
    ≠ Installation

Resource receipt
    ≠ ResourceInstallation object-level state
```

These distinctions are important because a Resource being available on a network does not itself make that Resource authoritative local application state.

---

# Related Documents

The most closely related implementation documents are:

```text
docs/03_implementation/resources/001-resource-transport.md

docs/03_implementation/platform/005-application-startup.md

docs/03_implementation/010-domain-implementation-map.md

docs/03_implementation/011-target-code-organization.md
```

The current source remains authoritative if an older historical document disagrees with this document.

---

# Public Resource Boundary

External callers should normally consume stable Resource concepts through:

```text
$lib/resource
```

The root Resource API exposes stable contracts and browser-safe Resource services.

Examples include:

```text
PublishedResourceReference
ResourceRepresentation
VerifiedResourceContent
DecodedResourceContent

ResourceLoader
ResourceWorkerClient
ResourceService
ResourceProcessor

ResourceDataTypeHandler
ResourceDataTypeResolver
ResourceDomainObjectFactory
ResourceDomainObjectFactoryResolver
GenericResourceInstaller
ResourceHandler

ResourceDescriptor
ResourceResolutionResult
ResourceResolutionStrategy

ResourceContentDecoder
ResourceContentEncoder
ResourceContentDecoratorBuilder

ResourceInstallation
ResourceReceipt
```

Concrete implementation wiring may still import implementation files directly.

Examples include:

```text
IndexedDBResourceReceiptStore
NostrResourceResolutionStrategy
ResourceDiscovery
worker composition
concrete Domain Resource handlers
```

The goal of `$lib/resource` is a stable Resource boundary, not hiding every implementation path behind one barrel.

---

# High-Level Runtime Flow

A normal Domain read that may need Resource acquisition looks approximately like:

```text
Domain Service
    ↓
local Domain Store lookup
    ↓
missing / acquisition required
    ↓
ResourceLoader.load(source, key)
    ↓
ResourceWorkerClient.install(reference)
    ↓
Resource Worker
    ↓
ResourceDiscovery on main thread
    ↓
ResourceRepresentation
    ↓
Resource Processor
    ↓
special ResourceHandler OR GenericResourceInstaller
    ↓
semantic validation + Domain Object factory
    ↓
Domain Service retries / reads installed state
```

The Domain Service does not need to know:

* Nostr event structure,
* descriptor representation syntax,
* Blossom URLs,
* gzip or hex details,
* Worker message formats,
* Resource receipt persistence,
* or generic Resource resolution machinery.

---

# PublishedResourceReference

The application-facing Resource identity used for acquisition is:

```ts
interface PublishedResourceReference {
    publisher: string;
    resourceId: string;
}
```

The reference identifies a Published Resource by:

```text
publisher
+
resourceId
```

It does not contain Pane or Buffer state.

It is intentionally independent from Domain Object identity.

```text
Published Resource identity
    ≠ Domain Object identity
```

A single Resource can install one or many Domain Objects.

A bundle Resource is the common example.

---

# ResourceLoader

`ResourceLoader<TKey>` is the generic application/Domain-facing acquisition helper.

It depends only on:

```text
install(PublishedResourceReference)
```

and a `ResourceReferenceBuilder<TKey>`.

That means the loader does not care whether installation is implemented by:

* a Worker,
* an in-process Resource service,
* a test fake,
* or a future alternate implementation.

The current browser Application wires `ResourceLoader` to `ResourceWorkerClient`.

---

# Individual Resource Then Bundle Fallback

The current `ResourceLoader` supports a common pattern:

```text
try individual Resource
    ↓
if found
    → require successful outcomes
    → done

if individual not found
    ↓
try bundle Resource
    ↓
if bundle not found
    → return false

if bundle found
    → require successful outcomes
    → return true
```

This lets Domain services request a specific logical item while still allowing a publisher to package a complete collection as a bundle.

For example:

```text
chapter source + chapter key
    ↓
individual chapter reference
    ↓
fallback to Bible-version bundle
```

The loader itself does not interpret the Resource.

It only constructs references and invokes installation.

---

# Resource Install Result

Resource installation returns a structured result:

```ts
interface ResourceInstallResult {
    requested: PublishedResourceReference;
    found: boolean;
    resources: readonly ResourceInstallOutcome[];
}
```

An individual outcome can be:

```text
handled
current
unsupported
failed
```

Meaning:

```text
handled
    content was decoded and handled successfully

current
    descriptor-backed content was already current according to a receipt

unsupported
    reserved result shape used by callers that explicitly classify an unsupported item

failed
    resolution, decoding, unsupported datatype/Resource Type, validation, installation, or another processing step failed
```

`found = false` means the root Resource reference could not be discovered.

It does not mean a Resource was discovered but failed later in processing.

---

# ResourceLoader Success Policy

`ResourceLoader` treats:

```text
handled
```

as successful.

A `failed` outcome throws its stored error.

Any other outcome encountered by the loader is currently treated as unsupported for that load path.

This keeps Domain acquisition failures visible rather than silently ignoring unsupported Resource Types.

---

# Main Thread / Worker Ownership

The current Resource lifecycle intentionally spans multiple execution contexts.

The main thread owns browser/application integration that should not be duplicated inside Resource processing workers.

The Resource Workers own the expensive and generic Resource processing pipeline.

Current topology:

```text
Main Thread
    Application
        ↓
    ResourceWorkerClient
        ↓

Resource Coordinator Worker
    ResourceService
        ↓
    root Resource Discovery bridge
        ↓
    representation routing
        ├── content child worker
        └── descriptor worker pool
                ├── descriptor worker 1
                ├── descriptor worker 2
                └── descriptor worker 3
```

Descriptor strategy calls that require main-thread infrastructure can be bridged back to the main thread.

---

# Why Resource Discovery Remains on the Main Thread

The current browser Application owns the real `ResourceDiscovery` instance.

`ResourceDiscovery` depends on the application-owned `NostrClient`.

The Resource Worker therefore does not construct another Nostr client.

Instead:

```text
Resource Worker
    ResourceWorkerDiscovery.get(reference)
        ↓ message
Main Thread
    ResourceWorkerClient
        ↓
    ResourceDiscovery.get(reference)
        ↓
    NostrClient
        ↓ result
Resource Worker
```

This preserves one application transport composition while still keeping Resource processing off the main thread.

---

# Root Resource Discovery

`ResourceDiscovery.get()` performs direct lookup of the requested root Resource.

The Nostr filter is based on:

```text
kind = RESOURCE_KIND
publisher = reference.publisher
d tag = reference.resourceId
```

`RESOURCE_KIND` is currently:

```text
37770
```

If no matching event is found:

```text
ResourceDiscovery.get()
    → null
```

and the install result becomes:

```text
found = false
```

---

# Nostr Event to ResourceRepresentation

A discovered Nostr event is converted by `toResourceRepresentation()`.

The conversion validates the Resource publication envelope before generic processing begins.

It requires:

```text
kind = RESOURCE_KIND

d tag
    = Resource ID

t tag
    = Resource Type

representation tag
    = content | descriptors

m tag
    = media type
```

The Resource Type is carried explicitly by the Resource envelope / `t` tag. Generic Resource processing does not infer it from the Resource ID.

The resulting representation is:

```ts
interface ResourceRepresentation {
    publisher: string;
    resourceId: string;
    resourceType: string;
    eventId: string;
    modifiedAt: number;
    representation: 'content' | 'descriptors';
    mediaType: string;
    payload: string;
}
```

At this point the code has a transport-neutral Resource representation rather than a raw Nostr event.

---

# Representation Routing

The coordinator routes discovered representations by representation type.

```text
representation = content
    → content Resource processor

representation = descriptors
    → descriptor Resource processor
```

This routing happens before interpretation by any Domain.

The Domain does not need to know how the Resource content was represented externally.

---

# ResourceResolver

`ResourceResolver` selects a `ResourceRepresentationResolver` by:

```text
resource.representation
```

Each processor is composed with the representation resolvers appropriate to that processing path.

Conceptually:

```text
ResourceRepresentation
    ↓
ResourceResolver
    ↓
representation-specific resolver
    ↓
ResourceResolutionResult
```

The result contains three independent collections:

```text
contents
current
failures
```

This lets descriptor collections partially succeed instead of reducing the entire collection to one boolean result.

---

# Direct Content Representation

For:

```text
representation = content
```

`ContentRepresentationResolver` converts the representation directly into `VerifiedResourceContent`.

There is no external descriptor strategy to execute.

Conceptually:

```text
ResourceRepresentation
    publisher
    resourceId
    resourceType
    modifiedAt
    mediaType
    payload
        ↓
VerifiedResourceContent
    publisher
    resourceId
    resourceType
    modifiedAt
    mediaType
    content = payload
```

The term `VerifiedResourceContent` means the generic Resource representation/resolution stage has accepted the Resource metadata/content relationship required by that path.

It does **not** mean the Domain value has already passed Domain validation.

---

# Descriptor Representation

For:

```text
representation = descriptors
```

processing begins by decoding the root descriptor document.

The root representation declares its own media type.

`ResourceDescriptorDocumentDecoder` uses the same content-decorator system used for ordinary Resource content.

The decoded value must be an array.

Each array entry is then validated as a `ResourceDescriptor`.

---

# ResourceDescriptor

A descriptor contains:

```text
metadata
strategy
```

Metadata includes:

```text
publisher
resourceId
resourceType
modifiedAt
representation
mediaType
```

Strategy includes:

```text
type
data
```

The descriptor validator checks generic Resource invariants before a strategy executes.

Examples include:

* publisher must be a 64-character lowercase hex public key,
* Resource ID must be present,
* descriptor Resource Type must be present,
* `modifiedAt` must be a non-negative safe integer,
* representation must be `content` or `descriptors`,
* media type must be present,
* strategy type must be present,
* strategy data must exist.

---

# Descriptor Receipt Check

Before retrieving descriptor-backed content, the descriptors resolver asks:

```text
ResourceReceiptService.needsProcessing(
    publisher,
    resourceId,
    modifiedAt
)
```

If the local receipt has the same or newer `modifiedAt`, the descriptor is returned as:

```text
status = current
```

and external content retrieval is skipped.

This is a Resource-processing optimization and freshness guard.

It does not replace object-level `ResourceInstallation` state.

---

# Resource Receipts vs ResourceInstallation

These concepts solve different problems.

## ResourceReceipt

A Resource receipt records that a Published Resource revision was successfully processed.

Its identity is based on:

```text
publisher
+
resourceId
```

and it stores:

```text
modifiedAt
```

It is used by descriptor resolution to determine whether content needs to be processed again.

## ResourceInstallation

A `ResourceInstallation` record associates a Resource-backed Domain Object with its currently accepted Resource revision/state. For externally installed objects it can also preserve which Resource produced the object; locally authored Resource-backed state uses the same record before external provenance necessarily exists.

It records concepts such as:

```text
objectType
objectId
publisher
resourceId
modifiedAt
```

The generic installer uses this object-level revision state to decide whether a normal Domain Object candidate should be replaced; specialized installers such as Filesystem apply the same revision concept in their own persistence path.

Therefore:

```text
ResourceReceipt
    = Resource processing freshness

ResourceInstallation
    = Domain Object Resource revision/state + freshness
```

Do not collapse the two concepts.

---

# Descriptor Resolution Strategies

A descriptor delegates content retrieval to a strategy selected by:

```text
descriptor.strategy.type
```

The current generic strategy contract is:

```ts
interface ResourceResolutionStrategy {
    readonly type: string;

    resolve(
        descriptor: ResourceDescriptor
    ): Promise<Uint8Array>;
}
```

The descriptors resolver itself does not know transport details.

It only knows strategy identifiers and the generic strategy interface.

---

# Blossom Strategy

`BlossomResourceResolutionStrategy` is worker-safe and can resolve content directly.

Its strategy data includes:

```text
urls
sha256
optional size
```

The resolver:

```text
tries configured URLs
    ↓
requires successful HTTP response
    ↓
reads bytes
    ↓
optionally validates byte length
    ↓
calculates SHA-256
    ↓
requires expected digest
    ↓
returns Uint8Array
```

This means descriptor metadata identifies the Resource while the strategy data identifies how to retrieve and verify the external bytes.

---

# Nostr Descriptor Strategy

`NostrResourceResolutionStrategy` uses application-owned Nostr transport.

Its strategy data currently includes:

```text
kind
relays
```

It resolves an exact event using:

```text
kind
author = descriptor publisher
d tag = descriptor Resource ID
configured relays
```

The resolved event is then checked against the descriptor metadata.

Current checks include:

```text
kind
publisher
modifiedAt
d tag
t tag
representation tag
media type tag
```

Only after those values match is the Nostr event content returned as bytes.

---

# Descriptor Worker to Main-Thread Strategy Bridge

Descriptor workers do not create their own application Nostr transport.

When a descriptor requests the `nostr` strategy:

```text
Descriptor Worker
    ↓
ResourceWorkerStrategyResolver
    ↓ message
Resource Coordinator Worker
    ↓ message
Main Thread ResourceWorkerClient
    ↓
NostrResourceResolutionStrategy
    ↓
NostrClient
    ↓ bytes
Descriptor Worker
```

This maintains the Application's transport ownership while allowing descriptor processing to remain in workers.

---

# Nested Descriptor Collections

A descriptor can itself describe another:

```text
representation = descriptors
```

The resolver then:

```text
retrieves nested descriptor content
    ↓
decodes the nested descriptor document
    ↓
validates nested descriptors
    ↓
recursively resolves entries
```

The implementation protects recursion with both:

```text
cycle detection
maximum nesting depth
```

---

# Descriptor Cycle Detection

The descriptors resolver tracks visited identity using:

```text
publisher
+
resourceId
```

If a nested descriptor references an identity already in the current traversal path, resolution fails for that entry with a Resource descriptor cycle error.

This prevents recursive collections from looping indefinitely.

---

# Descriptor Nesting Depth

The current implementation also limits descriptor nesting depth.

Current constant:

```text
MAX_DESCRIPTOR_NESTING_DEPTH = 3
```

This is an implementation guard in addition to cycle detection.

It should not be confused with Resource identity or Domain hierarchy.

---

# Partial Descriptor Failure

Descriptor collection processing is intentionally granular.

If one descriptor fails:

```text
that descriptor
    → failed outcome
```

while other descriptors can still produce:

```text
contents
current entries
other failures
```

The `ResourceProcessor` converts each resolution result entry into an installation outcome.

This avoids treating a large descriptor collection as all-or-nothing at the generic resolution layer.

The generic installation transaction determines atomicity for normal Domain Object candidates; specialized installers such as Filesystem preserve their own transaction boundary.

---

# VerifiedResourceContent

Resolved content enters the content-decoding stage as:

```ts
interface VerifiedResourceContent {
    publisher: string;
    resourceId: string;
    resourceType: string;
    modifiedAt: number;
    mediaType: string;
    content: string | Uint8Array;
}
```

This representation preserves provenance while abstracting away the retrieval strategy.

By this point downstream code no longer needs to know whether bytes came from:

* inline Nostr content,
* a Nostr descriptor strategy,
* Blossom,
* or a nested descriptor collection.

---

# Resource Content Decoding

`ResourceContentDecoder` is responsible for turning serialized Resource content into a decoded value.

Conceptually:

```text
VerifiedResourceContent
    ↓
ResourceContentDecoratorBuilder.build(mediaType)
    ↓
ResourceContentDecorator.decode(content)
    ↓
DecodedResourceContent
```

The result preserves Resource provenance:

```ts
interface DecodedResourceContent {
    publisher: string;
    resourceId: string;
    resourceType: string;
    modifiedAt: number;
    mediaType: string;
    value: unknown;
}
```

The generic Resource layer still does not know the Domain schema of `value`.

---

# Media-Type Driven Decorator Pipeline

Content transformations are declared through the Resource media type.

The builder tokenizes the media type using `+`.

Examples:

```text
application/json
application/json+gzip
application/json+gzip+hex
```

The first token is treated as the base media type.

Remaining tokens are required encoding decorators.

For example:

```text
application/json+gzip+hex
```

builds a decoding chain conceptually equivalent to:

```text
hex decode
    ↓
gzip decompress
    ↓
JSON parse
    ↓
value
```

Encoding performs the inverse direction.

---

# Optional Base Media-Type Registration

The base media type is intentionally optional in the decorator registry.

That permits pass-through binary content.

For example:

```text
audio/mpeg
image/png
application/octet-stream
```

can flow through the base decorator unchanged when no base transformation is registered.

This keeps the Resource content pipeline generic beyond JSON.

---

# Required Encoding Registration

Encoding suffixes are not optional.

If a Resource declares:

```text
+gzip
```

or:

```text
+hex
```

and no corresponding decoder is registered, content decoding fails.

Silently ignoring an encoding suffix would interpret serialized bytes incorrectly.

---

# Current Content Decorators

The current Worker composition registers:

```text
application/json
    → JsonResourceContentDecorator

gzip
    → GzipResourceContentDecorator

hex
    → HexResourceContentDecorator
```

The base decorator provides identity/pass-through behavior.

---

# JSON Content

`JsonResourceContentDecorator` accepts:

```text
string
or
Uint8Array
```

When decoding bytes, it first converts them to text.

It then parses JSON and forwards the parsed value to the inner decorator.

JSON schema validation is **not** performed here.

Schema validation belongs to the Domain Resource validator.

---

# Gzip Content

`GzipResourceContentDecorator` uses browser `CompressionStream` / `DecompressionStream` with:

```text
gzip
```

During decoding it requires `Uint8Array` input, decompresses the bytes, and forwards the resulting bytes to the inner decorator.

During encoding it accepts string or byte output from the inner decorator and compresses it to bytes.

---

# Hex Content

`HexResourceContentDecorator` converts serialized hex text to bytes during decoding.

It validates:

```text
even character count
hex characters only
```

During encoding it requires bytes and emits lowercase hex text.

Hex is especially useful when binary encoded content must ultimately fit inside a string transport field such as Nostr event content.

---

# ResourceProcessor

After representation resolution, `ResourceProcessor` delegates the resolved entries to `ResourceResolutionProcessor`.

Conceptually:

```text
ResourceResolutionResult
    ↓
failures → failed outcomes
current  → current outcomes
contents → decode → processDecoded
```

For each decoded content item:

```text
DecodedResourceContent
    ↓
registered specialized ResourceHandler?
    │
    ├── yes → specialized handler
    │
    └── no  → GenericResourceInstaller
                 ↓
             dataType validation
                 ↓
             Domain Object factory
                 ↓
             object-level currentness
                 ↓
             DOMAIN_OBJECTS + RESOURCE_INSTALLATIONS
    ↓
mark Resource receipt
    ↓
handled
```

`processDecoded(...)` is also the Archive import re-entry point.

---

# Specialized ResourceHandler Registry

`ResourceResolutionProcessor` still supports a registry of `ResourceHandler` implementations, indexed by `resourceType`.

The registry now represents exceptions to the normal generic Domain Object installation path rather than the primary extension mechanism.

At the current codebase state:

```text
specialized ResourceHandler
    = Filesystem
```

Filesystem remains specialized because accepted `FilesystemEntry` values are persisted in the Filesystem store with mount/path addressing instead of `DOMAIN_OBJECTS`.

---

# Generic Semantic Installation Boundary

For normal Resource-backed Domain Objects, generic decoded Resource content enters two registered semantic capabilities:

```text
DecodedResourceContent.value
    ↓
ResourceDataTypeResolver
    ↓
ResourceDataTypeHandler.validate
    ↓
validated semantic value
    ↓
ResourceDomainObjectFactoryResolver
    ↓
ResourceDomainObjectFactory.create
    ↓
0..n ResourceDomainObjectCandidate
    ↓
GenericResourceInstaller persistence
```

This is now the normal boundary where generic Resource processing meets Domain semantics.

---

# ResourceDataTypeHandler

A datatype handler is selected by:

```text
dataType + dataVersion
```

It validates the semantic payload contract after generic content decoding.

The handler does not own Resource identity, Domain Object identity, currentness, or persistence.

Published bundle contracts and canonical stored object contracts may use different datatypes, which is why several Resource families register both published and object/archive handlers.

---

# ResourceDomainObjectFactory

A factory is selected by Resource Type.

It receives:

```text
validated semantic value
+
Resource envelope context without raw value
```

and owns:

```text
Domain Object identity
Domain-specific Resource ID interpretation
Domain-specific Resource metadata interpretation
context-dependent invariants
bundle expansion
canonical objectType/dataType/dataVersion
```

One Resource may produce zero, one, or many candidates.

---

# Generic Domain Installation

`GenericResourceInstaller` owns the repeatable persistence mechanics for normal Domain Objects.

For every candidate it:

```text
loads ResourceInstallation(objectType, objectId)
compares resource.modifiedAt
skips equal/older state
constructs StoredDomainObject
constructs ResourceInstallation
writes both atomically
```

The generic installer does not know concrete Bible, Notes, Plan, Strong's, or Normalized Content identity rules.

---

# Atomic Installation Transaction

`IndexedDBGenericResourceInstallationTransaction` opens one read/write IndexedDB transaction over:

```text
DOMAIN_OBJECTS
RESOURCE_INSTALLATIONS
```

All candidate writes that win currentness are committed through that transaction.

If validation or factory construction fails, the transaction is never entered.

If persistence fails, the transaction aborts.

---

# Object-Level Freshness

The generic installer compares the incoming Resource revision against the `ResourceInstallation` associated with each candidate Domain Object.

```text
if incoming modifiedAt <= installed modifiedAt
    → keep existing Domain Object

otherwise
    → write replacement Domain Object
    → write replacement ResourceInstallation
```

This rule is independent per candidate, so a bundle can install only the objects for which the incoming revision wins.

---

# Resource Receipt Write

After specialized or generic installation completes successfully, `ResourceResolutionProcessor` asks `ResourceReceiptService` to mark the Published Resource revision as processed.

Conceptually:

```text
installation success
    ↓
markProcessed(
    publisher,
    resourceId,
    modifiedAt
)
```

The receipt is written only after Domain handling succeeds.

---

# Receipt Failure Policy

A receipt write failure does **not** convert an otherwise successful Domain installation into a failed install outcome.

The processor logs the receipt failure and still returns:

```text
status = handled
```

The consequence is that the Resource may be processed again later because Resource-level freshness bookkeeping was not persisted.

Object-level `ResourceInstallation` state still protects accepted Domain Objects through `modifiedAt` currentness.

---

# Processing Errors

For decoded content, the processor converts errors from:

```text
specialized ResourceHandler
unsupported dataType/dataVersion
semantic validation
unsupported Resource Type
Domain Object factory invariants
generic transaction/persistence
```

into a failed Resource outcome carrying the original error.

Descriptor resolution failures are likewise preserved as individual failed outcomes.

---

# Unsupported Resource Contracts

The current generic path does not require a `ResourceHandler` for every supported Resource Type.

Normal support requires:

```text
registered datatype handler
+
registered Domain Object factory
```

An unknown datatype/version or unregistered Resource Type causes the generic installation path to fail explicitly.

A specialized handler is registered only when the Resource family has materially different installation requirements.

---

# In-Flight Install Deduplication

`ResourceService` deduplicates simultaneous installs of the exact same Published Resource reference.

The deduplication key is based on:

```text
publisher
resourceId
```

Conceptually:

```text
install(reference)
    ↓
existing Promise for same reference?
        yes → return existing Promise
        no  → begin install and cache Promise
```

The in-flight entry is removed when the Promise settles, whether it succeeds or rejects.

This avoids duplicate concurrent discovery and processing work without turning the Resource Service into a permanent cache.

---

# Resource Service Responsibility

Inside the Resource Coordinator Worker, `ResourceService` owns:

```text
exact-reference in-flight deduplication
+
root Resource Discovery
+
hand-off to a ResourceProcessor-compatible processor/router
```

It does not own:

```text
Domain schemas
Domain stores
content encoding details
Nostr authentication
Pane/Buffer state
Resource-selection policy
```

---

# Resource Worker Coordinator

The coordinator Worker receives install requests from the main-thread `ResourceWorkerClient`.

For each request:

```text
ResourceService.install(reference)
    ↓
ResourceWorkerDiscovery.get(reference)
    ↓
representation router
    ↓
child worker / descriptor pool
    ↓
ResourceInstallResult
    ↓
serialized result back to main thread
```

The coordinator owns request correlation and routing rather than Domain behavior.

---

# Content Child Worker

Direct content representations are currently processed by one dedicated child Worker.

That Worker composes:

```text
ContentRepresentationResolver
ResourceContentDecoder
ResourceReceiptService
ResourceDataTypeResolver
ResourceDomainObjectFactoryResolver
GenericResourceInstaller
specialized ResourceHandlers
```

and returns a serialized `ResourceInstallResult` to the coordinator.

---

# Descriptor Worker Pool

Descriptor representations are currently processed by a fixed pool of three descriptor child Workers.

The pool:

```text
uses an idle worker immediately
or
queues the descriptor job until a slot is free
```

Each descriptor worker composes:

```text
DescriptorsRepresentationResolver
ResourceDescriptorDocumentDecoder
ResourceDescriptorValidator
ResourceReceiptService
Blossom strategy
bridged Nostr strategy
ResourceContentDecoder
ResourceDataTypeResolver
ResourceDomainObjectFactoryResolver
GenericResourceInstaller
specialized ResourceHandlers
```

The pool is an implementation detail of the current browser Resource processing runtime.

---

# Worker Error Boundaries

Worker clients track pending requests by request ID.

Failures such as:

```text
worker error
message deserialization error
explicit processing error
strategy resolution error
```

are serialized across Worker boundaries and reject the corresponding caller Promise.

Disposal rejects pending work and terminates owned Workers.

The application therefore receives ordinary Promise success/failure rather than depending directly on Worker event handling.

---

# Application Composition

`Application` constructs the main-thread Resource-facing runtime.

Relevant composition includes:

```text
NostrClient
    ↓
ResourceDiscovery

ResourceDiscovery
+
main-thread NostrResourceResolutionStrategy
    ↓
createBrowserResourceWorkerClient(...)
    ↓
ResourceWorkerClient
```

Domain services receive generic Resource acquisition capabilities through `ResourceLoader` or, for some service shapes, the worker client's `install()` capability directly.

The concrete `Application` composition root is imported directly only by:

```text
src/routes/+layout.svelte
```

Resource consumers do not construct the Application.

---

# Domain Service Integration

The browser Application composes Domain services with local stores plus Resource loaders.

For example:

```text
ChapterService
    local ChapterStore
    ResourceLoader
    BibleLocationReferenceService
```

The Domain Service can therefore implement an offline-first pattern such as:

```text
read local Domain Object
    ↓
if missing / refresh required
    acquire Resource
    ↓
Resource pipeline installs Domain Object
    ↓
read local Domain Object again
```

The Resource pipeline does not replace Domain service behavior.

It provides acquisition and installation behind it.

---

# Resource Identity vs Domain Identity

The Resource pipeline deliberately preserves the distinction between:

```text
Resource ID
```

and:

```text
Domain Object ID
```

`resourceId` is publisher-chosen Resource identity. Its segments are not generically interpreted as Domain fields.

A Domain Object factory may use Resource identity as one input to Domain identity when its Domain contract requires that relationship.

Bible Chapters currently retain a historical path-like Resource ID for compatibility, but the identity component is treated as `bibleId`; the semantic Bible version label comes independently from Resource metadata.

---

# Resource Type, Datatype, and Metadata Ownership

The current implementation separates three concepts:

```text
resourceType
    → Resource Type / Domain Object factory selection

dataType + dataVersion
    → semantic payload handler selection

metadata
    → protocol-agnostic scalar Resource context interpreted by owning Domains
```

These values may coincide in simple Resource contracts but are not interchangeable.

Generic code branches only on registration tables and specialized-handler composition, not on concrete Domain values.

---

# Current Source Organization

The generic Resource implementation is organized approximately as:

```text
src/lib/resource/
    index.ts

    content/
        resource-content-decorator.ts
        resource-content-decorator-builder.ts
        resource-content-decoder.ts
        resource-content-encoder.ts
        json-resource-content-decorator.ts
        gzip-resource-content-decorator.ts
        hex-resource-content-decorator.ts

    descriptors/
        resource-descriptor.ts
        resource-descriptor-document-decoder.ts
        resource-descriptor-validator.ts

    installation/
        installation-transaction.ts
        resource-handler.ts
        resource-installation.ts
        resource-installation-store.ts

    interpretation/
        resource-interpreter.ts

    loading/
        resource-loader.ts
        resource-reference-builder.ts

    models/
        resource.model.ts

    nostr/
        resource-discovery.ts
        resource-event.ts
        nostr-resource-publication-strategy.ts

    publication/
        resource-publication.ts

    receipts/
        resource-receipt.ts
        resource-receipt-store.ts
        resource-receipt.service.ts
        indexeddb-resource-receipt-store.ts

    resolution/
        resource-resolver.ts
        resource-representation-resolver.ts
        resource-resolution-result.ts
        resource-resolution-strategy.ts
        content-representation-resolver.ts
        descriptors-representation-resolver.ts
        blossom-resource-resolution-strategy.ts
        nostr-resource-resolution-strategy.ts

    services/
        resource.service.ts
        resource-processor.ts
        resource-install-result.ts

    validation/
        resource-validator.ts

    worker/
        resource-worker-client.ts
        resource.worker.ts
        resource-content.worker.ts
        resource-descriptor.worker.ts
        resource-worker-composition.ts
        resource-worker-discovery.ts
        resource-worker-strategy-resolver.ts
        resource-worker-processor-router.ts
        resource-child-worker-client.ts
        resource-descriptor-worker-pool.ts
        worker message contracts
```

Domain Resource implementations live inside their owning Domains rather than under the generic Resource layer.

---

# Domain Resource Source Organization

A Domain Resource Type commonly has code such as:

```text
domains/<domain>/resources/<resource>/
    <resource>-candidate.ts
    <resource>-interpreter.ts
    <resource>-validator.ts
    <resource>-installer.ts
    <resource>-resource-handler.ts
```

Persistence transactions normally live under the Domain's persistence area.

This keeps generic Resource mechanics separate from Domain semantics.

---

# Testing Strategy

The Resource lifecycle is tested at several levels.

## Generic unit tests

Generic Resource tests cover areas such as:

```text
Resource identifiers
content decorators
content decoder/encoder
descriptor decoding
descriptor validation
representation resolvers
resolution strategies
ResourceProcessor
ResourceService
ResourceLoader
receipt service
Worker clients
Worker discovery
Worker processor routing
descriptor Worker pool
```

## Domain Resource tests

Domain tests cover:

```text
interpretation
schema/invariant validation
installation decisions
transaction behavior
ResourceHandler composition
```

## Browser integration tests

Browser tests exercise Worker and real browser/runtime integration where appropriate.

They should prefer real Domain-facing entry points when the goal is application integration rather than invoking a generic Resource escape hatch merely for convenience.

---

# Important Invariants

The current implementation depends on the following invariants.

## Resource discovery is not Domain acceptance

A discovered Resource is only a publication representation.

## Resolution is transport-independent downstream

After resolution/decoding, downstream semantic processing uses application Resource models rather than raw transport objects.

## Media type declares serialization transforms

The decoder does not guess gzip, hex, or JSON.

## Encoding suffixes must be understood

Unknown declared encodings fail explicitly.

## `dataType + dataVersion` owns semantic payload validation

Generic decoding produces `unknown`; semantic handlers establish accepted value contracts.

## Resource Type owns Domain Object factory selection

Resource Type is separate from datatype and Resource identity.

## Domain Object factories own Domain identity

Generic installation never invents Domain Object IDs from Resource IDs.

## Resource metadata is opaque to generic infrastructure

Owning Domains may interpret keys such as Bible Chapter `version`.

## Generic installation owns normal currentness and persistence

Normal Domain Objects share one object-level `modifiedAt` comparison and one atomic transaction shape.

## Specialized ResourceHandlers require a real lifecycle difference

Filesystem remains specialized because it persists to its own store.

## Resource receipts do not replace ResourceInstallation state

Receipts and `ResourceInstallation` records solve different freshness/provenance problems.

## Local-write transactions are not inbound installers

Domain-specific local writes may still atomically maintain Domain state, Resource revision state, and Outbox intent.

## Workers are composition roots

Worker-local services can be constructed inside Worker composition instead of being forced through `ApplicationContext`.

## Nostr remains infrastructure

Domain factories and generic Resource processors do not depend on Nostr event APIs.

## Browser UI is not part of the Resource pipeline

No Pane, Buffer, Svelte component, or Application UI state belongs in Resource processing.

---

# Failure Model

The current lifecycle distinguishes several failure classes.

```text
root Resource not found
    → found = false

representation invalid
    → discovery/conversion rejects

unsupported representation
    → resolver rejects

descriptor invalid
    → failed descriptor outcome

unsupported descriptor strategy
    → failed descriptor outcome

external retrieval/integrity failure
    → failed descriptor outcome

unsupported Resource Type
    → unsupported outcome

content decoding failure
    → failed outcome

Domain interpretation/validation failure
    → failed outcome

Domain installation failure
    → failed outcome

receipt write failure after successful installation
    → warning + handled outcome
```

This preserves enough structure for callers and tests to distinguish “not found,” “unsupported,” and actual processing failure.

---

# What the Resource Lifecycle Does Not Own

The Resource lifecycle does not own:

```text
which Resource a Pane selected
which Bible version a user prefers
when a synchronization job should run
how a Notes list is presented
how Outbox entries are scheduled
which user is authenticated
which Nostr relays are account preferences
how Domain Objects are rendered
```

Those responsibilities remain in Application, Domain, synchronization, account, Outbox, or UI layers as appropriate.

---

# Historical ResourceClient Architecture

Older implementation documents may describe a `ResourceClient` that directly owned the inbound Resource lifecycle.

That architecture is removed.

Do not recreate it merely to match historical documentation.

Current responsibilities are intentionally separated across:

```text
NostrClient
ResourceDiscovery
ResourceWorkerClient
ResourceService
ResourceResolver
ResourceContentDecoder
ResourceProcessor
ResourceDataTypeResolver
ResourceDomainObjectFactoryResolver
GenericResourceInstaller
specialized ResourceHandlers
```

See:

```text
001-resource-transport.md
```

for the current transport boundary.

---

# Summary

The current inbound Resource lifecycle is:

```text
Domain / Application
    ↓
PublishedResourceReference
    ↓
ResourceLoader
    ↓
ResourceWorkerClient
    ↓
Resource Coordinator Worker
    ↓
main-thread ResourceDiscovery
    ↓
ResourceRepresentation
    ↓
content or descriptors resolution
    ↓
VerifiedResourceContent
    ↓
media-type decoding
    ↓
DecodedResourceContent
    ↓
Filesystem special handler OR GenericResourceInstaller
    ↓
ResourceDataTypeHandler
    ↓
ResourceDomainObjectFactory
    ↓
0..n Domain Object candidates
    ↓
object-level currentness
    ↓
Domain Object + ResourceInstallation
    ↓
ResourceReceipt
    ↓
ResourceInstallResult
```

The major current simplification is that normal Resource-backed Domains no longer own duplicate interpreter/validator/installer/handler stacks.

They register semantic payload handlers and Domain Object factories while the generic Resource lifecycle owns the common installation mechanics.
