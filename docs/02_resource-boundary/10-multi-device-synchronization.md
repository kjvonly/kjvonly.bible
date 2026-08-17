# ADR 10 — Multi-Device Synchronization

**Status**

Accepted

---

# Problem

A user may modify the same Resource from multiple devices.

Each device may operate offline, accept local changes independently, and publish those changes later.

Nostr addressable events provide replacement semantics, but they do not provide:

* locking,
* compare-and-swap,
* transactional coordination between devices,
* or automatic merging of concurrent edits.

The Resource Boundary therefore needs a deterministic reconciliation rule for local and remote writes without sacrificing offline-first behavior.

---

# Decision

KJVOnly uses **Last Write Wins (LWW)** for Multi-Device Synchronization.

For the same Published Resource Identity, synchronization compares the logical write timestamp of accepted local state with the `created_at` timestamp of the incoming Nostr publication.

The later valid write wins reconciliation.

```text
Accepted Local State
    modifiedAt
        │
        ├──── compare ──── Incoming Publication
        │                     created_at
        │
        ↓
Last Write Wins
        ↓
Selected Synchronization State
        ↓
Resource Installation when remote wins
```

LWW selects which state should proceed during synchronization.

It does not allow a network publication to bypass Resource Resolution, Domain validation, or Installation.

> **The network proposes. Synchronization selects. Installation accepts.**

---

# Synchronization Identity

Synchronization compares writes only when they represent the same Published Resource.

Published Resource Identity remains:

```text
kind + publisher public key + d tag
```

as defined by ADR 04 — Nostr Resource Identity.

Different Published Resource Identities are independent Resources and are not reconciled through LWW merely because their Domain content appears related.

The Nostr event `id` identifies one publication.

It does not define synchronization identity or revision identity.

---

# Logical Write Timestamp

Synchronizable Domain information carries a `modifiedAt` timestamp representing its logical write time.

When that state is published:

```text
Domain modifiedAt
    =
Nostr event created_at
```

The same timestamp therefore orders both local and published state.

When a remote publication is successfully installed, its `created_at` becomes the `modifiedAt` value of the resulting accepted local Domain information.

When accepted local information is changed, its new `modifiedAt` is later used as the `created_at` of the corresponding Nostr publication.

The Resource Boundary does not introduce a separate synchronization timestamp.

---

# Reconciliation Rule

For the same Published Resource Identity:

```text
remote created_at > local modifiedAt
    → remote write wins reconciliation

local modifiedAt > remote created_at
    → local write remains selected
```

When no accepted local state exists, the incoming publication may proceed through the normal Installation lifecycle.

An incoming publication that wins LWW is still only a candidate for local replacement until:

1. its Resource Representation is resolved,
2. its Resource content is verified,
3. its Domain information is validated,
4. and Installation succeeds.

If any required stage fails, the previously accepted local state remains unchanged.

---

# Equal Timestamps

This ADR does not introduce a second application-specific revision or tie-breaking system.

When multiple Nostr publications have the same timestamp, the Resource Boundary relies on the applicable Nostr current-publication selection semantics defined by the Event Model and Resource Discovery specifications.

Synchronization MUST NOT invent another Resource revision identity merely to order equal-timestamp publications.

---

# Incoming Synchronization

Incoming synchronization uses the existing inbound Resource lifecycle.

Conceptually:

```text
Nostr Publication
        ↓
Resource Discovery
        ↓
Resource Resolution
        ↓
Domain Interpretation / Validation
        ↓
LWW Reconciliation
        ↓
Resource Installation
        ↓
Accepted Local State
```

Synchronization MUST NOT write protocol data directly into accepted Domain state.

If the incoming write loses LWW comparison, it does not replace the accepted local state.

If the incoming write wins, synchronization presents the resulting candidate information for Installation.

---

# Local Authority

A newer Nostr publication is not automatically authoritative merely because it exists on a relay.

These are separate questions:

```text
Is this the later write?
        ↓
LWW

Is this valid Resource and Domain information?
        ↓
Resolution + Domain Validation

Should it become accepted local state?
        ↓
Installation
```

LWW answers only the first question.

This preserves the Resource Boundary's Local Authority rule.

---

# Outgoing Synchronization

Local changes are accepted independently of Nostr availability.

When locally accepted information requires publication:

```text
Accepted Local Change
        ↓
modifiedAt
        ↓
Durable Publication Intent
        ↓
Outbox
        ↓
Nostr Publication
```

ADR 09 — Outbox and Publishing owns the publication process.

Multi-Device Synchronization MUST NOT publish directly to relays.

The Outbox MUST NOT perform LWW or remote-state reconciliation itself.

---

# Pending Publication Intent

A local write may remain pending in the Outbox while another device publishes a newer write.

Synchronization does not require a remote fetch immediately before every Outbox publication.

