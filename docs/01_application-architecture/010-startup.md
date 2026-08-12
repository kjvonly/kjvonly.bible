# Startup

## Status

Current

---

# Purpose

This document defines how KJVOnly transitions from application launch to an interactive Workspace.

Its primary question is:

> **What must be available before the application is considered ready, and what work can happen afterward?**

Startup coordinates the minimum initialization required for normal application behavior. It does not take ownership of the responsibilities it initializes, and it does not wait for unrelated background or remote work to complete.

---

# Startup Model

KJVOnly is offline-first.

Startup should therefore restore locally available application state and make the Workspace interactive without requiring current network access or completion of synchronization.

Conceptually:

```text
Application Launch
        ↓
Restore Required Local State
        ↓
Initialize Workspace Runtime
        ↓
Interactive Workspace
        ↓
Begin Deferred Work
```

The goal of startup is **readiness**, not completeness.

---

# Startup Is Coordination

Startup is a lifecycle, not a permanent architectural owner.

It coordinates initialization across responsibilities whose ownership already exists elsewhere in the Application Architecture.

For example:

```text
Startup

    Settings Domain
        restore required preferences

    Workspace Runtime
        restore or create Workspace

    Domains
        make required local state available

    Technical Infrastructure
        prepare required platform capabilities

    Background Processing
        begin deferred work when appropriate
```

Startup does not absorb these responsibilities.

The Settings Domain still owns settings. The Workspace Runtime still owns the Workspace. Domains still own Domain behavior and Domain Objects.

Startup only coordinates what must happen before the application can proceed.

---

# Determining Startup Work

Not everything that happens near application launch belongs to Startup.

When considering new initialization work, ask:

> **Must this complete before the user can meaningfully interact with the application?**

If yes, it may belong on the startup path.

If no, it should normally happen after readiness or when the capability is first required.

This distinction keeps startup from becoming a collection point for every initialization task in the application.

---

# Required State

Startup should restore or establish only the state required for the initial application experience.

This generally includes enough information to:

* apply required application settings,
* establish the active Workspace,
* restore or create its Runtime Objects,
* present an initial Module interaction,
* and access the local state required by that interaction.

The exact data required depends upon the Workspace being restored.

Startup should not load Domain information merely because the application may need it later.

---

# Restore Before Rebuild

Persisted state should be restored whenever it remains valid.

Conceptually:

```text
Persisted State
      ↓
Startup
      ↓
Restored Application
```

Startup should not unnecessarily reconstruct information that the application already persisted for reuse.

For example, a persisted Workspace can be restored rather than recreated from scratch. Likewise, valid locally available Domain Objects can remain available without being downloaded again before the application becomes usable.

Derived state follows the same principle when it can be safely restored. If rebuilding or refreshing derived information is not required for initial interaction, that work can occur later.

---

# Initial Workspace

The Workspace Runtime determines the Runtime state required for the active Workspace.

Startup asks the Workspace Runtime to restore an existing Workspace when possible or establish an initial Workspace when no restorable state exists.

Conceptually:

```text
Startup
    ↓
Workspace Runtime
    ↓
Restored Workspace
        or
Initial Workspace
```

The resulting Workspace follows the Runtime model defined in `002-workspace-runtime.md`:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
```

Startup does not need to understand or manipulate that internal structure itself.

The Workspace Runtime owns how the Workspace is reconstructed.

---

# Choosing the Initial Interaction

A new or unrestorable Workspace still requires an initial interaction.

That choice is application policy rather than a permanent property of Startup.

For example, the initial Module may be chosen from:

* restored application state,
* a previous reading location,
* a configured default,
* or another established startup policy.

The important architectural requirement is that Startup can establish an interactive Workspace without assuming that one specific Module must always be the starting point.

---

# Settings at Startup

Settings required to present the initial application correctly must be available before or during initial presentation.

For example, appearance settings should be applied early enough that the application does not first present one configuration and then unnecessarily switch to another.

The Settings Domain owns those preferences.

Startup only coordinates restoring the settings required for readiness.

Settings that do not affect initial interaction do not automatically belong on the critical startup path.

---

# Local State at Startup

Startup relies upon the application's accepted local state whenever possible.

It should not require externally available Resources merely to reconstruct information that is already installed locally.

Conceptually:

```text
Persisted Local State
        ↓
Restore
        ↓
Interactive Application
```

If an active Module later requires a Domain Object that is not locally available, it requests that information through the normal Data Access path.

Startup should not preemptively become a separate data-retrieval system.

---

# Remote Capabilities

Remote capabilities should not normally determine whether the application can start.

Resource discovery, remote synchronization, publication, relay availability, and similar work may be important to the running application, but they are not prerequisites for presenting locally available state.

Conceptually:

```text
Local State
    ↓
Interactive Application

        meanwhile

