# 001 — Resource Client

**Status**

Implementation Specification

---

# Purpose

The Resource Client provides the Resource Boundary with a small, explicit interface for communicating with Nostr relays.

The Resource Client is the application's Nostr relay communication boundary.

It hides:

* rx-nostr,
* RxJS,
* WebSocket connection management,
* Nostr REQ lifecycle mechanics,
* relay connection reuse,
* NIP-11 request queuing,
* reconnection behavior,
* NIP-42 challenge handling,
* and relay acknowledgement mechanics.

It does **not** hide Nostr itself.

The Resource Boundary intentionally uses Nostr as its Resource protocol. Resource code may therefore operate on Nostr concepts such as:

```text
Filter
Event
relay
publisher pubkey
kind
d tag
```

The Resource Client is not a generic abstraction over REST, RPC, HTTP, or arbitrary transport protocols.

Its purpose is narrower:

> **Provide the Resource Boundary with a clean, testable Nostr client while isolating the application from the rx-nostr implementation.**

---

# Scope

This specification defines:

* the `ResourceClient` interface,
* the `RxNostrResourceClient` implementation,
* singular event retrieval,
* plural event retrieval,
* event publication,
* live subscriptions,
* default relay configuration,
* per-operation relay selection,
* NIP-42 authentication integration,
* Nostr event verification,
* Resource Client error semantics,
* client lifecycle,
* background execution behavior,
* and testing expectations.

This specification does not define:

* Resource Discovery policy,
* Published Resource Identity,
* Resource Representation parsing,
* Resource Resolution,
* descriptor retrieval,
* Resource integrity verification,
* Domain parsing,
* Domain validation,
* Resource Installation,
* the Outbox,
* synchronization policy,
* publication intent,
* Resource event construction,
* or Resource signing policy.

Those responsibilities exist above or beside the Resource Client.

---

# Architectural Position

The Resource Client sits between the Resource lifecycle and Nostr infrastructure.

```text
Application
    ↓
Domain
    ↓
Domain Resource behavior
    ↓

========== Resource Boundary ==========

Resource Discovery
Resource Publication
Resource Synchronization
    ↓
ResourceClient
    ↓

========== Infrastructure ==========

RxNostrResourceClient
    ↓
rx-nostr
    ↓
WebSocket
    ↓
Nostr Relays
```

The dependency direction is:

```text
Resource Boundary
        ↓
ResourceClient interface

Infrastructure
        ↓
implements ResourceClient
```

Resource lifecycle code depends on the interface.

The interface does not depend on the concrete rx-nostr implementation.

---

# Why the Boundary Exists

rx-nostr is intentionally a low-level Nostr communication library.

That is desirable.

It handles difficult relay mechanics without imposing application-level Nostr semantics.

However, Resource Discovery should not contain code such as:

```ts
const req = createRxBackwardReq();

rxNostr
    .use(req)
    .subscribe(...);

req.emit(filter);
req.over();
```

Nor should Resource Publication contain:

```ts
rxNostr.send(event).subscribe(...);
```

Those are infrastructure mechanics.

Resource code should instead say:

```ts
const event = await resourceClient.getEvent(filter);
```

or:

```ts
const events = await resourceClient.getEvents(filter);
```

or:

```ts
const result = await resourceClient.publishEvent(event);
```

This keeps Resource lifecycle code focused on Resource behavior rather than relay lifecycle behavior.

---

# Nostr Is Not Abstracted Away

The Resource Client is not intended to make Nostr interchangeable with another transport.

For example, this is appropriate:

```ts
const filter: Filter = {
    kinds: [37770],
    authors: [publisher],
    '#d': ['kjvonly/bible/chapters/kjv/43_3']
};

const event = await resourceClient.getEvent(filter);
```

The caller knows that Resources are discovered through Nostr.

The Resource Client merely owns execution of the Nostr request.

This avoids abstractions such as:

```text
TransportClient
ProtocolClient
GenericNetworkClient
RemoteRepository
```

which would not protect a meaningful application boundary.

---

# REST-Like Application Shape

At the application level, KJVOnly's Resource usage resembles a local-first REST-style model over Nostr addressable events.

The useful conceptual mapping is:

| Application Intent                   | Resource Client Operation |
| ------------------------------------ | ------------------------- |
| Get one current Resource publication | `getEvent()`              |
| Get multiple matching publications   | `getEvents()`             |
| Create or replace a publication      | `publishEvent()`          |
| Observe future publications          | `subscribe()`             |

There is deliberately no separate POST and PUT operation.

Nostr publication uses the same `EVENT` operation for both.

Whether a publication creates a new logical publication or replaces an existing addressable publication is determined by Nostr event semantics, particularly:

```text
kind + pubkey + d
```

That policy belongs to Resource identity and publication behavior rather than to separate client methods.

There is also no generic:

```ts
deleteEvent()
```

Resource deletion semantics are not equivalent to deleting a row from a server.

If a Resource Type later defines deletion through a Nostr event, that event is constructed by the appropriate Resource lifecycle behavior and published through:

```ts
publishEvent()
```

---

# Source Organization

The target organization is:

```text
src/lib/

    resource/
        nostr/
            resource-client.ts

    infrastructure/
        nostr/
            rx-nostr-resource-client.ts
            create-rx-nostr-resource-client.ts
```

The ownership is intentional.

```text
resource/nostr/resource-client.ts
```

defines the contract used by the Resource Boundary.

```text
infrastructure/nostr/rx-nostr-resource-client.ts
```

contains rx-nostr and RxJS-specific behavior.

```text
infrastructure/nostr/create-rx-nostr-resource-client.ts
```

contains composition and rx-nostr configuration.

Domain code must not import from:

```text
infrastructure/nostr/
```

Resource lifecycle code should normally depend only on:

```text
resource/nostr/resource-client
```

---

# Core Resource Client Types

## File

```text
src/lib/resource/nostr/resource-client.ts
```

## Implementation

