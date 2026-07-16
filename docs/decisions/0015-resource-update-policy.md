# ADR 0015 — Resource Update Policy

**Status**

Accepted

---

# Problem

Once a resource has been installed, the application must determine how future updates from the publisher are handled.

Users may wish to automatically receive updates for some resources while keeping others fixed at a specific version.

The architecture also supports users creating independent copies of publisher-owned resources.

These concepts must remain distinct.

---

# Decision

Resource installation, ownership, and update behavior are independent concerns.

Every installed resource defines its own update policy.

The default update policy is **Auto Sync**.

When Auto Sync is enabled, the application automatically installs newer versions published by the resource owner.

When disabled, the installed resource remains at its current version until the user explicitly updates it.

---

# Resource Lifecycle

A resource progresses through a simple lifecycle.

```text
Discovered

↓

Installed

↓

Auto Sync (optional)

↓

Fork (optional)
```

Each stage represents an independent architectural decision.

---

# Auto Sync

Auto Sync controls whether an installed publisher-owned resource automatically receives updates.

```text
Installed Resource

↓

Auto Sync = Enabled

↓

Publisher Update

↓

Automatic Installation
```

or

```text
Installed Resource

↓

Auto Sync = Disabled

↓

Publisher Update

↓

No Automatic Change
```

Auto Sync affects only update behavior.

It does not change ownership.

---

# Installation

Installation makes a resource available locally.

Installing a resource does not imply that future updates will be applied automatically.

Installation and update policy remain separate concerns.

---

# Ownership

Installing a resource never transfers ownership.

Publisher-owned resources remain owned by their publisher regardless of where they are installed.

Ownership changes only when a user creates a fork.

---

# Forking

Forking creates a new user-owned resource.

The application downloads the publisher's resource, recreates the event, signs it using the user's identity, and publishes it as a new resource.

The original publisher resource remains installed.

```text
Publisher Resource
        │
        ├── Installed
        │
        └── Fork
                │
                ▼
        User-Owned Resource
```

Both resources may exist simultaneously.

The publisher resource continues receiving updates according to its Auto Sync policy.

The fork is completely independent.

---

# Publisher Updates

When Auto Sync is enabled, publisher updates are discovered through manifest updates.

Updated resources are installed using the standard installation pipeline.

Updates are atomic.

The previous installed version remains active until the replacement has been successfully installed and validated.

---

# Manual Updates

Resources with Auto Sync disabled remain installed at their current version.

Users may manually install newer versions whenever they choose.

This allows users to keep stable versions of resources while remaining aware that newer versions exist.

---

# Dependencies

Resources installed automatically as dependencies inherit the Auto Sync policy of the parent resource.

This ensures dependent resources remain compatible as updates occur.

---

# Resource Removal

Removing a resource removes only that installed resource.

Removing a publisher resource does not remove any user-owned forks.

Likewise, removing a fork does not affect the original publisher resource.

The two resources are completely independent after the fork has been created.

---

# Relationship to the Architecture

Resource Update Policy builds upon the existing architecture.

```text
Trust

↓

Discovery

↓

Installation

↓

Update Policy

↓

Fork (optional)
```

The update policy determines how installed publisher resources evolve over time.

Forking creates new ownership without affecting the original installation.

---

# Big Takeaway

Installation, ownership, and updates are separate architectural concepts.

Installing a resource makes it available locally.

Auto Sync determines whether future publisher updates are installed automatically.

Forking creates an independent user-owned resource while leaving the original publisher resource intact and able to continue receiving updates.
