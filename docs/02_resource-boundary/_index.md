# Resource Boundary Specification Index

This directory contains the ADRs that define the KJVOnly **Resource Boundary**.

The Resource Boundary specifies:

> **How an offline-first application uses Nostr to represent, publish, discover, resolve, install, synchronize, and archive application Resources.**

The ADRs are intended to be read in order.

Each specification introduces or depends on concepts established earlier in the series.

---

# Specification Organization

```text
00  Resource Boundary Overview

01  Domain Resource Model
02  Data Distribution Strategy
03  Nostr Event Model
04  Nostr Resource Identity

05  Discovery Roots
06  Resource Discovery
07  Resource Resolution
08  Resource Installation Lifecycle

09  Outbox and Publishing
10  Multi-Device Synchronization
11  Resource Archives
```

The series progresses from the Resource model, through Nostr representation and identity, into the inbound and outbound Resource lifecycle.

---

# Reading Order

## Overview

| ADR | Title                      | Purpose                                                                                              |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| 00  | Resource Boundary Overview | Defines the purpose, principles, lifecycle, and organization of the Resource Boundary specification. |

---

## Resource Foundations

These ADRs establish the Resource model and its Nostr representation.

| ADR | Title                      | Purpose                                                                                                                         |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Domain Resource Model      | Defines Domain Objects, Resources, Resource Types, Representations, Classification, Granularity, and their relationships.       |
| 02  | Data Distribution Strategy | Defines how Resource content is distributed directly through Nostr or through externally stored descriptor content.             |
| 03  | Nostr Event Model          | Defines how Resource Representations map to Nostr events without making Nostr events part of the Domain model.                  |
| 04  | Nostr Resource Identity    | Defines Published Resource Identity as `kind + pubkey + d` and distinguishes Resource identity from event publication identity. |

---

## Inbound Resource Lifecycle

These ADRs define how externally available Resources become candidates for accepted local state.

| ADR | Title                           | Purpose                                                                                               |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 05  | Discovery Roots                 | Defines which publishers may serve as starting points for open-ended Resource Discovery.              |
| 06  | Resource Discovery              | Defines how Resource Representations are located from Nostr relays using known discovery information. |
| 07  | Resource Resolution             | Defines how a known Resource Representation produces verified serialized Resource content.            |
| 08  | Resource Installation Lifecycle | Defines how verified external Resource information may become accepted local application state.       |

---

## Publication, Synchronization, and Portability

These ADRs define how accepted local information participates in the external Resource lifecycle.

| ADR | Title                        | Purpose                                                                                        |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| 09  | Outbox and Publishing        | Defines durable offline-first publication of accepted local changes to Nostr.                  |
| 10  | Multi-Device Synchronization | Defines Last Write Wins reconciliation between independently operating offline clients.        |
| 11  | Resource Archives            | Defines portable `.kjva` Resource collections for transfer, preservation, sharing, and import. |

---

# Resource Boundary at a Glance

The Resource Boundary connects application-owned Domain information to its external Resource lifecycle.

```text
Application

Accepted Local Domain Information
        │
        │ outbound
        ↓
Resource
        ↓
Resource Representation
        ↓
Nostr Event
        ↓
Nostr Relays

        ↑
        │ inbound
        │

Discovery
    ↓
Resource Representation
    ↓
Resolution
    ↓
Verified Resource Content
    ↓
Domain Interpretation
    ↓
Candidate Domain Object
    ↓
Domain Validation
    ↓
Installation
    ↓
Accepted Local Domain Information
```

The application owns accepted local state.

Nostr provides external Resource publication and discovery.

---

# Core Contracts

The specification establishes several system-wide contracts.

## Resource Identity

```text
Published Resource Identity
    =
kind + publisher public key + d tag
```

The event `id` identifies one signed publication.

It does not create another Resource identity or revision system.

---

## Local Authority

External information does not automatically become application state.

> **The network proposes. The application decides.**

Discovery and Resolution may identify and verify Resource information.

Installation determines whether that information becomes accepted local state.

---

## Offline-First Publication

Local application behavior does not wait for Nostr publication.

```text
Local Domain Change
        ↓
Accepted Local State
        ↓
Durable Publication Intent
        ↓
Outbox
        ↓
Nostr Publication
```

> **Accept locally first. Publish externally independently.**

---

## Synchronization

Multi-device synchronization uses Last Write Wins.

```text
Domain modifiedAt
    =
Nostr created_at
```

The later valid write wins reconciliation for the same Published Resource Identity.

A newer network publication still follows the normal acceptance lifecycle.

---

## Resource Portability

Resource Archives make Resources portable without requiring live relay or external-storage access.

Archives preserve Resource boundaries and serialized Resource content.

They do not automatically include arbitrary application state that has no Resource representation.

---

# Outside This Specification

The Resource Boundary interacts with, but does not define:

* application persistence,
* Domain-specific search implementation,
* application startup,
* background execution scheduling,
* Workspace Runtime behavior,
* presentation,
* local-only settings,
* caches,
* and other implementation-specific application concerns.

Implementation documentation may define mechanisms such as:

* repositories,
* IndexedDB object stores,
* Resource Resolution strategies,
* Nostr event handlers,
* background workers,
* Outbox processors,
* and Resource Installation coordinators.

Those mechanisms implement the Resource Boundary but are not themselves Resource Boundary ADRs.

---

# Support Documents

The specification is accompanied by:

```text
_glossary.md
_adr-authoring-guide.md
```

`_glossary.md` provides concise definitions of Resource Boundary terminology.

`_adr-authoring-guide.md` defines conventions for extending and maintaining the specification.

---

# File List

```text
00-resource-boundary-overview.md
01-domain-resource-model.md
02-data-distribution-strategy.md
03-nostr-event-model.md
04-nostr-resource-identity.md
05-discovery-roots.md
06-resource-discovery.md
07-resource-resolution.md
08-resource-installation-lifecycle.md
09-outbox-and-publishing.md
10-multi-device-synchronization.md
11-resource-archives.md

_glossary.md
_adr-authoring-guide.md
_index.md
```

---

# Maintaining the Specification

When adding or modifying an ADR:

* keep it focused on one Resource Boundary responsibility,
* preserve existing Nostr contracts unless explicitly revising them,
* define concepts only in their authoritative ADR,
* avoid implementation details that do not affect compatibility,
* preserve offline-first and Local Authority principles,
* update this index when filenames or reading order change,
* and update the glossary when authoritative terminology changes.

The ADR series should remain readable as one progressively constructed Resource Boundary specification.