```ts
import type { Event, Filter } from 'nostr-typedef';

export interface ResourceRelay {
    readonly url: string;
    readonly read: boolean;
    readonly write: boolean;
}

export interface ResourceClientRequestOptions {
    /**
     * Override the configured default relays for this operation.
     *
     * When omitted, the Resource Client uses its configured default
     * read or write relays.
     *
     * When supplied, only these relays are used for the operation.
     */
    readonly relays?: readonly string[];
}

export interface ResourcePublishAcknowledgement {
    readonly relay: string;
    readonly accepted: boolean;
    readonly message?: string;
}

export interface ResourcePublishResult {
    readonly eventId: string;

    readonly acknowledgements:
    readonly ResourcePublishAcknowledgement[];

    /**
     * True when at least one relay acknowledged the event with OK=true.
     *
     * This is a factual transport result.
     *
     * Higher Resource publication behavior remains responsible for
     * deciding whether that satisfies the publication lifecycle.
     */
    readonly acceptedByAnyRelay: boolean;
}

export interface ResourceSubscription {
    /**
     * Closes the underlying Nostr REQ subscription.
     *
     * Calling close more than once must be safe.
     */
    close(): void;
}

export type ResourceClientOperation =
    | 'getEvent'
    | 'getEvents'
    | 'publishEvent'
    | 'subscribe';

export class ResourceClientError extends Error {
    constructor(
        public readonly operation: ResourceClientOperation,
        public readonly relays: readonly string[],
        public readonly cause?: unknown
    ) {
        super(`Resource client unavailable during ${operation}.`);
        this.name = 'ResourceClientError';
    }
}

export interface ResourceClient {
    /**
     * Replaces the configured default relay set.
     *
     * rx-nostr reacts to changes in the default relay configuration
     * and updates active default-relay subscriptions as appropriate.
     */
    setDefaultRelays(relays: readonly ResourceRelay[]): void;

    /**
     * Executes a bounded historical Nostr request where the caller
     * expects one current matching event.
     *
     * Returns null when the request can be completed but no matching
     * event is available.
     *
     * Throws ResourceClientError when the operation cannot be
     * meaningfully completed because the relay service is unavailable.
     */
    getEvent(
        filter: Filter,
        options?: ResourceClientRequestOptions
    ): Promise<Event | null>;

    /**
     * Executes a bounded historical Nostr request and returns all
     * matching events produced by that request.
     *
     * Duplicate signed events received from multiple relays are
     * deduplicated by event id.
     *
     * Results are ordered newest-first using Nostr event ordering.
     */
    getEvents(
        filters: Filter | readonly Filter[],
        options?: ResourceClientRequestOptions
    ): Promise<readonly Event[]>;

    /**
     * Publishes an already-signed Nostr event.
     *
     * Event construction and Resource publication signing occur
     * before this boundary.
     */
    publishEvent(
        event: Event,
        options?: ResourceClientRequestOptions
    ): Promise<ResourcePublishResult>;

    /**
     * Creates a long-lived Nostr subscription for future matching events.
     *
     * Unlike getEvent/getEvents, this operation does not automatically
     * complete after historical events have been read.
     *
     * The caller owns the returned subscription and must close it when
     * it is no longer required.
     */
    subscribe(
        filters: Filter | readonly Filter[],
        onEvent: (event: Event) => void,
        options?: ResourceClientRequestOptions
    ): ResourceSubscription;

    /**
     * Permanently releases the Resource Client's relay resources.
     *
     * The client must not be reused after disposal.
     */
    dispose(): void;
}
```

---

# Interface Semantics

The interface deliberately stays small.

Its operations correspond directly to useful Nostr communication behaviors.

It does not expose:

```text
Observable
Subject
RxReq
EventPacket
OkPacket
ConnectionState
createRxBackwardReq
createRxForwardReq
```

Those are rx-nostr implementation concepts.

They remain inside infrastructure.

---

# `getEvent()`

`getEvent()` is used when the caller expects one current matching publication.

The primary Resource example is direct discovery by Published Resource Identity.

Conceptually:

```text
kind
+
publisher pubkey
+
d
```

produces a filter such as:

```ts
const filter: Filter = {
    kinds: [37770],
    authors: [publisher],
    '#d': [
        'kjvonly/bible/chapters/kjv/43_3'
    ]
};
```

The call is:

```ts
const event = await resourceClient.getEvent(filter);
```

The caller should not need to write:

```ts
const events = await resourceClient.getEvents(filter);
const event = events[0] ?? null;
```

when singular retrieval is explicitly the requested behavior.

---

# Singular Does Not Mean First Packet

`getEvent()` must not return whichever relay happens to respond first.

Multiple relays may hold different signed publications for the same addressable identity.

Therefore `getEvent()`:

1. performs the bounded historical query,
2. permits participating relays to return their matching event,
3. deduplicates identical signed events,
4. orders the remaining events using Nostr ordering,
5. and returns the current event.

For replaceable/addressable event ordering:

```text
newer created_at wins
```

and when timestamps are equal:

```text
lower lexical event id wins
```

This is Nostr protocol ordering rather than Domain authority.

Returning the current network publication does not imply that the application must install or accept that publication.

That decision remains downstream.

---

# `getEvent()` and `limit`

The implementation should add:

```ts
limit: 1
```

to the supplied filter.

For example:

```ts
const boundedFilter: Filter = {
    ...filter,
    limit: 1
};
```

The limit applies to each relay's initial query.

The client still collects responses from the targeted relay set before choosing the current result.

---

# `getEvents()`

`getEvents()` is used when the caller genuinely expects multiple publications.

Examples include:

* classification discovery,
* discovery of related Resources,
* querying a set of explicit Resource references,
* or other Resource graph operations.

Example:

```ts
const events = await resourceClient.getEvents({
    kinds: [37770],
    authors: [publisher],
    '#t': ['kjvonly/bible/chapters']
});
```

The Resource Client performs only Nostr-level result normalization.

It may:

* deduplicate identical events by `event.id`,
* and return them in deterministic Nostr order.

It does not:

* group events into Resources,
* inspect `d` as Resource identity,
* select Resource Types,
* establish trust,
* or install anything.

Those remain Resource Discovery responsibilities.

---

# One-Shot Request Lifecycle

Both:

```ts
getEvent()
```

and:

```ts
getEvents()
```

are bounded historical requests.

The rx-nostr Backward Strategy is used.

Conceptually:

```text
create backward request
        ↓
register event listener
        ↓
emit filter
        ↓
REQ sent to relay(s)
        ↓
EVENT messages received
        ↓
EOSE received
        ↓
CLOSE
        ↓
Observable completes
        ↓
Promise resolves
```

The caller never manages this lifecycle directly.

---

# `over()`

For each one-shot request, the adapter calls:

```ts
request.over();
```

after emitting all filters.

This communicates:

> No more filters will be emitted through this request.

The rx-nostr Backward Strategy can then complete after all outstanding historical REQs reach their completion condition.

This is an infrastructure detail and must not escape through `ResourceClient`.

---

# One-Shot Request Isolation

Each bounded Resource Client call creates its own backward request.

For example:

```text
getEvent(A)
    ↓
RxBackwardReq A

getEvent(B)
    ↓
RxBackwardReq B
```

This does not mean a new WebSocket is created for each request.

rx-nostr manages relay connections independently from the individual REQ lifecycle.

---

# Event Verification

Inbound Nostr events must be cryptographically verified before they are used by the Resource Boundary.

The rx-nostr instance must therefore be configured with a real verifier.

The production configuration must not use:

```ts
noopVerifier
```

or:

```text
skipVerify
```

for normal Resource traffic.

A verified Nostr event is still only a valid Nostr event.

Additional Resource validation occurs later:

```text
Nostr Event
    ↓
protocol signature verification
    ↓
Resource event validation
    ↓
Resource Representation
    ↓
Resource Resolution
```

The Resource Client handles the first protocol-level validation through rx-nostr configuration.

It does not perform Resource-event validation.

---

# Relay Configuration

The Resource Client maintains a default relay configuration.

Each relay has independent read and write permissions.

Example:

```ts
const relays: ResourceRelay[] = [
    {
        url: 'wss://relay.example.com',
        read: true,
        write: true
    },
    {
        url: 'wss://archive.example.com',
        read: true,
        write: false
    }
];
```

The relay set is supplied during application composition.

The client may later receive a replacement configuration:

```ts
resourceClient.setDefaultRelays(updatedRelays);
```

The Resource lifecycle does not recreate the client merely because relay settings change.

---

# Default Relay Behavior

When no operation-specific relay selection is supplied:

```ts
await resourceClient.getEvent(filter);
```

the configured default **read** relays are used.

Likewise:

```ts
await resourceClient.publishEvent(event);
```

uses configured default **write** relays.

Read and write permissions remain meaningful even when the same physical relay is used for both.

---

# Per-Operation Relay Selection

Some Resource workflows may provide relay hints or otherwise require an explicit target.

The Resource Client supports this through:

```ts
ResourceClientRequestOptions
```

Example:

```ts
const event = await resourceClient.getEvent(
    filter,
    {
        relays: [
            'wss://relay-hint.example.com'
        ]
    }
);
```

When `relays` is supplied, those relays replace the default relay set for that operation.

This permits Resource Discovery to use relay hints without mutating the application's default relay configuration.

The Resource Client does not determine when relay hints should be trusted or followed.

That policy belongs to the caller.

---

# Dynamic Default Relays

Changing default relays is a runtime configuration operation.

For example:

```ts
resourceClient.setDefaultRelays([
    {
        url: 'wss://relay-a.example.com',
        read: true,
        write: true
    },
    {
        url: 'wss://relay-b.example.com',
        read: true,
        write: false
    }
]);
```

rx-nostr owns the mechanics required to adapt active default-relay communication when this set changes.

Resource lifecycle code does not manage WebSocket reconnection itself.

---

# Authentication

Nostr relay authentication is an infrastructure responsibility.

KJVOnly uses NIP-42 authentication where required by configured relays.

Authentication must not appear as an application call such as:

```ts
resourceClient.authenticate();
```

A caller should simply perform its intended operation:

```ts
const event = await resourceClient.getEvent(filter);
```

If the relay requires NIP-42 authentication, the configured rx-nostr authenticator handles the challenge.

Conceptually:

```text
ResourceClient.getEvent()
        ↓
REQ
        ↓
Relay requires AUTH
        ↓
AUTH challenge
        ↓
rx-nostr
        ↓
configured signer
        ↓
signed kind 22242 AUTH event
        ↓
AUTH accepted
        ↓
REQ automatically retried
        ↓
Resource operation continues
```

Authentication does not alter Resource ownership.

---

# Signer Responsibility

The Resource Client does not determine:

* which user identity is active,
* where a private key is stored,
* whether signing uses a local key,
* whether signing uses NIP-07,
* whether signing uses NIP-46,
* or how authentication state is presented to the user.

The Resource Client requires an rx-nostr-compatible signer during composition.

Conceptually the signer contract is:

```ts
interface EventSigner {
    getPublicKey(): Promise<string>;

    signEvent(
        event: EventParameters
    ): Promise<Event>;
}
```

The application's authentication/signing implementation supplies that capability.

The same signer can therefore support:

```text
NIP-42 AUTH
```

without moving authentication logic into Resource Discovery.

---

# Signed Resource Publication

Resource publication itself has an additional architectural requirement:

```text
Resource Representation
        ↓
Nostr Event
        ↓
Sign
        ↓
Signed Nostr Event
        ↓
ResourceClient.publishEvent()
```

Therefore:

```ts
publishEvent()
```

accepts a complete signed `Event`.

The Resource Client is not responsible for deciding which publisher must sign the Resource publication.

That is part of the outbound Resource lifecycle.

The signer configured on rx-nostr remains required because rx-nostr may independently need it for NIP-42 authentication.

The signer implementation used with rx-nostr must respect already-complete signed events rather than replacing their publication identity.

---

# Publication

There is one Nostr write operation:

```ts
publishEvent()
```

Example:

```ts
const result =
    await resourceClient.publishEvent(event);
```

The adapter sends the event to the applicable write relays and waits for the rx-nostr send operation to complete.

The result preserves relay acknowledgements.

Example:

```ts
{
    eventId: event.id,

    acknowledgements: [
        {
            relay: 'wss://relay-a.example.com/',
            accepted: true
        },
        {
            relay: 'wss://relay-b.example.com/',
            accepted: false,
            message: 'restricted'
        }
    ],

    acceptedByAnyRelay: true
}
```

A negative relay `OK` response is not a Resource Client transport error.

It is a normal Nostr publication response.

Therefore:

```text
relay responded OK=false
```

produces a normal `ResourcePublishResult`.

It does not throw `ResourceClientError`.

Higher Resource Publication behavior decides whether the result satisfies the publication requirement.

---

# NIP-42 and Publication Acknowledgements

NIP-42 may cause the same relay to return more than one acknowledgement during one logical send operation.

For example:

```text
EVENT
    ↓
OK false: auth-required
    ↓
AUTH
    ↓
EVENT resent
    ↓
OK true
```

The Resource Client must normalize acknowledgements by relay.

If a relay eventually accepts the event:

```text
accepted = true
```

for that relay.

A prior authentication rejection must not cause the final publication result to remain rejected after the authenticated retry succeeds.

---

# Live Subscriptions

`subscribe()` represents a different Nostr behavior from one-shot reads.

It is intended for future Resource synchronization and other operations that need newly arriving publications.

Example:

```ts
const subscription = resourceClient.subscribe(
    {
        kinds: [37770],
        authors: [publisher],
        since: Math.floor(Date.now() / 1000)
    },
    (event) => {
        // Feed the event into the Resource lifecycle.
    }
);
```

The subscription remains active.

The caller later closes it:

```ts
subscription.close();
```

---

# Forward vs Backward Requests

The implementation uses different rx-nostr request strategies intentionally.

```text
getEvent()
getEvents()
    ↓
createRxBackwardReq()
```

These operations query historical stored events and finish.

```text
subscribe()
    ↓
createRxForwardReq()
```

This operation listens for ongoing/future events.

This distinction belongs inside the adapter.

Resource callers do not manipulate `RxReq` directly.

---

# Closing Live Subscriptions

Calling:

```ts
subscription.close();
```

must unsubscribe the underlying RxJS subscription.

rx-nostr then owns sending the applicable Nostr `CLOSE` message.

The implementation must not maintain a separate application-level registry of Nostr subscription IDs merely to close them.

---

# Subscription Error Semantics

rx-nostr manages reconnection for active relay communication.

A temporary WebSocket disconnect is therefore not automatically a Resource synchronization failure.

The first implementation does not expose rx-nostr connection-state events through the Resource Client subscription contract.

This is intentional.

Synchronization policy has not yet been specified in implementation detail.

If synchronization later requires an explicit terminal-connectivity callback, that requirement should extend the contract deliberately rather than exposing raw rx-nostr connection states now.

The Resource Client must not prematurely invent:

```text
onRetry
onReconnect
onSocketError
onRelayDormant
onCircuitOpen
```

as Resource-level concepts.

---

# Error Model

The Resource Client intentionally exposes a small error model.

The primary infrastructure error is:

```ts
ResourceClientError
```

It means:

> The requested Resource Client operation could not be meaningfully completed because usable Nostr relay communication was unavailable.

Example:

```ts
try {
    const event =
        await resourceClient.getEvent(filter);
} catch (error) {
    if (error instanceof ResourceClientError) {
        // Infrastructure unavailable.
    }

    throw error;
}
```

---

# Absence Is Not Failure

For singular reads:

```ts
Event
```

means a matching event was available.

```ts
null
```

means the bounded request completed without a matching event.

```ts
ResourceClientError
```

means the client could not meaningfully complete the operation because relay infrastructure was unavailable.

These cases must remain distinct.

---

# Empty Collection Is Not Failure

Likewise:

```ts
[]
```

from:

```ts
getEvents()
```

means the query completed without matching events.

It is not automatically an infrastructure error.

---

# Partial Relay Failure

Multiple relays may participate in one operation.

One relay failing does not invalidate successful results from another relay.

For example:

```text
Relay A
    → unavailable

Relay B
    → returns valid Event
```

must still allow the operation to return that Event.

The Resource Client throws only when the operation cannot be meaningfully satisfied by the available relay set.

It must not add another aggressive retry loop above rx-nostr.

rx-nostr already owns:

* reconnect behavior,
* retry scheduling,
* WebSocket restoration,
* and REQ concurrency handling.

---

# rx-nostr Error Behavior

A significant rx-nostr implementation detail is that the Observable returned by:

```ts
rxNostr.use()
```

does not directly throw multiplexed WebSocket connection errors.

Those errors are available through rx-nostr's connection/error observables and relay state.

Therefore the adapter must not assume this is sufficient:

```ts
rxNostr.use(req).subscribe({
    error(error) {
        // This is not the normal connection-error path.
    }
});
```

For bounded requests, the adapter determines whether the operation had usable relay participation after the request completes.

If every targeted relay is in a terminal unavailable state, it throws:

```ts
ResourceClientError
```

Otherwise successful or empty results are returned.

---

# Terminal Relay States

For Resource Client availability purposes, these rx-nostr states are terminal for the current operation:

```text
error
rejected
terminated
```

The following are not treated as terminal application failures:

```text
initialized
connecting
connected
waiting-for-retrying
retrying
dormant
```

rx-nostr may still establish or restore communication in those states.

The Resource Client does not expose these states directly to Resource lifecycle code.

---

# RxNostrResourceClient

## File

```text
src/lib/infrastructure/nostr/rx-nostr-resource-client.ts
```

## Implementation

