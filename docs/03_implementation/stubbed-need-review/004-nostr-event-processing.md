# Nostr Event Processing

**Status**

Implementation Design — Preserved from Resource Boundary ADRs

---

# Purpose

This document preserves the implementation model for translating between Nostr protocol events and the Resource Representations used by the Resource Boundary.

The architectural contract is defined by the Resource Boundary specifications, especially:

* ADR 03 — Nostr Event Model
* ADR 04 — Nostr Resource Identity
* ADR 09 — Outbox and Publishing

This document describes implementation mechanisms that may satisfy those contracts.

---

# Responsibilities

Nostr event processing isolates protocol mechanics from Domain behavior.

It is responsible for implementation concerns such as:

* validating Nostr events,
* identifying supported event structures,
* parsing Nostr tags and metadata,
* decoding or decrypting payloads where required,
* constructing Resource Representations,
* constructing outbound Nostr events,
* validating outbound event structure,
* and coordinating signing.

It does not own:

* Domain validation,
* Resource Resolution,
* Resource Installation,
* persistence,
* synchronization conflict resolution,
* or application behavior.

---

# Inbound Processing

A useful implementation pipeline is:

```text
Relay Event
    ↓
Validate Nostr Event
    ↓
Determine Event Structure / Kind
    ↓
Select Event Handler
    ↓
Decode / Decrypt if required
    ↓
Validate Resource Event Structure
    ↓
Construct Resource Representation
```

The old Event Model used an Event Strategy registry for this dispatch.

That remains a useful implementation technique, but it is no longer a required architectural layer.

---

# Event Handler Registry

Different Nostr event structures may require different protocol handling.

A registry may map:

```text
kind + relevant metadata
        ↓
Event Handler
```

An Event Handler may define implementation behavior for:

* protocol validation,
* tag parsing,
* payload decoding,
* optional decryption,
* representation parsing,
* outbound event construction,
* and optional encoding.

For example:

```text
Kind
    ↓
Handler Registry
    ↓
Resource Event Handler
    ↓
Resource Representation
```

The registry should remain protocol-focused.

It should not dispatch Domain behavior.

---

# Validation Stages

Validation should remain layered.

```text
Nostr Validation
    ↓
Resource Event Validation
    ↓
Resource Representation
    ↓
later...
Domain Validation
```

## Nostr Validation

Validate protocol-level properties such as:

* required event fields,
* event identifier,
* signature,
* publisher public key,
* timestamp,
* and basic tag structure.

## Resource Event Validation

Validate the Resource-specific event contract, including applicable:

* `d` tag,
* classification metadata,
* representation metadata,
* media type,
* and representation payload.

## Domain Validation

Domain validation occurs later during Resource Installation.

Event processing must not validate application meaning.

---

# Resource Event Parsing

A parsed Resource event should preserve the Nostr publication context needed by later Resource Boundary operations.

Useful information includes:

```text
kind
publisher public key
d tag / Resource Identifier
event id
created_at
classification
representation
media type
content / descriptor payload
```

This information becomes a Resource Representation rather than a Domain Object.

Raw Nostr tags should not leak into Domain behavior merely because they were required during protocol processing.

---

# Published Resource Identity

Event processing should expose enough information to reconstruct:

```text
kind + publisher public key + d tag
```

as the Published Resource Identity.

The event `id` remains the identity of one signed publication.

The processing implementation must not introduce a second revision identifier.

---

# Incoming Encoding and Encryption

Some event types may require encoding or encryption.

The original Event Strategy model allowed handlers to perform:

* decoding,
* decryption,
* serialization,
* deserialization,
* hexadecimal encoding,
* and encryption.

These remain valid implementation capabilities when required by an actual Resource/event contract.

They should not be applied universally.

Conceptually:

```text
event.content
    ↓
Decode if required
    ↓
Decrypt if required
    ↓
Representation Payload
```

The selected event handler determines which processing is required.

---

# Outbound Processing

