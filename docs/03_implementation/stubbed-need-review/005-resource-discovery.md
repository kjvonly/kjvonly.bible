# Resource Discovery Implementation

**Status**

Implementation Design — Preserved from Resource Boundary ADRs

---

# Purpose

This document preserves the concrete implementation model for Resource Discovery.

ADR 05 — Discovery Roots defines discovery scope.

ADR 06 — Resource Discovery defines the discovery contract.

This document describes practical query construction, result types, multi-relay processing, recursive traversal, limits, and failure handling.

---

# Processing Model

A discovery operation follows:

```text
Discovery Input
    ↓
Build Nostr Filter
    ↓
Query Relay(s)
    ↓
Validate Events
    ↓
Deduplicate Events
    ↓
Group Published Resources
    ↓
Select Current Publication
    ↓
Resource Representations
```

When recursive traversal is requested, explicit Nostr Resource references may produce additional discovery operations.

---

# Discovery Inputs

Useful implementation inputs include:

```text
publisher public key
Published Resource Identity
Resource Classification
Resource reference
event id
```

A Discovery Root supplies publisher scope for open-ended discovery.

A direct Resource reference supplies a bounded query and does not need to promote that publisher to a Discovery Root.

---

# Query Construction

Discovery should construct the narrowest Nostr filter available from its input.

## Exact Published Resource

```json
{
  "kinds": ["<resource-kind>"],
  "authors": ["<publisher-pubkey>"],
  "#d": ["<resource-identifier>"]
}
```

## Classification

```json
{
  "kinds": ["<resource-kind>"],
  "authors": ["<publisher-pubkey>"],
  "#t": ["<resource-classification>"]
}
```

## Publisher

```json
{
  "kinds": ["<resource-kinds>"],
  "authors": ["<publisher-pubkey>"]
}
```

## Exact Event

```json
{
  "ids": ["<event-id>"]
}
```

Publisher filtering should be included whenever the publisher is known.

---

# Query Builder

A useful implementation component is a query builder that translates discovery inputs into Nostr filters.

Conceptually:

```text
Exact Resource?
    → authors + kinds + #d

Classification?
    → authors + kinds + #t

Publisher only?
    → authors + kinds

Exact Publication?
    → ids
```

Relay API details remain isolated behind the discovery implementation.

---

# Discovered Resource

The old ADR used the following conceptual result:

```ts
type DiscoveredResource = {
  publisher: string
  resourceId: string
  kind: number
  eventId: string
  createdAt: number
  classification?: string
  representation: ResourceRepresentation
  relays?: string[]
}
```

This remains a useful implementation shape.

A discovery result should preserve enough context for:

* Resource Resolution,
* publication comparison,
* provenance,
* diagnostics,
* and referenced discovery.

It is not a Domain Object.

---

# Multi-Relay Discovery

Discovery may query multiple configured relays concurrently.

```text
Query
    ├── Relay A
    ├── Relay B
    └── Relay C
          ↓
       Merge
          ↓
       Dedupe
```

A relay failure should not automatically invalidate valid results obtained from other relays.

Relay provenance may be retained with results.

Relay URLs do not participate in Published Resource Identity.

---

# Event Deduplication

The same signed event may be returned by multiple relays.

Events with the same:

```text
event id
```

should be processed once.

This is the first deduplication stage.

---

# Resource Deduplication

After event-level deduplication, events are grouped by:

```text
kind + publisher public key + d tag
```

Multiple event IDs may therefore represent publications of one Published Resource.

The discovery implementation selects the current valid publication according to the Resource Boundary's Nostr addressable-event rules.

Only the selected Resource Representation is normally exposed to the caller.

---

# Descriptor References

A `descriptors` representation may expose references to other Resources.

Two cases must remain distinct.

## Nostr Resource Reference

A reference containing Resource identity information such as:

```text
publisher
Resource Identifier
applicable kind
optional expected event id
```

may produce another direct discovery query.

## External Content Reference

A reference containing:

```text
strategy
url
sha256
media type
```

is not another relay query.

It proceeds to Resource Resolution.

---

# Recursive Discovery

Recursive mode follows eligible Nostr Resource references.

