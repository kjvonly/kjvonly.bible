# Resource Discovery Implementation

**Status:** Current
**Area:** Resource Boundary / Nostr Discovery

---

# Purpose

This document describes the current Resource Discovery implementation used to locate published Resource representations on Nostr.

Resource Discovery answers:

```text
Given a PublishedResourceReference,
what is the current matching ResourceRepresentation?
```

or:

```text
Given a publisher and Resource Type,
which current ResourceRepresentations are advertised for that type?
```

Discovery does not install Domain Objects and does not recursively resolve descriptor collections.

---

# Architectural Position

```text
PublishedResourceReference
    ↓
ResourceDiscovery
    ↓
NostrClient
    ↓
verified Nostr Event
    ↓
toResourceRepresentation()
    ↓
ResourceRepresentation
```

For normal installation, discovery feeds the Resource Worker lifecycle:

```text
Domain/Application request
    ↓
ResourceWorkerClient
    ↓
Resource Worker ResourceService
    ↓
ResourceWorkerDiscovery bridge
    ↓
main-thread ResourceDiscovery
    ↓
ResourceRepresentation
```

The actual Nostr client remains on the main thread.

---

# Why Discovery Is Separate From Resolution

Discovery locates the root published Resource event.

Resolution interprets the representation carried by that Resource:

```text
content
```

or:

```text
descriptors
```

A nested descriptor with strategy `nostr` is **not** another `ResourceDiscovery` operation. It is a Resource Resolution Strategy operation driven by descriptor metadata.

That distinction prevents root discovery policy from becoming entangled with recursive descriptor traversal.

---

# ResourceDiscovery

Implementation:

```text
src/lib/resource/nostr/resource-discovery.ts
```

The class depends on the generic infrastructure `NostrClient` and currently exposes two operations:

```text
get(reference)
listByType(publisher, resourceType)
```

---

# Exact Resource Lookup

`get()` queries one addressable Resource by:

```text
kind   = RESOURCE_KIND
pubkey = reference.publisher
#d     = reference.resourceId
```

Conceptually:

```json
{
  "kinds": [37770],
  "authors": ["<publisher>"],
  "#d": ["<resourceId>"]
}
```

If no matching event exists, discovery returns:

```text
null
```

A missing Resource is distinct from infrastructure failure. Infrastructure failures are surfaced by `NostrClient`.

---

# Resource-Type Listing

`listByType()` queries:

```text
kind   = RESOURCE_KIND
pubkey = publisher
#t     = resourceType
```

The returned events are converted to Resource representations and filtered again so the resulting representation still matches the requested publisher and Resource Type.

The method then groups by `resourceId` and retains the representation with the greatest `modifiedAt` value for each Resource.

The result is:

```text
readonly ResourceRepresentation[]
```

This operation is useful for synchronization/discovery-oriented enumeration. It is not the normal lookup path for a module that already has a concrete `PublishedResourceReference`.

---

# Event Conversion

Nostr Resource events are converted through:

```text
toResourceRepresentation()
```

The representation preserves Resource-boundary information such as:

```text
publisher
resourceId
resourceType
modifiedAt
representation
mediaType
payload
```

The result is still a published Resource representation, not a Domain Object.

---

# Current Publication Selection

For `listByType()`, multiple events may advertise the same `resourceId`.

The current implementation selects by:

```text
same resourceId
    ↓
keep greatest modifiedAt
```

Nostr event identity and relay location do not become part of Resource identity.

---

# Main-Thread Ownership

Nostr transport stays on the main thread.

The Resource coordinator/child workers do not construct independent Nostr clients.

When a Resource Worker needs root discovery it uses:

```text
ResourceWorkerDiscovery
```

That bridge sends a typed request to `ResourceWorkerClient`, which invokes main-thread `ResourceDiscovery` and returns either:

```text
discovery-result
```

or:

```text
discovery-error
```

This preserves one Nostr transport boundary while allowing Resource processing to remain Worker-owned.

---

# Discovery Is Not Synchronization

`ResourceDiscovery.listByType()` provides an enumeration primitive, but synchronization policy is separate.

For example, Notes local reads do not query Nostr merely because a Note is absent locally.

The intended separation remains:

```text
normal Domain read
    = local accepted state

explicit Resource install
    = known PublishedResourceReference

synchronization
    = discover/enumerate remote state and reconcile intentionally
```

Do not turn Domain `get()` methods into implicit relay synchronization.

---

# Discovery Is Not Descriptor Recursion

Older design material described recursive discovery modes.

The current implementation does not expose a recursive `ResourceDiscovery` API.

Recursive collection traversal now belongs to:

```text
DescriptorsRepresentationResolver
```

A descriptor's strategy selects the retrieval mechanism for that descriptor.

For `nostr`, the descriptor resolver invokes `NostrResourceResolutionStrategy`, not another open-ended discovery traversal.

---

# Error Boundary

Current behavior distinguishes:

## Missing Resource

```text
get() → null
```

## No matching type results

```text
listByType() → []
```

## Nostr infrastructure failure

The `NostrClient` operation throws an infrastructure error.

The Resource Worker bridge serializes/re-hydrates errors when discovery crosses the Worker boundary.

---

# Testing

Resource Discovery tests should cover:

- exact `kind + author + #d` query construction,
- type `kind + author + #t` query construction,
- event → Resource representation conversion,
- publisher/type filtering,
- current representation selection by `modifiedAt`,
- missing results,
- infrastructure errors,
- Worker discovery request/result/error bridging.

Browser integration tests may use concrete Nostr infrastructure because transport is the behavior under test.

---

# Important Files

```text
src/lib/resource/nostr/
    resource-discovery.ts
    resource-event.ts

src/lib/resource/worker/
    resource-worker-discovery.ts
    resource-worker-client.ts
    resource-worker-message.ts

src/lib/infrastructure/nostr/client/
    nostr-client.ts
    rx-nostr-client.ts
```

---

# Invariants

```text
Root Resource discovery is separate from descriptor resolution.

A PublishedResourceReference identifies the Resource to discover.

Nostr transport remains behind NostrClient.

Resource workers bridge discovery back to the main thread.

Missing remote state is not the same as transport failure.

Domain reads do not implicitly become synchronization.
```
