# Testing and Patch Workflow

## Patch Files

Use descriptive date-prefixed patch names:

```text
YYYYMMDD-descriptive-name.patch
```

Generate patches from the repository root so paths include the complete project prefix, for example:

```text
client/pwa/...
```

Do not generate PWA patches relative to `client/pwa` when the patch is expected to be applied from the repository root.

---

# Baseline And Patch Integrity

Treat the newest supplied source as the implementation baseline. Replay only changes the user has confirmed applied. A failed patch must be checked against the actual conflicting file and rebased; a failed download must not change the code.

When re-uploading identical content, use a `-v2`, `-v3`, etc. suffix without changing its bytes. When correcting content, document the difference and verify the corrected patch against the current baseline.

---

# Applying a Patch

Check before applying:

```bash
git apply --check YYYYMMDD-wtx-description.patch &&
git apply YYYYMMDD-wtx-description.patch
```
where wtx is the worktree so if i dont tell you what x is ask. It will be wt1 or wt2 etc...
Keep patch application separate from test/build commands so failures are easy to identify.

---

# Normal Validation

For client code changes:

```bash
cd client/pwa
npm run test && npm run build
```

For browser-facing or infrastructure integration changes also run:

```bash
cd client/pwa
npm run test:browser
```

Run `git diff --check` before sharing a generated patch.

---

# Test the Boundary Being Changed

Prefer focused behavior tests over tests that merely preserve implementation structure.

Examples:

* Domain service tests for Domain behavior,
* WorkspaceRuntime tests for Workspace behavior,
* Resource integration tests through Domain-facing entry points,
* infrastructure tests that directly construct concrete infrastructure when infrastructure is the subject,
* browser tests for Worker/WebSocket/IndexedDB/browser-only behavior.

Do not expose private runtime infrastructure through `ApplicationContext` only to make a test easier to write.

---

# Diagnose Existing Test Failures First

Before changing production code or expectations, distinguish between a real regression, an outdated fixture/mock, an asynchronous test synchronization issue, an intentional requirement change, or a mismatched source baseline.

Trace the contract and reproduce the failure when possible. Fix production for production defects; fix fixtures when they misrepresent the current contract. Never relax an assertion solely to make tests pass.

Write tests for actual workflows and owned contracts. Do not freeze speculative requirements or incidental implementation structure. State exactly which validation steps were run and which were not.

---

# Node vs Browser Tests

Keep Node-safe public barrels free of browser-only imports.

If a test fails with errors such as:

```text
ReferenceError: document is not defined
```

inspect the import graph before converting the test environment.

The correct fix may be restoring a browser-only `/ui` boundary rather than making every test run in a browser environment.

---

# Tests During Cleanup

When behavior is non-trivial, add or strengthen tests as part of the cleanup slice.

When a change is purely mechanical import normalization, existing test/build coverage may be sufficient.

When deleting dead code, do not preserve tests whose only purpose is testing an implementation that has no production responsibility.
