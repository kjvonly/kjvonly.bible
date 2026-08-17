# ADR 06 — Resource Discovery

**Status**

Accepted

---

# Problem

Resources are distributed through Nostr, but a client will not always know every complete Published Resource Identity in advance.

A client may know:

* a publisher,
* a Published Resource Identity,
* a Resource Classification,
* an event ID,
* or a Resource reference discovered from another Resource.

The Resource Boundary therefore needs a consistent way to locate available Resource Representations without coupling discovery to Resolution, Installation, or local acceptance.

---

# Decision

Resource Discovery queries Nostr relays for Resource events and returns validated Resource Representations.

```text id="697e64"
Discovery Input
      ↓
Nostr Relay Query
      ↓
Resource Event Validation
      ↓
Discovered Resource Representation
      ↓
Resource Resolution
```

Discovery ends when the applicable Resource Representation and its publication context are known.

Discovery MUST NOT:

* retrieve externally stored Resource content,
* interpret Domain meaning,
* create Domain Objects,
* install Resource information,
* persist accepted application state,
* or decide whether the discovered information should replace local state.

---

# Discovery Inputs

Discovery operates from known information supplied by a caller or obtained through an existing discovery traversal.

Typical inputs include:

```text id="0c5d13"
publisher public key

Published Resource Identity

Resource Classification

Resource reference

Nostr event ID
```

Discovery Roots define where a discovery traversal begins and are specified separately in ADR 05.

This ADR defines how supplied discovery information is translated into Nostr queries.

---

# Direct Resource Discovery

When the complete Published Resource Identity is known, Discovery SHOULD query directly for that Resource.

Published Resource Identity is:

```text id="cde288"
kind + publisher public key + d tag
```

A direct Nostr query therefore uses:

```json id="24a1b7"
{
  "kinds": ["<resource-kind>"],
  "authors": ["<publisher-pubkey>"],
  "#d": ["<resource-identifier>"]
}
```

For example:

```text id="1699d7"
publisher = <publisher-pubkey>
resource  = kjvonly/bible/chapters/kjv
```

Direct discovery is preferred when the complete identity is already known.

---

# Classification Discovery

A client may discover related Resources using Resource Classification.

Classification follows the Domain Resource Model:

```text id="f374a6"
namespace/domain/resource-type
```

For example:

```text id="781d57"
kjvonly/bible/chapters
kjvonly/plans/readings
kjvonly/notes/notes
```

When the publisher and applicable Resource kind are known, a classification query uses:

```json id="c54f3c"
{
  "kinds": ["<resource-kind>"],
  "authors": ["<publisher-pubkey>"],
  "#t": ["kjvonly/plans/readings"]
}
```

Classification discovery answers:

> **Which Resources of this class has this publisher published?**

It does not determine whether those Resources should be installed or accepted.

---

# Publisher Discovery

A client MAY query Resource events published by a known publisher.

Conceptually:

```json id="aa59f1"
{
  "kinds": ["<resource-kinds>"],
  "authors": ["<publisher-pubkey>"]
}
```

Broad publisher discovery may be useful when no narrower Resource Identity or Classification is known.

When a narrower query is possible, implementations SHOULD prefer it to reduce relay load, transferred data, and client-side filtering.

---

# Event Lookup

A specific Nostr publication may be retrieved by event ID:

```json id="fa7b81"
{
  "ids": ["<event-id>"]
}
```

An event ID identifies one publication, not the Published Resource itself.

Event lookup is therefore useful when a reference requires a specific publication, but it MUST NOT replace Published Resource Identity for normal Resource discovery.

---

# Relay Query Contract

The normal Nostr query shapes are:

| Discovery goal               | Filters                  |
| ---------------------------- | ------------------------ |
| Exact Published Resource     | `authors`, `kinds`, `#d` |
| Resources of one class       | `authors`, `kinds`, `#t` |
| Resources from one publisher | `authors`, `kinds`       |
| Exact publication            | `ids`                    |

Queries SHOULD include publisher filtering whenever the publisher is known.

Classification-only discovery across arbitrary publishers is not the normal discovery path. Discovery Roots and the calling workflow determine which publisher context is eligible for traversal.

---

# Current Addressable Publication

Resources use Nostr addressable-event identity.

Multiple relays may return different publications for the same:

```text id="ab8452"
kind + pubkey + d
```

Discovery MUST group those events by Published Resource Identity and select the current valid publication according to the Nostr addressable-event rules used by the Resource Boundary.

The selected event's `id` remains publication metadata.

It does not create a new Resource Identity.

Discovery selecting the current network publication does **not** mean that publication automatically replaces accepted local state.

That decision belongs to later Installation or Synchronization behavior.

---

# Multi-Relay Discovery

A Resource may be available from multiple relays.

Discovery MAY query multiple configured relays and merge the results.

Two forms of deduplication apply:

**Event deduplication**

Events with the same event `id` are the same signed publication and need only be processed once.

**Resource deduplication**

Different event IDs may represent publications of the same Published Resource Identity.

After grouping by:

```text id="6212a8"
kind + pubkey + d
```

Discovery exposes the selected current Resource Representation.

Relay provenance MAY be retained for diagnostics or later relay selection.

Relay location MUST NOT participate in Resource Identity.

---

# Discovery Through Resource References

A Resource using the `descriptors` representation may reference other independently identifiable Resources.

