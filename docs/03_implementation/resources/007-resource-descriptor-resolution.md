# Resource Descriptor Resolution Implementation

**Status:** Current
**Area:** Resource Resolution / Descriptor Collections / External Retrieval

---

# Purpose

This document describes the current implementation for resolving Resource representations whose payload is a descriptor document.

A descriptor-backed Resource allows one published Resource to describe one or more Resources whose bytes are retrieved through pluggable strategies such as Blossom or Nostr.

Descriptor entries may themselves represent nested descriptor collections.

The central model is:

```text
ResourceRepresentation(representation = descriptors)
    ↓
ResourceDescriptorDocumentDecoder
    ↓
ResourceDescriptorValidator
    ↓
ResourceReceiptService
    ↓
ResourceResolutionStrategy
    ↓
bytes
    ↓
terminal content
or
recursive descriptor document
```

---

# Scope

This document covers:

- descriptor document decoding,
- generic descriptor validation,
- strategy dispatch,
- Blossom resolution,
- Nostr resolution,
- nested descriptor recursion,
- cycle and depth protection,
- Resource receipts,
- best-effort failure isolation,
- Worker/main-thread strategy bridging,
- the relationship between root discovery and nested resolution.

Domain interpretation/validation/installation occurs after resolution and is documented separately.

---

# Representation Model

A `ResourceRepresentation` has one of two representation values:

```text
content
```

or:

```text
descriptors
```

`ResourceResolver` dispatches to a registered `ResourceRepresentationResolver` according to that value.

Current resolvers are:

```text
ContentRepresentationResolver
DescriptorsRepresentationResolver
```

The descriptor resolver is therefore part of generic Resource mechanics rather than any one Domain.

---

# ResourceDescriptor

A descriptor contains:

```ts
interface ResourceDescriptor {
    metadata: {
        publisher: string;
        resourceId: string;
        category: string;
        modifiedAt: number;
        representation: 'content' | 'descriptors';
        mediaType: string;
    };

    strategy: {
        type: string;
        data: unknown;
    };
}
```

The strategy envelope is intentionally generic.

Generic Resource code validates the envelope; the selected strategy validates its own `data`.

---

# Descriptor Metadata

## publisher

The publisher is a 64-character lowercase hexadecimal Nostr public key.

## resourceId

The Resource identity/path of the described Resource.

## category

The descriptor category must equal the Resource Type extracted from `resourceId`.

This prevents a descriptor from advertising one Resource Type while pointing at an unrelated Resource ID.

## modifiedAt

Non-negative safe integer used for freshness/receipt comparisons and Nostr descriptor integrity checks.

## representation

Either:

```text
content
```

or:

```text
descriptors
```

## mediaType

Describes how the resolved bytes should be decoded at the appropriate stage.

---

# Descriptor Document Decoding

`ResourceDescriptorDocumentDecoder` decodes the parent Resource payload according to its media type and returns descriptor entries.

This reuses the Resource content decorator system rather than defining a separate descriptor-only encoding stack.

Current decorators include:

```text
application/json
+ gzip
+ hex
```

A failure to decode the root descriptor document becomes a Resource resolution failure for the root Resource.

---

# Generic Validation

`ResourceDescriptorValidator` validates:

- object shape,
- publisher format,
- Resource ID,
- category/Resource-Type agreement,
- `modifiedAt`,
- representation value,
- media type,
- strategy type,
- presence of strategy data.

It deliberately does not understand provider-specific strategy data.

Provider-specific validation belongs to the strategy implementation.

---

# ResourceResolutionStrategy

The strategy contract is:

```ts
interface ResourceResolutionStrategy {
    readonly type: string;

    resolve(
        descriptor: ResourceDescriptor
    ): Promise<Uint8Array>;
}
```

Strategies return bytes.

They do not interpret Domain Objects.

This keeps external retrieval separate from Resource content decoding and Domain interpretation.

---

# Strategy Registry

`DescriptorsRepresentationResolver` receives a collection of strategies and builds a type-indexed registry.

Duplicate strategy types are rejected during construction.

When processing a descriptor:

```text
descriptor.strategy.type
    ↓
registered strategy
    ↓
strategy.resolve(descriptor)
```

An unknown strategy becomes a failure for that descriptor.

---

# Blossom Strategy

`BlossomResourceResolutionStrategy` currently validates strategy data containing:

```text
urls
sha256
optional size
```

It attempts URLs in order until one succeeds.

The resolved bytes are validated against:

