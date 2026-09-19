# Documentation Maintenance

## Documentation Layers

Keep the project documentation layers distinct.

```text
Principles
    = how to reason

Application Architecture
    = enduring application responsibilities

Resource Boundary
    = Resource/Nostr distribution contract

Service Architecture
    = backend service architecture

Implementation
    = how the current source realizes the architecture

Developer Guide
    = how contributors should work
```

Do not move implementation mechanics into architecture solely because they are important today.

Do not leave changed architectural decisions documented only in implementation notes.

---

# Source and Documentation

For implementation details, current source is authoritative when an implementation document is stale.

That does not mean accepted architecture should be silently ignored.

If source and architecture genuinely disagree, determine whether:

* the implementation is wrong,
* the architecture changed and requires an explicit amendment,
* or the documents are describing different layers.

Update the appropriate layer deliberately.

---

# Architecture vs Implementation

Architecture should describe stable responsibilities and contracts.

Implementation docs may name:

* classes,
* files,
* libraries,
* Worker counts,
* persistence schemas,
* current strategies,
* and concrete startup order.

A refactor that changes only implementation should usually update implementation docs without rewriting architecture.

A decision such as allowing native Nostr application state alongside Resource-backed Domain state is architectural and should update the Resource Boundary ADRs as well.

---

# Historical Development Captures

Development handoffs and dated implementation captures are useful while work is in progress.

Once durable information has been promoted into current implementation or architecture docs, retire duplicate captures so the repository does not contain competing "current" descriptions.

Preserve historical material only when it still serves a deliberate reference purpose.

---

# Documentation Review Checklist

When finishing a significant refactor, check for:

```text
removed class/service names
old import paths
old Public API barrels
stale ownership claims
old Worker responsibilities
obsolete TODOs
broken internal links
duplicate numbering
status labels that no longer match reality
```

Documentation cleanup should follow the same ownership rules as code cleanup: change the smallest document layer that actually owns the concept.
