# Native Nostr Event Processing

**Status:** Current Implementation
**Scope:** Generic Nostr transport, verification, selected native Nostr event persistence, account event caching and refresh, durable native-event publication, and the boundary between native Nostr events and Resource events.

---

# 1. Purpose

KJVOnly.bible uses Nostr for more than one application concern.

Two different models exist intentionally:

```text
Published Resource data
    → Nostr event
    → ResourceRepresentation
    → Resource pipeline

Application-owned native Nostr state
    → Nostr event
    → nostr_events
    → application/account behavior
```

These paths share transport and signing infrastructure, but they are not the same application model.

This document describes the native Nostr event side and the protocol-processing boundary around it.

Resource-specific discovery, resolution, installation, and publication are documented separately under:

```text
docs/03_implementation/resources/
```

The central rule is:

> Nostr protocol mechanics belong to infrastructure. Application meaning belongs to the Application, Resource, or Domain owner that consumes the event.

---

# 2. Scope

This document covers:

```text
NostrClient
rx-nostr ownership
verification worker
NostrSigner integration
native Nostr event model
nostr_events persistence
NostrEventsService
atomic native-event + Outbox writes
NostrEventPublication
NostrEventPublicationStrategy
AccountService / NostrAccountStrategy interaction
Resource-event translation boundary
```

It does not redefine:

```text
Authentication policy
Resource identity
Resource resolution
Domain installation
Outbox processing internals
Resource publication encoding
relay server behavior
NIP protocol specifications
```

Those concerns are documented elsewhere.

---

# 3. High-Level Architecture

```text
                         ┌───────────────────────┐
                         │     NostrSigner       │
                         └───────────┬───────────┘
                                     │
                                     ▼
┌─────────────────┐        ┌───────────────────────┐
│ verification    │───────▶│      NostrClient      │
│ worker/client   │        │      RxNostrClient    │
└─────────────────┘        └───────────┬───────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼                                         ▼
       Resource-facing Nostr                    Native Nostr events
                 │                                         │
                 ▼                                         ▼
       ResourceRepresentation                         nostr_events
                 │                                         │
                 ▼                                         ▼
          Resource pipeline                      Account/application state
                                                           │
                                                           ▼
                                                        Outbox
                                                           │
                                                           ▼
                                              NostrEventPublicationStrategy
                                                           │
                                                           ▼
                                                      NostrClient
```

The shared transport does not imply shared semantics.

---

# 4. `NostrClient`

The application uses a single Nostr transport abstraction:

```text
NostrClient
```

The current browser implementation is:

```text
RxNostrClient
```

created by:

```text
createNostrClient()
createBrowserNostrClient()
```

`NostrClient` owns generic protocol operations such as:

```text
setDefaultRelays()
getPublicKey()
getEvent()
getEvents()
publishEvent()
subscribe()
dispose()
```

It does not own Resource meaning or account meaning.

---

# 5. One rx-nostr Instance

`createNostrClient()` creates one `RxNostr` instance for the application transport path.

Configuration currently includes:

```text
verification client verifier
active EventSigner
automatic authentication
lazy-keep connection strategy
5-second EOSE timeout
5-second OK timeout
5-second AUTH timeout
exponential retry
maximum retry count: 5
initial retry delay: 1000 ms
polite retry behavior
```

The application should not create independent rx-nostr instances throughout Domain/UI code.

The concrete Nostr client is infrastructure owned by Application composition.

---

# 6. Verification Worker

Inbound Nostr verification uses the rx-nostr crypto verification service.

Browser creation follows:

```text
createBrowserNostrClient()
    ↓
createBrowserVerificationClient()
    ↓
verification.worker.ts
    ↓
startVerificationServiceHost()
```

The verification worker exists to move cryptographic event verification off the main UI thread.

The worker is protocol infrastructure.

It does not dispatch Domain behavior.

---

# 7. Signing Boundary

`NostrSigner` implements the signer contract consumed by rx-nostr.

Supported signer modes currently include:

```text
NIP-07
nsec
NIP-46
```

`NostrClient.publishEvent()` accepts event parameters rather than a pre-signed final event.

The active signer signs through the shared rx-nostr path.

Therefore application publication code should not independently sign events before calling `NostrClient.publishEvent()`.

The publication strategies instead verify that the logical publisher matches the active signer before publication.

---

# 8. Reads

`RxNostrClient` exposes bounded read operations.

## 8.1 `getEvent()`

`getEvent()`:

```text
creates one-shot request
limits each relay query to one result
deduplicates repeated relay results
selects the current event using rx-nostr latest ordering
returns Event | null
```

If no readable relays are configured, or all configured relays are unavailable, the client throws `NostrClientError` rather than silently presenting transport failure as an empty successful query.

## 8.2 `getEvents()`

`getEvents()`:

```text
creates one-shot request
accepts one or multiple filters
deduplicates identical signed events
orders results using rx-nostr timeline ordering
returns newest-first event results
```

## 8.3 `subscribe()`

Long-lived subscriptions use `createRxForwardReq()` and return a small application-facing subscription handle:

```ts
interface NostrSubscription {
    close(): void;
}
```

Callers do not receive rx-nostr subscription internals.

---

# 9. Publication Acknowledgement

`NostrClient.publishEvent()` publishes to the selected writable relays and returns normalized acknowledgement information.

The result includes:

```text
eventId
per-relay acknowledgements
acceptedByAnyRelay
```

Application publication strategies currently treat:

```text
acceptedByAnyRelay === false
```

as publication failure.

A successful local write therefore does not imply successful relay publication.

Durability across that boundary is provided by the Outbox.

---

# 10. Native Nostr Events vs Resource Events

The application deliberately distinguishes native Nostr state from Resource-backed state.

## Native Nostr state

Examples:

```text
kind 0      profile metadata
kind 3      contacts/follows
kind 10002  relay list
```

These are persisted in:

```text
nostr_events
```

and interpreted by account infrastructure.

## Resource state

Published Resource events use the Resource event contract and are converted to:

```text
ResourceRepresentation
```

before entering Resource resolution/installation.

They are not stored as generic account-native `NostrEvent` objects merely because Nostr transported them.

---

# 11. Resource Event Translation

Resource event translation currently lives in:

```text
resource/nostr/resource-event.ts
```

`toResourceRepresentation()` validates Resource-level protocol structure including:

```text
Resource kind
`d` tag
`t` classification tag
classification == Resource Type
`representation` tag
supported representation value
`m` media type tag
```

It then produces a transport-neutral Resource representation containing:

```text
publisher
resourceId
resourceType
eventId
modifiedAt
representation
mediaType
payload
```

After this conversion, later Resource/Domain code does not need raw Nostr tag parsing.

---

# 12. Native `NostrEvent` Model

Selected application-owned native events use the infrastructure model:

```ts
interface NostrEvent {
    key: string;
    pubkey: string;
    kind: number;
    content: string;
    tags: readonly (readonly string[])[];
    created_at?: number;
    id?: string;
    sig?: string;
}
```

The optional signed-event fields are intentional.

Locally authored application state may be persisted before network signing/publication.

A fetched relay event, by contrast, can contain:

```text
created_at
id
sig
```

---

# 13. Replaceable Native Event Identity

The current native-event key helper is:

```ts
createReplaceableNostrEventKey(kind, pubkey)
```

which produces:

```text
nostr/event:<kind>:<pubkey>
```

For the currently persisted account kinds, this represents the logical replaceable application state for one:

```text
kind + publisher
```

Examples:

```text
nostr/event:0:<pubkey>
nostr/event:3:<pubkey>
nostr/event:10002:<pubkey>
```

The signed Nostr event `id` remains the identity of one concrete network publication.

It is not used as the local logical state key.

---

# 14. `nostr_events` Persistence

The application database contains:

```text
nostr_events
```

with:

```text
key path: key
indexes:
    kind
    pubkey
    [kind, pubkey]
```

