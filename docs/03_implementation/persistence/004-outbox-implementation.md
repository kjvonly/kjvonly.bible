# Outbox and Publishing Implementation

**Status**

Current

---

# Purpose

This document describes the current application Outbox implementation used to durably publish accepted local state after the local write has already succeeded.

The Outbox is an application-level publication mechanism. It is not Resource-specific and it is not a synchronization engine.

The current high-level flow is:

```text
Accepted Local Change
        ↓
Persist Local State
        +
Persist Final Publication Intent
        ↓
Commit Transaction
        ↓
Wake Outbox
        ↓
OutboxProcessor
        ↓
Publication Strategy
        ↓
Transport
```

For Resource-backed Domain writes this becomes:

```text
Domain Operation
    ↓
Domain Object
    ↓
Domain-owned Resource publication mapping
    ↓
ResourcePublication / ResourceDeletionPublication
    ↓
Domain Object + Outbox entry committed atomically
    ↓
OutboxProcessor
    ↓
NostrResourcePublicationStrategy
    ↓
Resource encoding
    ↓
NostrClient
```

For application-owned native Nostr events it becomes:

```text
Application Operation
    ↓
NostrEvent
    ↓
NostrEventPublicationIntent
    ↓
Nostr event + Outbox entry committed atomically
    ↓
OutboxProcessor
    ↓
NostrEventPublicationStrategy
    ↓
NostrClient
```

The important implementation principle is:

> The Outbox stores the final durable publication intent. It does not later reconstruct publication meaning by reading Domain state.

---

# Scope

This document covers:

- Outbox ownership,
- Outbox entry shape,
- durable persistence,
- atomic local-write + Outbox transactions,
- last-write-wins replacement,
- publication strategy dispatch,
- Resource publication,
- native Nostr-event publication,
- wake and processing behavior,
- successful-entry deletion,
- stale-completion protection,
- retry behavior,
- startup behavior,
- Resource deletion publication,
- concurrency behavior,
- public boundaries,
- and current implementation limitations.

It does not define:

- inbound Resource resolution,
- Domain Resource installation,
- synchronization policy,
- conflict resolution with remote state,
- Resource selection,
- or Domain-specific publication mapping rules.

Those responsibilities live elsewhere.

---

# Core Responsibilities

The current implementation separates four concerns:

```text
Domain / Application Service
    owns accepted local behavior

Write Transaction
    atomically persists local state
    and the publication intent

Outbox
    durably queues application publication work

Publication Strategy
    converts one publication-intent type
    into transport-specific work
```

The Outbox does not own Domain meaning.

It also does not decide whether a Resource should exist, which Resource ID should be used, or which Nostr event kind represents an application-level account operation.

Those decisions occur before the publication intent reaches the Outbox.

---

# Application-Wide Outbox

The Outbox is shared by multiple publication types.

Current registered publication types include:

```text
resource
nostr-event
```

The processor itself does not switch on concrete payload shapes.

Instead it resolves an `OutboxPublicationStrategy` by the intent's `type` value.

Conceptually:

```text
OutboxEntry.publication.type
        ↓
registered strategy map
        ↓
OutboxPublicationStrategy.publish(...)
```

This keeps the processor open to additional publication types without embedding Resource or Nostr-event behavior directly in `OutboxProcessor`.

---

# Publication Intent Contract

The generic application contract is:

```ts
export interface OutboxPublicationIntent {
    readonly type: string;
    readonly [key: string]: unknown;
}
```

The `type` field is the dispatch key.

Concrete publication contracts extend this base shape.

The Outbox treats the remainder of the publication as opaque application data.

---

# Resource Publication Intent

Resource publication has two current forms.

A normal publication contains:

```text
type = resource
publisher
resourceType
resourceId
representation
mediaType
value
```

The value is the Domain-produced Resource value before transport encoding.

A Resource deletion contains:

```text
type = resource
operation = delete
publisher
resourceType
resourceId
```

The Resource publication strategy distinguishes the two forms with `isResourceDeletionPublication(...)`.

The Outbox itself does not know the difference.

---

# Native Nostr Event Publication Intent

Application-owned Nostr events use a separate intent:

```text
type = nostr-event
publisher

event:
    kind
    content
    tags
```

This is used for application-owned Nostr event state such as account/profile-related events that are not published as KJVOnly Resources.

The Outbox therefore provides one durable publication mechanism while preserving separate publication semantics.

---

# Outbox Entry

The current entry shape is intentionally small:

