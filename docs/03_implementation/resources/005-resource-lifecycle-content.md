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
ResourceHandler
    ↓
Domain interpretation
    ↓
Domain validation
    ↓
Domain installation transaction
    ↓
Domain Object + ResourceInstallation
    ↓
ResourceReceipt
```

The central implementation rule is:

> **Transport discovers and retrieves Resources; the Resource pipeline normalizes them; Domains decide what those Resources mean and how accepted Domain Objects are installed.**

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

ResourceInterpreter
ResourceValidator
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
Domain Resource Handler
    ↓
Domain installation transaction
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
    no ResourceHandler exists for the resolved Resource Type

failed
    resolution, decoding, validation, installation, or another processing step failed
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

The Resource Type is independently derived from the Resource ID and must match the `t` classification tag.

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
category
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
* descriptor category must match the Resource Type derived from the Resource ID,
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

Domain installers use this object-level revision state to decide whether an individual Domain Object should be replaced.

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

Domain installation transactions still determine atomicity for each Domain handler's accepted objects.

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

After representation resolution, `ResourceProcessor` owns generic processing of the resulting entries.

Conceptually:

```text
ResourceResolutionResult
    ↓
failures → failed outcomes
current  → current outcomes
contents → decode + ResourceHandler
```

For each resolved content item:

```text
find ResourceHandler by resourceType
    ↓
missing handler
    → unsupported

handler found
    ↓
decode Resource content
    ↓
handler.handle(decoded)
    ↓
mark Resource receipt
    ↓
handled
```

---

# ResourceHandler Registry

`ResourceProcessor` receives a list of Domain-specific `ResourceHandler` implementations.

The handlers are indexed by:

```text
handler.resourceType
```

Duplicate handlers for the same Resource Type fail composition immediately.

This avoids ambiguous runtime dispatch.

---

# Current Worker Resource Handlers

The current Worker composition includes handlers for Resource Types in these areas:

```text
Bible Chapters
Bible Booknames
Bible Paragraphs
Bible Pericopes
Bible Text Markup
Bible Search Index

Notes

Reading Plan Definitions

Strong's Definitions
```

Each handler is owned by its Domain.

The generic Resource layer only dispatches to the handler matching the Resource Type.

---

# Domain Interpretation Boundary

A Domain Resource Handler is where generic decoded Resource content becomes Domain-specific candidate data.

The common pattern is:

```text
DecodedResourceContent
    ↓
ResourceInterpreter
    ↓
Domain candidate(s)
    ↓
ResourceValidator
    ↓
validated Domain candidate(s)
    ↓
Domain installer
```

This is the key boundary where generic Resource processing ends and Domain semantics begin.

---

# ResourceInterpreter

The generic interpreter contract is:

```text
DecodedResourceContent
    → Iterable<DomainCandidate>
```

An interpreter may produce:

```text
one candidate
or
many candidates
```

This supports both individual Resources and bundle Resources.

For example, the Bible Chapter interpreter can interpret either:

```text
one chapter Resource
```

or:

```text
a Bible-version chapter bundle
```

without changing the generic Resource pipeline.

---

# ResourceValidator

A Domain validator checks Domain-specific structure and invariants.

The generic Resource content decoder does not know these rules.

For Bible chapters, validation includes concepts such as:

```text
chapter content schema
chapter reference consistency
verse key consistency
verse number consistency
```

Other Domains provide their own validation rules.

---

# Domain Installation

After interpretation and validation, the Domain installer writes accepted Domain Objects through a Domain-specific installation transaction.

The transaction determines the stores that must change atomically for that Domain Resource Type.

Typical installation writes include:

```text
Domain Object(s)
+
ResourceInstallation provenance
```

Some handlers may also maintain related Domain catalog objects.

For example, Bible Chapter installation may ensure a Bible Version object exists while installing chapters.

---

# Atomic Installation Transactions

Domain installers do not write generic stores independently in an arbitrary sequence.

They use Domain-specific transaction abstractions backed by IndexedDB transactions.

For example:

```text
Bible Chapter installation transaction
    ↓