`IndexedDBNostrEventsStore` provides:

```text
get(key)
getByKindAndPubkey(kind, pubkey)
put(event)
```

The store is intentionally small.

Application/account behavior goes through higher-level services rather than exposing raw IndexedDB operations to Svelte UI.

---

# 15. `NostrEventsService`

`NostrEventsService` coordinates selected native Nostr state.

Its current responsibilities are:

```text
read cached native event state
cache accepted signed relay events
atomically persist locally-authored state + Outbox publication
wake the Outbox after successful local commit
```

It does not own account interpretation.

That belongs to `NostrAccountStrategy`.

---

# 16. Caching Signed Relay Events

`cache()` stores a signed event without queueing publication.

Conceptually:

```text
verified relay event
    ↓
NostrEventsService.cache()
    ↓
local replacement decision
    ↓
nostr_events
```

There is no Outbox write because the event came from the network rather than from a local application mutation.

---

# 17. Cache Replacement Rules

The cache behavior protects locally-authored pending state from stale relay refreshes.

## 17.1 Existing local event is unsigned

An unsigned current event represents locally-authored state that may still be pending publication.

A signed relay event replaces it only when:

```text
content matches
AND
tags match
```

This allows the relay-confirmed signed version of the same logical payload to replace the unsigned local copy.

A different relay payload does not overwrite that local intent.

## 17.2 Existing local event is signed

When the current cached event is signed and has `created_at`, an incoming event replaces it only when:

```text
incoming.created_at > current.created_at
```

The native event cache therefore preserves newer accepted state.

---

# 18. Local Native Event Write

A locally-authored native Nostr event uses:

```text
NostrEventsService.put()
```

The flow is:

```text
NostrEvent
    ↓
NostrEventPublication.create()
    ↓
IndexedDBNostrEventWriteTransaction
    ├── put NostrEvent into nostr_events
    └── put publication intent into outbox
    ↓
commit transaction
    ↓
OutboxWakeup.wake()
```

The Outbox is not awakened when the local transaction fails.

---

# 19. Atomic Native Event + Outbox Transaction

`IndexedDBNostrEventWriteTransaction` opens one read/write transaction over:

```text
nostr_events
outbox
```

This preserves the invariant:

> A durable locally-authored native Nostr state change and its durable publication intent are committed together.

The application should not persist account event state successfully and then separately hope to enqueue publication afterward.

---

# 20. `NostrEventPublication`

`NostrEventPublication.create()` maps the persisted native event to the Outbox intent:

```ts
{
    type: 'nostr-event',
    publisher,
    event: {
        kind,
        content,
        tags
    }
}
```

Signed/publication-derived fields are deliberately absent from the intent:

```text
created_at
id
sig
```

Those are transport/signing results rather than authored application state.

---

# 21. Native Event Publication Strategy

`NostrEventPublicationStrategy` handles Outbox entries whose type is:

```text
nostr-event
```

Before publishing, it validates:

```text
active NostrClient public key
    ==
publication.publisher
```

If identities differ, publication fails.

The strategy then calls:

```text
NostrClient.publishEvent({
    kind,
    content,
    tags
})
```

and requires at least one relay acknowledgement accepting the event.

---

# 22. Shared Outbox

Native Nostr events and Resources share one durable application Outbox.

Current publication types include:

```text
resource
nostr-event
```

The Outbox processor dispatches by publication strategy type.

Therefore:

```text
Resource publication semantics
    remain Resource-specific

Native Nostr publication semantics
    remain Nostr-specific

Durable publication scheduling
    is shared
```

This keeps the Outbox open to additional durable application-owned publication types without forcing every type into the Resource model.

---

# 23. Account Application Boundary

Svelte/Profile UI does not consume raw Nostr event infrastructure directly.

The application-facing model is:

```text
AccountService
    ↓
AccountState
```

Current account state contains:

```text
name?
relays?
```

`AccountService` delegates protocol-specific account behavior through:

```text
AccountStrategy
```

with the current implementation:

```text
NostrAccountStrategy
```