```ts
export interface OutboxEntry {
    readonly id: string;
    readonly publication: OutboxPublicationIntent;
    readonly status: OutboxStatus;
    readonly attempts: number;
}
```

New entries are created with:

```text
status = pending
attempts = 0
```

using `createPendingPublication(...)`.

The durable publication intent is stored directly in `publication`.

There is no wrapper that requires a later Domain-store lookup to recover the intended outbound state.

---

# Current Status Semantics

`OutboxStatus` currently defines:

```text
pending
publishing
published
failed
```

However, the current processor behavior is simpler than that type suggests.

Normal writes create `pending` entries.

`OutboxProcessor` currently:

```text
lists pending entries
publishes them
then deletes the still-current entry on success
```

It does not currently persist transitions through:

```text
publishing
published
failed
```

and it does not currently increment `attempts`.

Those fields/types should therefore not be interpreted as an implemented retry-state machine.

The current durable model is effectively:

```text
pending
    ↓ successful publication
removed
```

or:

```text
pending
    ↓ publication failure
still pending
```

---

# Persistence

Outbox entries live in the application IndexedDB database.

Current store:

```text
outbox
```

Key path:

```text
id
```

Index:

```text
status
```

The concrete store implementation is:

```text
IndexedDBOutboxStore
```

It supports:

```text
get(id)
put(entry)
listByStatus(status)
deleteIfCurrent(entry)
```

The Outbox is durable application work, not an in-memory task queue.

Pending entries survive page/application restart because IndexedDB owns the queue state.

---

# Atomic Local Write + Publication Intent

Publishable local state is written transactionally with its Outbox entry whenever the two records share the application database.

This prevents the invalid state:

```text
local state committed
publication intent lost
```

The current pattern is:

```text
open read/write transaction
    over Domain/application store + OUTBOX

write accepted local state
write final Outbox publication intent
commit once
```

If the transaction fails, neither side should become authoritative independently.

---

# Bible Text Markup Example

Bible text markup uses a transaction over:

```text
domain_objects
outbox
```

The transaction exposes narrow stores to Domain behavior:

```text
textMarkup.put(...)
outbox.put(...)
```

The Outbox key is derived from the stored Domain Object identity.

The Resource publication is already fully mapped before it is placed into the Outbox.

---

# Notes Example

Notes follow the same pattern.

The Notes transaction can:

```text
put Note Domain Object
or
delete Note Domain Object

and

put corresponding publication intent
```

inside one IndexedDB transaction.

A local Note deletion does not by itself imply a remote Resource deletion.

The Domain publication behavior must explicitly provide the publication intent required for that operation.

---

# Reading Plans Example

Reading Plan subscription/progress writes use the same transaction boundary:

```text
accepted local plan state
        +
final Resource publication intent
```

committed atomically.

The Outbox does not know Reading Plans semantics.

---

# Native Nostr Event Example

Native application-owned Nostr events use:

```text
nostr_events
outbox
```

in the same transaction.

The write transaction persists:

```text
NostrEvent
        +
NostrEventPublicationIntent
```

This is an important architectural point:

> The Outbox is an application publication mechanism, not a Resource repository feature.

---

# Outbox Identity

The Outbox key is chosen by the caller according to the logical local publication identity.

For Domain Resource writes, the current pattern uses the same stored Domain Object identity as the Outbox key.

For example:

```text
bible/text-markup:<object-id>
```

or another stable stored-object identifier appropriate to the Domain.

Native Nostr events use their own stable application key.

The Outbox does not derive this key itself.

---

# Last-Write-Wins Coalescing

The Outbox object store uses `id` as its key.

Writing another entry with the same ID replaces the older pending entry.

That gives current mutable application state a simple last-write-wins publication behavior:

```text
write state A
    → Outbox[id] = publication A

write state B before A completes
    → Outbox[id] = publication B
```

The queue does not accumulate every intermediate version of mutable replaceable state.

This behavior is intentional for the current Domain writes that reuse stable local object identity.

It is not a generic statement that every possible future publication should share one ID.

Append-only or independently meaningful publication types must choose distinct Outbox identities.

---

# Why Final Publication Intents Are Stored

An earlier design considered storing incomplete work and asking an Outbox handler to reread Domain state later.

The current implementation deliberately does not do that.

The write path already knows the intended outbound representation.

So the durable entry stores that publication intent directly.

This has several useful properties:

```text
Outbox processing does not depend on Domain stores
Outbox processing does not reconstruct Domain meaning
publication intent survives independently of UI/runtime objects
same-ID replacement is explicit
strategy dispatch stays generic
```