```ts
import {
    createRxBackwardReq,
    createRxForwardReq,
    type RxNostr
} from 'rx-nostr';

import type {
    Event,
    Filter
} from 'nostr-typedef';

import type {
    ResourceClient,
    ResourceClientOperation,
    ResourceClientRequestOptions,
    ResourcePublishAcknowledgement,
    ResourcePublishResult,
    ResourceRelay,
    ResourceSubscription
} from '$lib/resource/nostr/resource-client';

import {
    ResourceClientError
} from '$lib/resource/nostr/resource-client';

const TERMINAL_CONNECTION_STATES =
    new Set([
        'error',
        'rejected',
        'terminated'
    ] as const);

export class RxNostrResourceClient
    implements ResourceClient {

    private readonly relayErrors =
        new Map<string, unknown>();

    private readonly errorSubscription;

    constructor(
        private readonly rxNostr: RxNostr
    ) {
        this.errorSubscription =
            this.rxNostr
                .createAllErrorObservable()
                .subscribe(({ from, reason }) => {
                    this.relayErrors.set(
                        from,
                        reason
                    );
                });
    }

    setDefaultRelays(
        relays: readonly ResourceRelay[]
    ): void {
        this.rxNostr.setDefaultRelays(
            relays.map((relay) => ({
                url: relay.url,
                read: relay.read,
                write: relay.write
            }))
        );
    }

    async getEvent(
        filter: Filter,
        options?: ResourceClientRequestOptions
    ): Promise<Event | null> {
        const events =
            await this.queryPast(
                [
                    {
                        ...filter,
                        limit: 1
                    }
                ],
                'getEvent',
                options
            );

        return events[0] ?? null;
    }

    async getEvents(
        filters: Filter | readonly Filter[],
        options?: ResourceClientRequestOptions
    ): Promise<readonly Event[]> {
        return this.queryPast(
            normalizeFilters(filters),
            'getEvents',
            options
        );
    }

    async publishEvent(
        event: Event,
        options?: ResourceClientRequestOptions
    ): Promise<ResourcePublishResult> {
        const relays =
            this.getWriteRelays(options);

        this.assertRelaysConfigured(
            'publishEvent',
            relays
        );

        return new Promise(
            (resolve, reject) => {
                const acknowledgements =
                    new Map<
                        string,
                        ResourcePublishAcknowledgement
                    >();

                let observable;

                try {
                    observable =
                        options?.relays !== undefined
                            ? this.rxNostr.send(
                                event,
                                {
                                    on: {
                                        relays: [
                                            ...options.relays
                                        ],
                                        defaultWriteRelays: false
                                    }
                                }
                            )
                            : this.rxNostr.send(event);
                } catch (cause) {
                    reject(
                        new ResourceClientError(
                            'publishEvent',
                            relays,
                            cause
                        )
                    );

                    return;
                }

                observable.subscribe({
                    next: (packet) => {
                        const previous =
                            acknowledgements.get(
                                packet.from
                            );

                        acknowledgements.set(
                            packet.from,
                            {
                                relay: packet.from,

                                // Once a relay accepts the event,
                                // a previous auth-required response
                                // must not make it rejected again.
                                accepted:
                                    previous?.accepted === true ||
                                    packet.ok,

                                message:
                                    packet.notice ??
                                    previous?.message
                            }
                        );
                    },

                    complete: () => {
                        const result =
                            [
                                ...acknowledgements.values()
                            ];

                        if (
                            result.length === 0 &&
                            this.allRelaysTerminal(
                                relays
                            )
                        ) {
                            reject(
                                this.unavailableError(
                                    'publishEvent',
                                    relays
                                )
                            );

                            return;
                        }

                        resolve({
                            eventId: event.id,

                            acknowledgements:
                                result,

                            acceptedByAnyRelay:
                                result.some(
                                    ({ accepted }) =>
                                        accepted
                                )
                        });
                    },

                    error: (cause) => {
                        reject(
                            new ResourceClientError(
                                'publishEvent',
                                relays,
                                cause
                            )
                        );
                    }
                });
            }
        );
    }

    subscribe(
        filters: Filter | readonly Filter[],
        onEvent: (event: Event) => void,
        options?: ResourceClientRequestOptions
    ): ResourceSubscription {
        const relays =
            this.getReadRelays(options);

        this.assertRelaysConfigured(
            'subscribe',
            relays
        );

        const request =
            createRxForwardReq();

        const subscription =
            this.rxNostr
                .use(request)
                .subscribe(({ event }) => {
                    onEvent(event);
                });

        try {
            emitRequest(
                request,
                normalizeFilters(filters),
                options
            );
        } catch (cause) {
            subscription.unsubscribe();

            throw new ResourceClientError(
                'subscribe',
                relays,
                cause
            );
        }

        let closed = false;

        return {
            close(): void {
                if (closed) {
                    return;
                }

                closed = true;
                subscription.unsubscribe();
            }
        };
    }

    dispose(): void {
        this.errorSubscription.unsubscribe();
        this.rxNostr.dispose();
    }

    private async queryPast(
        filters: readonly Filter[],
        operation:
            | 'getEvent'
            | 'getEvents',
        options?: ResourceClientRequestOptions
    ): Promise<readonly Event[]> {
        const relays =
            this.getReadRelays(options);

        this.assertRelaysConfigured(
            operation,
            relays
        );

        return new Promise(
            (resolve, reject) => {
                const events =
                    new Map<string, Event>();

                const request =
                    createRxBackwardReq();

                const subscription =
                    this.rxNostr
                        .use(request)
                        .subscribe({
                            next: ({ event }) => {
                                events.set(
                                    event.id,
                                    event
                                );
                            },

                            complete: () => {
                                const result =
                                    orderNostrEvents(
                                        events.values()
                                    );

                                if (
                                    result.length === 0 &&
                                    this.allRelaysTerminal(
                                        relays
                                    )
                                ) {
                                    reject(
                                        this.unavailableError(
                                            operation,
                                            relays
                                        )
                                    );

                                    return;
                                }

                                resolve(result);
                            },

                            // rx-nostr's REQ Observable is not
                            // the normal transport-error channel,
                            // but retain this defensively.
                            error: (cause) => {
                                reject(
                                    new ResourceClientError(
                                        operation,
                                        relays,
                                        cause
                                    )
                                );
                            }
                        });

                try {
                    emitRequest(
                        request,
                        filters,
                        options
                    );

                    request.over();
                } catch (cause) {
                    subscription.unsubscribe();

                    reject(
                        new ResourceClientError(
                            operation,
                            relays,
                            cause
                        )
                    );
                }
            }
        );
    }

    private getReadRelays(
        options?: ResourceClientRequestOptions
    ): string[] {
        if (options?.relays !== undefined) {
            return [...options.relays];
        }

        return Object
            .values(
                this.rxNostr.getDefaultRelays()
            )
            .filter(({ read }) => read)
            .map(({ url }) => url);
    }

    private getWriteRelays(
        options?: ResourceClientRequestOptions
    ): string[] {
        if (options?.relays !== undefined) {
            return [...options.relays];
        }

        return Object
            .values(
                this.rxNostr.getDefaultRelays()
            )
            .filter(({ write }) => write)
            .map(({ url }) => url);
    }

    private assertRelaysConfigured(
        operation: ResourceClientOperation,
        relays: readonly string[]
    ): void {
        if (relays.length > 0) {
            return;
        }

        throw new ResourceClientError(
            operation,
            relays,
            new Error(
                'No applicable Nostr relays are configured.'
            )
        );
    }

    private allRelaysTerminal(
        relays: readonly string[]
    ): boolean {
        if (relays.length === 0) {
            return true;
        }

        return relays.every((relay) => {
            const state =
                this.rxNostr
                    .getRelayStatus(relay)
                    ?.connection;

            return (
                state === undefined ||
                TERMINAL_CONNECTION_STATES.has(
                    state as
                        | 'error'
                        | 'rejected'
                        | 'terminated'
                )
            );
        });
    }

    private unavailableError(
        operation: ResourceClientOperation,
        relays: readonly string[]
    ): ResourceClientError {
        const causes =
            relays
                .map((relay) =>
                    this.relayErrors.get(relay)
                )
                .filter(
                    (cause) =>
                        cause !== undefined
                );

        return new ResourceClientError(
            operation,
            relays,
            causes.length === 1
                ? causes[0]
                : causes
        );
    }
}

function normalizeFilters(
    filters: Filter | readonly Filter[]
): Filter[] {
    return Array.isArray(filters)
        ? [...filters]
        : [filters];
}

function emitRequest(
    request:
        ReturnType<
            typeof createRxBackwardReq
        > |
        ReturnType<
            typeof createRxForwardReq
        >,
    filters: readonly Filter[],
    options?: ResourceClientRequestOptions
): void {
    if (options?.relays !== undefined) {
        request.emit(
            [...filters],
            {
                relays: [...options.relays]
            }
        );

        return;
    }

    request.emit([...filters]);
}

/**
 * Deduplicates identical signed events and returns
 * them in NIP-01 newest-first ordering.
 *
 * For equal created_at values the lexically lower
 * event id sorts first.
 */
export function orderNostrEvents(
    events: Iterable<Event>
): Event[] {
    const unique =
        new Map<string, Event>();

    for (const event of events) {
        unique.set(
            event.id,
            event
        );
    }

    return [
        ...unique.values()
    ].sort(compareNostrEvents);
}

function compareNostrEvents(
    left: Event,
    right: Event
): number {
    if (
        left.created_at !==
        right.created_at
    ) {
        return (
            right.created_at -
            left.created_at
        );
    }

    return left.id.localeCompare(
        right.id
    );
}
```