Some references identify another Nostr-published Resource.

For example, a reference may provide:

```text id="db6ead"
publisher public key
Resource Identifier
applicable Resource kind
optional expected event ID
```

Such a reference can produce another direct Resource Discovery operation.

```text id="5e95a8"
Discovered descriptors Representation
        ↓
Nostr Resource Reference
        ↓
Direct Resource Discovery
        ↓
Referenced Resource Representation
```

If a reference identifies another publisher, Discovery can identify that publisher as part of the referenced Published Resource.

Whether the traversal is permitted is determined by the applicable Discovery Root or calling policy.

Discovery itself does not establish trust or acceptance merely because the reference exists.

---

# External Content References

A descriptor may instead describe external content directly using information such as:

```text id="998019"
storage mechanism
location
content hash
media type
```

That does **not** trigger another Nostr Resource discovery query.

The descriptor is already part of the discovered Resource Representation and is passed to Resource Resolution.

Therefore:

```text id="ac28c6"
Reference to another Nostr Resource
    → Discovery

Reference to external Resource content
    → Resolution
```

This distinction prevents Discovery and Resolution from overlapping.

---

# Recursive Discovery

A `descriptors` Resource may reveal Resources that themselves contain further Nostr Resource references.

Discovery MAY follow those references recursively when the calling workflow requests graph traversal.

Recursive discovery MUST:

* track Published Resource Identities already visited,
* avoid repeatedly expanding the same Resource,
* and enforce bounded traversal.

Implementations MUST protect recursive discovery from unbounded or hostile Resource graphs.

The exact depth, count, timeout, and cancellation limits are implementation policy rather than Resource protocol identity.

---

# Direct and Recursive Discovery

Discovery supports two conceptual behaviors:

**Direct Discovery**

Returns Resources matching the requested query.

**Recursive Discovery**

Also follows eligible Nostr Resource references revealed by discovered `descriptors` representations.

The calling workflow determines whether traversal should stop at direct results or continue through references.

This choice does not change the identity or validation rules used by Discovery.

---

# Partial Discovery

Multi-relay and recursive discovery are inherently capable of partial success.

Failure from one relay MUST NOT invalidate an otherwise valid representation obtained from another relay.

Likewise, failure to discover one referenced Resource need not invalidate unrelated successfully discovered Resources.

Discovery SHOULD therefore preserve successful results separately from failures so the caller can determine whether the partial result is sufficient.

The exact result and error types are implementation details.

---

# Discovery Failures

Discovery failures MUST be observable rather than silently converted into successful absence.

Relevant failures may include:

* relay failure or timeout,
* invalid Resource event,
* unsupported Resource event structure,
* malformed discovery input,
* referenced Resource not found,
* or traversal limit exhaustion.

Failure information SHOULD retain enough context to identify the failed discovery request.

The specification does not require a particular error type hierarchy.

---

# Discovery Does Not Establish Authority

Finding a Resource only establishes that a matching Resource Representation was available through the discovery operation.

It does not establish that:

* the publisher is accepted,
* the Resource should be installed,
* its Domain information is valid,
* or its publication should replace accepted local state.

Conceptually:

```text id="6c3dc1"
Discover
    ↓
Resource Representation
    ↓
Resolve
    ↓
Validate
    ↓
Accept / Install
```

The network proposes available Resource information.

Later Resource lifecycle stages determine what the application accepts.

---

# Discovery and Resolution

Discovery answers:

> **Which Resource Representation is available?**

Resource Resolution answers:

> **How does this known Resource Representation produce verified Resource content?**

Discovery MAY follow a Nostr reference when locating another Resource is required.

Discovery MUST NOT retrieve externally referenced Resource content.

That boundary is fundamental to the Resource lifecycle.

---

# Specification Invariants

A compatible implementation MUST preserve these rules:

```text id="822a86"
Discovery returns Resource Representations.

Exact Resource discovery uses Published Resource Identity.

Classification discovery uses Resource Classification.

Known publishers should constrain relay queries when possible.

Multiple relay results are deduplicated by event ID
and Published Resource Identity.

Nostr Resource references may extend discovery.

External content references belong to Resolution.

Recursive discovery must be bounded.

Discovery does not install or establish local authority.
```

---

# Scope

This ADR defines:

* direct Published Resource discovery,
* Resource Classification discovery,
* publisher discovery,
* event lookup,
* Nostr relay query shapes,
* current-publication selection,
* multi-relay deduplication,
* discovery through Nostr Resource references,
* recursive discovery,
* bounded traversal,
* and partial discovery behavior.

It does not define:

* how Discovery Roots are established,
* acceptance or trust policy,
* relay configuration,
* Nostr Resource event schemas,
* external content retrieval,
* integrity verification,
* Domain interpretation,
* Installation,
* persistence,
* synchronization,
* or application startup.

Those concerns belong to the corresponding Resource Boundary or Application Architecture specifications.

---

# Big Takeaway

Resource Discovery has one responsibility:

> **Find the Nostr Resource Representations available from known discovery information.**

It uses Nostr identity and classification metadata to query relays, merges results across relays, and may follow references to other Nostr Resources.

It stops before external content retrieval, Domain interpretation, Installation, or local acceptance.

> **Discovery finds what is available. Later Resource lifecycle stages decide what to do with it.**