The publication strategy may still perform transport encoding at execution time, but the semantic publication intent is already complete.

---

# Outbox Processor

`OutboxProcessor` owns queue execution.

Its dependencies are:

```text
OutboxStore
readonly OutboxPublicationStrategy[]
```

At construction time it builds a strategy map keyed by:

```text
strategy.type
```

Duplicate strategy registrations are rejected.

That catches ambiguous publication ownership during composition.

---

# Processing One Pass

`processPending()` performs one current-state pass:

```text
list all pending entries
        ↓
for each entry
        ↓
resolve strategy by publication.type
        ↓
publish publication
        ↓
deleteIfCurrent(original entry)
```

If no matching strategy exists, publication fails and the pending entry remains durable.

If the strategy throws, the pending entry remains durable.

The processor intentionally does not delete failed work.

---

# Strategy Dispatch

The current strategy contract is:

```ts
export interface OutboxPublicationStrategy {
    readonly type: string;

    publish(
        publication: OutboxPublicationIntent
    ): Promise<void>;
}
```

Current application composition registers:

```text
NostrResourcePublicationStrategy
    type = resource

NostrEventPublicationStrategy
    type = nostr-event
```

Adding another publication type should generally mean:

```text
new publication intent
new publication strategy
register strategy in Application
```

rather than adding another branch inside `OutboxProcessor`.

---

# Resource Publication Strategy

`NostrResourcePublicationStrategy` owns Nostr publication of Resource intents.

It depends on:

```text
NostrClient
ResourceContentEncoder
```

Before publication it verifies:

```text
configured signer public key
    == publication.publisher
```

A mismatch fails publication and leaves the Outbox entry pending.

---

# Resource Content Encoding

For a normal Resource publication, the strategy passes the publication through `ResourceContentEncoder`.

The configured media type controls the decorator chain.

A common current format is:

```text
application/json+gzip+hex
```

Conceptually:

```text
ResourcePublication.value
    ↓ JSON
    ↓ gzip
    ↓ hex
    ↓ event.content
```

This encoding occurs at publication execution time.

The Outbox still stores the final semantic Resource publication intent rather than the final signed Nostr event.

---

# Resource Nostr Event

A normal Resource publication produces a Resource event containing tags such as:

```text
d
m
t
representation
```

where:

```text
d
    Resource ID

m
    media type

t
    Resource Type

representation
    content / descriptor / descriptors
```

The Resource Nostr kind comes from the Resource transport model.

The publication strategy is the place where that Resource intent becomes a Nostr transport representation.

---

# Resource Deletion

Resource deletion is explicit.

A local Domain delete does not automatically cause remote deletion.

The Domain publication path must deliberately create a `ResourceDeletionPublication`.

The Nostr Resource publication strategy then creates a Nostr deletion event targeting the published Resource address.

Current deletion publication uses:

```text
kind 5
```

with tags identifying the Resource address/kind.

The Outbox still treats this as normal `type = resource` work.

---

# Nostr Event Publication Strategy

`NostrEventPublicationStrategy` publishes native application-owned Nostr events.

It also validates:

```text
configured signer public key
    == publication.publisher
```

It then forwards:

```text
kind
content
tags
```

to `NostrClient.publishEvent(...)`.

This strategy does not pass through Resource encoding because these events are not KJVOnly Resources.

---

# Relay Acceptance

Both current Nostr-backed strategies require at least one configured relay to accept the event.

If:

```text
acceptedByAnyRelay == false
```

the strategy throws.

The Outbox processor catches that failure and leaves the entry pending.

So transport failure does not destroy durable publication intent.

---

# Wakeup Model

Outbox execution is wake-driven.

The public application capability is:

```ts
export interface OutboxWakeup {
    wake(): void;
}
```

Domain/application services receive this capability rather than the concrete store or processor.

After a successful local write they call:

```text
outbox.wake()
```

This keeps UI/Domain code unaware of queue-processing mechanics.

---

# Serialized Wake Processing

`OutboxProcessor` protects its wake loop with:

```text
processing
wakeRequested
```

If `wake()` is called while processing is already active:

```text
wakeRequested = true
return
```

The current processor then finishes its active pass and runs another pass before becoming idle.

Conceptually:

```text
wake
    ↓
processing pass
    ↓
new wake arrives
    ↓
remember wake
    ↓
finish current pass
    ↓
run another pass
```

This prevents parallel wake loops from racing through the queue while still ensuring newly queued work is observed.

---

