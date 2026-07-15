# ADR 0014 — Application Lifecycle

**Status**

Accepted

---

# Problem

KJVOnly is an offline-first application that synchronizes resources over Nostr.

The application must provide a responsive user experience while simultaneously performing background work such as resource discovery, installation, synchronization, search indexing, and update checking.

The architecture requires a consistent application lifecycle that prioritizes immediate usability while allowing long-running tasks to execute independently.

---

# Decision

The application becomes usable as soon as the current reading context and its required dependencies are available.

All remaining work occurs independently in the background.

The application should never delay rendering while waiting for synchronization, updates, or optional resources.

---

# Application Startup

Application startup follows a consistent sequence.

```text
Open Application
        │
        ▼
Open IndexedDB
        │
        ▼
Run Migrations
        │
        ▼
Ensure Application Publisher Trusted
        │
        ▼
Resolve Current Reading Resource
        │
        ▼
Resolve Required Dependencies
        │
        ▼
Render Application
        │
        ▼
Start Background Services
```

Rendering begins as soon as the current reading context is available.

The application does not wait for complete resource installation before becoming usable.

---

# First Launch

During the first application launch, the application publisher provides the initial bootstrap resources.

The application ensures the application publisher exists within the trusted publisher list.

The application may automatically install its default resources.

For the initial implementation, the application publisher's manifest may be downloaded and installed automatically.

Future implementations may optimize startup by installing only the immediate reading context before continuing background installation.

---

# Reading Context

The application starts from a predefined or previously viewed reading location.

The startup pipeline is:

```text
Reading Location

↓

Check Domain Store

↓

Resolve Resource

↓

Install if Needed

↓

Render
```

This allows chapter-level resources to provide immediate rendering while larger resources continue downloading in the background.

---

# Required Dependencies

Resources required to render the current reading context are resolved automatically.

Examples include:

* Bible text
* Book metadata
* Chapter metadata
* Rendering overlays required for the current view

Optional resources such as search indexes or Strong's data are not required for application startup.

---

# Background Services

Once the application has rendered, independent background services begin.

Examples include:

* Manifest discovery
* Resource installation
* Resource updates
* Outbox synchronization
* Search index generation
* Search index refresh
* Optional resource downloads

These services execute independently without blocking user interaction.

---

# Offline Startup

Offline startup relies entirely upon previously installed resources.

If the required reading resources exist locally, the application behaves normally.

If a requested resource has not yet been installed and no network connection is available, that resource cannot be resolved until connectivity returns.

The remainder of the application continues functioning using available local resources.

---

# Interrupted Installation

Resource downloads may be interrupted by application termination or device failure.

Downloaded blobs are staged until installation completes successfully.

On startup the application checks for previously downloaded blobs before downloading resources again.

```text
Restart

↓

Check Staged Blobs

↓

Reuse Existing Downloads

↓

Download Missing Resources

↓

Install
```

This minimizes unnecessary network activity while preserving atomic installation.

---

# Search

Search indexes are restored or updated independently of application startup.

Search work may execute in background workers.

If an index is unavailable, the application may offer to install or generate the required search resource.

Search never blocks application startup.

---

# Synchronization

Synchronization begins after the application is ready.

The Outbox resumes automatically.

Manifest discovery, update checking, and synchronization occur independently of the user interface.

Changes are reflected through updates to the domain stores.

---

# Resource Validation

Resource hashes are validated when content is downloaded.

Previously installed resources are not revalidated during every application startup.

Integrity validation occurs during installation rather than application launch.

---

# Application State

The application maintains a simple lifecycle.

```text
Initializing

↓

Ready
```

Once the application reaches the Ready state, multiple background activities may execute simultaneously.

Examples include:

* Downloading
* Synchronizing
* Updating
* Indexing
* Offline operation

These are independent service states rather than mutually exclusive application states.

---

# Relationship to the Architecture

Application startup coordinates previously defined architectural concepts.

```text
Trusted Publishers

↓

Manifest Discovery

↓

Resource Resolution

↓

Installation

↓

Domain Stores

↓

Background Services
```

The lifecycle introduces no new architectural concepts.

It orchestrates the existing resource-oriented architecture into a consistent application startup experience.

---

# Big Takeaway

The application becomes usable as quickly as possible.

Only the resources required for the current reading context participate in startup.

Everything else—including synchronization, updates, indexing, and optional resource installation—continues independently in the background, preserving both responsiveness and the offline-first design of the application.