The original local publication retains its original logical write timestamp.

Therefore, publishing it later does not make it a later write merely because network delivery occurred later.

```text
local modifiedAt
    determines
published created_at

not:

relay delivery time
```

This distinction is required for offline synchronization.

---

# Superseded Pending Work

After synchronization accepts a newer remote write, an older local publication intent for the same Published Resource may no longer be useful.

Synchronization MAY mark such pending publication work as superseded when doing so preserves the accepted LWW result.

The Outbox itself MUST NOT make this decision independently.

This keeps reconciliation policy in Synchronization and durable transport behavior in the Outbox.

---

# Offline Behavior

A device MAY create and modify synchronizable Domain information while completely offline.

Local acceptance MUST NOT require:

* relay connectivity,
* a synchronization check,
* or knowledge of other devices.

The local write receives its `modifiedAt` timestamp and any required publication intent is persisted through the Outbox.

When connectivity returns, publication and incoming synchronization happen independently.

Concurrent offline edits are reconciled through LWW when their publications become available.

---

# Concurrent Writes

LWW intentionally accepts the possibility that concurrent edits overwrite one another.

For example:

```text
Device A writes at T1

Device B writes at T2

T2 > T1

Device B's write wins reconciliation
```

This remains true even if Device A publishes after Device B.

Publication arrival order does not replace logical write ordering.

KJVOnly does not attempt to merge the two writes automatically.

---

# Race Conditions

A device may refresh remote state and then another device may publish before the first device completes its own edit.

Nostr provides no atomic mechanism to lock an addressable Resource during editing.

KJVOnly accepts this race condition.

Preventing it would require a more complex synchronization protocol such as:

* locking,
* conditional publication,
* revision negotiation,
* operational transformation,
* CRDTs,
* or application-specific merging.

Those mechanisms are not part of the current Resource Boundary.

---

# No Revision System

Multi-Device Synchronization does not introduce:

* Resource revisions,
* revision numbers,
* synchronization sequence numbers,
* conflict-copy identity,
* or durable revision history.

Published Resource Identity remains unchanged across addressable replacement publications.

Each event ID identifies only one signed publication.

Older relay publications MUST NOT be treated as a durable revision history.

---

# Clock Assumption

LWW depends on timestamps generated independently by devices.

The synchronization model assumes device clocks are reasonably accurate.

Significant clock skew may cause a write to be ordered incorrectly.

KJVOnly does not introduce:

* a centralized timestamp authority,
* a synchronization server,
* a logical clock,
* or a separate ordering service.

This is an accepted limitation of the simplified LWW model.

---

# Background Synchronization

Synchronization MAY execute in the background.

For example, an application may synchronize:

* after connectivity returns,
* while relevant Resources are active,
* periodically,
* or during another application workflow.

Those scheduling decisions are implementation and application-lifecycle policy.

They do not change the LWW reconciliation contract defined here.

---

# Specification Invariants

A compatible implementation MUST preserve these rules:

```text
Synchronization applies to the same
Published Resource Identity.

LWW is the reconciliation strategy.

modifiedAt and created_at represent
the same logical write timestamp.

Later network delivery does not create
a later logical write.

A newer remote write does not bypass
Resolution, Domain validation, or Installation.

Local changes remain usable before synchronization
or publication completes.

Incoming synchronization uses the normal
Resource lifecycle.

Outgoing synchronization uses the Outbox.

The Outbox does not perform reconciliation.

Synchronization does not introduce
a separate Resource revision system.

Concurrent writes may overwrite one another.

Clock skew is an accepted limitation.
```

---

# Scope

This ADR defines:

* Multi-Device Synchronization,
* Last Write Wins reconciliation,
* the relationship between `modifiedAt` and Nostr `created_at`,
* reconciliation of local and remote writes,
* incoming synchronization through the Resource lifecycle,
* outgoing synchronization through the Outbox,
* pending local publications during reconciliation,
* offline concurrent writes,
* and the accepted clock and race-condition limitations.

It does not define:

* Resource Identity,
* Resource Discovery mechanics,
* Resource Resolution,
* Domain validation rules,
* Resource Installation mechanics,
* Outbox transport behavior,
* editor refresh behavior,
* application startup sequencing,
* background execution scheduling,
* automatic merging,
* locks,
* conflict copies,
* or revision history.

Those concerns belong to their corresponding specifications or implementation documentation.

---

# Big Takeaway

Multi-Device Synchronization uses one ordering value:

```text
Domain modifiedAt
        =
Nostr created_at
```

For the same Published Resource, the later valid write wins reconciliation.

That winner still passes through the normal Resource lifecycle before changing accepted local state.

Devices remain free to work offline, and simultaneous edits may overwrite one another.

> **Last Write Wins determines reconciliation order; it does not turn the newest relay event into unconditional local authority.**
