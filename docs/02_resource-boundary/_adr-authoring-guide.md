# Resource Boundary ADR Authoring Guide

This document defines the conventions for writing and maintaining the KJVOnly Resource Boundary Architecture Decision Records (ADRs).

The ADRs collectively define:

> **How an offline-first application uses Nostr to represent, publish, discover, resolve, install, synchronize, and archive application Resources.**

New ADRs must extend that specification without duplicating, contradicting, or silently redefining established decisions.

---

# Purpose

An ADR documents one significant Resource Boundary decision.

Each ADR should answer one specific Resource lifecycle question and define the invariant a compatible implementation must preserve.

Implementation mechanisms belong in separate implementation documentation.

---

# Resource Boundary Context

KJVOnly has one Application Architecture.

The Resource Boundary is one boundary within that architecture.

```text
Application
    Domain
        ↓
    Domain Object

========== Resource Boundary ==========

    Resource
        ↓
    Nostr Representation
        ↓
    Nostr Protocol / Relays
```

Use **Resource Boundary** rather than describing a separate **Resource Architecture**.

Domains retain ownership of application meaning when information crosses this boundary.

---

# Core Principles

Every Resource Boundary ADR should remain consistent with these principles.

* Offline-first.
* Domains own application meaning.
* Domain Objects are the application's internal working representation.
* Resources are independently identifiable units of externally distributable Domain information.
* Not every Domain Object must have a Resource representation.
* Nostr is the protocol being specified.
* Resource lifecycle responsibilities remain distinct.
* Accepted local state belongs to the application.
* Simplicity is preferred over unnecessary protocol complexity.

Two rules are especially important:

> **The network proposes. The application decides.**

and:

> **Accept locally first. Publish externally independently.**

---

# One Question Per ADR

Each ADR should answer one Resource Boundary question.

Examples:

```text
Domain Resource Model
    What is a Resource?

Data Distribution Strategy
    How is Resource content distributed?

Nostr Event Model
    How does Nostr represent Resources?

Nostr Resource Identity
    How is a Resource addressed?

Discovery Roots
    Where does open-ended discovery begin?

Resource Discovery
    How are Resource Representations found?

Resource Resolution
    How does a representation become verified content?

Resource Installation
    How does external information become accepted local state?

Outbox and Publishing
    How are offline local changes reliably published?

Multi-Device Synchronization
    How do offline clients reconcile Resource state?

Resource Archives
    How are Resources made portable?
```

Do not allow one ADR to become a general explanation of the entire Resource Boundary.

---

# Preferred ADR Structure

Unless there is a strong reason otherwise, use:

```text
Status

Problem

Decision

(optional decision-specific sections)

Specification Invariants

Scope

Big Takeaway
```

A **Relationship to Other ADRs** section may be added when useful, but an ADR should normally rely on direct cross-references rather than restating earlier decisions.

---

# Define Concepts Once

Every architectural concept has one authoritative home.

Later ADRs rely on that definition.

For example:

```text
Domain Resource Model
    defines Resource and Resource Representation

Nostr Event Model
    defines their Nostr mapping

Nostr Resource Identity
    defines Published Resource Identity

Discovery Roots
    defines open-ended discovery starting publishers

Resource Discovery
    defines how representations are located

Resource Resolution
    defines how serialized content is obtained and verified

Resource Installation
    defines acceptance of external information

Outbox and Publishing
    defines durable outbound publication

Multi-Device Synchronization
    defines LWW reconciliation

Resource Archives
    defines portable Resource collections
```

Do not redefine an earlier concept merely to make a later ADR self-contained.

Cross-reference it.

---

# Normative Language

Use normative language when the distinction affects compatibility.

Appropriate words include:

```text
MUST
MUST NOT
SHOULD
SHOULD NOT
MAY
```

For example:

> Resource Discovery MUST NOT install a Resource.

> Externally retrieved descriptor content MUST pass required integrity verification before Resolution succeeds.

> A client MAY retain relay provenance for diagnostics.

Do not force normative language into explanatory prose where no interoperability requirement exists.

---

# Nostr Is Part of the Specification

Nostr is not incidental implementation detail in this document series.

Protocol details belong in an ADR when they define the Resource Boundary contract.

Examples include:

* Nostr event kinds,
* publisher `pubkey`,
* `d` tags,
* `t` tags,
* `created_at`,
* event IDs,
* addressable-event semantics,
* relay filters,
* signed events,
* descriptor relationships,
* Blossom references,
* and integrity hashes.

Do not replace these decisions with generic abstractions merely because another protocol could theoretically implement a similar system.

---

# Architecture vs Implementation

The specification defines the behavior and invariants that compatible implementations preserve.

Implementation documentation defines how the current application realizes those decisions.

Examples of implementation mechanisms include:

* TypeScript interfaces,
* service classes,
* strategy registries,
* parser registries,
* repositories,
* IndexedDB object stores,
* Svelte lifecycle hooks,
* workers,
* library-specific APIs,
* retry schedulers,
* concrete DTOs,
* and source-directory organization.

The distinction is:

```text
Resource Boundary contract
    belongs in ADRs

Implementation mechanism
    belongs in implementation docs
```

A useful implementation mechanism may be documented without becoming a mandatory architectural layer.

---

# Architecture Before Implementation

Reason in this order:

```text
What Resource lifecycle problem is being solved?
        ↓
Which responsibility owns it?
        ↓
What invariant must be preserved?
        ↓
How does the Domain Resource Model apply?
        ↓
Which Nostr primitives express the decision?
        ↓
What offline behavior is required?
        ↓
Only then choose implementation
```

Do not begin architectural reasoning with:

```text
Which TypeScript service handles this?

Which worker runs it?

Which IndexedDB store holds it?

Which rx-nostr function should be called?

Which Svelte component triggers it?
```

Those questions belong after the architecture is understood.

---

# Local Authority

ADRs involving inbound information must preserve the acceptance boundary.

A network publication does not become accepted local state merely because it:

* exists,
* is newer,
* was returned by a relay,
* has a valid signature,
* or successfully resolves.

The general inbound lifecycle is:

```text
Resource Representation
        ↓
Resource Resolution
        ↓
Verified Resource Content
        ↓
Domain Interpretation
        ↓
Candidate Domain Object
        ↓
Domain Validation
        ↓
Installation Decision
        ↓
Accepted Local State
```

Do not allow another ADR to bypass this model without an explicit architectural decision.

---

# Installation and Persistence

Installation and persistence answer different questions.

Installation:

> **Should this externally represented information become accepted local state?**

Persistence:

> **How does accepted local state survive application execution?**

A Store, repository, IndexedDB object store, or adapter may implement persistence.

Those mechanisms do not become Resource Boundary concepts merely because Installation eventually causes durable state changes.

---

# Discovery and Resolution

Keep these responsibilities distinct.

```text
Discovery
    finds Resource Representations

Resolution
    obtains and verifies serialized Resource content
```

A reference to another Nostr Resource belongs to Discovery.

A descriptor referencing external content belongs to Resolution.

Do not silently combine relay discovery and external content retrieval into one architectural responsibility.

---

# Synchronization

Synchronization policy may compare Nostr `created_at` values and Domain `modifiedAt` values.

It must not redefine Resource Identity or bypass Installation.

For the established LWW model:

```text
modifiedAt
    =
created_at
```

provides logical write ordering.

It does not mean:

```text
newest relay event
    =
unconditional local authority
```

---

# Resource Archives

Resource Archives contain Resources.

Do not automatically turn an archive specification into a complete application backup format.

Runtime state, arbitrary UI settings, caches, installation bookkeeping, and other local-only information do not belong in a Resource Archive unless they deliberately have a Resource representation.

---

# Scope

Every ADR should explicitly state what it defines and what it does not define.

For example:

```text
This ADR defines:
    ...

It does not define:
    ...
```

Scope boundaries prevent lifecycle responsibilities from gradually bleeding into one another.

---

# Naming and Numbering

Resource Boundary ADR filenames use two-digit prefixes.

```text
00-resource-boundary-overview.md
01-domain-resource-model.md
...
11-resource-archives.md
```

Titles should use the same number:

```text
# ADR 04 — Nostr Resource Identity
```

Prefer responsibility names over implementation class names.

Good:

```text
Resource Resolution
Discovery Roots
Outbox and Publishing
Resource Archives
```

Avoid architectural ADR names such as:

```text
ResourceResolutionService
ArchiveStrategy
NostrWorker
IndexedDBResourceStore
```

---

# Terminology

Use terminology from `_glossary.md`.

When a genuinely new Resource Boundary concept is introduced:

1. define it in its owning ADR,
2. add it to the glossary,
3. reuse the same term consistently.

Do not create synonyms merely for stylistic variety.

---

# Diagrams

Use diagrams only when they communicate a relationship more clearly than prose.

Prefer one primary conceptual diagram per ADR.

Useful diagrams include:

* lifecycle transitions,
* boundary relationships,
* identity relationships,
* and protocol flows.

Avoid multiple diagrams that repeat the same rule.

---

# Writing Style

Write ADRs as concise protocol/application specifications.

Prefer:

* declarative language,
* present tense,
* precise terminology,
* short sections,
* explicit boundaries,
* and concrete protocol rules.

Avoid:

* implementation tutorials,
* historical narratives,
* speculative alternatives,
* repeated definitions,
* conversational filler,
* and lengthy explanations of simple decisions.

Concision is part of specification quality.

A revised ADR should normally remain the same length or become shorter unless genuinely new specification content requires expansion.

---

# Specification Invariants

Where useful, collect the ADR's compatibility requirements into a short **Specification Invariants** section.

This section should summarize rules already established by the ADR rather than introduce new decisions.

It should make it easy for a future implementation or reviewer to answer:

> **What must remain true even if the implementation changes?**

---

# Big Takeaway

End each ADR with the essential decision.

The Big Takeaway should not introduce new architecture.

It should leave the reader with one clear understanding of what responsibility the ADR owns and what invariant must survive implementation changes.

---

# Maintaining the Specification

When modifying Resource Boundary ADRs:

* preserve established terminology,
* preserve valid Nostr protocol decisions,
* avoid changing ownership boundaries unnecessarily,
* check dependent ADRs for contradictions,
* move implementation detail into implementation documentation instead of deleting useful design knowledge,
* update `_index.md` when ADRs are added, removed, renamed, or reordered,
* and update `_glossary.md` when authoritative terminology changes.

The Resource Boundary should evolve as one coherent specification rather than as independent documents.
