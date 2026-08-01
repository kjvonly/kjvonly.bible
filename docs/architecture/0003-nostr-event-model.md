# ADR 0003 — Event Model

**Status**

Accepted

---

# Problem

KJVOnly uses Nostr as its synchronization protocol.

Nostr defines how events are created, signed, published, authenticated, and synchronized between clients.

The application, however, should operate on domain models rather than raw Nostr events.

The architecture requires a clear boundary that isolates protocol concerns from application concerns while allowing every resource to be represented as a Nostr event.

---

# Decision

Nostr is the synchronization protocol used by the application.

Application features do not directly consume or produce raw Nostr events.

Instead, the application communicates through domain models.

Dedicated event strategies translate between domain objects and Nostr events.

```text
Application

↓

Domain Objects

↓

Event Model

====================

Nostr Boundary

====================

↓

Nostr Events

↓

Relay
```

The Event Model is the only architectural layer responsible for understanding Nostr event structure.

---

# Event Pipeline

Incoming events follow a consistent processing pipeline.

```text
Relay

↓

Validate Event

↓

Determine Kind

↓

Select Event Strategy

↓

Decode / Decrypt

↓

Deserialize

↓

Validate Domain Structure

↓

Domain Object

↓

Domain Store
```

Every event passes through the same pipeline regardless of its source.

Raw Nostr events are never exposed beyond the Event Model.

---

# Event Creation

Outgoing events follow the reverse pipeline.

```text
Domain Object

↓

Event Factory

↓

Serialize

↓

Optional Encryption

↓

Hex Encode

↓

Build Event

↓

Validate

↓

Sign

↓

Outbox
```

The Event Factory is responsible for converting domain objects into valid Nostr events.

Application code never constructs Nostr events directly.

---

# Event Strategies

The Event Model uses a strategy registry.

Each strategy understands a specific event structure.

```text
Kind

↓

Event Strategy

↓

Parser

↓

Factory
```

Strategies define:

* Parsing
* Serialization
* Validation
* Optional encryption
* Optional encoding

This keeps protocol behavior isolated from application logic.

---

# Domain Models

Application features operate entirely on domain objects.

Examples include:

* Notes
* Reading plans
* Completed readings
* Highlights
* Annotations
* Publisher metadata

Domain models contain application data only.

They do not expose:

* Raw Nostr tags
* Event serialization
* Protocol-specific structures

The Event Model is responsible for translating between protocol data and application data.

---

# Everything Is a Resource

Every application object is represented as a resource.

Examples include:

```text
kjvonly/notes/default

kjvonly/notes/sermons

kjvonly/notes/sermons/sermon-1

kjvonly/completed-readings/default

kjvonly/annotations/default
```

Resource identity provides the application's logical organization.

Nostr events provide the protocol representation used to synchronize those resources.

---

# Kind Strategy

Kinds represent broad application domains rather than individual resource types.

Resource identity, structured metadata, and content determine the specific application type.

For example, multiple resource types may share the same application kind while remaining distinguishable through their resource identifiers.

This avoids unnecessary kind proliferation while maintaining clear domain separation.

---

# Identity

Domain metadata exposes:

* Resource Identifier
* Publisher Public Key
* Event Identifier
* Creation Timestamp

Each serves a different purpose.

The resource identifier provides stable identity.

The event identifier identifies one immutable version.

The publisher public key establishes ownership.

The creation timestamp participates in synchronization ordering.

---

# Replaceable Events

Replaceable event behavior is hidden behind the Event Model.

Application code works with resources rather than replaceable-event semantics.

The Event Strategy determines how replacement is represented within the Nostr protocol.

---

# Event Validation

Validation occurs in layers.

First, the Nostr event is validated.

Next, the Event Strategy validates the expected event structure.

Finally, the resulting domain object validates its own domain rules.

Each layer validates only its own responsibility.

---

# Encoding and Encryption

The Event Strategy determines how content is represented.

A strategy may perform:

* Serialization
* Hex encoding
* Encryption
* Decryption

The selected strategy is determined by the event kind together with event metadata.

This allows the same domain model to support multiple transport representations without changing application code.

---

# Deletion

Deletion is represented by the Nostr protocol using event identifiers.

The Event Factory creates deletion requests.

The Event Model converts deletion requests into the appropriate domain operations.

Application code works with deleted resources rather than protocol-specific deletion mechanics.

---

# Local Storage

The application does not persist raw Nostr events as its primary application state.

Instead it stores:

* Domain Stores
* Resources
* Manifests
* Outbox

Raw events are considered transient protocol objects.

Future modules that are inherently event-oriented, such as chat or timelines, may define their own event storage strategies without changing the core application architecture.

---

# Relationship to the Architecture

The Event Model forms the boundary between the application and the Nostr protocol.

Everything above the Event Model works with resources and domain objects.

Everything below the Event Model works with Nostr events.

This separation allows the application architecture to remain resource-oriented while fully embracing Nostr as its synchronization protocol.

---

# Big Takeaway

The Event Model isolates the Nostr protocol from the rest of the application.

Application features operate exclusively on domain models and resources.

Event strategies translate between those domain models and Nostr events, allowing serialization, validation, encryption, signing, and synchronization to remain centralized behind a single architectural boundary.