Outbound event construction begins with a Resource Representation, not directly with arbitrary Domain Objects.

```text
Resource Representation
    ↓
Select Event Handler
    ↓
Encode / Encrypt if required
    ↓
Construct Unsigned Nostr Event
    ↓
Validate Event Structure
    ↓
Sign
    ↓
Signed Nostr Event
```

Resource serialization from Domain information occurs before this protocol-processing stage.

---

# Event Construction

An outbound event builder is responsible for constructing the Nostr event fields required by the Resource Representation.

This includes applicable:

```text
kind
pubkey
created_at
tags
content
```

The event builder must preserve the intended:

```text
kind + pubkey + d
```

for addressable Resource publications.

The final event `id` and signature are produced by Nostr signing.

---

# Event Factory

The original architecture called the outbound implementation an **Event Factory**.

That remains a reasonable implementation name.

Its responsibility should now be understood as:

> Convert a Resource Representation into a valid unsigned Nostr event.

It should not:

* interpret Domain Objects,
* choose accepted local state,
* perform synchronization,
* or persist Domain information.

---

# Signing

Signing occurs after the event has been fully constructed.

```text
Unsigned Event
    ↓
Validate
    ↓
Signer
    ↓
event id + signature
    ↓
Signed Event
```

Signing uses the publisher identity associated with the publication.

The signing implementation may be local or delegated, provided the resulting event satisfies the Nostr event contract.

Key-management details belong to their own implementation documentation.

---

# Relationship to the Outbox

The Outbox owns durable publication intent.

Event processing materializes that intent into a Nostr publication.

Conceptually:

```text
Outbox Publication Intent
        ↓
Resource Representation
        ↓
Event Builder
        ↓
Signer
        ↓
Signed Nostr Event
        ↓
Relay Publisher
```

The event processor itself does not own durable retry or publication status.

---

# Replaceable Events

Addressable-event replacement semantics should remain hidden from Domain behavior.

Event-processing code understands the Nostr mechanics required to publish and parse addressable events.

Application code works with Published Resource Identity.

For addressable Resources:

```text
same kind + pubkey + d
    = same Published Resource
```

while each signed event has a different event `id`.

---

# Deletion

The old Event Model included a generic Event Factory path for Nostr deletion.

That mechanism should be retained only as an implementation capability.

A local Domain delete must not automatically become a Nostr deletion event unless the applicable Resource contract defines that behavior.

If deletion publication is required:

```text
Domain / Resource deletion decision
        ↓
Publication Intent
        ↓
Deletion Event Builder
        ↓
Sign
        ↓
Outbox / Relay Publication
```

---

# Raw Event Lifetime

Raw Nostr events are protocol objects.

They may be retained temporarily for:

* validation,
* diagnostics,
* synchronization processing,
* provenance,
* debugging,
* or protocol-oriented features.

They should not become the application's primary Domain representation merely because they were received from Nostr.

Event-oriented features may define different storage behavior when appropriate.

---

# Failure Handling

Useful protocol-processing failures include:

```text
Invalid Nostr Event
Invalid Signature
Unsupported Event Kind
Invalid Resource Event Structure
Invalid Resource Identifier
Invalid Representation Metadata
Decode Failure
Decrypt Failure
Event Construction Failure
Signing Failure
```

Failures should preserve the event or publication context needed for diagnostics.

The exact error classes are implementation-defined.

---

# Implementation Direction

A practical implementation may be organized around:

```text
NostrEventValidator

ResourceEventRegistry

ResourceEventHandler

ResourceEventParser

ResourceEventBuilder

NostrSigner
```

These names are implementation mechanisms rather than architectural layers.

They may evolve without changing the Resource Boundary contract.

---

# Big Takeaway

Nostr event processing isolates protocol mechanics:

```text
Nostr Event
    ⇅
Event Processing
    ⇅
Resource Representation
```

Handlers, registries, parsers, builders, encoders, and signers are useful implementation tools.

The important boundary is that they translate protocol representations without taking ownership of Domain meaning.
