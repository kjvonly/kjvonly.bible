# Remote Prune Design Note

## Status

Future work.

`prune` is not currently implemented.

## Purpose

Add an explicit, destructive cleanup workflow for remote publication state that was previously managed by a manifest but is no longer part of the manifest's current desired state.

Remote deletion must remain separate from normal `build`, `publish`, and `sync` behavior.

The intended command is:

```bash
kjvonly prune <manifest>
```

with mutation requiring an explicit option such as:

```bash
kjvonly prune <manifest> --apply
```

## Core Mental Model

The CLI distinguishes between:

```text
staging
    = current desired publication state

published state
    = remote state previously published and managed by this manifest
```

Pruning computes:

```text
previously managed published state
                -
current desired staged state
                =
remote deletion candidates
```

This preserves the existing behavior:

```text
build
    → prepares local desired state

publish
    → ensures desired state exists remotely

sync
    → build + publish

prune
    → removes previously managed remote state
      that is no longer desired
```

Normal `sync` remains non-destructive.

## Published-State Ledger

A future prune implementation requires durable knowledge of what the manifest previously published.

Staging alone is insufficient because `build` removes stale local staged files when source files or Resources disappear.

The CLI should therefore maintain a small published-state ledger, conceptually:

```text
<staging>/
├── artifacts/
├── events/
└── published/
```

The ledger represents successful remote publication state managed by this manifest.

It should contain enough information to identify previously published state without rediscovering ownership from broad remote queries.

For Nostr events, this may include:

```text
event ID
kind
publisher
d tag / Resource identity
event representation
descriptor information when applicable
```

For externally published artifacts, this may include:

```text
strategy
Blossom URLs
SHA-256
size
```

The exact persistence format is an implementation detail.

## Ownership Boundary

Prune must only consider state that the CLI can prove was previously managed by the current manifest.

It must not infer deletion ownership by querying all matching events from a relay.

For example, this is unsafe:

```text
query all events matching:
    publisher + kind + category

delete anything not currently staged
```

The relay may contain legitimate state published by another manifest or workflow.

Instead:

```text
published ledger
    → known managed state
```

defines the deletion boundary.

## Nostr Pruning

For each previously published event:

```text
previous published event ID
        ↓
exists in current desired staging?
        ↓
yes → keep
no  → deletion candidate
```

A removed Resource, source key, or Collection may therefore produce a Nostr deletion candidate.

The future implementation should publish the appropriate Nostr deletion event for the specific previously published event.

Remote-only relay events that are not recorded as manifest-managed state remain untouched.

## Blossom Pruning

Blossom deletion requires more caution because artifacts are content-addressed and may be shared.

A descriptor that disappears may reference an artifact such as:

```text
sha256 = abc123
```

Before treating that artifact as removable, prune must determine whether the SHA is still referenced by the manifest's current desired state.

```text
old artifact SHA
      ↓
referenced by current desired descriptors?
      ↓
yes → keep
no  → orphan candidate
```

Even an orphan candidate may still be used outside this manifest.

Therefore initial Blossom support should be conservative.

Recommended first implementation:

```text
Nostr deletion
    → supported with explicit --apply

Blossom orphan detection
    → reported

Blossom DELETE
    → separate explicit policy/option
```

A future interface might resemble:

```bash
kjvonly prune manifest.yaml --apply
```

for managed Nostr deletion, and:

```bash
kjvonly prune manifest.yaml --apply --artifacts
```

for explicitly authorized Blossom cleanup.

The exact flags may be decided during implementation.

## Collections

Collections use the same comparison model as Resources.

If a Collection remains in the manifest but its members change:

```text
build
    → creates a new Collection event

sync
    → publishes the replacement
```

The previous Collection event may become a prune candidate if it remains part of the recorded managed publication state.

If a Collection is removed entirely:

```text
previously published Collection
        -
current desired Collections
        =
Nostr deletion candidate
```

No special Collection-specific deletion mechanism is required beyond the normal managed-event pruning model.

## Dry Run

Because pruning is destructive, the default command should not mutate remote state.

```bash
kjvonly prune manifest.yaml
```

should produce a plan similar to:

```text
Nostr deletion candidates:
    <event-id>
    <event-id>

Blossom orphan candidates:
    <sha256>
```

Only an explicit apply operation should perform deletion.

```bash
kjvonly prune manifest.yaml --apply
```

Verbose logging should expose the same architectural seams as the rest of the CLI.

## Safety Rules

The prune implementation should preserve these invariants:

1. `build`, `publish`, and `sync` never implicitly delete remote state.
2. Prune is always an explicit operation.
3. Default prune behavior is inspection/dry-run.
4. Only state previously recorded as managed by the current manifest may be deleted.
5. Remote-only state is ignored.
6. Nostr deletion operates on specific known published event IDs.
7. Blossom artifacts are never deleted merely because one descriptor disappeared.
8. Artifact deletion requires proof that the artifact is no longer referenced by current desired state and an explicit destructive policy.
9. Failure partway through pruning must be safe to retry.
10. The published-state ledger must only advance after successful corresponding remote operations.

## Open Implementation Questions

The following should be decided when prune is implemented:

* exact published-ledger file format,
* whether published state is recorded per Resource or as a manifest-wide snapshot,
* exact Nostr deletion-event construction,
* whether deleted Nostr events remain in the ledger as tombstoned history,
* how Blossom DELETE authorization is handled,
* exact CLI flags for artifact deletion,
* whether prune operations require endpoint preflight before mutation.

These decisions do not affect the core model.

## Summary

The intended design is:

```text
Staging
    → what should exist now

Published ledger
    → what this manifest previously managed remotely

Prune
    → published managed state - current desired state
```

This keeps destructive lifecycle behavior explicit while preserving the existing non-destructive semantics of `sync`.