Remote Capabilities
    ↓
Resource Boundary / Background Work
```

The application may initialize technical capabilities needed for later remote work, but network success should not become a readiness requirement unless a future capability genuinely cannot operate locally.

Nostr, Blossom, relay connections, and authentication protocols are implementation concerns beneath the appropriate architectural responsibilities rather than Startup concepts.

---

# Application Readiness

The application is ready when the user can meaningfully interact with the restored or initial Workspace.

Readiness does not require the application to be globally up to date.

For example, readiness should not normally wait for:

* every Resource to be discovered,
* every installed Domain Object to be refreshed,
* synchronization to complete,
* every derived index to be rebuilt,
* publication queues to drain,
* or remote systems to become available.

Those activities can continue after readiness when their owners require them.

---

# Critical and Deferred Work

Startup work should be divided according to whether it blocks readiness.

```text
Application Launch
        ↓
Critical Startup Work
        ↓
Interactive
        ↓
Deferred Work
```

Critical work is necessary to create a usable application session.

Deferred work improves, refreshes, synchronizes, or prepares the application after that point.

The distinction should be based on user-visible readiness rather than on when the implementation happens to call a function.

---

# Background Processing

Once the application is interactive, deferred work may continue through Background Processing.

Examples may include:

* refreshing locally installed information,
* synchronization,
* indexing,
* maintenance,
* or other non-blocking work.

Conceptually:

```text
Startup
    ↓
Interactive Application
    ↓
Background Processing
```

Moving work to Background Processing does not change ownership of that work.

A Bible indexing task remains Bible-owned. Resource synchronization remains associated with the Resource Boundary. Background Processing only changes when or where the work executes.

---

# Startup Failures

Startup should distinguish between failures that prevent meaningful interaction and failures in optional capabilities.

For example, inability to reconstruct any usable Workspace may be a startup failure.

By contrast, failure to reach a relay should not prevent locally available Bible content, Notes, Reading Plans, or Workspace state from remaining usable.

Conceptually:

```text
Initialization Failure
        ↓
Required for Readiness?
     /           \
   Yes            No
    ↓              ↓
Startup        Isolate Failure
Cannot        Continue Locally
Complete
```

Failures should remain associated with the responsibility that produced them rather than turning Startup into the long-term error manager for the application.

---

# Avoid Growing the Startup Path

New functionality should not automatically add new startup work.

For every proposed startup dependency, ask:

> **Why must this happen before the Workspace becomes interactive?**

If the answer is simply that the capability will eventually be needed, it probably does not belong on the startup path.

Prefer:

```text
Launch
    ↓
Restore minimum state
    ↓
Interactive
    ↓
Initialize when required
```

over:

```text
Launch
    ↓
Initialize everything the application might use
    ↓
Interactive
```

This keeps startup bounded as the application grows.

---

# Adding a Startup Requirement

When adding functionality that appears to require initialization, reason through it in order:

```text
What capability is being initialized?
        ↓
Who owns that capability?
        ↓
Does it require initialization at all?
        ↓
Must initialization complete before meaningful interaction?
        │
        ├── No → Defer or initialize on demand
        │
        └── Yes
             ↓
What is the minimum state required?
        ↓
Can that state be restored locally?
        ↓
What happens if initialization fails?
        ↓
Add only the required work to Startup
        ↓
Choose implementation
```

The first question should not be:

```text
Should this go in onMount()?

Should this run from +page.svelte?

Should Startup connect to the relay?
```

Those are implementation questions.

First determine whether the capability belongs on the startup path at all.

---

# Example: Adding a New Domain

Suppose a new Domain is introduced.

Its existence does not automatically mean Startup must initialize the entire Domain.

Ask whether the initial Workspace requires its information or behavior.

If it does not:

```text
Application Launch
    ↓
Existing Startup Requirements
    ↓
Interactive Workspace
    ↓
New Domain initialized when required
```

If the active Workspace contains a Module backed by that Domain, Startup coordinates enough restoration for that Module to become usable.

The Domain still owns its behavior and state.

Startup only ensures that the required owner can participate in the initial application session.

---

# Big Takeaway

Startup is the transition from an unloaded application to an interactive Workspace.

Its job is to coordinate the **minimum required initialization** while preserving ownership of every responsibility it touches.

The central decision is:

> **Must this complete before the user can meaningfully interact with the application?**

If yes, Startup may coordinate it.

If no, defer it, initialize it on demand, or allow its existing owner to perform it after readiness.

Conceptually:

```text
Launch
    ↓
Restore Required Local State
    ↓
Initialize Required Owners
    ↓
Interactive Workspace
    ↓
Deferred and Background Work
```

Startup restores rather than rebuilds.

It prefers local state over remote dependencies.

It does not take ownership from the responsibilities it initializes.

Once readiness is reached, Startup is complete.
