# Code Quality, Scope, and Ownership

## Purpose

This guide defines how to review, simplify, and change code while preserving the application's established behavior and architectural boundaries.

It complements the Change Workflow, Testing and Patch Workflow, and architectural documentation. It does not introduce new architectural responsibilities.

The goal is code whose requirements, ownership, state, and side effects can be understood from the implementation. **Complexity must earn its place through an actual requirement or demonstrated problem.**

---

# Establish The Requirement And Evidence

Before proposing a change:

1. Read the newest available source and applicable architecture/implementation documentation.
2. Trace the current user flow, callers, collaborators, and tests.
3. State the observed defect, missing behavior, misleading contract, or unnecessary responsibility.
4. Distinguish what is explicitly required from what is assumed or merely possible.
5. Identify the owner of the behavior or invariant.
6. Define what must remain unchanged and the smallest meaningful correction.

Classify findings honestly:

| Finding | Appropriate response |
|---|---|
| Reproduced defect | Correct it at the owning boundary; add a focused regression |
| Explicit requirement | Implement within existing responsibilities and contracts |
| Supported risk | Explain evidence and decide whether a safeguard is justified |
| Plausible but unrequested scenario | Record as a consideration, not an automatic implementation task |
| Consequential uncertainty | Ask one focused question before choosing a new product rule |
| Sound existing behavior | Keep the code; an audit does not require a patch |

**Technical possibility does not establish a product requirement.** Do not introduce workflows, state machines, conflict policies, or failure handling on speculation. Equally, do not remove safeguards that protect demonstrated correctness merely because a scenario is uncommon.

Use established conventions when a safe, behavior-preserving change does not depend on an unanswered product decision.

---

# Keep Responsibilities With Their Owners

Follow the architectural sequence:

```text
Meaning
    ↓
Ownership
    ↓
Responsibility
    ↓
Public API
    ↓
Implementation
```

Trace behavior across boundaries before adding logic. A caller may initiate a request and present a result without taking ownership of the underlying validation, persistence, coordination, or notification policy.

Ask:

- Which layer or Domain defines the invariant?
- Is the operation already exposed through its owning Public API?
- Does an existing service already validate, transform, persist, or notify?
- Is an extra check protecting a genuinely separate boundary, or repeating an owner's guarantee?
- Would the proposed dependency reverse the intended direction or create a cycle?
- Is a direct contract available instead of constructing an unrelated object for a side effect?

Distinguish accepted state, external representations, asynchronous work, and presentation state. A consumer of a notification is not automatically the owner of the producer's synchronization rules.

Preserve checks that belong to a *different* boundary. For example, accepting a valid result does not by itself establish that the user interface still displays the context for which the result was requested.

---

# Remove Redundancy Before Adding Abstractions

Look for actual duplication of responsibility, not only repeated syntax.

Review these patterns:

- Checks repeated after an owning API has already enforced the same invariant.
- A stored value that can be obtained reliably from its authoritative owner.
- Multiple flags representing one mutually exclusive choice.
- Repeated retrieval or subscription with no change in the requested identity.
- State updated manually after the same accepted update is already delivered through an established notification.
- Intermediate conversions or objects used only to recover information already available directly.
- Helpers that merely forward calls or hide where the real behavior occurs.
- Cleanup and error-handling branches retained for workflows that are no longer supported.

Before deleting a check or state variable, trace its readers and writers and determine whether it protects a distinct responsibility. Do not replace one redundant mechanism with a more elaborate mechanism that serves the same purpose.

Similar-looking statements can represent different responsibilities. Reuse is justified by shared meaning and a stable contract, not by superficial resemblance.

---

# Prefer Explicit Code And Honest Naming

- Choose clear, intention-revealing function and variable names.
- Use distinct handlers for actions with distinct side effects instead of a generic dispatcher when direct functions are clearer.
- Prefer explicit state transitions to toggles when the caller already knows the desired state.
- Make dependencies, outcomes, and side effects visible at the call site or in an intentional API.
- Name combined responsibilities accurately (including `And` when it improves clarity) before deciding whether to separate them.
- Extract functions around independently understandable or testable responsibilities; avoid abstraction for theoretical purity.
- Use braces around `if` return guards in code being touched. Mechanical cleanup must not change logic.
- Add JSDoc where it explains non-obvious invariants, ownership, asynchronous completion, units/indices, side effects, or failure semantics.
- Avoid JSDoc that only restates a function name; correct misleading documentation when the code changes.

Source code is authoritative for current implementation mechanics. Accepted architecture remains authoritative for intended responsibility unless explicitly amended.

---

# Review State And Asynchronous Lifecycles Deliberately

Every state variable should have a clear owner, purpose, and lifecycle.

- Identify what starts an operation, what finishes it, and who releases its resources.
- Separate UI progress state from data identity, persistence rules, and background communication.
- Add cancellation or stale-result protection only when it prevents a supported, concrete correctness failure.
- Avoid duplicate identity snapshots, unnecessary counters, and repeated availability checks when a simpler existing contract suffices.
- Keep user-visible error handling aligned with the actual failure boundary; do not turn one failure category into another by assumption.
- Check that notifications and subscriptions have clear setup, filtering, and cleanup ownership.

Do not assume that external revision rules, local persistence semantics, and asynchronous UI completion all solve the same problem. Determine which contract is relevant before adding or removing guards.

---

# Test Behavior At The Correct Boundary

When a test fails, establish which of these changed:

1. Production behavior.
2. The declared contract or intended requirement.
3. The test fixture or mock's implementation of the contract.
4. The test's synchronization with an asynchronous or reactive update.
5. The source baseline against which the test was written.

Fix the actual issue. Do not weaken assertions just to obtain a passing suite or change production code to accommodate an outdated fixture.

Prefer focused regression tests for observable behavior and owner contracts. Mechanical name/import/brace changes can rely on existing coverage plus structural or syntax checks when appropriate. Avoid tests whose only effect is freezing incidental helper structure.

Report validation precisely: patch application, formatting, transpilation, focused tests, full unit suite, build, and browser suite are different forms of evidence.

---

# Review And Patch Discipline

- Use the newest supplied implementation source as the patch baseline.
- Include only changes the user confirms applied; downloading is not applying.
- Inspect the actual conflicting file when a patch fails; do not guess at context.
- Make one cohesive change per patch and preserve unrelated behavior.
- Validate the patch and its scope before delivery.
- Re-upload identical patch bytes under `-v2`, `-v3`, and later suffixes when only the download fails; generate a corrected patch when the source differs.

An audit may conclude **no issue**, **documentation only**, **a focused test**, **a small correction**, or **a justified redesign**. The result should follow evidence, not the desire to produce another patch.

---

# Final Review Checklist

Before submitting a finding or patch, verify:

- Is the need demonstrated, required, or speculative?
- Is the intended behavior understood from the actual workflow?
- Does the right owner already provide the capability or enforce the contract?
- Does this add duplicate checks, state, subscriptions, or abstractions?
- Are names, responsibilities, side effects, and JSDoc truthful?
- Are separate boundaries being conflated?
- Is the change the smallest coherent improvement?
- Do tests protect behavior at the relevant boundary?
- Does the patch apply to the confirmed current source?
- Would leaving the implementation unchanged be the better decision?
