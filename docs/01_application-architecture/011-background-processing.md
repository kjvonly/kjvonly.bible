# Background Processing

## Status

Current

---

# Purpose

This document defines how application work continues independently of the user's current interaction.

Its primary question is:

> **When should work execute in the background, and who owns that work while it does?**

Background Processing is an execution model, not a separate owner of application behavior. Moving work into the background changes when or where it executes; it does not change the responsibility that gives the work meaning.

---

# Background Processing Model

Some application work must complete immediately because the user is waiting for its result.

Other work can continue independently after the application is interactive.

Conceptually:

```text
Application Work
    │
    ├── Foreground
    │       Required for the current interaction
    │
    └── Background
            Can proceed independently
```

The distinction is about execution timing.

Ownership remains with the responsibility that defines the work.

---

# Ownership Does Not Move

A task does not become Background Processing-owned merely because it runs asynchronously, periodically, or in a worker.

For example:

```text
Bible search indexing
    → Bible Domain

Resource refresh
    → Resource Boundary

Workspace maintenance
    → Workspace Runtime

Notes indexing
    → Notes Domain
```

Any of these responsibilities may perform work in the background.

The owner still determines what the work means, when it is required, what constitutes success, and how its results affect application state.

Background execution only provides a way for that work to proceed without blocking the user's current interaction.

---

# Determining Whether Work Belongs in the Background

When introducing work that does not need to complete immediately, ask:

> **Does the user's current interaction require the result before it can continue?**

If yes, the work belongs on the foreground path.

If no, ask:

> **Can the work execute independently without changing the meaning of the current interaction?**

If so, it may be suitable for background execution.

For example:

```text
User opens John 3
    ↓
Chapter required now
    ↓
Foreground
```

while:

```text
New Bible Resources discovered
    ↓
Current interaction does not require them
    ↓
Background candidate
```

The goal is not to move as much work as possible into the background.

The goal is to keep work off the critical interaction path when the user does not need to wait for it.

---

# Foreground and Background Work

Foreground work satisfies the current interaction.

Background work improves, maintains, synchronizes, prepares, or completes application responsibilities independently of that interaction.

Conceptually:

```text
User Interaction
      ↓
Foreground Work
      ↓
Immediate Result


Background Work
      ↓
Application State Improves
      ↓
Future Interactions Benefit
```

The two execution paths may operate on related application state, but they should use the same architectural ownership and boundaries.

Background work should not create a second model of the application.

---

# Background Work After Startup

Startup establishes the minimum state required for the application to become interactive.

Work that is useful but not required for readiness should normally occur afterward.

Conceptually:

```text
Launch
    ↓
Startup
    ↓
Interactive Workspace
    ↓
Background Work
```

This keeps Startup focused on readiness rather than completeness.

A capability does not belong in Background Processing merely because it happens after Startup. Its owner remains the same; only its execution has been deferred.

---

# Background Work and Local State

Background work may improve or modify the application's accepted local state.

For example, it may:

* install newly accepted information,
* refresh existing information,
* maintain derived data,
* complete publication work,
* or perform deferred maintenance.

When that work changes application state, the normal rules of the owning responsibility still apply.

Conceptually:

```text
Background Execution
        ↓
Owning Responsibility
        ↓
Accepted State Change
        ↓
Persisted Local State
```

Background Processing does not bypass Domain rules, Resource Boundary acceptance, persistence semantics, or other architectural boundaries simply because the work is deferred.

---

# Resource Boundary Work

Several Resource Boundary responsibilities naturally benefit from background execution.

Examples may include:

```text
Resource discovery
Resource refresh
Resource installation
Resource publication
Synchronization
Retrying incomplete Resource operations
```

These remain Resource Boundary responsibilities.

Conceptually:

```text
Resource Boundary
    ↓
Resource Refresh
    ↓
Background Execution
```

not:

```text
Background Processing
    ↓
owns Resource Refresh
```

The Resource Boundary determines what should be discovered, installed, synchronized, or published.

Background execution allows those operations to proceed independently of the foreground interaction.

---

# Derived Data

Maintaining derived data is another common background activity.

For example:

```text
Notes Domain
    ↓
Notes
    ↓
Notes Search Index
    ↓
Background Update
```

The Notes Domain still gives the index meaning because Notes search defines what the index represents.

Likewise:

```text
Bible Domain
    ↓
Bible Content
    ↓
Bible Search Index
    ↓
Background Update
```

A shared indexing implementation or worker does not change that ownership.

Background execution simply allows expensive derived-data maintenance to happen without unnecessarily blocking application interaction.

---

# Responding to Background Changes

When background work changes accepted application state, other parts of the application may need to react.

Those reactions should use the same collaboration mechanisms used elsewhere in the architecture.

For example, an owner may communicate a meaningful state change through an Application Event:

```text
Background Work Completes
        ↓
Owner Accepts State Change
        ↓
Application Event
        ↓
Interested Consumers React
```

Background Processing should not directly manipulate active Module Instances simply because it produced the change.

The owner updates its state.

Normal application collaboration communicates the result.

---

# Scheduling Background Work

Background work may be triggered in different ways depending on the responsibility.

