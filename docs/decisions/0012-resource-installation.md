# ADR 0012 — Resource Installation

**Status**

Accepted

---

# Problem

KJVOnly is built around publisher-owned resources discovered through manifests.

Once resources have been discovered, the application must install them into local domain stores while preserving offline-first behavior, maintaining resource integrity, supporting incremental updates, and allowing users to control what content is available offline.

The architecture requires a consistent installation model regardless of whether resources originate from a trusted publisher, an archive, or another supported source.

---

# Decision

Resource installation is a single, source-independent pipeline.

Resources may originate from:

* Trusted publishers
* Archive resources
* Local files
* Cached manifests
* Future resource sources

Once a manifest has been resolved, all resources follow the same installation process.

```text
Source
    │
    ▼
Manifest
    │
    ▼
Resolve Resources
    │
    ▼
Download
    │
    ▼
Verify
    │
    ▼
Install
    │
    ▼
Domain Stores
```

---

# Discovery, Installation, and Forking

The resource lifecycle intentionally separates discovery, installation, and ownership.

```text
Discovery

↓

Installation

↓

Fork (optional)
```

Discovery makes resources available.

Installation makes resources usable locally.

Forking creates a new user-owned resource that is independent of the original publisher.

Installing a resource never transfers ownership.

---

# Installation Units

Both bundled resources and individual resources are first-class installation targets.

Examples:

```text
kjvonly/bible/chapters/kjv

kjvonly/bible/chapters/kjv/43_3
```

This allows users to install an entire resource collection for offline use or retrieve individual resources on demand.

The same resource identifiers are used in both cases.

---

# Default Installation

The application publisher provides the default application resources.

These resources may be installed automatically during application initialization.

Resources from other trusted publishers are discovered automatically but installed on demand unless the user explicitly chooses otherwise.

This provides a usable application immediately while allowing users to control storage usage for optional content.

---

# Resource Dependencies

Resources may declare dependencies on other resources.

Dependencies must belong to the same publisher.

Required dependencies are installed automatically.

Optional dependencies enable additional functionality without preventing installation.

Examples include:

```text
Bible Text

↓

Search Index
```

and

```text
Bible Text

↓

Strong's Definitions
```

The application continues functioning if optional resources are unavailable, although the associated features may be disabled.

---

# Content Deduplication

Downloaded content is deduplicated using its content hash.

If multiple resources reference identical content, the application stores the blob once and reuses it.

```text
Same SHA-256

↓

Reuse Existing Blob

↓

Do Not Download Again
```

Resource ownership and metadata remain independent even when the underlying content is shared.

---

# Installation Validation

Resources are validated before installation.

Validation includes:

* Resource integrity
* Content hash verification
* Parser validation
* Domain-specific completeness checks where applicable

The manifest may describe expected metadata, such as record counts, allowing the installer to verify that installation completed successfully.

For example, a Bible resource may verify that every expected chapter has been installed.

Domain-specific validation remains the responsibility of the corresponding resource parser.

---

# Atomic Installation

Installation is atomic.

A resource is not considered installed until all required resources have:

* Been downloaded
* Passed integrity verification
* Been successfully parsed
* Passed validation
* Been committed to local storage

The previous installed version remains active until the new installation completes successfully.

Downloaded blobs may be retained temporarily during installation to support rollback if necessary.

---

# Updates

Installed publisher-owned resources receive updates automatically.

Before applying an update, the application may compare the currently installed manifest with the updated manifest to determine added, changed, and removed resources.

Applications that do not automatically install updates may present these differences to the user before proceeding.

Updates are applied atomically.

If installation of the updated manifest fails, the previous installation remains active.

---

# Resource Removal

When a manifest removes a resource, the application removes that installed resource during the next successful manifest update.

Users wishing to preserve a resource independently of its publisher should fork it before the publisher removes it.

---

# Uninstall

Resources may be uninstalled individually or as part of a manifest installation.

Removing a manifest removes the resources that were installed from that manifest.

Shared blobs are deleted only when no remaining installed resources reference them.

Uninstalling a resource does not remove:

* Notes
* Annotations
* Highlights
* Reading progress
* Other user-owned data

User-created content remains available even if the referenced publisher resource has been removed.

---

# Blob Lifecycle

Downloaded blobs exist only to support installation and validation.

```text
Download

↓

Verify

↓

Install

↓

Discard Blob
```

Blobs may be retained temporarily while an installation is in progress.

Once installation completes successfully, blobs may be discarded unless another installed resource still references the same content.

---

# Relationship to the Architecture

Resource installation does not introduce a separate architectural model.

It reuses the existing concepts established by previous ADRs.

```text
Manifest

↓

Resolve Resources

↓

Verify

↓

Install

↓

Domain Stores
```

Regardless of where resources originate, installation always follows the same pipeline.

---

# Big Takeaway

Resource installation transforms discovered resources into usable local application data.

By supporting bundles and individual resources, automatic dependency installation, atomic updates, shared content deduplication, and source-independent installation, KJVOnly maintains a simple, reliable, and offline-first installation model while preserving the publisher-oriented resource architecture.