---

# Notes on the Core Implementation

The implementation intentionally does not create a general-purpose relay service.

There is no class responsible for:

```text
decode Resource payload
load IndexedDB
construct Bible filters
publish Domain state
show toast
manage Outbox
perform synchronization
```

`RxNostrResourceClient` does one thing:

> Translate the small Resource Client contract into rx-nostr communication.

---

# rx-nostr Construction

The `RxNostrResourceClient` receives an existing `RxNostr` instance.

This is deliberate.

```ts
new RxNostrResourceClient(rxNostr)
```

The adapter does not decide:

* which signer to use,
* which verifier implementation to use,
* initial relay configuration,
* connection strategy,
* or authentication configuration.

Those are composition concerns.

This also makes execution-context behavior explicit.

The main application may construct one client.

A Web Worker may construct another.

Neither changes the Resource lifecycle contract.

---

# Production Composition

## File

```text
src/lib/infrastructure/nostr/create-rx-nostr-resource-client.ts
```

## Implementation

```ts
import {
    createRxNostr,
    type EventSigner
} from 'rx-nostr';

import {
    verifier
} from '@rx-nostr/crypto';

import type {
    ResourceClient,
    ResourceRelay
} from '$lib/resource/nostr/resource-client';

import {
    RxNostrResourceClient
} from './rx-nostr-resource-client';

export interface CreateResourceClientOptions {
    readonly relays:
        readonly ResourceRelay[];

    readonly signer:
        EventSigner;
}

export function createRxNostrResourceClient(
    options: CreateResourceClientOptions
): ResourceClient {
    const rxNostr =
        createRxNostr({
            verifier,

            signer:
                options.signer,

            authenticator:
                'auto',

            connectionStrategy:
                'lazy-keep',

            eoseTimeout:
                5_000,

            okTimeout:
                5_000
        });

    const client =
        new RxNostrResourceClient(
            rxNostr
        );

    client.setDefaultRelays(
        options.relays
    );

    return client;
}
```

The exact timeout values are implementation configuration and may be adjusted from operational experience.

They are not architectural constants.

---

# Why `lazy-keep`

The initial production configuration uses:

```ts
connectionStrategy: 'lazy-keep'
```

This gives KJVOnly useful behavior for an application that performs intermittent Resource operations throughout its lifetime.

The relay connection is not created merely because the application starts.

It is created when communication is actually needed.

Once a default relay has been used, the connection may remain available for later Resource operations.

This avoids both extremes:

```text
connect eagerly to every relay at startup
```

and:

```text
create and destroy a WebSocket for every Resource lookup
```

The Resource Client contract does not depend on this strategy.

The configuration can change without modifying Resource lifecycle code.

---

# Retry and Reconnection

The Resource Client does not implement its own retry loop.

Do not write:

```ts
for (let attempt = 0; attempt < 5; attempt++) {
    try {
        return await query();
    } catch {
        await sleep(...);
    }
}
```

around rx-nostr.

rx-nostr already owns WebSocket reconnection and restoration of active communication.

Duplicating retry behavior above it would create:

* competing backoff policies,
* unnecessary relay load,
* harder error semantics,
* and more difficult testing.

The Resource Client converts terminal unavailability into:

```ts
ResourceClientError
```

and otherwise lets rx-nostr perform its normal connection behavior.

---

# REQ Concurrency and Relay Limits

The Resource Client does not implement its own semaphore for Nostr subscriptions.

rx-nostr reads applicable relay limitations and queues REQ operations to avoid exceeding relay concurrency limits.

Therefore multiple Resource operations may safely share one long-lived `RxNostr` instance.

Conceptually:

```text
Resource operation A ─┐
Resource operation B ─┼─→ ResourceClient
Resource operation C ─┘        ↓
                             rx-nostr
                                ↓
                     shared relay connection
```

The application should not create a new `RxNostr` instance for each Resource request.

---

# Client Lifetime

Within one JavaScript execution context, the normal ownership model is:

```text
Application Runtime
        ↓
one long-lived ResourceClient
        ↓
one long-lived RxNostr
        ↓
relay connection pool
```

The client is disposed only when that execution context no longer needs Nostr communication.

For example:

```ts
resourceClient.dispose();
```

This closes the underlying rx-nostr resources.

---

# Background Execution

Running Resource behavior in the background does not change architectural ownership.

A foreground operation and a background operation use the same Resource lifecycle:

```text
Resource lifecycle
    ↓
ResourceClient
    ↓
Nostr
```

There is no:

```text
BackgroundResourceClient
ForegroundResourceClient
WorkerResourceClient
```

