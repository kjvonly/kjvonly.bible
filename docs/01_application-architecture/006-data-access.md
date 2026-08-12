# Data Access

## Status

Current

---

# Purpose

This document defines how requests for Domain Objects are satisfied within the application.

Its primary question is:

> **When application behavior requests a Domain Object, how is that request satisfied without coupling the caller to where the information is stored or obtained?**

Callers request information through the Public API of the owner responsible for that information. The retrieval path remains behind that boundary.

---

# Data Access Model

Application behavior operates on Domain Objects.

A caller should therefore express the information it needs rather than the source from which that information should be retrieved.

Conceptually:

```text
Caller
    ↓
Owner Public API
    ↓
Request Domain Object
    ↓
Data Access
    ↓
Domain Object
```

Data Access is the responsibility of satisfying that request.

It may use locally available information, the Resource Boundary, or another appropriate source without requiring the caller to understand which path was taken.

---

# Requesting Domain Objects

A request begins with application meaning.

For example:

```text
Bible Reader
    ↓
Bible Public API
    ↓
Get Chapter
```

The request is for a Bible Chapter.

It is not a request for:

```text
IndexedDB record
Nostr event
Blossom object
relay query
```

Those concepts describe possible implementation or retrieval mechanisms.

The caller depends only upon the Domain capability and the Domain Object returned by it.

---

# Retrieval Flow

KJVOnly follows a local-first retrieval model.

The application's accepted local model is consulted first. If the requested Domain Object is available and satisfies the request, it is returned without requiring external retrieval.

If the information is not locally available and can be obtained externally, the request may cross the Resource Boundary.

Conceptually:

```text
Request Domain Object
        ↓
Accepted Local Model
        ↓
    Available?
      /   \
    Yes    No
     ↓      ↓
   Return   Resource Boundary
                ↓
          Resolve Resource
                ↓
        Validate and Accept
                ↓
        Installed Domain Object
                ↓
              Return
```

The caller does not select between these paths.

It requests the Domain Object it needs.

---

# Local-First Access

Local-first access means the application's accepted local model is the first source considered when satisfying a request.

This supports offline operation and avoids making application behavior dependent upon current network availability.

---

# Local Availability

If an accepted Domain Object already exists locally and satisfies the request, it can be returned directly.

Conceptually:

```text
Get Bible Chapter
        ↓
Local Chapter Available
        ↓
Return Chapter
```

No Resource lookup is required simply because the same information may also exist externally.

The application operates on the Domain Object already accepted into its local model.

---

# Local Misses

A local miss does not change the caller's request.

For example:

```text
Get Bible Chapter
```

remains the request regardless of whether that Chapter is currently installed.

When the requested information can be obtained externally, Data Access may use the Resource Boundary to resolve it.

```text
Get Bible Chapter
        ↓
Not Available Locally
        ↓
Resource Boundary
        ↓
Resolve and Validate
        ↓
Install Domain Object
        ↓
Return Bible Chapter
```

The retrieval mechanism remains invisible to the caller.

---

# Not Every Request Has an External Source

The Resource Boundary is one possible path for satisfying a request.

It is not required for every Domain Object.

Some information may:

* exist only locally,
* be created internally by the application,
* or otherwise have no external Resource representation.

In those cases, a local miss is handled according to the owning capability's contract rather than automatically becoming a network request.

Data Access separates the caller from that decision.

---

# Data Access and the Resource Boundary

Data Access and the Resource Boundary have different responsibilities.

Data Access answers:

> **How should this request for a Domain Object be satisfied?**

The Resource Boundary answers:

> **How is Domain information represented and communicated outside the application's local Domain model?**

Conceptually:

```text
Domain Object Request
        ↓
Data Access
        │
        ├── Accepted Local Model
        │
        └── Resource Boundary
                 ↓
              Resource
```

The Resource Boundary is therefore a possible retrieval path used by Data Access.

It is not the Data Access abstraction itself.

---

# Returning Through the Resource Boundary

Externally obtained information does not bypass the application's local model.

A Resource must first pass through the Resource Boundary and become an accepted Domain Object.

Conceptually:

```text
Resource
    ↓
Resolution
    ↓
Validation
    ↓
Application Acceptance
    ↓
Installed Domain Object
    ↓
Request Satisfied
```

