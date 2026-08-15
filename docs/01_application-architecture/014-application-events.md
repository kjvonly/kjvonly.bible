# Application Events

## Status

Current

---

# Purpose

This document defines how independently owned parts of the application communicate that meaningful changes have occurred.

Its primary question is:

> **When should one owner announce a change through an Application Event rather than directly request behavior from another owner?**

Application Events provide observation without transferring ownership. They allow interested consumers to react to changes without requiring the producer to know who those consumers are.

---

# Application Event Model

An Application Event represents a meaningful application change that has already occurred.

Conceptually:

```text
Owner
    ↓
Meaningful Change
    ↓
Application Event
    ↓
Interested Consumers
```

The owner performs the behavior and accepts the resulting state change.

The event communicates that result.

It does not perform the behavior itself.

---

# Events and Public APIs

Application Events and Public APIs both allow collaboration across ownership boundaries, but they solve different problems.

A Public API is used when one owner needs another owner to do something.

```text
Consumer
    ↓
Request Behavior
    ↓
Owner Public API
    ↓
Owner Performs Behavior
```

An Application Event is used when an owner has already performed meaningful behavior and other parts of the application may need to know about the result.

```text
Owner Performs Behavior
        ↓
Meaningful Change
        ↓
Application Event
        ↓
Interested Consumers
```

The distinction is:

```text
Public API
    "Please do this."

Application Event
    "This happened."
```

An Application Event exposed outside its owner is therefore part of that owner's public architectural contract, but it represents observation rather than a behavioral request.

---

# Choosing Between an API and an Event

When two owners need to collaborate, first determine the direction of the relationship.

Ask:

> **Does the consumer require another owner to perform behavior?**

If yes, use the owner's Public API.

```text
Notes Domain
    ↓
Get Bible Chapter
    ↓
Bible Public API
```

If instead the behavior has already happened and other owners may independently care about the result, an Application Event may be appropriate.

```text
Notes Domain
    ↓
Note Created
    ↓
Application Event
    ↓
Interested Consumers
```

Do not use an event merely to avoid making a legitimate dependency explicit.

If one owner genuinely requires another owner's behavior to complete its own responsibility, that dependency should be expressed through the Public API.

---

# Event Ownership

Every Application Event originates from an owned responsibility.

For example:

```text
Notes Domain
    ↓
Create Note
    ↓
Note becomes accepted state
    ↓
Note Created Event
```

The Notes Domain owns the meaning of the change.

The event does not become a separate owner simply because several consumers observe it.

The same rule applies to Runtime events, Resource Boundary events, or events originating from other architectural responsibilities.

Ownership follows the behavior that gives the event meaning.

---

# Events Describe Completed Meaningful Changes

An event should represent something meaningful that the originating owner can truthfully say has occurred.

Conceptually:

```text
Requested Behavior
        ↓
Owner Performs Work
        ↓
Owner Accepts Result
        ↓
Application Event
```

This keeps events aligned with authoritative application state.

For example, receiving an external Resource is not necessarily the same event as accepting the resulting Domain Object into local state.

The meaningful application event should reflect the actual architectural change being communicated.

---

# Event Observation

The producer of an event does not need to know which consumers may care about it.

Conceptually:

```text
Owner
    ↓
Application Event
    ├── Consumer A
    ├── Consumer B
    └── Consumer C
```

Each consumer independently determines whether the event matters to its own responsibility.

A consumer may:

* react,
* request additional information,
* update its own state,
* initiate background work,
* or ignore the event.

The producer does not control those reactions.

---

# Events Do Not Command Consumers

An Application Event communicates an occurrence.

It should not become an indirect command such as:

```text
Note Created
    ↓
Therefore Bible must perform X
```

If Notes requires Bible behavior, Notes should request that behavior through the Bible Public API.

An event instead allows Bible, the Workspace Runtime, an active Module, or another interested responsibility to independently decide whether the Note creation matters.

Conceptually:

```text
Note Created Event
        ↓
Consumer
        ↓
Does this matter to me?
    /               \
  Yes                No
   ↓                  ↓
React               Ignore
```

This preserves independent ownership on both sides of the event.

---

# Events and Domain Changes

Domain state changes are a common source of Application Events.

For example:

```text
Notes Domain
    ↓
Note Changed
    ↓
Application Event
    ↓
Interested Consumers
```

An active Notes Module may respond by requesting the latest Note state through the Notes Public API.

```text
Note Changed Event
        ↓
Notes Module
        ↓
Notes Public API
        ↓
Current Note
```

The event communicates that the state changed.

The Domain Public API remains the authoritative way to request the current Domain information.

This prevents events from becoming an alternate data-access model.

---

# Events and Module Instances

Module Instances may observe Application Events when a meaningful application change affects their active interaction.

For example:

```text
Notes Domain
    ↓
Note Changed Event
    ↓
Open Notes Module
    ↓
Request Current Note
```

The Module does not need to know whether the change originated from:

* another Module,
* background execution,
* synchronization,
* or another workflow.

It only needs to understand the meaningful application event and request current state from the appropriate owner when required.

---

# Events and Background Execution

Work performed in the background may produce meaningful application changes.

For example:

```text
Resource Boundary
    ↓
Background Resource Refresh
    ↓
Candidate Accepted
    ↓
Installed Domain Object Changes
    ↓
Application Event
```

Background execution does not own the event merely because the change happened asynchronously.

The event belongs with the responsibility that gives the change meaning.

Likewise, observing an event may cause an owner to schedule background work without transferring ownership of that work to the event system.

---

