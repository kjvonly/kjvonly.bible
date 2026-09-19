# Testing and Patch Workflow

## Patch Files

Use descriptive date-prefixed patch names:

```text
YYYYMMDD-descriptive-name.patch
```

Generate patches from the repository root so paths include the complete project prefix, for example:

```text
client/kjvonly-pwa/...
```

Do not generate PWA patches relative to `client/kjvonly-pwa` when the patch is expected to be applied from the repository root.

---

# Applying a Patch

Check before applying:

```bash
git apply --check YYYYMMDD-description.patch &&
git apply YYYYMMDD-description.patch
```

Keep patch application separate from test/build commands so failures are easy to identify.

---

# Normal Validation

For client code changes:

```bash
cd client/kjvonly-pwa
npm run test && npm run build
```

For browser-facing or infrastructure integration changes also run:

```bash
cd client/kjvonly-pwa
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
