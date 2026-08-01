# ADR 0009 — Discovery Roots

**Status**

Accepted

---

# Problem

Resource Discovery requires one or more starting points.

Discovering Resources from every publisher on the network is neither practical nor desirable.

The architecture requires a mechanism for defining which publishers should participate in Resource Discovery without coupling that decision to installation, synchronization, or ownership.

---

# Decision

KJVOnly introduces the concept of a **Discovery Root**.

A Discovery Root is a publisher from which the application begins Resource Discovery.

Discovery Roots define where discovery starts.

They do not imply:

- installation,
- Resource Auto Sync,
- ownership,
- authenticity,
- or endorsement.

Those concerns are defined by other ADRs.

---

# Discovery Relationship

Discovery begins from one or more Discovery Roots.

```mermaid
flowchart LR

    ROOT["Discovery Root"]

    ROOT --> DISCOVERY["Resource Discovery"]

    DISCOVERY --> RESOURCE["Published Resources"]
```

A publisher that is not a Discovery Root does not participate in normal Resource Discovery.

---

# Establishing Discovery Roots

The architecture intentionally separates **how Discovery Roots are established** from **how Resource Discovery operates**.

Discovery Roots may be established by:

- explicit user configuration,
- the application's default configuration,
- a Nostr follow list,
- a web-of-trust model,
- or future discovery mechanisms.

Regardless of how they are established, Resource Discovery always begins from the resulting set of Discovery Roots.

---

# Discovery Scope

Discovery Roots apply to publishers.

They do not apply to individual Resources.

All Resources published by a Discovery Root become eligible for Resource Discovery.

Whether those Resources are installed is determined independently by the Resource Installation Lifecycle.

---

# Application Discovery Root

The application includes a default Discovery Root used during application bootstrap.

This publisher provides the Resources required for the application to initialize.

Additional Discovery Roots may be added independently.

---

# Removing Discovery Roots

A Discovery Root may be removed at any time.

Removing a Discovery Root prevents future Resource Discovery from that publisher.

It does not:

- uninstall previously installed Resources,
- remove Domain Objects,
- disable Resource Auto Sync,
- or affect publisher ownership.

Those behaviors are defined by other ADRs.

---

# Cross-Publisher Resources

Resources may reference Resources published by other publishers.

Such references do not automatically establish additional Discovery Roots.

Each publisher participates in Resource Discovery only if it is a Discovery Root.

---

# Relationship to Other ADRs

This ADR defines where Resource Discovery begins.

It relies on:

- **ADR 0004** — Nostr Resource Identity
- **ADR 0005** — Resource Discovery

It intentionally does not define:

- Resource Installation,
- Resource Auto Sync,
- publishing,
- synchronization,
- or local persistence.

---

# Scope

This ADR defines:

- Discovery Roots,
- how discovery begins,
- discovery boundaries,
- and removal of Discovery Roots.

This ADR does not define:

- Resource Discovery,
- Resource Installation,
- Resource Auto Sync,
- publishing,
- or synchronization.

---

# Big Takeaway

Discovery begins from one or more Discovery Roots.

How those Discovery Roots are established is independent of how Resource Discovery operates, allowing the architecture to support manual configuration, Nostr follow lists, web-of-trust models, and future discovery mechanisms without changing the discovery pipeline.

```mermaid
flowchart LR

    ROOTS["Discovery Roots"]

    ROOTS --> DISCOVERY["Resource Discovery"]

    DISCOVERY --> INSTALL["Resource Installation"]

    INSTALL --> APPLICATION["Application"]
```