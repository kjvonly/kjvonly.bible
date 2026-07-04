# ADR 0010 — Import / Export Format

**Status**

Accepted

---

# Problem

KJVOnly needs a portable way to move data between devices, create backups, share selected resources, and bootstrap application state.

Earlier versions of the application exported IndexedDB data directly as JSON.

That approach worked as an implementation shortcut, but it treated import/export as a separate system from the rest of the architecture.

The architecture now has a resource-oriented model built around manifests, resources, verification, resolution, and installation.

Import/export should reuse that model rather than introduce a second backup-specific format.

---

# Decision

An export is an **Archive Resource**.

An Archive Resource is a portable collection of resources described by a manifest.

```text
Archive Resource
    │
    ▼
Manifest
    │
    ▼
Resources
```

The archive may be saved locally, transferred between devices, imported into the application, or published as a Nostr resource.

Import does not use a separate installation path.

Imports are processed through the same manifest and resource installation pipeline used by normal application bootstrap and resource discovery.

---

# Archive Structure

An export archive contains:

```text
Export Archive
  ├─ Manifest
  ├─ Domain Data
  ├─ Resource Metadata
  ├─ Optional Large Resources
  ├─ Optional Search Indexes
  └─ Signature
```

The manifest describes the contents of the archive.

Each included resource may define:

```text
resource id
domain
resource type
version
hash
provenance
location inside archive
```

The archive is therefore not an IndexedDB dump.

It is a manifest with associated resources.

---

# Manifest Reuse

Import/export reuses the same architectural concepts as resource discovery and installation.

```text
Source
    │
    ▼
Manifest
    │
    ▼
Verify
    │
    ▼
Resolve Resources
    │
    ▼
Install
    │
    ▼
Domain Stores
```

The source may be:

```text
Trusted Publisher

Export Archive

Local File

Future Source
```

The client should not need separate logic for each source once a manifest has been read.

---

# Embedded and Referenced Resources

An archive may include resources directly, or it may reference resources available elsewhere.

Embedded resources are stored inside the archive.

Referenced resources are described by the manifest but resolved through the normal resource resolution pipeline.

This allows multiple archive styles without creating multiple formats.

```text
Full Archive
    Everything embedded

Portable Archive
    Some embedded resources, some referenced resources

Manifest-Only Archive
    Only resource references
```

All three are the same format.

They differ only in packaging.

---

# Export Scope

Exports may be full or partial.

A full export may include all application data needed to bootstrap a user on another device.

A partial export may include selected domains or selected resources.

Examples include:

```text
All data

Notes

Filtered notes

Annotations

Reading progress

Search indexes

Installed resources
```

Notes may be filtered by title, text, tags, or other domain-defined criteria before export.

Annotations may be exported as a complete domain set.

---

# Search Indexes

Search indexes are valid exportable resources.

Although search indexes are derived data, they may be expensive to rebuild.

The architecture therefore allows indexes to be exported, imported, verified, and installed like other resources.

An imported search index should only be used when it is signed or its hash matches the resources it indexes.

If validation fails, the index should be discarded or rebuilt.

---

# Provenance

Exports preserve provenance.

When a resource is exported, the archive should retain information about where it came from, including publisher identity, resource id, version, hash, and event metadata where available.

Importing a resource does not erase its origin.

This allows the application to distinguish between:

```text
Original Publisher Resource

Imported Copy

User-Owned Fork
```

---

# Import Behavior

Import begins by reading the archive manifest.

The application should verify the archive signature and resource integrity before applying changes.

Imports should support a preview step showing what data will be added, updated, or skipped.

After confirmation, resources are installed through the normal resource installation pipeline.

The default merge strategy is Last Write Wins.

Domains may define additional merge behavior where needed.

---

# User-Owned Data

User-owned data may be included in an export.

Examples include:

```text
Notes

Highlights

Annotations

Reading progress

Subscriptions

Trusted publishers

Settings
```

Exporting user-owned data does not automatically publish it.

It only packages the data into an archive.

---

# Signing

Exports are signed as a whole archive.

The archive signature verifies the integrity and authorship of the exported package.

Existing resource signatures and provenance should still be preserved where available.

Signing the archive does not transfer ownership of the contained resources.

---

# Encryption

The archive format may support encryption.

Encryption is optional and may be introduced or expanded in future architectural decisions.

The format should leave room for encrypted archives without changing the core manifest-plus-resources model.

---

# Republishing

Imported resources are restored locally.

They are not automatically republished.

If a user wants to publish an imported resource as their own, they must create a new copy and sign it with their own key.

This creates a new user-owned resource rather than modifying the original publisher's resource.

---

# Relationship to Nostr

An export archive may be represented as Nostr content.

The archive content may be JSON, hex-encoded, and published as a Nostr event or referenced from a Nostr event.

When published, the archive itself becomes another discoverable resource.

---

# Big Takeaway

Import/export is not a separate backup system.

An export archive is a manifest with associated resources.

By treating archives as resources, KJVOnly reuses the same manifest, verification, resolution, and installation pipeline used everywhere else in the application.

This keeps the architecture simple, consistent, portable, and offline-first.
