# Change Workflow

## Purpose

This guide defines the preferred workflow for refactoring and cleanup while preserving architectural behavior.

---

# Trace Before Changing

Before deleting, moving, hiding, or restructuring something:

```text
1. trace current callers
2. identify the actual responsibility
3. identify the architectural owner
4. verify whether the code is active, an entrypoint, a Worker path, reference material, or dead
5. inspect existing tests
6. choose the smallest safe change
7. update tests when behavior is non-trivial
8. validate
```

Do not delete code merely because it has few callers.

Do not expose code publicly merely because a test wants convenient access.

---

# Evidence Before Complexity

Before adding special cases, state, or abstractions, establish the requirement and trace existing behavior. Separate observed defects from plausible but unrequested scenarios. Verify callers, tests, and the owning API rather than inventing a missing product rule.

Ask whether another owner already performs the validation, persistence, coordination, or notification. Do not repeat that responsibility in a consumer without a distinct boundary reason.

When an unresolved requirement would materially change ownership or user experience, ask one focused clarification. Otherwise make the smallest safe change using established conventions.

See `005-code-quality-and-assumptions.md` for the full review rubric.

---

# Small Reviewable Slices

Prefer one coherent responsibility per change.

Good slices include:

* one ownership correction,
* one Public API normalization,
* one dead-code island,
* one correctness bug plus focused tests,
* one documentation-alignment topic.

Avoid combining unrelated cleanup just because the same files are nearby.

A patch can touch many files when they all participate in one mechanical boundary change.

---

# Explicit Code As A Review Goal

Prefer explicit state transitions, meaningful names, and direct handlers over generic dispatch or implicit side effects when simpler code expresses the same behavior. Name mixed responsibilities honestly before extracting them; extract only when the responsibility justifies a boundary and focused testing.

Use braces for return guards in touched code without changing logic. Update JSDoc for non-obvious invariants, side effects, and contracts. Do not make a change solely because an audit is in progress: **no change needed** is a valid conclusion.

---

# Preserve Behavior During Structural Cleanup

Refactoring should preserve behavior unless the slice is explicitly fixing a concrete defect.

Do not use cleanup as an excuse to reopen settled Resource, Outbox, Authentication, Workspace, Notes, or Reading Plans architecture.

If source inspection reveals a genuine architectural defect, describe the defect before redesigning the boundary.

---

# Use Architecture to Judge Compiler Findings

The compiler can reveal dependencies.

It cannot decide whether a dependency is architecturally valid.

When an import breaks during a move:

```text
broken import
    ↓
what concept is being consumed?
    ↓
who owns that concept?
    ↓
should it be public?
    ↓
which boundary should expose it?
```

Do not automatically create a barrel or move the concept upward.

---

# Workers Are Separate Composition Roots

A Worker does not consume Svelte `ApplicationContext`.

Workers may construct their own local collaborators when they execute in a separate runtime context.

Keep Worker protocols explicit and typed.

Share architectural contracts, not runtime object instances.

---

# Dead-Code Workflow

Before deletion:

```text
search imports/references
check dynamic resolution
check Worker/service-worker entrypoints
check tests and fixtures
check historical/reference intent
identify replacement behavior
```

Delete the implementation and orphaned tests together when the behavior is truly obsolete.

Reference utilities intentionally retained for future work should be marked/skipped rather than repeatedly rediscovered as dead code.
