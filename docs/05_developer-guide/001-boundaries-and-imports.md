# Boundaries and Imports

## Purpose

This guide translates architectural Public APIs into concrete TypeScript/Svelte import conventions.

---

# External Consumers Use Owner APIs

The normal rule is:

```text
external consumer
    → owner root API

browser/Svelte consumer
    → owner /ui API when browser-only exports are required

internal implementation
    → direct internal import when appropriate
```

Current public boundaries include:

```text
$lib/application
$lib/application/ui

$lib/domains/bible
$lib/domains/bible/ui

$lib/domains/notes
$lib/domains/notes/ui

$lib/domains/reading-plans
$lib/domains/reading-plans/ui

$lib/domains/strongs

$lib/resource
$lib/shared
```

Do not create nested public barrels merely to shorten a path.

---

# Browser-Safe Roots

Root APIs that are consumed by Node-side tests must remain safe to evaluate without a DOM.

Do not re-export Svelte components or browser-only libraries from a Node-safe root barrel.

Use `/ui` for presentation exports.

This rule exists because a root barrel that imports Svelte UI can transitively evaluate browser-only libraries during Node tests.

---

# Application Composition Root

The concrete `Application` class is not part of `$lib/application`.

The only runtime bootstrap location that should import it directly is:

```text
src/routes/+layout.svelte
```

Other code should consume:

* `$lib/application`,
* `$lib/application/ui`,
* `ApplicationContext`,
* or an owning Domain/Resource API.

This prevents lower layers from importing a barrel that also re-exports their composition root and creating circular dependency paths.

---

# ApplicationContext

`ApplicationContext` is the Svelte-facing runtime capability surface.

It is not a generic dependency-injection container.

Add a capability only when Svelte/runtime consumers genuinely need it.

Do not expose private transport, persistence, or composition objects for test convenience.

If a Svelte container needs independent state, expose an application-owned factory rather than one global shared instance.

---

# Internal Imports

Code inside an owner may use direct internal imports.

Do not force an implementation file to import back through its own public barrel; that can create cycles and obscures internal dependencies.

Public APIs are for architectural consumers, not mandatory self-import routes.

---

# Composition Wiring Exceptions

Concrete imports are expected in composition code.

Examples include:

* `Application` wiring concrete Domain stores and infrastructure,
* Worker composition roots,
* concrete persistence adapters,
* browser/integration tests whose subject is the implementation itself.

Do not add public exports merely to eliminate every deep import.

The goal is correct ownership, not path aesthetics.

---

# Dependency Direction

Prefer dependencies that point toward the owner of meaning.

Example:

```text
Reading Plans
    → Bible Public API
```

when Reading Plans needs a Bible-owned location/navigation concept.

Avoid cycles such as:

```text
Bible → Reading Plans → Bible
```

If a shared contract is genuinely required, determine who owns the concept before moving it to `shared` or Application.

---

# `shared/` Policy

`$lib/shared` is for small concepts with no stronger architectural owner.

Do not use it as an escape hatch from ownership analysis.

Before adding shared code, ask whether it is actually:

* Domain-owned,
* Application-owned,
* Resource-owned,
* Runtime-owned,
* or Infrastructure-owned.
