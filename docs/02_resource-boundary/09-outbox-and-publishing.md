# ADR 09 — Outbox and Publishing

**Status**

Accepted

---

# Problem

KJVOnly is offline-first.

Users must be able to create and modify local Domain information without waiting for network availability, relay acknowledgements, or successful Nostr publication.

When accepted local information participates in the Resource lifecycle, the application must also ensure that its publication intent is not lost if the application closes, the network is unavailable, or publication fails.

The Resource Boundary therefore needs a durable outbound publication process that remains separate from synchronization and conflict resolution.

---

# Decision

KJVOnly uses a persistent **Outbox** to record durable publication intent and publish Resources asynchronously.

The outbound lifecycle is:

```text id="vzc2cu"
Local Domain Change
        ↓
Accepted Local State
        ↓
Durable Publication Intent
        ↓
Resource Representation
        ↓
Nostr Event
        ↓
Sign
        ↓
Relay Publication
```

Local acceptance MUST NOT depend on successful relay publication.

If an accepted local change requires publication, its publication intent MUST survive application restart and network failure.

---

# Local-First Changes

Application changes are accepted locally before publication completes.

A user-facing operation MUST NOT wait for relay acknowledgement before its resulting local Domain state becomes usable.

Therefore:

```text id="spcs4q"
local acceptance
    ≠
publication success
```

Network failure does not invalidate an already accepted local change.

---

# Durable Publication Intent

The Outbox records that accepted local information still needs to participate in Nostr publication.

An Outbox entry MUST preserve enough information to identify and later produce the intended publication.

Conceptually, that includes:

* the Published Resource Identity,
* the information required to construct the Resource publication,
* publication targets or relay policy,
* publication status,
* and retry state.

The exact persistence format is implementation-defined.

The Outbox does not require a particular `Resource Serializer`, repository, database schema, or queue implementation.

---

# Local Durability Invariant

When an accepted local change requires publication, the application MUST durably establish both:

```text id="5e6zgz"
Accepted Local Change
        +
Durable Publication Intent
```

before considering the publish-required operation durably complete.

A crash MUST NOT be able to leave the application with a committed local change whose required publication intent was silently lost.

How an implementation preserves this invariant is a persistence concern.

It does not require a `Domain Store` architectural abstraction.

---

# Materializing the Publication

A durable publication intent is converted into the Resource publication defined by the earlier Resource Boundary specifications.

Conceptually:

```text id="t7xbrp"
Publication Intent
        ↓
Resource
        ↓
Resource Representation
        ↓
Nostr Event
```

The owning Domain determines the Domain information being published.

ADR 01 defines the Resource model.

ADR 03 defines how the resulting Resource Representation maps to a Nostr event.

The implementation MAY use serializers, builders, factories, or other internal mechanisms.

Those mechanisms are not architectural requirements.

---

# Signing

The Nostr event is signed using the publisher identity required by the Published Resource Identity.

```text id="tq0uev"
Resource Representation
        ↓
Nostr Event
        ↓
Sign
        ↓
Signed Nostr Event
```

Signing MUST occur before relay publication.

The resulting event `id` identifies that specific signed publication, while `kind + pubkey + d` continues to identify the Published Resource as defined by ADR 04.

The Outbox does not introduce another publication identity.

---

# Outbox Lifecycle

A publication intent progresses conceptually through:

```text id="opjv36"
Pending
    ↓
Publishing
    ↓
Published
```

A failed publication remains durable until it is retried, superseded, explicitly abandoned according to application policy, or otherwise resolved.

Pending publication intent MUST NOT be silently discarded because publication failed.

Published entries MAY be removed once the application's publication requirements have been satisfied.

---

# Background Publishing

Outbox publication occurs independently of user interaction.

Publishing may be attempted:

* after a local change,
* when connectivity returns,
* after application restart,
* or during other background processing.

The timing and execution mechanism are implementation concerns.

The architectural requirement is that local application behavior does not depend on immediate publication success.

---

# Relay Publication

A signed Resource event MAY be sent to multiple configured relays.

Publication is considered successful when at least one configured publication relay accepts the event.

Additional relay publication provides replication and MAY continue independently.

Per-relay status MAY be retained for diagnostics or replication behavior.

