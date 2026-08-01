# Architecture Glossary

This glossary defines the architectural terminology used throughout the KJVOnly Architecture Decision Records (ADRs).

Terms are defined once and referenced consistently throughout the architecture.

---

# Domain

A logical area of the application that owns a related set of functionality.

A Domain owns:

- Domain Objects,
- Domain Object Factories,
- Resource Serializers,
- Domain Stores,
- and domain-specific application behavior.

Examples include Bible, Notes, Search, and Reading Plans.

---

# Resource

The unit of distribution.

A Resource represents application data that can be discovered, resolved, installed, synchronized, archived, or published.

Resources are independent of storage and transport.

---

# Published Resource

A Resource that has been serialized and made available for distribution.

Published Resources are exchanged between publishers, relays, archives, and devices.

---

# Published Resource Identity

The stable identity of a Published Resource.

A Published Resource Identity consists of:

- publisher,
- kind,
- and Resource Identifier.

It uniquely identifies a replaceable Resource publication.

---

# Resource Identifier

The application-defined identifier for a Resource.

Resource Identifiers uniquely identify Resources within a publisher.

Example:

```text
kjvonly/bible/chapters/kjv
```

---

# Resource Representation

Defines how Resource content is represented.

Representations determine how Resource content is obtained before becoming Domain Objects.

---

# Content Representation

A Resource Representation that contains the Resource content directly.

---

# Descriptor Representation

A Resource Representation that describes how Resource content can be obtained.

Descriptor Representations may reference one or more Resources.

---

# Resource Discovery

The process of locating Published Resources from one or more Discovery Roots.

---

# Discovery Root

A trusted starting point for Resource Discovery.

Discovery begins from one or more configured Discovery Roots.

---

# Resource Resolution

The process of converting a Resource Representation into serialized Resource content.

---

# Domain Object

The application's working representation of Resource content.

The application operates exclusively on Domain Objects.

---

# Domain Object Factory

Transforms serialized Resource content into Domain Objects.

The factory validates and constructs Domain Objects for its Domain.

---

# Domain Store

Persists Domain Objects for a Domain.

Domain Stores are the application's authoritative local data source.

---

# Resource Serializer

Transforms Domain Objects into serialized Resource content suitable for publication or archival.

---

# Resource Installation

The process of validating, transforming, and persisting Resource content into Domain Stores.

---

# Outbox

A persistent queue of pending publication operations.

The Outbox is responsible only for transporting outgoing changes.

---

# Multi-Device Synchronization

The process of reconciling local Domain Objects with remote Published Resources.

Synchronization follows the application's Last Write Wins policy.

---

# Resource Archive

A portable collection of serialized Resource content and application state.

Resource Archives support sharing, backup, and restoration.

---

# Search Index

A searchable representation derived from Domain Objects or installed as a Published Resource.

Search indexes accelerate queries but are never the source of truth.

---

# Application State

Local state that describes the user's application environment rather than Resource content.

Examples include settings, reading position, Discovery Roots, and installation metadata.

---

# Application Lifecycle

The sequence through which the application becomes ready for use while background processes continue independently.

---

# Last Write Wins

The conflict resolution policy used throughout the application.

When multiple versions of the same Domain Object exist, the version with the most recent `modifiedAt` timestamp becomes authoritative.

---

# Offline-First

An architectural principle in which the application remains functional using locally installed Domain Objects while network operations continue independently whenever connectivity is available.