# Successful Publication and `deleteIfCurrent()`

A successful publish does not blindly delete the entry by ID.

That would create a race:

```text
processor reads publication A
        ↓
publishing A is slow
        ↓
local state changes
        ↓
Outbox[id] becomes publication B
        ↓
A succeeds
        ↓
blind delete(id)
        ↓
B is lost
```

The current store therefore uses:

```text
deleteIfCurrent(entry)
```

inside a read/write transaction.

It reloads the current stored entry and deletes only when:

```text
current.status == pending
AND
current.publication == publication being completed
```

If a newer publication replaced the entry, deletion returns `false` and the newer publication remains queued.

This is the key race-protection mechanism behind same-ID last-write-wins publication.

---

# Intent Equality

`IndexedDBOutboxStore.deleteIfCurrent(...)` currently compares publication intents by JSON serialization.

Conceptually:

```text
JSON.stringify(current.publication)
    ==
JSON.stringify(completed.publication)
```

This is sufficient for the current publication intent shapes, which are plain serializable data written through IndexedDB.

If future intent shapes become order-sensitive or contain non-JSON values, this comparison mechanism would need to be revisited.

---

# Failure and Retry Behavior

The current implementation has intentionally simple retry behavior.

If publication fails:

```text
entry remains pending
```

There is currently no persisted:

```text
nextAttemptAt
lastError
lastAttemptAt
backoff schedule
retry timer
```

and `attempts` is not currently incremented by the processor.

Retry occurs when the processor is woken again.

Typical future wakes include:

```text
another local publishable write
application startup
another explicit wake
```

This means the current implementation provides durable eventual retry opportunity, but not time-based retry scheduling.

Documentation and UI should not imply exponential backoff or a timed retry scheduler exists today.

---

# Startup Behavior

Pending publication is non-blocking application work.

During application startup, after authentication/signing and relay configuration are available, `Application.start()` wakes the Outbox processor.

Conceptually:

```text
restore/authenticate active identity
        ↓
configure account / transport state
        ↓
wake Outbox
        ↓
application becomes started
```

Application readiness does not wait for all pending publications to succeed.

That preserves local-first behavior.

---

# Application Ownership

`Application` is the composition root for the main browser runtime.

It constructs:

```text
IndexedDBOutboxStore
ResourceContentEncoder
NostrResourcePublicationStrategy
NostrEventPublicationStrategy
OutboxProcessor
```

and injects only the capabilities consumers need.

Domain/application services that need to trigger publication receive `OutboxWakeup` rather than the concrete processor/store.

Write transactions receive/use the Outbox store through their transaction-scoped persistence boundary.

---

# Public Application Boundary

Stable application-facing Outbox contracts are exported through:

```text
$lib/application
```

The concrete composition root itself remains outside that root public barrel.

Normal callers should not import concrete Outbox processor/store implementation paths merely to wake publication or create a pending entry when the public Application contract already exposes the needed symbol.

Application-internal implementation files may still use direct internal imports where appropriate to avoid self-barrel cycles.

---

# Synchronization Is Separate

The Outbox answers:

> What locally accepted publication work still needs to be sent?

Synchronization answers different questions, such as:

```text
What remote state exists?
Which remote state should be installed?
What wins when local and remote state conflict?
Should local state be superseded?
```

The current Outbox does not perform those decisions.

It executes publication intents that were already accepted by the application.

---

# Domain Publication Mapping Is Separate

The Outbox does not derive Resource IDs or Resource Types from arbitrary Domain Objects.

That mapping belongs to the Domain Resource publication code.

For example, a Domain-specific publication component decides:

```text
Domain object identity
    ↓
Resource Type
Resource ID
representation
media type
Resource value
```

and produces a `ResourcePublication`.

Only then is the publication queued.

This keeps generic Outbox infrastructure independent from Domain semantics.

---

# Current Concurrency Model

The main browser runtime owns one `OutboxProcessor` instance.

Its wake loop is serialized in-process.

The IndexedDB store also protects successful deletion with a transaction and current-intent comparison.

The implementation does not currently define multi-tab queue leadership or a cross-tab publication lock.

If multiple application runtimes process the same persistent Outbox simultaneously in the future, that behavior would require a dedicated coordination design.

---

# Current Persistence Invariants

The important current invariants are:

