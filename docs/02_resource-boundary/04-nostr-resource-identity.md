# ADR 04 — Nostr Resource Identity

**Status**

Accepted

---

# Problem

Resources are published as Nostr addressable events.

The Resource Boundary needs a consistent way to determine:

* whether two events are publications of the same Resource,
* whether a new event replaces an earlier publication,
* and whether an event identifies a different Resource.

Defining a separate application-specific Resource version or revision model would duplicate semantics already provided by Nostr.

---

# Decision

The Resource Boundary adopts Nostr addressable-event identity and replacement semantics directly.

A Published Resource is identified by:

```text
kind + publisher public key + d tag
```

The application MUST NOT introduce a separate Resource version, revision, or publication identity system.

The Nostr event `id` identifies one specific signed publication of that Resource.

---

# Published Resource Identity

Two Resource events with the same:

```text
kind
publisher public key
d tag
```

are publications of the same Published Resource.

Changing any of those values creates a different Published Resource.

Conceptually:

```text
kind + pubkey + d
        │
        ├── Event Publication A
        ├── Event Publication B
        └── Event Publication C
```

Each publication has its own event `id`.

The Published Resource Identity remains unchanged.

---

# Resource Identifier

The Domain Resource Model defines the logical Resource Identifier.

When represented as a Nostr addressable event, that identifier is carried in the `d` tag.

For example:

```text
kjvonly/bible/chapters/kjv
```

may be represented as:

```json
["d", "kjvonly/bible/chapters/kjv"]
```

The `d` tag identifies the Resource within a publisher's address space and Nostr kind.

It is therefore one component of Published Resource Identity, not the complete identity by itself.

---

# Event Publication

An Event Publication is one signed Nostr event for a Published Resource.

Publishing another event with the same:

* `kind`,
* publisher public key,
* and `d` tag

creates another publication of the same Resource.

The replacement publication has a different event `id`, but the Published Resource Identity remains unchanged.

Relays MAY discard older publications and retain only the latest event for an addressable identity.

Older event publications therefore MUST NOT be treated as a durable Resource revision history.

---

# Different Published Resources

A different Published Resource is created when any identity component changes:

```text
different kind

or

different publisher public key

or

different d tag
```

The protocol does not assign additional meaning to why the identity changed.

For example, a publisher may choose identifiers such as:

```text
kjvonly/bible/chapters/kjv

kjvonly/bible/chapters/kjv/v2
```

These are different Resource Identifiers and therefore different Published Resources when published under the same kind and publisher.

The `v2` segment has no special protocol meaning.

It is part of the publisher's Resource naming convention.

---

# Publisher Identity

The publisher public key is part of Published Resource Identity.

The same `kind` and `d` tag published by two different publishers identifies two different Resources.

```text
Publisher A + kind + d
    → Published Resource A

Publisher B + kind + d
    → Published Resource B
```

Changing publishers cannot replace the original publisher's Resource.

It creates an independently addressable Resource.

---

# Replacement Semantics

Compatible corrections and updates to the same Resource SHOULD preserve:

```text
kind + pubkey + d
```

and publish a replacement event.

A publisher SHOULD use a different Resource Identifier when it intends to create a separately addressable Resource.

Changing:

* event `id`,
* `created_at`,
* serialized content,
* or Resource Representation

does not by itself create a different Published Resource.

Identity is determined only by:

```text
kind + pubkey + d
```

---

# Resource Representation and Identity

Resource Representation does not participate in Published Resource Identity.

A publisher may change a Resource from:

```text
content
```

to:

```text
descriptor
```

without changing the Resource identity, provided the `kind`, publisher, and `d` tag remain the same.

Representation determines how Resource content is obtained.

Identity determines which Published Resource the event represents.

---

# Versions

The Resource Boundary does not define a special version abstraction.

Publishers MAY encode distinctions such as:

* editions,
* translations,
* incompatible formats,
* compatibility generations,
* or alternative datasets

into Resource Identifiers when those distinctions should be independently addressable.

Segments such as:

```text
v1
v2
edition
2026
```

have no generic protocol-level version semantics.

They are Resource naming conventions.

---

# Forks and Provenance

The Resource Boundary does not define a Fork as a separate identity type.

A Resource published under another publisher is already a different Published Resource because the publisher public key differs.

A publisher MAY include provenance metadata describing a relationship to another Resource.

Such metadata may identify:

```text
source kind
source publisher public key
source d tag
optional source event id
```

Provenance is descriptive metadata.

It MUST NOT participate in Published Resource Identity or replacement semantics.

---

# Identity and Local Acceptance

Published Resource Identity determines which external Resource a Nostr event represents.

It does not determine whether a publication becomes accepted local state.

A replacement publication may be newer according to Nostr semantics while still requiring the normal Resource Resolution, validation, Installation, or Synchronization rules.

Therefore:

```text
same Published Resource
    ≠
automatically accepted replacement
```

Identity and local acceptance are separate concerns.

---

# Identity Rules

The complete identity model is:

```text
same kind + same publisher + same d tag
    = same Published Resource

same identity + different event id
    = different publication of the same Resource

different kind, publisher, or d tag
    = different Published Resource

provenance
    = metadata only

version-like identifier segments
    = publisher naming convention
```

No additional Resource version or revision abstraction is introduced.

---

# Implications

Resource Identifiers SHOULD be stable logical identifiers.

Compatible corrections and updates SHOULD normally reuse the existing Published Resource Identity.

A publisher MAY create a new identity when it intends to publish an independently addressable Resource.

Clients MUST NOT infer protocol-level version semantics from Resource Identifier segments.

Clients MUST NOT depend on older relay publications as a durable revision history.

---

# Scope

This ADR defines:

* Published Resource Identity,
* the relationship between Resource Identifier and Nostr identity,
* the relationship between Published Resource Identity and event `id`,
* Nostr replacement identity,
* publisher participation in identity,
* version-like Resource naming,
* and optional provenance.

It does not define:

* Resource Discovery,
* Resource Resolution,
* Installation,
* update-selection policy,
* synchronization conflict resolution,
* local acceptance,
* historical archival,
* deletion,
* or persistence.

Those concerns are defined by other Resource Boundary specifications.

---

# Big Takeaway

The Resource Boundary relies directly on Nostr addressable-event identity:

```text
kind + publisher public key + d tag
```

identifies the Published Resource.

The event `id` identifies one signed publication of that Resource.

Changing an identity component creates a different Published Resource.

Version names and fork relationships remain naming or provenance conventions rather than additional identity systems.

> **Nostr identity determines which Resource was published; the Resource lifecycle determines what the application accepts.**