architectural distinction.

---

# Separate Worker Contexts

A Web Worker is a separate JavaScript execution context.

It cannot directly share the main thread's in-memory `RxNostr` instance.

If a background task runs inside a dedicated worker, the simplest implementation is:

```text
Worker
    ↓
create RxNostr
    ↓
create RxNostrResourceClient
    ↓
run Resource lifecycle
```

That worker uses the same:

```ts
ResourceClient
```

contract.

Only composition differs.

---

# Relay Connection Limits Across Workers

Separate workers may therefore establish separate WebSocket connections to the same relay.

This should not be optimized prematurely.

The initial rule is:

> Use one Resource Client per execution context, not one Resource Client per operation.

If operational evidence later shows that browser-level relay connection limits make multiple worker clients undesirable, Nostr communication can be centralized behind a worker/message boundary.

For example:

```text
Main Thread ───────┐
                   │
Background Worker ─┼─→ Network Worker
                   │       ↓
Other Worker ──────┘   ResourceClient
                           ↓
                        rx-nostr
```

That is an infrastructure optimization.

The Resource lifecycle does not change because it already depends on the `ResourceClient` contract.

---

# Resource Lifecycle Integration

The Resource Client participates only in lifecycle stages requiring Nostr relay communication.

For inbound Resources:

```text
Resource Discovery
        ↓
construct Nostr Filter
        ↓
ResourceClient
        ↓
Nostr Event
        ↓
Resource Representation validation
        ↓
Resource Resolution
        ↓
serialized Resource content
```

The Resource Client stops at:

```text
Nostr Event
```

It does not continue into representation processing.

---

# `content` Representation

For a Resource whose representation is:

```text
content
```

the downstream flow is:

```text
ResourceClient
    ↓
Nostr Event
    ↓
Resource Representation
    ↓
event.content
    ↓
Resource Resolution
```

The Resource Client does not decode the content.

---

# `descriptor` Representation

For a Resource whose representation is:

```text
descriptor
```

the flow is:

```text
ResourceClient
    ↓
Nostr Event
    ↓
Resource Representation
    ↓
descriptor
    ↓
Resource Resolution
    ↓
external content retrieval
```

The Resource Client does **not** fetch the descriptor target.

That behavior belongs downstream in Resource Resolution and its applicable infrastructure.

This distinction prevents the Resource Client from becoming a general network service.

---

# Nostr Resource References

A descriptor is different from a reference to another Nostr Resource.

If Resource Discovery follows another Nostr Resource reference, Discovery may make another:

```ts
resourceClient.getEvent(...)
```

or:

```ts
resourceClient.getEvents(...)
```

call.

The Resource Client itself does not recursively follow references.

---

# Bible Chapter Example

A Bible chapter provides the first concrete Resource Client use case.

Assume the application needs:

```text
KJV
John 3
```

and the canonical chapter Resource Identifier is:

```text
kjvonly/bible/chapters/kjv/43_3
```

Resource Discovery knows:

```text
kind
publisher
resource identifier
```

and constructs:

```ts
import type {
    Event,
    Filter
} from 'nostr-typedef';

async function discoverBibleChapterEvent(
    resourceClient: ResourceClient,
    publisher: string
): Promise<Event | null> {
    const filter: Filter = {
        kinds: [37770],

        authors: [
            publisher
        ],

        '#d': [
            'kjvonly/bible/chapters/kjv/43_3'
        ]
    };

    return resourceClient.getEvent(
        filter
    );
}
```

The Resource Client does not know that:

```text
43 = John
3 = chapter 3
kjv = Bible version
```

It also does not know that kind `37770` represents a Resources.

Those meanings belong above the Resource Client.

---

# Complete Bible Network Segment

The Resource Client's portion of the first vertical slice is:

```text
Chapter Resource Access
        ↓
Resource Discovery
        ↓
construct:
    kind = 37770
    publisher = KJVOnly publisher
    d = kjvonly/bible/chapters/kjv/43_3
        ↓
ResourceClient.getEvent(filter)
        ↓
RxNostrResourceClient
        ↓
createRxBackwardReq()
        ↓
rx-nostr
        ↓
configured read relay(s)
        ↓
NIP-42 if required
        ↓
verified Nostr event(s)
        ↓
EOSE
        ↓
request completes
        ↓
current Event | null
        ↓
Resource Discovery
        ↓
Resource Representation
        ↓
Resource Resolution
```

Everything below the returned Nostr Event is outside the Resource Client.

---

# Dependency Injection

Resource lifecycle services receive a `ResourceClient`.

For example:

```ts
export class ResourceDiscovery {
    constructor(
        private readonly resourceClient:
            ResourceClient
    ) {}
}
```

They do not instantiate:

```ts
new RxNostrResourceClient(...)
```

and they do not import:

```ts
rx-nostr
```

The application composition root supplies the production implementation.

---

# Testing Boundary

The main testing advantage of `ResourceClient` is not that rx-nostr itself becomes heavily mocked.

It is that every Resource behavior above the client can be tested without:

* a WebSocket,
* a relay,
* rx-nostr,
* RxJS,
* NIP-42,
* or browser networking.

For example, Resource Discovery tests can use:

```ts
const client: ResourceClient = {
    setDefaultRelays() {},

    async getEvent() {
        return event;
    },

    async getEvents() {
        return [];
    },

    async publishEvent(event) {
        return {
            eventId: event.id,
            acknowledgements: [],
            acceptedByAnyRelay: false
        };
    },

    subscribe() {
        return {
            close() {}
        };
    },

    dispose() {}
};
```

The production adapter itself is infrastructure and should receive focused adapter/integration testing.

---

# Pure Ordering Tests

The Resource Client does not implement its own Nostr event ordering or deduplication algorithm.

rx-nostr already provides operators for these behaviors, including:

```ts
uniq()
```

for removing the same signed event received from multiple relays, and:

```ts
latestEach(...)
```

for selecting the latest event for a logical replaceable or addressable identity.

The Resource Client should compose these rx-nostr operators where the query semantics require them rather than duplicating Nostr ordering behavior in application code.

For example, a bounded query for one addressable Resource may conceptually use:

```ts
rxNostr
	.use(request)
	.pipe(
		uniq(),
		latestEach(() => 'resource')
	);
```

Because the request identifies one logical Resource, all returned candidate publications belong to the same result group and `latestEach()` can select the current publication.