```text
1. Publishable accepted local state and its Outbox intent are written atomically when they share ApplicationDB.

2. Outbox entries are durable in IndexedDB.

3. The Outbox stores final semantic publication intents.

4. Same ID overwrites previous pending work.

5. A completed older publication cannot delete a newer replacement.

6. Failed publication remains pending.

7. Outbox processing does not block local application acceptance.

8. OutboxProcessor does not contain publication-type-specific branches.

9. Domain meaning is resolved before work enters the Outbox.

10. Synchronization remains separate from publication execution.
```

---

# Current Tests

The implementation is covered at several boundaries.

## Outbox entry tests

Verify:

```text
pending Resource publication shape
pending native Nostr-event publication shape
```

## IndexedDB Outbox store tests

Verify:

```text
get
put
status lookup
safe deleteIfCurrent
newer replacement preservation
Resource deletion replacement behavior
```

## Outbox processor tests

Verify:

```text
strategy routing
multiple publication types
missing strategy behavior
duplicate strategy rejection
wake serialization
successful deletion
failed publication preservation
newer replacement preservation
```

## Domain write transaction tests

Verify atomic persistence of:

```text
Domain state
+
Outbox intent
```

for Bible text markup, Notes, Reading Plans, and other publishable Domain state.

## Nostr-event transaction tests

Verify application-owned Nostr event state and publication intent are committed together.

## Publication strategy tests

Verify Resource/Nostr event construction, signer checks, relay acceptance behavior, encoding, and deletion semantics.

---

# Current Limitations

The following are not currently implemented by the Outbox:

```text
timed retry scheduling
exponential backoff
persisted last-error diagnostics
persisted retry timestamps
attempt counter updates
publishing/published/failed status transitions
manual queue-management UI
multi-tab queue leadership
remote/local synchronization policy
```

These are possible future capabilities, not current behavior.

Do not document or depend on them as though they already exist.

---

# Important Files

Current implementation centers around:

```text
client/kjvonly-pwa/src/lib/application/outbox/
    outbox-entry.ts
    outbox-publication-intent.ts
    outbox-publication-strategy.ts
    outbox-store.ts
    outbox-wakeup.ts
    indexeddb-outbox-store.ts
    outbox-processor.ts
```

Resource publication:

```text
client/kjvonly-pwa/src/lib/resource/publication/
    resource-publication.ts

client/kjvonly-pwa/src/lib/resource/nostr/
    nostr-resource-publication-strategy.ts
```

Native Nostr-event publication:

```text
client/kjvonly-pwa/src/lib/infrastructure/nostr/events/publication/
    nostr-event-publication.ts
    nostr-event-publication-strategy.ts
    nostr-event-write-stores.ts
```

Persistence:

```text
client/kjvonly-pwa/src/lib/infrastructure/persistence/
    application.db.ts
```

Composition:

```text
client/kjvonly-pwa/src/lib/application/runtime/application.ts
```

Domain transaction examples include:

```text
client/kjvonly-pwa/src/lib/domains/bible/persistence/
client/kjvonly-pwa/src/lib/domains/notes/persistence/
client/kjvonly-pwa/src/lib/domains/reading-plans/persistence/
```

---

# Extension Procedure

To add a new durable publication type:

```text
1. Define an OutboxPublicationIntent subtype.

2. Decide its stable Outbox identity/coalescing semantics.

3. Persist accepted local state and the final publication intent atomically where possible.

4. Implement an OutboxPublicationStrategy with a unique type.

5. Register the strategy in Application composition.

6. Wake the Outbox after the local transaction commits.

7. Add processor/strategy/transaction tests.
```

Do not add publication-type-specific branches to `OutboxProcessor` unless the generic strategy model itself is intentionally being redesigned.

---

# Relationship to Resource Publication

The dedicated Resource publication document describes the Domain-to-Resource mapping and Nostr Resource transport in more detail.

This document focuses on the shared durable application queue that executes that work.

The relationship is:

```text
Domain Resource Publication
        ↓
Outbox
        ↓
Resource Publication Strategy
```

For native Nostr events:

```text
Application Nostr Event Publication
        ↓
Outbox
        ↓
Nostr Event Publication Strategy
```

---

# Big Takeaway

The current Outbox is intentionally simple:

```text
accepted local state
    +
final durable publication intent
        ↓
IndexedDB
        ↓
wake-driven processor
        ↓
pluggable publication strategy
        ↓
transport
```

It is durable, local-first, and application-wide.

It does not reconstruct Domain meaning later.

It does not currently implement a persisted retry-state machine.

Same-ID replacement provides last-write-wins coalescing, and `deleteIfCurrent()` prevents a completed stale publication from deleting newer pending work.

That is the current implementation contract.