The caller receives the Domain Object.

It does not receive the external Resource representation and become responsible for interpreting it.

---

# Consistent Results

The source used to satisfy a request may vary.

The application-facing result should not.

For example:

```text
Accepted Local Model ─────┐
                          │
Resource Boundary ────────┼──→ Bible Chapter
                          │
Future Retrieval Source ──┘
```

The caller continues to operate on the Bible Chapter regardless of how that Chapter became available.

This keeps retrieval mechanisms from leaking into Domain behavior or Module interactions.

---

# Data Access and Public APIs

Data Access normally sits behind the Public API of the owner whose information is being requested.

For example:

```text
Bible Reader
    ↓
Bible Public API
    ↓
Get Chapter
    ↓
Bible data retrieval
```

A consumer should not need to call a separate global retrieval mechanism and then determine how the returned information relates to the Bible Domain.

The public request should remain expressed in the language of the owner.

---

# Data Access and Freshness

Satisfying a request and maintaining data freshness are different responsibilities.

Data Access satisfies the current request using information that is valid for that request.

Background Processing may independently:

* refresh installed information,
* discover newer Resources,
* synchronize changes,
* or perform other maintenance.

Conceptually:

```text
Current Request
    ↓
Data Access
    ↓
Accepted Domain Object


Background Processing
    ↓
Resource Boundary
    ↓
Updated Local Model
```

A later request can automatically benefit from newer accepted Domain Objects without requiring the original caller to coordinate synchronization.

---

# Deciding How a New Data Request Works

When introducing behavior that requires information, work through the decision in order.

```text
What information is required?
        ↓
Who owns that information?
        ↓
Request it through the owner's Public API
        ↓
Can the accepted local model satisfy the request?
        │
        ├── Yes → Return the Domain Object
        │
        └── No
             ↓
Can the information be obtained through the Resource Boundary?
        │
        ├── Yes → Resolve, validate, accept, and return
        │
        └── No → Follow the owner's missing-data contract
        ↓
Choose implementation
```

The caller should never need to decide:

```text
Should I read IndexedDB?

Should I query a relay?

Should I download from Blossom?
```

Those questions belong beneath the architectural request.

---

# Example: Requesting a Bible Chapter

Suppose a Bible Reader requires John 3.

The interaction requests the Chapter from the Bible Domain:

```text
Bible Reader
    ↓
Bible Public API
    ↓
Get Chapter: John 3
```

If John 3 is already installed and valid for the request, the existing Domain Object is returned.

```text
Get John 3
    ↓
Local Chapter
    ↓
Return Chapter
```

If it is not available locally and the Chapter can be obtained externally:

```text
Get John 3
    ↓
Local Miss
    ↓
Resource Boundary
    ↓
Resolve Published Resource
    ↓
Validate
    ↓
Install Chapter
    ↓
Return Chapter
```

The Bible Reader makes the same request in both cases.

It never needs to know which retrieval path satisfied it.

---

# Design Rules

## Request Information by Meaning

Requests should identify the Domain information required rather than a storage or transport location.

## Prefer the Accepted Local Model

Locally accepted Domain Objects should satisfy requests whenever they meet the requirements of that request.

## Keep Retrieval Paths Behind the Boundary

Callers should not decide whether information comes from local persistence, the Resource Boundary, or another source.

## Return Domain Objects

Application-facing retrieval should produce Domain Objects rather than leaking external or persistence-specific representations.

## Preserve Local Authority

Externally obtained information must be validated and accepted before becoming part of the local Domain model.

## Separate Retrieval From Freshness

Current requests and ongoing synchronization are different responsibilities. Background Processing can improve the local model without becoming part of every request path.

---

# Big Takeaway

Data Access separates **what information the application needs** from **how that information becomes available**.

A caller requests a Domain Object through the Public API of its owner.

The accepted local model is considered first. When appropriate, a local miss may be satisfied through the Resource Boundary, after which the externally obtained information is validated and accepted as a Domain Object.

Conceptually:

```text
Caller
    ↓
Owner Public API
    ↓
Domain Object Request
    ↓
Data Access
    │
    ├── Local Model
    │
    └── Resource Boundary
    ↓
Domain Object
```

The caller requests data.

The retrieval path remains behind the architectural boundary.
