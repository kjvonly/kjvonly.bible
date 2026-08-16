# ADR 05 — Discovery Roots

**Status**

Accepted

---

# Problem

Resource Discovery requires bounded starting points.

Querying Resources from every publisher on Nostr is neither practical nor desirable. The application therefore needs a way to determine which publishers may participate in normal, open-ended Resource Discovery.

That decision must remain separate from:

* Resource Discovery mechanics,
* Resource Installation,
* synchronization,
* local acceptance,
* and Resource ownership.

The specification must also distinguish a publisher chosen as a discovery starting point from a publisher encountered through an explicit Resource reference.

---

# Decision

A **Discovery Root** is a publisher from which the application may begin open-ended Resource Discovery.

```text
Discovery Root
    ↓
Publisher
    ↓
Resource Discovery
    ↓
Published Resources
```

Discovery Roots define **where discovery may begin**.

They do not imply:

* installation,
* synchronization,
* ownership,
* endorsement,
* or automatic acceptance of discovered Resources.

Those decisions belong to later Resource lifecycle stages.

---

# Discovery Roots Are Publishers

Discovery Roots apply to publishers.

A Discovery Root is identified by a Nostr publisher public key.

Once a publisher is established as a Discovery Root, its Resource publications become eligible for the Resource Discovery operations defined in ADR 06.

For example, Discovery may query that publisher by:

* Published Resource Identity,
* Resource Classification,
* or broader publisher Resource queries.

The exact Nostr query shapes belong to Resource Discovery.

---

# Discovery Roots and Discovery Inputs

A Discovery Root is not the same thing as a Discovery Input.

ADR 06 may perform discovery from inputs such as:

```text
Published Resource Identity
Resource Classification
Resource reference
Nostr event ID
```

These values constrain a particular discovery operation.

They do not automatically establish new Discovery Roots.

Conceptually:

```text
Discovery Root
    = publisher allowed as a discovery starting point

Discovery Input
    = information used to locate particular Resources
```

This distinction keeps publisher discovery scope separate from individual Resource addressing.

---

# Establishing Discovery Roots

The Resource Boundary defines what a Discovery Root means but does not require one mechanism for selecting them.

Discovery Roots MAY be established through:

* application defaults,
* explicit user configuration,
* Nostr follow information,
* web-of-trust policy,
* imported configuration,
* or future application mechanisms.

Regardless of how the set is established, Resource Discovery operates against the resulting publisher set.

The mechanism that chooses Discovery Roots MUST NOT change Resource Identity or Resource Discovery semantics.

---

# Default Application Discovery Root

The application MAY provide one or more default Discovery Roots.

A default application publisher may provide Resources required or recommended for initial application use.

Additional Discovery Roots MAY be added independently.

Being configured by default does not change the Resource Identity or protocol semantics of that publisher's Resources.

---

# Open-Ended Discovery

Discovery Roots govern **open-ended publisher discovery**.

Examples include:

```text
Find Bible Resources from Publisher A

Find Reading Plan Resources from Publisher A

Browse Resources published by Publisher A
```

Such discovery begins from publishers already established as Discovery Roots.

A publisher that is not a Discovery Root MUST NOT become eligible for unrestricted or open-ended discovery merely because the application encounters its public key.

---

# Explicit Resource References

A discovered Resource may explicitly reference another Resource published by another publisher.

For example:

```text
Resource A
    publisher = Publisher A
        ↓
explicit reference
        ↓
Resource B
    publisher = Publisher B
```

Following that reference does **not** make Publisher B a Discovery Root.

Instead, the reference supplies a bounded Discovery Input for the specifically referenced Resource.

If application policy permits the reference to be followed, Resource Discovery MAY query Publisher B for that Resource.

This permits cross-publisher Resource composition without implicitly expanding the application's Discovery Root set.

---

# Root Discovery vs Referenced Discovery

The distinction is:

```text
Discovery Root
    ↓
permits open-ended discovery from a publisher


Explicit Resource Reference
    ↓
permits discovery of the referenced Resource
without establishing a new root
```

A referenced publisher therefore participates only in the traversal required by the explicit reference unless separately established as a Discovery Root.

This prevents one publisher from silently expanding the application's general discovery scope while still allowing Resources to reference independently published Resources.

---

# References Do Not Establish Authority

An explicit cross-publisher reference does not establish:

* endorsement of the referenced publisher,
* installation permission,
* synchronization policy,
* or automatic acceptance of the referenced Resource.

Likewise, being a Discovery Root does not make all of a publisher's Resources authoritative local state.

Discovery scope and local authority remain separate.

---

# Resource-Specific Entry Points

An application workflow may already possess a complete Published Resource Identity or another direct Resource reference.

Such a reference may be used as a bounded Discovery Input even when the publisher is not configured for broader discovery.

For example:

```text
kind
publisher pubkey
d tag
```

may identify one specific Published Resource.

This does not grant permission to enumerate unrelated Resources from that publisher.

---

# Removing Discovery Roots

A Discovery Root MAY be removed at any time.

Removal prevents future open-ended Resource Discovery from that publisher.

It does not automatically:

* uninstall previously accepted Resources,
* remove local Domain information,
* invalidate existing Resource provenance,
* or change Resource ownership.

Existing explicit Resource references MAY still identify Resources from that publisher according to the policy governing those references.

Removing a Discovery Root changes discovery scope, not historical Resource identity.

---

# Offline-First Behavior

Discovery Roots define network discovery scope.

They MUST NOT become a prerequisite for using already accepted local information.

If a publisher is removed as a Discovery Root or becomes unreachable:

```text
existing accepted local state
    remains usable
```

Future network discovery may be affected.

Existing local application state is not invalidated by that change.

---

# Relationship to Resource Discovery

Discovery Roots answer:

> **Which publishers may serve as starting points for open-ended discovery?**

Resource Discovery answers:

> **How are Resource Representations located from a root or another bounded Discovery Input?**

ADR 06 defines:

* Nostr query shapes,
* identity and classification filtering,
* multi-relay discovery,
* current-publication selection,
* descriptor traversal,
* and deduplication.

This ADR defines only discovery scope.

---

# Specification Invariants

A compatible implementation MUST preserve these rules:

```text
Discovery Roots are publishers.

Discovery Roots define open-ended discovery scope.

Discovery Inputs do not automatically become Discovery Roots.

Explicit cross-publisher references may be followed
without promoting the referenced publisher to a root.

A reference does not authorize unrelated discovery
from the referenced publisher.

Discovery Root status does not imply installation
or local authority.

Removing a Discovery Root does not invalidate
already accepted local state.
```

---

# Scope

This ADR defines:

* Discovery Roots,
* publisher-based discovery scope,
* establishment and removal of Discovery Roots,
* the distinction between Discovery Roots and Discovery Inputs,
* and the handling of explicitly referenced publishers.

It does not define:

* Resource Discovery query mechanics,
* relay configuration,
* Resource Resolution,
* Installation,
* local acceptance,
* synchronization,
* persistence,
* or how a particular application chooses its Discovery Root policy.

Those concerns belong to the corresponding Resource Boundary or Application Architecture specifications.

---

# Big Takeaway

A Discovery Root is a publisher from which the application permits open-ended Resource Discovery.

An explicit Resource reference is narrower:

```text
Discovery Root
    → discover Resources from this publisher

Resource Reference
    → discover this referenced Resource
```

Following a cross-publisher reference does not silently create another Discovery Root.

> **Roots define discovery scope; references identify Resources within a bounded traversal.**
