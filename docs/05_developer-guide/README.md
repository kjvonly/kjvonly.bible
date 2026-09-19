# Developer Guide

The Developer Guide explains how to change the KJVOnly codebase without weakening the ownership boundaries defined by the architecture.

Read the architecture and current implementation docs before making structural changes.

Current guide:

```text
001-boundaries-and-imports.md
002-change-workflow.md
003-testing-and-patches.md
004-documentation.md
```

The central development rule is:

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

Implementation should reinforce that sequence rather than bypass it for convenience.
