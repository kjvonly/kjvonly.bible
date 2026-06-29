# ADR 0009 — Trusted Publishers

**Status**

Accepted

---

# Problem

KJVOnly is built around publisher-owned resources distributed over Nostr.

Resources are not discovered through public search.

Instead, discovery begins from publishers that the user has explicitly chosen to trust.

The architecture requires a consistent trust model that determines where resource discovery begins while remaining independent of how publishers are found or verified.

---

# Decision

The application adopts a binary trust model.

A publisher is either trusted or not trusted.

Trust grants the application permission to discover resources published by that publisher.

Trust does not automatically install resources.

Resource installation remains an independent user decision.

---

# Trust Enables Discovery

Trusted publishers form the starting point for resource discovery.

The application discovers manifests and resources only from publishers that exist in the user's trusted publisher list.

```text
Trusted Publisher

↓

Manifest Discovery

↓

Available Resources
```

Trust determines **who** the application may discover resources from.

It does not determine which resources become part of the local application.

---

# Subscription Enables Installation

Discovery and installation are intentionally separate concerns.

After resources have been discovered, users choose which resources they wish to install.

Subscriptions are managed independently for each resource domain.

For example, a user may subscribe to:

* Reading plans
* Notes
* Pericopes
* Themes

without subscribing to every resource published by that publisher.

This separation allows users to trust a publisher while installing only the resources that are relevant to them.

```text
Trusted Publisher

↓

Discover Resources

↓

Subscribe to Resource Domain

↓

Install Resources
```

---

# Binary Trust

Trust is intentionally simple.

A publisher is either:

* Trusted
* Not Trusted

The architecture does not define trust levels or categories.

Additional metadata, such as whether a publisher represents an individual, organization, church, or community, is informational and does not affect the trust model.

---

# Publisher Discovery

The architecture intentionally does not define how publishers are discovered.

A trusted publisher may be added through any implementation-defined discovery mechanism, including manual entry, QR codes, application features, or future discovery methods.

Regardless of how a publisher is discovered, trust is always an explicit user decision.

---

# Application Publisher

The application includes a built-in publisher that serves as the initial trust anchor.

During first-run initialization, the application ensures this publisher exists within the user's trusted publisher list.

The application's public key is embedded within the application and provides the starting point for resource discovery.

After initialization, the application publisher behaves like any other trusted publisher.

---

# Revoking Trust

Trust may be revoked at any time.

Revoking trust immediately stops future resource discovery and updates from that publisher.

Previously installed resources remain installed until the user explicitly removes them.

This prevents unexpected data loss while allowing users to stop receiving future publications.

---

# Resource Ownership

Resources always remain owned by their publisher.

Ownership is determined by the publisher's public key together with the resource identifier.

Installing a resource does not transfer ownership.

If a user wishes to modify a publisher's resource, they create their own published version rather than altering the original.

---

# Publisher Metadata

Publisher information is treated as another resource within the system.

Information such as:

* Display name
* Profile picture
* Biography
* Contact information

may be discovered, cached, and updated using the same resource-oriented architecture as other application data.

The trust model does not depend upon publisher metadata.

---

# Verification

Publisher verification is intentionally outside the scope of this ADR.

Verification answers whether a publisher's identity can be confirmed.

Trust answers whether the user wishes to receive resources from that publisher.

These are separate architectural concerns.

Future architectural decisions may introduce verification mechanisms without changing the trust model.

---

# Publisher Dependencies

Resources do not depend on trust relationships between publishers.

If users wish to modify or extend another publisher's work, they publish their own resource rather than creating publisher dependency chains.

This keeps ownership explicit and prevents hidden trust relationships between publishers.

---

# Schema

The implementation may persist trusted publishers using any suitable storage model.

This ADR intentionally defines only the architectural concept of trusted publishers rather than a specific database schema.

---

# Big Takeaway

Trust is the foundation of resource discovery.

A trusted publisher gives the application permission to discover resources.

Subscriptions determine which of those discovered resources become part of the local application.

By separating trust from installation, the architecture remains simple, explicit, and fully aligned with the application's resource-oriented and offline-first design.
