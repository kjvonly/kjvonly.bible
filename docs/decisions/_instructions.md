# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for KJVOnly.

An ADR captures an important architectural decision, the reasoning behind it, and the consequences of that decision. ADRs are intended to document *why* something exists, not just *how* it works.

The goal is that months or years later we can answer questions such as:

```text
Why did we introduce manifests?
Why are resources identified using d tags?
Why is Blossom a storage strategy instead of a Nostr kind?
Why do resource identifiers follow this convention?
```

without needing to search git history or reconstruct conversations.

## ADR Format

Each ADR should follow this structure:

### Problem

What problem are we trying to solve?

Examples:

```text
How should Bible data be distributed?
How should resources be identified?
How should clients bootstrap datasets?
```

### Decision

What decision was made?

Describe the chosen architecture, convention, or approach.

Include:

* Naming conventions
* Data structures
* Event formats
* Resource models
* Protocol decisions

### Big Takeaway

Summarize the decision in one or two sentences.

Examples:

```text
Kinds represent domains.
Storage is resolved through strategies.
```

```text
Resource identifiers are canonical and independent of storage.
```

A reader should be able to understand the purpose of the ADR from the takeaway alone.

## Naming Convention

ADRs are numbered sequentially.

```text
0001-data-distribution-strategy.md
0002-domain-resource-model.md
0003-manifest-events.md
```

Numbers should never be reused.

If a decision changes, create a new ADR rather than rewriting history.

## Updating the ADR Index

Whenever a new ADR is added:

### 1. Add it to the table

Example:

```markdown
| [0004](./0004-example.md) | Example Decision | Short one-line description. |
```

### 2. Add a summary section

Each ADR should include:

```text
Problem
Decision
Big Takeaway
```

Keep the summary concise.

The purpose of the index is to allow someone to quickly understand the architecture without reading every ADR.

### 3. Update Architectural Layers (if necessary)

If the ADR introduces a new major concept, update the architecture section at the bottom of the index.

Only update this section when the system architecture itself changes.

## Rule of Thumb

Create a new ADR when:

* A new architectural pattern is introduced.
* A naming convention is established.
* A protocol or event format is defined.
* A storage or synchronization strategy is chosen.
* A decision will likely need explanation in the future.

Do not create ADRs for:

* Small implementation details.
* Bug fixes.
* Refactoring that does not change architecture.

## Goal

The ADR index should provide a high-level map of the system.

Individual ADRs should explain the reasoning behind each major decision.

Together they should answer:

```text
What does the system do?
How does it work?
Why was it designed this way?
```