- optional byte length,
- required SHA-256 digest.

Only `http:` and `https:` URLs are accepted.

Integrity verification is part of the strategy because the provider-specific strategy data defines that integrity contract.

---

# Nostr Strategy

`NostrResourceResolutionStrategy` validates strategy data containing:

```text
kind
relays
```

It performs a bounded Nostr query using:

```text
kind
publisher
#d resourceId
```

and the descriptor-provided relay list.

The returned event must match the descriptor's:

```text
kind
publisher
modifiedAt
resourceId (#d)
category (#t)
representation
mediaType (#m)
```

The event content is returned as bytes for further Resource processing.

Nested Nostr resolution is therefore explicit descriptor resolution, not open-ended root Resource discovery.

---

# Resource Receipts

Before resolving a descriptor, the resolver asks:

```text
ResourceReceiptService.needsProcessing(
    publisher,
    resourceId,
    modifiedAt
)
```

If the stored receipt is current, the descriptor is reported in the `current` result instead of fetching its content again.

A Resource receipt records:

```text
publisher
resourceId
modifiedAt
```

with identity:

```text
publisher:resourceId
```

Receipts answer:

> Have these published Resource bytes already been processed at this revision?

They are not Domain installation provenance. Domain installation uses `ResourceInstallation` separately.

---

# Nested Descriptor Collections

A descriptor with:

```text
representation = descriptors
```

points at another descriptor document.

Current recursive flow:

```text
validate descriptor
    ↓
receipt freshness check
    ↓
strategy.resolve()
    ↓
decode nested descriptor document
    ↓
resolve nested entries recursively
```

Only terminal `content` descriptors become `VerifiedResourceContent` values returned for Domain processing.

Nested collection Resources are traversal structure; they are not converted into Domain Objects merely because they were traversed.

---

# Cycle Detection

Recursion maintains an operation-local set of visited Resource identities:

```text
publisher + resourceId
```

Before descending into another descriptor collection, the resolver checks whether that identity already exists in the current traversal path.

A repeat produces:

```text
Resource descriptor cycle: <publisher>/<resourceId>
```

The failure is isolated to that descriptor branch.

---

# Maximum Nesting Depth

The current implementation defines:

```text
MAX_DESCRIPTOR_NESTING_DEPTH = 3
```

When the current recursive depth has reached that value, another nested `descriptors` Resource is rejected.

This is a current implementation constraint, not part of Resource identity.

If this limit changes, update the resolver tests and this document together.

---

# Best-Effort Collection Resolution

Descriptor entries are processed independently.

The resolver accumulates three result collections:

```ts
{
    contents: VerifiedResourceContent[];
    current: ResourceResolutionCurrent[];
    failures: ResourceResolutionFailure[];
}
```

An invalid/unavailable descriptor does not automatically discard successful sibling descriptors.

This allows a collection to partially succeed while still returning structured failure information.

---

# ResourceResolutionResult

## contents

Terminal Resources that produced verified bytes and still require Domain processing.

## current

Resources skipped because their Resource receipt is already current.

## failures

Descriptor-level failures. When validation succeeded, the failure includes publisher/Resource identity/type context; failures before validation may contain only the error.

---

# Processing After Resolution

`ResourceProcessor` receives the resolution result.

For each terminal content result it:

1. decodes Resource content,
2. dispatches the matching `ResourceHandler`,
3. lets the Domain interpret/validate/install the object,
4. marks the terminal Resource receipt processed only after successful processing.

This ordering prevents a failed Domain installation from creating a receipt that would incorrectly suppress later retries.

---

# Root Discovery vs Nested Resolution

These remain different operations.

## Root Resource

```text
PublishedResourceReference
    ↓
ResourceDiscovery
    ↓
ResourceRepresentation
```

## Nested descriptor

```text
ResourceDescriptor
    ↓
ResourceResolutionStrategy
    ↓
bytes
```

Do not make descriptor recursion call open-ended Resource Discovery merely because the underlying provider is Nostr.

---

# Worker Topology

Descriptor processing runs in dedicated Resource child workers.

Current topology:

```text
main thread
    ↓
ResourceWorkerClient
    ↓
Resource coordinator worker
    ├── content child worker
    └── descriptor worker pool
            ├── descriptor worker 1
            ├── descriptor worker 2
            └── descriptor worker 3
```

The descriptor pool queues work when all three worker slots are busy.

Each descriptor worker constructs its own Resource processor and descriptor resolver.

---

# Why Nostr Strategy Resolution Bridges to the Main Thread

