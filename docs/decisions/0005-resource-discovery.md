# 0005 Resource Discovery

## Status

Proposed

## Problem

Clients need a way to discover available datasets, resources, overlays, reading plans, and user-created content.

The system must support:

* Built-in application content
* User-created content
* Friend-created content
* Future community content

while preventing untrusted or unwanted resources from automatically appearing in the application.

Discovery should remain independent from storage backends.

Clients should discover resources using Nostr events and manifests without needing to know whether content is stored in:

```text
event content
blossom
ipfs
http
future storage providers
```

The system must also function when offline by utilizing previously discovered manifests.

## Decision

KJVOnly uses a trust-based discovery model.

Discovery begins with trusted publishers.

Clients discover manifests from trusted publishers and use those manifests to discover available resources.

Discovery is publisher-first rather than search-first.

```text
trusted publisher
↓
manifest discovery
↓
resource discovery
↓
resource installation
```

## Discovery Sources

Discovery occurs in priority order.

### Application Publisher

The application contains a trusted publisher pubkey.

This publisher provides:

```text
Bible datasets
Default overlays
Default reading plans
Core application content
```

The application publisher is trusted automatically.

### User Publisher

Users may publish their own resources.

Examples:

```text
Reading plans
Notes
Annotations
Study guides
Paragraph schemes
Pericope schemes
```

### Trusted Publishers

Users may explicitly trust additional publishers.

Examples:

```text
Friends
Churches
Study groups
Organizations
```

Trusted publishers may provide:

```text
Reading plans
Notes
Annotations
Overlays
Other resources
```

### Future Discovery Sources

Future versions may support:

```text
Community directories
Publisher catalogs
Public discovery relays
```

These are intentionally excluded from the initial design.

## Discovery Model

Discovery begins with a list of trusted publishers.

Example:

```text
app publisher
friend A
friend B
```

The client queries manifests from trusted publishers.

Example:

```json
{
  "kinds": [37778],
  "authors": ["<trusted-pubkey>"]
}
```

Discovered manifests are validated and cached locally.

Resources are then discovered through manifest contents.

The client never discovers resources directly from storage backends.

## Publisher Permissions

Trust is granted per publisher.

Future versions may support domain-level permissions.

Example:

```json
{
  "pubkey": "<friend-pubkey>",
  "plans": true,
  "overlays": true,
  "notes": false,
  "annotations": false
}
```

This allows users to selectively subscribe to resource categories.

Examples:

```text
Accept reading plans from a friend
Reject annotations from a friend
Accept overlays from a study group
```

## Manifest Discovery

Manifests are the primary discovery mechanism.

Example:

```text
kind=37778
d=kjvonly/bible/kjv
```

Manifests advertise available resources.

Example:

```text
kjvonly/bible/chapters/kjv
kjvonly/overlays/paragraphs/default
kjvonly/overlays/pericopes/default
```

The client discovers resources by reading manifests rather than performing direct resource searches.

## IndexedDB Architecture

The client maintains discovery state locally.

### trusted_publishers

Stores trusted publisher information.

Example:

```ts
{
  pubkey: "...",
  trusted: true
}
```

### discovered_manifests

Stores manifests discovered from trusted publishers.

Example:

```ts
{
  pubkey: "...",
  d: "kjvonly/bible/kjv",
  eventId: "...",
  discoveredAt: 123456789
}
```

### manifests

Stores cached manifest content.

This allows discovery to function while offline.

## Offline Discovery

Previously discovered manifests remain available offline.

Flow:

```text
load cached manifests
↓
enumerate resources
↓
install resources
```

Relay access is only required when refreshing discovery information.

## Discovery Validation

Before accepting a discovered manifest:

### Verify Signature

The event signature must be valid.

### Verify Publisher

The publisher must be trusted.

### Verify Application

When applicable:

```text
app=kjvonly
```

must match the current application.

### Verify Resource Metadata

Manifest resource definitions must be valid before installation.

## Duplicate Handling

The canonical manifest identifier is:

```text
pubkey + d
```

If multiple manifests exist:

```text
same pubkey
same d
```

the newest valid event is retained.

Different publishers may publish resources with the same resource identifier.

Example:

```text
publisher A
kjvonly/plans/readings/yearly

publisher B
kjvonly/plans/readings/yearly
```

These are treated as separate resources because publisher ownership differs.

## Failure Handling

### Invalid Publisher

Ignore manifest.

### Invalid Signature

Ignore manifest.

### Invalid Resource Metadata

Mark manifest invalid.

### Missing Resources

Retain manifest but mark resource unavailable.

### Relay Offline

Use cached manifests.

### Hash Validation Failure

Reject resource installation.

## Public Discovery

Public relay searching is intentionally excluded.

The system does not automatically search for resources across arbitrary publishers.

Future versions may provide an explicit discovery experience.

Examples:

```text
Browse publishers
Browse reading plans
Browse community content
```

This must always remain user initiated.

## Design Rules

* Discovery begins with trusted publishers.
* Discovery uses manifests.
* Discovery is independent of storage backends.
* Publishers own their resources.
* `(pubkey, d)` is the canonical resource identifier.
* The application publisher is trusted by default.
* Public discovery is opt-in.
* Cached manifests support offline operation.
* Resources are discovered through manifests.
* Resources are not discovered directly from storage backends.

## Consequences

* Discovery remains predictable.
* Users control what content they receive.
* Publishers retain ownership of resources.
* Offline discovery is possible.
* Storage backends remain implementation details.
* Community content can be added later without changing the discovery model.
* Future trust and subscription systems can be layered on top of the existing architecture.

## Big Takeaway

```text
Discovery starts from trust, not search.

Clients discover manifests from trusted publishers and discover resources through those manifests.
```
