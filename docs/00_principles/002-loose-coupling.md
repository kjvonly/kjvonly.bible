# Loose Coupling

## Status

Current

---

# Purpose

This document defines the loose coupling principle used throughout the KJVOnly application.

Loose coupling allows independently owned responsibilities to collaborate while remaining free to evolve independently.

Its purpose is to preserve clear ownership boundaries while enabling collaboration across the application.

---

# Principle

Loose coupling begins with well-defined responsibilities.

A responsibility should have a single owner.

Other responsibilities should collaborate with that owner through its Public API rather than depending upon its implementation.

As implementations evolve, collaboration should remain stable.

---

# What Is Loose Coupling?

Loose coupling allows independently owned responsibilities to collaborate without requiring knowledge of one another's implementation.

Responsibilities collaborate through behavior rather than implementation details.

Ownership remains clear.

Implementations remain replaceable.

The architecture remains stable.

---

# Collaboration

Ownership defines the boundaries of responsibility within the application.

Loose coupling preserves those boundaries by limiting cross-owner collaboration to stable communication mechanisms.

When one owner requires behavior or information from another, it should cross the ownership boundary through a Public API, Application Event, Shared Identifier, or Navigation Context rather than depending on the other owner’s implementation.

These mechanisms allow responsibilities to collaborate without merging ownership or leaking implementation details across boundaries.

Responsibilities should not:

* manipulate another owner's internal state,
* depend upon implementation details,
* assume repository organization,
* or become coupled to implementation technologies.

They should depend only upon behavior.

---

# Communication Patterns

The application favors a small number of stable collaboration mechanisms.

---

## Public APIs

Public APIs are the primary collaboration mechanism.

They expose behavior without exposing implementation.

Every owner defines the behavior it makes available to the rest of the application.

Other responsibilities collaborate through those APIs rather than directly manipulating implementation.

---

## Application Events

Application Events communicate that something has changed.

The sender does not know who receives the event.

Interested responsibilities determine whether they should respond.

This preserves loose coupling while supporting asynchronous collaboration.

---

## Shared Identifiers

Responsibilities should reference shared concepts through identifiers rather than shared implementation.

For example, multiple Domains may reference the same Bible location without depending upon Bible storage or presentation.

---

## Navigation Context

The Runtime may initialize another responsibility by providing navigation context.

The receiving owner decides how that context should be interpreted.

Neither responsibility depends upon the other's internal implementation.

---

# Common Anti-Patterns

---

## Reaching Around the Public API

Do not bypass an owner's Public API to manipulate its implementation directly.

Doing so transfers implementation knowledge between responsibilities and weakens ownership boundaries.

---

## Shared Internal State

Responsibilities should not depend upon another owner's private runtime state.

Shared state should belong to its owner and be exposed only through its Public API.

---

## Ownership Leakage

One responsibility should not begin implementing behavior owned by another.

Ownership should remain clear.

Behavior should remain cohesive.

---

## Technology Coupling

Application behavior should not become dependent upon specific implementation technologies.

Technologies realize responsibilities.

They should not define them.

---

# Big Takeaway

Ownership establishes responsibility.

Public APIs preserve ownership.

Loose coupling allows independently owned responsibilities to collaborate without depending upon one another's implementation.

As long as responsibilities remain cohesive and ownership remains clear, implementations can evolve independently while the architecture remains stable.