---

# 24. Account Event Kinds

`NostrAccountStrategy` currently manages:

```text
0      metadata
3      contacts/follows
10002  relay list
```

These are native Nostr account events.

They are intentionally not converted into KJVOnly Resource objects.

---

# 25. Account Load

`load(userId)` reads local native event state for:

```text
kind 0
kind 3
kind 10002
```

from `NostrEventsService`.

It then derives application-facing `AccountState`.

The local native-event store is the immediate source used by the Account application service.

---

# 26. Account Refresh

`refresh(userId)` reads account events from configured bootstrap read relays.

The flow is:

```text
bootstrap read relays
    ↓
NostrClient.getEvents()
    ↓
current event per supported kind
    ↓
NostrEventsService.cache()
    ↓
reload merged local account state
```

The final `load()` is important.

A relay refresh may be partial, and `NostrEventsService` may intentionally preserve newer or locally-authored state.

Therefore relay response data is not used directly as the final `AccountState`.

---

# 27. Account Setup

`setup()` first verifies:

```text
authenticated user id
    ==
active Nostr signer public key
```

It then authors the account events currently required by the application.

## Metadata

Kind `0` content contains the configured name in both:

```text
name
display_name
```

## Relay list

Kind `10002` uses `r` tags.

Current tag behavior supports:

```text
read-only
write-only
read + write
```

## Contacts

Kind `3` preserves existing content and adds the application follow relationship required by current account setup behavior.

Each authored event is persisted and queued through `NostrEventsService.put()`.

---

# 28. Relay Preference Reading

Account relay preferences prefer kind `10002` relay tags when available.

If no usable relay-list event is available, current code can fall back to legacy relay JSON found in kind `3` content.

This legacy read compatibility belongs inside `NostrAccountStrategy`.

It should not leak into `AccountState` consumers.

---

# 29. Local State Is Authoritative During Pending Publication

A critical current behavior is:

```text
local account write
    ↓
nostr_events unsigned state
    +
outbox pending publication
```

A subsequent relay refresh must not overwrite a different local pending event merely because the relay still contains older state.

The unsigned-cache replacement rule exists specifically to preserve this local-first publication model.

---

# 30. Resource Publication Uses the Same Transport Differently

`NostrResourcePublicationStrategy` also uses `NostrClient`, but its semantics are Resource-specific.

For Resource publications it constructs:

```text
kind = RESOURCE_KIND

d tag = Resource ID
m tag = media type
t tag = Resource Type
representation tag = representation kind
content = encoded Resource payload
```

Resource deletion uses Nostr kind `5` with the Resource address.

These behaviors belong to Resource publication and are documented in:

```text
resources/006-resource-publication.md
```

They should not be moved into generic native-event infrastructure.

---

# 31. Validation Layers

The durable idea from the earlier Nostr-event design remains useful: validation is layered by responsibility.

Conceptually:

```text
Nostr protocol verification
    ↓
feature-specific event contract validation
    ↓
transport-neutral/application representation
    ↓
Domain/application validation
```

Examples:

```text
rx-nostr verification
    → signed Nostr event validity

Resource event parser
    → Resource tag/representation contract

NostrAccountStrategy
    → account-event interpretation

Domain Resource validators
    → application Domain meaning
```

A generic Nostr transport layer should not perform Domain validation.

---

# 32. Protocol Infrastructure Must Stay Protocol-Focused

The earlier captured implementation design proposed event-handler registries for multiple event structures.

The current implementation does not require a generic registry.

Instead, protocol-specific behavior is explicit in the owning feature:

```text
Resource Nostr event conversion
Native account Nostr event persistence
Resource Nostr publication strategy
Native Nostr event publication strategy
```

Do not introduce a generic event-handler framework unless actual multiple event structures require one.

---

# 33. Application Boundaries

Normal Svelte code should not import:

```text
RxNostrClient
NostrSigner
IndexedDBNostrEventsStore
NostrEventPublicationStrategy
NostrAccountStrategy
```

directly for application behavior.