```text
Root
    ↓
Discovered Resource
    ↓
Descriptor References
    ↓
Referenced Resource Queries
    ↓
Additional Results
```

The implementation should track Published Resource Identities already visited.

A visited Resource should not be repeatedly expanded.

---

# Direct and Recursive Modes

The old discovery design distinguished two useful modes.

```ts
type DiscoveryMode =
  | 'direct'
  | 'recursive'
```

**Direct**

Return only results matching the original request.

**Recursive**

Follow eligible Nostr Resource references exposed by discovered Resources.

The calling workflow chooses the mode.

---

# Traversal Context

A recursive discovery implementation should maintain operation-local state such as:

```text
visited Published Resource Identities
current depth
discovered count
descriptor count
cancellation state
deadline / timeout
```

This state belongs to the discovery operation.

It does not become persisted Resource metadata.

---

# Discovery Limits

Implementations should configure reasonable limits for:

* maximum discovery depth,
* maximum discovered Resources,
* maximum descriptor count,
* operation timeout,
* and cancellation.

The exact values are implementation policy.

The goal is to prevent hostile or malformed Resource graphs from causing unbounded network work.

---

# Discovery Failures

The old ADR identified useful failure categories:

```text
Relay Unavailable
Relay Rejected Query
Timeout
Cancelled
Invalid Event
Unsupported Event Kind
Invalid Resource Identifier
Invalid Classification
Conflicting Publications
Referenced Resource Not Found
Discovery Depth Exceeded
Discovery Limit Exceeded
```

`Conflicting Publications` replaces the older stale `Conflicting Revisions` terminology.

---

# Discovery Failure Type

A useful conceptual failure structure is:

```ts
type ResourceDiscoveryFailure = {
  publisher?: string
  resourceId?: string
  classification?: string
  relay?: string
  category: ResourceDiscoveryFailureCategory
  cause?: unknown
}
```

Where applicable, failure information should also retain the originating Resource reference.

---

# Partial Discovery

Discovery is best-effort when multiple independent operations are involved.

The old ADR used:

```ts
type ResourceDiscoveryResult = {
  resources: DiscoveredResource[]
  failures: ResourceDiscoveryFailure[]
}
```

This is a useful model because:

* one failed relay does not erase successful relay results,
* one missing referenced Resource does not erase unrelated Resources,
* and the caller can determine whether partial discovery is sufficient.

---

# Relay Adapter

A useful implementation boundary is:

```text
Resource Discovery
    ↓
Relay Query Adapter
    ↓
Nostr Library
    ↓
Relays
```

The discovery implementation should not scatter Nostr-library-specific query calls throughout application workflows.

---

# Current Publication Selection

Current-publication selection should happen after:

1. event validation,
2. event-id deduplication,
3. grouping by Published Resource Identity.

Conceptually:

```text
Events
    ↓
dedupe by event id
    ↓
group by kind + pubkey + d
    ↓
select current publication
    ↓
DiscoveredResource
```

Selection must not imply local acceptance.

---

# Cancellation

Long-running multi-relay and recursive discovery should support cancellation.

An `AbortSignal` or equivalent mechanism is appropriate.

Cancellation should stop:

* new relay queries,
* reference expansion,
* and unnecessary result processing.

Partial results already obtained may still be returned when the calling API supports that behavior.

---

# Workflow Independence

The same discovery implementation may support:

* application bootstrap,
* publisher browsing,
* manual Resource installation,
* synchronization,
* import validation,
* diagnostics,
* and direct Resource navigation.

These workflows supply their own policies.

Discovery itself remains focused on locating representations.

---

# Potential Components

A practical implementation may contain:

```text
ResourceDiscovery

DiscoveryQueryBuilder

RelayDiscoveryAdapter

DiscoveryResultMerger

CurrentPublicationSelector

RecursiveDiscoveryTraversal
```

These names are implementation guidance only.

---

# Big Takeaway

The discovery implementation turns bounded discovery inputs into Nostr queries and normalized Resource Representations.

Its most important concrete concerns are:

```text
query construction
multi-relay merging
event deduplication
Resource deduplication
recursive traversal
limits
partial results
failure reporting
```

What happens to a discovered Resource afterward remains outside this implementation.
