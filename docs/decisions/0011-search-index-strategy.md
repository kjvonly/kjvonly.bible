# ADR 0011 — Search Index Strategy

**Status**

Accepted

---

# Problem

Search is a core capability of KJVOnly.

Searching large resources such as Bible text, commentaries, or extensive note collections can be computationally expensive.

Rebuilding indexes every time the application starts wastes both time and device resources.

The architecture requires a consistent strategy for creating, storing, updating, distributing, and validating search indexes while remaining consistent with the application's resource-oriented design.

---

# Decision

Search indexes are treated as both derived data and resources.

Indexes are derived from application data, but once created they become reusable resources that may be stored locally, exported, imported, or published.

This allows expensive indexing work to be reused rather than repeated.

---

# Search Domain

Search is its own domain.

Each searchable content type has its own search resource.

Examples include:

```text
kjvonly/search/bible/kjv

kjvonly/search/notes/default

kjvonly/search/annotations/default

kjvonly/search/commentaries/matthew-henry
```

Each search resource may define its own indexing strategy while remaining part of the same architectural model.

---

# Resource Ownership

Search indexes follow the ownership of the resources they represent.

Examples:

```text
Bible Search Index
    Publisher-owned

Notes Search Index
    User-owned

Annotation Search Index
    User-owned

Shared Notes Index
    Publisher-owned
```

Publishers may distribute pre-built indexes alongside their resources.

Users may generate indexes for their own resources.

---

# Search Index Lifecycle

Search indexes are snapshots.

Each snapshot represents the indexed state of a resource set at a specific point in time.

```text
Resources

↓

Build Index

↓

Store Snapshot

↓

Search
```

Indexes are persisted and reused across application launches.

The application should not rebuild indexes unnecessarily.

---

# Incremental Updates

Locally generated indexes are updated incrementally.

Each index records the timestamp of the last successful indexing operation.

When resources change, the application applies only the changes that occurred after the stored timestamp.

```text
Existing Index

↓

Resource Changes

↓

Apply Changes

↓

Updated Index
```

This allows search indexes to remain current without requiring a complete rebuild after every modification.

---

# Snapshot Refresh

Incremental updates continue until a configurable threshold has been reached.

After sufficient changes have accumulated, the application creates a new snapshot of the updated index.

```text
Snapshot

↓

Incremental Updates

↓

Threshold Reached

↓

Create New Snapshot
```

This balances indexing performance with long-term storage efficiency.

---

# Validation

A search index is valid only for the resource set from which it was created.

Publisher-provided indexes may be validated using signatures, hashes, manifest metadata, or event identifiers.

Locally generated indexes are validated using their indexed timestamp together with the resources they represent.

If validation fails, the application should rebuild the index.

---

# Distribution

Search indexes participate in the same resource architecture as other application resources.

Indexes may be:

* Generated locally
* Exported
* Imported
* Published
* Downloaded

The architecture does not distinguish between search indexes and other resource types once an index has been created.

---

# Search Installation

Publisher-provided search indexes may be installed alongside their associated resources.

This allows users to begin searching immediately without waiting for expensive local indexing operations.

Locally generated indexes continue to evolve independently after installation.

---

# Offline First

Indexes are stored locally.

Once installed or generated, search continues to function without network connectivity.

The application should always prefer an existing local index over rebuilding one unnecessarily.

---

# Graceful Degradation

The application remains functional without search indexes.

If an index does not exist, the corresponding search capability is unavailable until an index has been installed or generated.

Search is an enhancement built on top of the resource architecture rather than a prerequisite for application functionality.

---

# Relationship to Resources

Search indexes are simply another resource.

Like any other resource, they have:

* A stable resource identifier
* Ownership
* Version information
* Validation
* Import/export support
* Installation support

Treating indexes as resources allows the application to reuse the same discovery, manifest, installation, and archive pipelines established throughout the architecture.

---

# Big Takeaway

Search indexes are derived resources.

They are created once, reused many times, updated incrementally, and distributed using the same resource-oriented architecture as every other application resource.

By treating search indexes as first-class resources, KJVOnly avoids unnecessary computation while preserving a consistent, offline-first architectural model.