It may be:

* deferred after an interaction,
* triggered by an Application Event,
* performed periodically,
* performed opportunistically,
* resumed after interruption,
* or started when the application becomes idle enough to perform it.

The exact scheduler is an implementation detail.

The architectural decision is whether the work can execute independently and what conditions defined by its owner require it to run.

---

# Background Work Does Not Imply a Worker

"Background" describes the relationship between the work and the current interaction.

It does not mean the work must execute inside a Web Worker.

For example:

```text
Background Responsibility
        ↓
Execution Choice
        │
        ├── Main thread
        ├── Web Worker
        └── Future execution mechanism
```

A Web Worker is a Technical Infrastructure mechanism.

Whether one is appropriate depends on the implementation requirements of the work.

The architectural decision to defer work comes first.

---

# Failure and Retry

Background work should generally fail independently from unrelated application behavior.

If Resource refresh fails, the application should continue operating on its accepted local state whenever possible. If a search index update fails, unrelated Domains should continue functioning.

Whether failed work should retry is determined by the responsibility that owns the operation.

Conceptually:

```text
Owned Background Work
        ↓
Failure
        ↓
Owner determines
    ├── Retry
    ├── Supersede
    ├── Abandon
    └── Surface failure
```

Background execution provides the opportunity to perform retries later.

It does not define the retry semantics for every kind of work.

---

# Durable Background Work

Not every background task needs to survive application shutdown.

When background work must eventually complete even across restarts, ask:

> **Does the intent to perform this work need to be persisted?**

If yes, the owner must define the state necessary to resume or retry that responsibility.

For example, publication through an outbox requires durable intent because losing that intent would lose the application's pending publication work.

Other tasks may safely be rediscovered or recomputed after restart.

Background execution does not automatically imply durable task storage.

Durability follows the semantics of the work.

---

# Foreground Work Takes Priority

Background work exists to avoid unnecessary disruption to the current interaction.

It should therefore be designed so that maintenance, synchronization, indexing, or other deferred work does not unnecessarily prevent foreground behavior from proceeding.

Conceptually:

```text
Foreground
    Current user need
    Higher immediacy

Background
    Deferred application work
    Can yield or continue later
```

This does not require one universal scheduling policy.

It establishes the architectural intent that background work should remain independent from the interaction that made the application useful in the first place.

---

# Adding Background Work

When new functionality appears to require deferred processing, reason through it in order:

```text
What work needs to happen?
        ↓
Who gives that work meaning?
        ↓
Does the current interaction require the result?
        │
        ├── Yes → Foreground
        │
        └── No
             ↓
Can it execute independently?
        │
        ├── No → Keep it with the foreground workflow
        │
        └── Yes → Background candidate
             ↓
What triggers the work?
        ↓
What constitutes completion?
        ↓
What should happen if it fails?
        ↓
Must the pending work survive restart?
        ↓
Choose execution mechanism
```

Do not begin with:

```text
Should this use a Web Worker?

Should this go in a background queue?

Should this run every five minutes?
```

Those are implementation and scheduling questions.

First establish the responsibility, ownership, and execution requirements.

---

# Example: Refreshing Installed Resources

Suppose the application should discover newer representations of already installed Resources.

The meaning of that behavior comes from the Resource lifecycle.

Therefore:

```text
Refresh Installed Resources
        ↓
Resource Boundary
```

The current user interaction does not normally need to wait for every installed Resource to be refreshed.

The work can therefore execute in the background:

```text
Resource Boundary
    ↓
Resource Refresh
    ↓
Background Execution
    ↓
Candidate Resource
    ↓
Normal Validation and Acceptance
```

If a candidate is accepted, the resulting local-state change follows the normal Resource Boundary and application collaboration rules.

Background execution changes when the refresh happens.

It does not change how Resources become accepted local state.

---

# Example: Maintaining a Search Index

Suppose a new Note is created and the Notes search index must be updated.

The search behavior belongs to the Notes Domain:

```text
Notes Domain
    ↓
Note Created
    ↓
Notes Search Index Update
```

If the index does not need to be updated before the Note creation interaction can complete, that maintenance may happen in the background.

```text
Note Accepted
    ↓
Persist Note
    ↓
Interaction Completes

        meanwhile

Notes Domain
    ↓
Update Search Index
    ↓
Background Execution
```

The Notes Domain still owns the search behavior and derived data.

A worker, queue, or scheduling mechanism is chosen only after that ownership and timing decision has been made.

---

# Big Takeaway

Background Processing describes **when work executes**, not **who owns the work**.

A responsibility remains owned by the part of the application that gives it meaning whether it executes immediately, later, periodically, or in another execution context.

When considering background work, ask:

> **Does the current interaction need this result now?**

and then:

> **Who owns the work that can be deferred?**

Conceptually:

```text
Responsibility
    ↓
Ownership
    ↓
Execution Requirement
    │
    ├── Foreground
    └── Background
            ↓
      Execution Mechanism
```

Startup gets the application ready.

Foreground behavior satisfies the current interaction.

Background execution allows independently owned work to continue without unnecessarily blocking either one.

Execution changes.

Ownership does not.
