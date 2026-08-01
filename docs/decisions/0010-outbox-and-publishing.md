# ADR 0008 — Sync / Outbox Strategy

**Status**

Accepted

---

# Problem

KJVOnly is an offline-first application.

Users should be able to create notes, annotations, highlights, reading progress, and other personal data regardless of network connectivity.

The application cannot assume that a relay is available when a user performs an action.

Synchronization must therefore be reliable, resilient, and independent of the user interface.

The architecture needs a consistent model for converting local changes into Nostr events while handling retries, temporary failures, duplicate submissions, and multi-relay publishing.

---

# Decision

The application adopts an asynchronous synchronization model built around a persistent Outbox.

The Outbox is responsible for publishing locally committed changes to Nostr relays.

A user action is considered successful once the local domain store has been updated and the corresponding synchronization operation has been queued.

Publishing to relays is never part of the user interaction.

Synchronization occurs independently in the background whenever connectivity is available.

---

# Local-First Writes

Every write follows the same lifecycle.

```text
User Action
        │
        ▼
Update Domain Store
        │
        ▼
Queue Outbox Operation
        │
        ▼
Return Success
        │
        ▼
Background Synchronization
```

The user interface never waits for relay acknowledgements before reporting success.

This preserves the application's offline-first behavior and ensures that network availability does not affect normal interaction.

---

# The Outbox

The Outbox is a persistent synchronization queue.

Its purpose is to ensure that local changes are eventually published to one or more relays.

The Outbox is **not** an event history or audit log.

It only contains operations that still require synchronization.

Once an operation has been successfully synchronized, it is removed from the queue.

---

# Operation Coalescing

Most user data is represented using replaceable Nostr events.

Multiple edits to the same logical object before synchronization do not provide additional architectural value.

The Outbox therefore maintains at most one pending operation per synchronization target.

If a queued operation already exists for the same target, it is replaced by the newer operation.

For example:

```text
Edit Note

↓

Edit Note

↓

Edit Note

↓

Single Pending Outbox Entry
```

This keeps synchronization efficient while ensuring that only the most recent state is published.

Non-replaceable event types may define different behavior where appropriate.

---

# Synchronization Lifecycle

Every Outbox operation follows a consistent lifecycle.

```text
Queued

↓

Publishing

↓

Succeeded
```

If publishing fails:

```text
Queued

↓

Publishing

↓

Failed

↓

Waiting

↓

Retry
```

This lifecycle is independent of the domain being synchronized.

---

# Success Criteria

Users may publish to multiple relays.

Synchronization is considered successful once a single configured relay has accepted the event.

Remaining relays provide additional replication but do not block completion.

This follows the distributed nature of Nostr while avoiding unnecessary failures caused by individual relay outages.

---

# Retry Strategy

Synchronization retries occur automatically.

Retries use exponential backoff to reduce unnecessary network traffic during prolonged outages.

A circuit breaker temporarily suspends attempts against relays that are consistently failing.

When the circuit breaker resets, publishing resumes automatically.

Operations remain in the Outbox until synchronization succeeds.

The application never silently discards pending user data.

---

# Application Restart

The Outbox is persisted in IndexedDB.

If the application closes or the device restarts, synchronization resumes automatically the next time the application starts.

No user intervention is required.

---

# Conflict Resolution

The synchronization pipeline does not attempt to merge conflicting changes.

The default conflict strategy is Last Write Wins.

Domains that require more sophisticated conflict handling may define additional behavior in future architectural decisions.

---

# Deletes

Delete operations are treated like any other synchronization operation.

Objects are first marked as deleted locally.

The corresponding delete event is queued in the Outbox.

Permanent cleanup may occur after successful synchronization according to the needs of the domain.

This guarantees that deletions can be retried if connectivity is unavailable.

---

# Replaceable Events

Most synchronized data uses replaceable Nostr events.

Publishing an updated event naturally replaces earlier versions of the same logical object.

This aligns with the Outbox's coalescing behavior by ensuring that only the latest representation of a resource is synchronized.

---

# Relationship to Nostr

Synchronization is built around the Nostr protocol.

The Outbox publishes Nostr events to configured relays using the application's synchronization strategy.

While the implementation may evolve, Nostr is the architectural protocol used for synchronization throughout the application.

---

# Big Takeaway

The Outbox makes synchronization asynchronous, reliable, and independent of the user interface.

Users interact only with local domain data.

The Outbox ensures that those local changes are eventually published to Nostr using automatic retries, efficient operation coalescing, and resilient background synchronization.

By treating synchronization as an independent architectural concern, the application remains responsive, offline-first, and resilient to network failures.