A plural query is different.

For example:

```ts
rxNostr
	.use(request)
	.pipe(
		uniq()
	);
```

may be sufficient when the caller intentionally requested multiple distinct events.

`latestEach()` must not be applied universally to `getEvents()`. The grouping key depends on the semantics of the query. Some Resource Discovery operations may need several distinct Resources, while others may need the latest publication for each Resource identity.

The Resource Client therefore relies on rx-nostr for the mechanics of Nostr event deduplication and latest-event selection instead of introducing utilities such as:

```text
compareNostrEvents()
orderNostrEvents()
selectCurrentNostrEvent()
```

These would duplicate behavior already owned by the Nostr client library.

## Testing Strategy

There is no value in reproducing rx-nostr's own unit tests inside KJVOnly.

KJVOnly tests should instead verify the behavior of the `ResourceClient` contract.

For example, adapter tests should establish that:

```text
same event returned by multiple relays
    ↓
ResourceClient returns it once
```

and:

```text
multiple publications for one requested addressable Resource
    ↓
ResourceClient.getEvent()
    ↓
returns the current publication
```

while:

```text
multiple distinct events requested by getEvents()
    ↓
distinct events remain present
```

These tests validate that `RxNostrResourceClient` composes rx-nostr correctly without testing the internal implementation of `uniq()` or `latestEach()`.

The distinction is important:

> **KJVOnly tests the Resource Client contract. rx-nostr tests Nostr stream ordering and deduplication mechanics.**

If future Resource behavior requires ordering or selection semantics that rx-nostr does not provide, that behavior should be introduced and unit tested explicitly at that time rather than preemptively duplicating protocol behavior.


# Resource Client Contract Tests

Resource-level tests should verify the contract rather than rx-nostr internals.

Important behaviors include:

```text
getEvent()
    returns Event when found

getEvent()
    returns null when absent

getEvents()
    returns multiple events

getEvent()/getEvents()
    throw ResourceClientError when no usable relay exists

publishEvent()
    reports per-relay acceptance

publishEvent()
    considers a relay accepted after an auth retry succeeds

subscribe()
    returns a closeable handle

ResourceSubscription.close()
    is idempotent
```

These may be implemented with a small rx-nostr test harness or a local test relay.

Tests should not assert private RxJS operator composition.

---

# Integration Testing

The production adapter should eventually have integration tests against a controlled Nostr relay.

Useful cases include:

```text
read existing event

read missing event

read addressable event

same event returned from two relays

different addressable publications returned by two relays

NIP-42 authenticated read

successful publication

rejected publication

NIP-42 authenticated publication

relay unavailable

default relay replacement

temporary relay request

live subscription + close
```

These tests validate the infrastructure boundary rather than Domain or Resource meaning.

---

# What Should Not Be Mocked

Pure Resource logic above the client should use a fake `ResourceClient`.

It should not mock:

```text
WebSocket
RxJS
createRxBackwardReq
createRxForwardReq
NIP-42 packets
rx-nostr internal connection state
```

That would couple Resource tests to infrastructure implementation details.

---

# What the Adapter May Rely on From rx-nostr

The implementation deliberately delegates these mechanics to rx-nostr:

* one relay connection serving multiple requests,
* relay connection reuse,
* lazy connection establishment,
* reconnection,
* exponential retry behavior,
* restoration of active REQs after reconnection,
* NIP-11 REQ concurrency handling,
* event signature verification,
* filter validation,
* temporary relay communication,
* default relay reconfiguration,
* NIP-42 authentication,
* EVENT retransmission after successful AUTH,
* and Nostr CLOSE behavior.

The adapter should not reproduce these mechanisms.

---

# Future Extension Rules

The Resource Client interface may grow when a concrete Resource lifecycle requirement requires it.

Possible future needs include:

```text
relay diagnostics
explicit connection health
COUNT requests
more advanced live-subscription restart behavior
```

They should not be added merely because rx-nostr supports them.

The interface should continue to expose only operations that the KJVOnly Resource lifecycle actually requires.

---

# Explicit Non-Goals

The Resource Client must not become:

```text
BibleResourceClient
DomainRepository
OfflineApi
ResourceResolver
ResourceInstaller
Outbox
SynchronizationManager
HTTP client
Blossom client
generic network client
```

It does not know Domain meaning.

It does not know local persistence.

It does not resolve external Resource content.

It does not decide local authority.

It does not decide whether a Resource should be installed.

It does not decide synchronization conflicts.

It does not determine Resource publication identity.

It communicates with Nostr relays.

---

# Implementation Summary

The Resource Client establishes one narrow boundary:

```text
Resource lifecycle
        ↓
ResourceClient
        ↓
RxNostrResourceClient
        ↓
rx-nostr
        ↓
Nostr relays
```

Its complete initial contract is:

```ts
interface ResourceClient {
    setDefaultRelays(
        relays: readonly ResourceRelay[]
    ): void;

    getEvent(
        filter: Filter,
        options?: ResourceClientRequestOptions
    ): Promise<Event | null>;

    getEvents(
        filters: Filter | readonly Filter[],
        options?: ResourceClientRequestOptions
    ): Promise<readonly Event[]>;

    publishEvent(
        event: Event,
        options?: ResourceClientRequestOptions
    ): Promise<ResourcePublishResult>;

    subscribe(
        filters: Filter | readonly Filter[],
        onEvent: (event: Event) => void,
        options?: ResourceClientRequestOptions
    ): ResourceSubscription;

    dispose(): void;
}
```

The client is intentionally Nostr-aware and Domain-agnostic.

rx-nostr remains entirely below the interface.

Bounded historical queries hide the REQ/EOSE/CLOSE lifecycle behind promises.

Live subscriptions expose only a closeable handle.

Default relays may be replaced dynamically.

Individual operations may target temporary relays.

NIP-42 is handled through rx-nostr and the configured signer.

Protocol-level event verification occurs before events leave Nostr infrastructure.

Publication accepts an already-signed Nostr Resource event and reports relay acknowledgements.

Background execution does not change the Resource lifecycle or the client contract.

Within an execution context, one long-lived Resource Client should serve many Resource operations.

The resulting boundary is small enough to understand directly, broad enough to support the known Resource lifecycle, and narrow enough that rx-nostr can be replaced or upgraded without changing Domain or Resource behavior.
