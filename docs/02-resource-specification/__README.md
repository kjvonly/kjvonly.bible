# Portable Ownership Architecture (POWN)

## An Architectural Style for Building Offline-First Decentralized Applications on Nostr

---

# Introduction

Modern applications typically own their users' data.

Application data is commonly stored in application-specific databases, accessed through application-specific APIs, and tightly coupled to the application's backend infrastructure. Although users may be able to export their information, true ownership rarely exists. Moving to another application often requires migration, transformation, or abandoning existing data altogether.

Decentralized protocols such as Nostr fundamentally change this relationship.

Rather than placing applications at the center of the system, Nostr places events and identities at the center. Data can exist independently of any individual application and can be published, discovered, and synchronized through decentralized infrastructure.

However, Nostr intentionally provides only the protocol.

It defines how events are published and exchanged but deliberately avoids defining how applications should organize, identify, discover, install, or manage application-specific data.

Portable Ownership Architecture (POWN) exists to fill that gap.

POWN is an architectural style for building offline-first decentralized applications on top of Nostr. Rather than replacing Nostr, POWN defines a consistent application model for representing Domain Objects using Nostr's replaceable events and related decentralized services.

The goal is not to standardize applications.

The goal is to standardize how applications participate in a decentralized ecosystem while allowing each application complete freedom over its own runtime behavior and user experience.

---

# Motivation

The central idea behind POWN is simple.

> **Users should own their data—not the application, not the backend service, and not the storage provider.**

Traditional applications generally treat exported data as an afterthought.

POWN treats portability as a fundamental architectural property.

Applications become temporary participants in the lifecycle of user data rather than permanent custodians of it.

This changes the relationship between users and software.

Users should be free to:

* change applications without losing information,
* change relay providers,
* change storage providers,
* work offline,
* share information publicly,
* install information published by others,
* create local copies,
* modify those copies,
* and republish them independently.

Applications remain responsible for providing the best possible user experience.

Ownership remains with the user.

---

# Relationship to Nostr

POWN intentionally builds upon the Nostr protocol.

Nostr already provides many of the capabilities required for decentralized applications, including:

* decentralized identities,
* replaceable events,
* event publication,
* decentralized discovery,
* relay infrastructure,
* and event synchronization.

POWN does not replace these capabilities.

Instead, it defines a consistent architectural style for using them to build offline-first applications.

Much as REST defines an architectural style for building applications on top of HTTP, POWN defines an architectural style for building applications on top of Nostr.

Nostr defines how events are exchanged.

POWN defines how applications should represent, organize, publish, discover, install, synchronize, and reconstruct Domain Objects using those events.

---

# Architectural Philosophy

POWN is built around one fundamental idea:

> **Portable Ownership**

Domain Objects should be capable of existing independently of the application currently using them.

Applications should be replaceable.

Service providers should be replaceable.

Transport mechanisms should be replaceable.

The user's ownership of their information should remain unchanged.

Applications therefore become consumers and producers of portable Domain information rather than permanent owners of it.

This architectural philosophy influences every decision within the specification.

---

# Core Architectural Ideas

Several ideas appear consistently throughout the POWN specification.

## Domain Objects

Applications own Domain Objects.

Domain Objects represent application meaning.

They exist only within the application's runtime.

Applications remain completely free to organize, optimize, cache, index, and present Domain Objects in whatever manner best serves the user experience.

POWN intentionally places no restrictions on internal application architecture.

---

## Published Resources

When Domain Objects leave the application they are represented as portable Resources.

Resources provide a standardized representation suitable for publication, discovery, installation, synchronization, and long-term persistence.

Resources are the exchange format between applications.

They are not runtime objects.

---

## Portable Ownership

Published Resources belong to their publisher rather than to any individual application.

Applications may discover Resources, install them locally, modify them, and publish new Resources derived from them.

Ownership is therefore independent of any specific application implementation.

---

## Offline-First

Applications are expected to install Resources into local Domain Objects.

Once installed, the application should continue to operate regardless of network availability.

Communication with decentralized infrastructure becomes a background concern rather than a runtime dependency.

Offline operation is therefore a consequence of the architectural style rather than an independent feature.

---

## Independent Applications

Applications implementing POWN remain free to provide entirely different user experiences while consuming the same published Resources.

The architectural style standardizes portable data.

It intentionally does not standardize application behavior.

---

# What POWN Defines

The POWN specification defines a consistent application model for using Nostr as a decentralized application platform.

The specification defines concepts including:

* Resource Identity
* Resource Representations
* Discovery
* Resolution
* Installation
* Publication
* Persistence
* Synchronization
* Resource Lifecycle
* Domain Object creation

Together these concepts define how portable application data behaves throughout its lifecycle.

---

# What POWN Does Not Define

POWN intentionally avoids defining application implementation.

The specification does not define:

* user interface design,
* application architecture,
* runtime behavior,
* presentation,
* programming languages,
* frameworks,
* local persistence implementation,
* search implementation,
* or transport implementation details beyond the capabilities required by the architectural style.

These responsibilities remain the responsibility of individual applications.

---

# Reading the Specification

The remainder of the POWN documentation defines the architectural style in detail.

Each document describes one aspect of the model.

Together they form the complete specification.

The recommended reading order is:

1. Resource Identity
2. Resource Representations
3. Discovery
4. Resolution
5. Installation
6. Persistence
7. Publication
8. Synchronization
9. Resource Lifecycle
10. Domain Object Integration

Each document builds upon the concepts established by the previous documents.

Applications implementing POWN should treat the specification as a cohesive architectural model rather than as a collection of independent features.

---

# Summary

Portable Ownership Architecture (POWN) is an architectural style for building offline-first decentralized applications on top of the Nostr protocol.

Rather than defining a new protocol, POWN defines a consistent application model for representing Domain Objects as portable Resources using Nostr's decentralized event model.

Applications remain free to innovate.

Infrastructure remains replaceable.

Users remain the long-term owners of their information.

That is the central goal of POWN.