DOMAIN_OBJECTS
+
RESOURCE_INSTALLATIONS
```

The Domain operation runs inside one read-write transaction.

If the operation fails, the transaction is aborted and the original error is preserved.

---

# Object-Level Freshness

Domain installers can compare the incoming Resource revision against the `ResourceInstallation` associated with an individual Domain Object.

A common rule is:

```text
if incoming modifiedAt <= installed modifiedAt
    → keep existing Domain Object

otherwise
    → install replacement Domain Object
    → update ResourceInstallation
```

This is intentionally Domain installation behavior rather than generic Resource receipt behavior.

A bundle Resource can therefore make an object-by-object installation decision.

---

# Resource Receipt Write

After a handler completes successfully, `ResourceProcessor` asks `ResourceReceiptService` to mark the Published Resource revision as processed.

Conceptually:

```text
handler success
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

The current processor logs:

```text
[Resource receipt write failed]
```

and still returns:

```text
status = handled
```

The consequence is that the Resource may be processed again later because freshness bookkeeping was not persisted.

The Domain Object's `ResourceInstallation` state still protects accepted objects according to the Domain installer's own freshness rules.

---

# Processing Errors

For resolved content, the processor converts errors from:

```text
content decoding
Domain interpretation
Domain validation
Domain installation
```

into:

```text
status = failed
error = original error
```

This keeps errors attached to the specific Resource outcome.

Descriptor resolution failures are similarly preserved as individual failed outcomes.

---

# Unsupported Resource Types

If resolved content has no registered handler:

```text
ResourceProcessor
    → status = unsupported
```

The generic Resource layer does not invent a default Domain interpretation.

A Resource Type becomes installable only when the Worker composition registers a Domain-owned handler for it.

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
Domain ResourceHandlers
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
Domain ResourceHandlers
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

For example, a Resource might identify a published Bible chapter path while the Domain installer derives a Domain Object ID containing the publisher/version/chapter identity required by the Bible Domain.

The Resource layer transports and preserves publication identity.

The Domain owns its Domain Object identity rules.

---

# Resource Type Ownership

A Resource Type identifies how decoded Resource content should be routed to a Domain handler.

The generic Resource layer knows the Resource Type as an opaque string.

Domain code owns constants such as:

```text
kjvonly/bible/chapters
```

and owns the corresponding:

```text
interpreter
validator
installer
handler
```

Generic code must not branch on concrete Domain types beyond handler registration/composition.

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

## Resource discovery is not Domain interpretation

A discovered Resource is only a publication representation.

## Resolution is transport-independent downstream

After resolution, downstream content processing receives `VerifiedResourceContent`, not transport-specific objects.

## Media type declares serialization transforms

The decoder does not guess gzip, hex, or JSON.

## Encoding suffixes must be understood

Unknown declared encodings fail explicitly.

## Domain validation happens after generic decoding

The Resource layer does not validate Domain schemas.

## Domain installation owns Domain Object identity

The Resource layer does not manufacture generic Domain Object IDs.

## Resource receipts do not replace ResourceInstallation state

Receipts and `ResourceInstallation` records solve different freshness problems.

## Workers are composition roots

Worker-local services can be constructed inside Worker composition instead of being forced through `ApplicationContext`.

## Nostr remains infrastructure

Domain handlers and generic Resource processors do not depend on Nostr event APIs.

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
Domain ResourceHandlers
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
content or descriptors processing
    ↓
ResourceResolutionResult
    ↓
VerifiedResourceContent
    ↓
media-type content decoding
    ↓
DecodedResourceContent
    ↓
Domain ResourceHandler
    ↓
Domain interpretation
    ↓
Domain validation
    ↓
Domain installation transaction
    ↓
Domain Object + ResourceInstallation
    ↓
ResourceReceipt
    ↓
ResourceInstallResult
```

The important implementation boundaries are:

```text
transport discovers
Resource resolution retrieves
content decoding normalizes serialization
Domains interpret meaning
Domains validate schemas/invariants
Domains install accepted objects
ResourceInstallation records provenance
ResourceReceipt records processing freshness
```

That separation lets the same generic Resource pipeline support Bible data, Strong's, Notes, Reading Plans, overlays, search data, and future Resource Types without moving Domain semantics into transport or generic Resource infrastructure.