# Events and the Workspace Runtime

The Workspace Runtime may publish events describing meaningful Runtime changes.

For example:

```text
Workspace Runtime
    ↓
Workspace Changes
    ↓
Application Event
```

Consumers may observe those events when the Runtime change matters to their own responsibility.

The event does not expose the Runtime's internal Pane-tree implementation.

It communicates the meaningful Runtime change at the public boundary.

---

# Events Are Not Navigation Context

Application Events and Navigation Context solve different problems.

Navigation Context initializes another Runtime interaction:

```text
Reading Plans Module
        ↓
Bible Location
        ↓
Navigation Context
        ↓
Bible Reader Module
```

An Application Event communicates that something has already changed:

```text
Reading Plans Domain
        ↓
Reading Completed
        ↓
Application Event
```

Use Navigation Context when starting or changing an interaction requires contextual information.

Use an Application Event when independently owned consumers may need to observe an occurrence.

---

# Events Are Not Resource Events

Application Events belong to the application's internal collaboration model.

They should not be confused with:

* Nostr events,
* browser events,
* transport messages,
* Resource representations,
* or protocol-level notifications.

For example:

```text
Nostr Event
    ↓
Resource Boundary
    ↓
Resource
    ↓
Domain Object accepted
    ↓
Application Event
```

These may participate in one workflow, but they represent different architectural concepts.

A transport event is not automatically an Application Event.

---

# Designing an Application Event

When introducing an event, begin with the change being communicated.

Ask:

> **What meaningful application change has already occurred?**

Then ask:

> **Who owns that change?**

The event should express that owner's public meaning rather than expose implementation details about how the change occurred.

For example, prefer communicating:

```text
Note Changed
```

rather than an implementation-specific occurrence such as:

```text
IndexedDB Note Record Updated
```

The first describes application meaning.

The second describes a storage mechanism.

The exact event representation and delivery mechanism are implementation decisions.

---

# What Information Should an Event Carry?

An event should communicate enough information for consumers to understand the occurrence and determine whether it is relevant.

The event does not need to duplicate all current application state merely to save consumers from using the owning Public API.

Conceptually:

```text
Application Event
    ↓
Identify Meaningful Change
    ↓
Consumer Determines Relevance
    ↓
Public API if Current State Is Needed
```

The owner determines what information forms part of the event's public contract.

That contract should remain expressed in application concepts rather than transport, storage, or implementation details.

---

# Avoid Event-Driven Hidden Dependencies

Events preserve loose coupling only when consumers are genuinely independent.

An architecture can still become tightly coupled if one event secretly requires a particular consumer to react for the originating workflow to succeed.

For example:

```text
Owner A publishes Event
        ↓
Owner B MUST react
        ↓
Owner A's operation only works if B reacts
```

That is effectively a required dependency hidden behind an event.

If Owner A requires Owner B's behavior, make the dependency explicit through Owner B's Public API.

Use events when observers are optional from the producer's perspective.

---

# Adding an Application Event

When a new feature appears to require cross-owner communication, reason through it in order:

```text
What meaningful change occurs?
        ↓
Who owns that change?
        ↓
Does another owner need to perform behavior
for the originating operation to succeed?
        │
        ├── Yes → Use that owner's Public API
        │
        └── No
             ↓
May independent consumers care that the change occurred?
        │
        ├── No → Keep the change internal
        │
        └── Yes → Consider an Application Event
             ↓
What application meaning should the event expose?
        ↓
What information is required to identify the change?
        ↓
Consumers independently decide whether to react
        ↓
Choose implementation
```

Do not begin with:

```text
Should I publish an event?

Which event bus should I use?

Should this use CustomEvent?

Should this go through a worker?
```

First determine whether the relationship is actually observational.

---

# Example: Creating a Note

Suppose the user creates a Note.

The Notes Domain owns creation:

```text
User Action
    ↓
Notes Domain
    ↓
Create Note
    ↓
Note Accepted
```

If other parts of the application may independently care about that change:

```text
Note Accepted
    ↓
Note Created Event
    ├── Open Notes Module
    ├── Search-related behavior
    └── Other interested consumers
```

The Notes Domain does not need to know which consumers currently exist.

Consumers determine their own reaction.

If one of those consumers requires the current Note, it requests it through the Notes Public API.

---

# Example: Opening a Bible Passage

Suppose a Reading Plans interaction wants the Bible Reader to open the next scheduled passage.

This is not primarily an Application Event.

The desired behavior is explicit:

```text
Reading Plans Module
    ↓
Open Bible Reader
    ↓
Workspace Runtime Public API
```

The initial Bible location is supplied through Navigation Context.

```text
Reading Plans Module
    ↓
Bible Location
    ↓
Navigation Context
    ↓
Bible Reader
```

An event would be appropriate only for communicating a meaningful change that has already occurred, such as:

```text
Reading Completed
    ↓
Application Event
```

The distinction is between requesting behavior and announcing an occurrence.

---

# Big Takeaway

Application Events communicate meaningful changes between independently owned parts of the application.

They complement Public APIs rather than replace them.

The central distinction is:

```text
Need another owner to do something?
    ↓
Public API

Something meaningful already happened?
    ↓
Application Event
```

The originating owner performs and owns the behavior.

The event announces the resulting change.

Consumers independently determine whether that change matters to them and use normal Public APIs when they require additional behavior or current state.

When adding cross-owner communication, ask:

> **Am I requesting behavior, or announcing that behavior has already occurred?**

That question determines whether the relationship belongs in a Public API, an Application Event, or another collaboration mechanism.