Relay location does not participate in Resource Identity.

---

# Retry and Restart

Retryable publication failures remain durable in the Outbox.

Implementations SHOULD avoid aggressive retry behavior during prolonged network failure.

The exact backoff schedule, connectivity handling, and retry mechanism are implementation policy.

Pending publication intents MUST survive application restart.

The user MUST NOT need to recreate a local change merely because its original publication attempt failed.

---

# Coalescing Addressable Resources

Most KJVOnly Resources use Nostr addressable-event semantics.

When multiple pending publication intents target the same:

```text id="pjuvc8"
kind + publisher public key + d tag
```

the Outbox MAY coalesce them when publishing only the newest intended state preserves the Resource's protocol semantics.

For example:

```text id="g7doqh"
Pending State A
        ↓
Pending State B
        ↓
Publish State B
```

Coalescing MUST NOT be used when each publication has independent meaning.

Append-only or otherwise non-replaceable event semantics require separate publication intents.

---

# Superseded and Stale Publication Intent

A pending publication may become obsolete because newer local or synchronized state supersedes it.

The Outbox itself does not determine which Domain state is authoritative.

It MUST NOT independently:

* fetch remote state,
* merge concurrent changes,
* compare Domain versions,
* resolve synchronization conflicts,
* or replace accepted local state.

Synchronization policy may supersede, replace, or cancel a pending publication intent when appropriate.

Once given a publication intent to execute, the Outbox remains responsible for durable publication rather than conflict resolution.

---

# Publication Status

Publication state is distinct from Domain state.

Conceptually, an accepted local change may be:

```text id="eq8z95"
accepted locally
    +
pending publication
```

and later:

```text id="dp521l"
accepted locally
    +
published
```

Publication failure MUST NOT make the accepted Domain information unavailable.

Applications MAY expose publication status such as pending, publishing, published, or failed when useful to the user.

---

# Deletion

This ADR does not define Resource deletion semantics.

If a Resource Type has an explicitly defined Nostr publication representing deletion, that publication uses the same durable Outbox lifecycle.

A generic local delete MUST NOT automatically be assumed to map to a particular Nostr deletion event.

Deletion semantics require their own Resource protocol definition.

---

# Offline-First Behavior

The Outbox preserves these offline-first properties:

* local changes remain usable without relay access,
* publication intent survives connectivity loss,
* failed publication can be retried later,
* application restart does not lose pending publication,
* and relay failure does not invalidate accepted local state.

The relationship is:

> **Accept locally first. Publish externally independently.**

---

# Specification Invariants

A compatible implementation MUST preserve these rules:

```text id="5akeiv"
Local acceptance does not wait for relay publication.

Required publication intent is durable.

A required local change and its publication intent
cannot become durably inconsistent.

The Outbox publishes asynchronously.

Resource Representation precedes Nostr event creation.

Nostr events are signed before relay publication.

Pending publication survives restart and network failure.

Publication failure does not invalidate local state.

Addressable Resource intents may be coalesced
only when replacement semantics make it safe.

The Outbox does not resolve synchronization conflicts.
```

---

# Scope

This ADR defines:

* durable publication intent,
* local-first publication behavior,
* the Outbox,
* the outbound Resource publication sequence,
* Nostr signing placement,
* relay success policy,
* retry and restart durability,
* safe publication coalescing,
* and the boundary between publishing and synchronization.

It does not define:

* Domain persistence implementation,
* Resource Identity,
* exact Resource serialization schemas,
* Nostr event structure,
* Resource Discovery,
* Resource Resolution,
* Resource Installation,
* synchronization conflict resolution,
* merge behavior,
* or generic Resource deletion semantics.

Those concerns are defined by the corresponding Resource Boundary or Application Architecture specifications.

---

# Big Takeaway

The Outbox exists so local application behavior and Nostr availability remain independent.

```text id="mpvg2b"
Accepted Local State
        ↓
Durable Publication Intent
        ↓
Resource Representation
        ↓
Signed Nostr Event
        ↓
Nostr Relays
```

The application accepts local changes first.

The Outbox ensures that required publication is not forgotten and can succeed later.

> **Local state is authoritative locally; publication is a durable asynchronous consequence.**