These are composition/infrastructure details.

Application-facing UI consumes capabilities such as:

```text
AuthenticationService
AccountService
Domain services
```

through the intentional Application/ApplicationContext boundaries.

---

# 34. Worker Boundary

The verification worker is different from application feature workers such as:

```text
Resource coordinator workers
Bible search worker
Notes search worker
Reading Plans worker
```

Its sole purpose is Nostr cryptographic verification support for rx-nostr.

It does not own Nostr account state, Resource resolution, or publication scheduling.

---

# 35. Error Boundaries

Transport failure is surfaced through `NostrClientError` for read/subscribe/publish transport failures.

Publication-strategy failures are allowed to propagate to the Outbox processor.

Current Outbox behavior then leaves the durable pending entry available for a later wake/retry opportunity.

Account parsing is more tolerant where malformed remote profile/relay data should not crash the application:

```text
invalid metadata JSON
    → no name

invalid legacy relay JSON
    → ignored/empty relay result
```

Protocol transport errors and malformed optional profile data are therefore intentionally handled at different boundaries.

---

# 36. Disposal

`NostrClient.dispose()` owns disposal of the underlying rx-nostr transport and verification client.

Signer lifecycle is separately owned through the authentication/application composition path.

Do not leave verification workers or Nostr transport instances as unmanaged component-local resources.

---

# 37. Testing

Current tests cover the layers separately.

## Nostr client tests

Cover:

```text
relay selection
read behavior
publish acknowledgement normalization
subscription behavior
client creation/disposal
```

## Native event persistence tests

Cover:

```text
IndexedDB native event storage
kind/pubkey lookup
atomic native-event + Outbox transaction
```

## `NostrEventsService` tests

Cover:

```text
signed event caching
preservation of different unsigned local state
replacement by the matching signed relay publication
atomic write before Outbox wake
failure behavior
```

## Publication strategy tests

Cover:

```text
correct NostrClient event publication
publisher/signer mismatch rejection
all-relay rejection
```

## Account strategy tests

Cover account event parsing, refresh, setup, relay behavior, and local caching policy.

---

# 38. Extension Rules

When adding a new application-owned native Nostr event type:

1. Decide first whether the data is truly native Nostr state or should be a Resource.
2. Define its logical local identity.
3. Add persistence/index support only if queries require it.
4. Keep event interpretation in the owning feature/strategy.
5. Use an atomic local-state + Outbox transaction for durable local writes.
6. Reuse `NostrEventPublicationStrategy` when the generic native event intent is sufficient.
7. Add feature-specific validation without pushing Domain semantics into `NostrClient`.
8. Add focused tests for local-vs-relay replacement behavior.

---

# 39. Current Invariants

The current implementation relies on these invariants:

1. One shared Nostr client owns the application rx-nostr transport path.
2. Nostr cryptographic verification is delegated through the verification worker/client.
3. Resource Nostr events become `ResourceRepresentation` before Resource/Domain processing.
4. Selected native account events remain native Nostr events and are stored in `nostr_events`.
5. Logical native event identity is not the signed event ID.
6. Local native event state and its Outbox publication intent are atomic.
7. A different locally-authored unsigned event is not overwritten by stale relay refresh state.
8. Native event publication verifies publisher identity against the active signer.
9. Resources and native Nostr events share durable Outbox scheduling but keep separate publication semantics.
10. Svelte/application code consumes account/auth capabilities rather than raw Nostr infrastructure.

---

# 40. Summary

The Nostr implementation is intentionally split by responsibility:

```text
NostrClient
    = generic relay transport

NostrSigner
    = active signing identity

verification worker
    = cryptographic verification support

Resource event processing
    = Nostr Resource publication ↔ ResourceRepresentation

NostrEventsService
    = selected native application-owned event persistence/publication boundary

NostrAccountStrategy
    = account-specific interpretation of native events

Outbox
    = shared durable outbound publication coordination
```

The application uses Nostr as transport and account infrastructure without allowing raw protocol event structure to become the universal application data model.