The application owns the real `NostrClient` on the main thread.

Descriptor workers therefore do not create their own Nostr transport.

Inside a descriptor worker, the `nostr` strategy is represented by a `ResourceWorkerStrategyResolver` proxy.

Flow:

```text
descriptor worker
    ↓ strategy-resolve
Resource coordinator / ResourceWorkerClient
    ↓
main-thread NostrResourceResolutionStrategy
    ↓
NostrClient
    ↓
strategy-resolve-result / error
    ↓
descriptor worker
```

This preserves one transport boundary while keeping recursive descriptor processing off the main thread.

Blossom resolution can run directly inside the descriptor worker because it uses `fetch` and does not need application Nostr state.

---

# Error Serialization

Errors crossing Worker boundaries are serialized and rehydrated by the Resource worker message helpers.

A Worker transport failure should not be confused with a descriptor's ordinary resolution failure.

`ResourceWorkerClient` also has terminal lifecycle states for failed/disposed Worker infrastructure.

---

# Relationship to Published Collections

Producer-side collection manifests may publish nested collection Resources whose descriptor entries point at:

- terminal object-backed Resources, or
- child collection Resources.

The consumer does not need to reconstruct the producer's manifest tree.

It follows descriptor semantics recursively and returns a flat set of terminal/current/failure outcomes.

Bootstrap policy consumes those flattened install results rather than preserving collection hierarchy as application runtime state.

---

# Public API Boundary

Browser-safe Resource contracts/resolvers used by external consumers are exposed through:

```text
$lib/resource
```

Concrete provider strategies and persistence implementations may remain direct implementation imports when composition requires them.

Do not export implementation-specific classes through the root merely to shorten import paths if doing so creates dependency cycles.

---

# Important Files

Descriptor model/validation:

```text
src/lib/resource/descriptors/
    resource-descriptor.ts
    resource-descriptor-validator.ts
    resource-descriptor-document-decoder.ts
```

Resolution:

```text
src/lib/resource/resolution/
    resource-resolver.ts
    resource-representation-resolver.ts
    resource-resolution-result.ts
    resource-resolution-strategy.ts
    content-representation-resolver.ts
    descriptors-representation-resolver.ts
    blossom-resource-resolution-strategy.ts
    nostr-resource-resolution-strategy.ts
```

Receipts:

```text
src/lib/resource/receipts/
```

Worker bridge:

```text
src/lib/resource/worker/
    resource-worker-client.ts
    resource-worker-strategy-resolver.ts
    resource-descriptor-worker-pool.ts
    resource-descriptor.worker.ts
    resource-worker-composition.ts
```

---

# Testing

Tests should cover:

- descriptor document decoding,
- generic descriptor validation,
- duplicate strategy registration,
- unsupported strategies,
- Blossom URL/data/hash/size validation,
- Nostr strategy data and event metadata validation,
- receipt-current skips,
- terminal descriptor resolution,
- nested descriptor recursion,
- cycle rejection,
- maximum-depth rejection,
- sibling failure isolation,
- Worker strategy request/result/error bridging,
- browser end-to-end nested Resource installation.

---

# Invariants

```text
Descriptor metadata is generic Resource metadata.

Strategy data is opaque to generic validation.

Strategies return bytes, not Domain Objects.

Root discovery is separate from nested descriptor resolution.

Receipt freshness is checked before external retrieval.

Domain installation provenance is separate from Resource receipts.

Terminal receipts are written only after successful processing.

Recursive traversal rejects cycles and enforces the current depth limit.

Sibling descriptor failures do not discard successful siblings.

Nostr transport remains main-thread infrastructure.
```

---

# Anti-Patterns

Do not:

- put provider-specific strategy validation into `ResourceDescriptorValidator`,
- treat Resource receipts as Domain installation records,
- make Domain interpreters fetch external data,
- recreate recursive Resource Discovery for descriptor traversal,
- construct independent Nostr clients inside descriptor workers,
- mark Resources current before Domain processing succeeds,
- expose collection hierarchy as Domain state unless a Domain explicitly models it.

---

# Relationship to Other Docs

See also:

```text
docs/03_implementation/resources/001-resource-transport.md
docs/03_implementation/resources/003-resource-discovery.md
docs/03_implementation/resources/004-resource-installation.md
docs/03_implementation/resources/005-resource-lifecycle-content.md
docs/03_implementation/resources/006-resource-publication.md
docs/03_implementation/platform/002-workers.md
```
