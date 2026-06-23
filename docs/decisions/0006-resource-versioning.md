# 0006 Resource Versioning

## Status

Proposed

## Problem

Resources evolve over time.

Examples:

```text
Reading plans are updated
Paragraph schemes are improved
Pericope layouts are refined
Bible datasets receive corrections
```

The system needs a way to determine:

```text
Has a resource changed?
Should a resource be updated?
How are user modifications handled?
How is history preserved?
```

Versioning should remain compatible with Nostr's replaceable event model and should not require creating new resource identifiers for every update.

The system must also avoid situations where users accidentally modify shared publisher resources.

## Decision

KJVOnly uses stable resource identifiers.

Resources are identified by:

```text
pubkey + d
```

A resource identity does not change when its content changes.

Examples:

```text
kjvonly/plans/readings/yearly
kjvonly/overlays/paragraphs/default
kjvonly/overlays/pericopes/default
```

Version changes are detected using content identity rather than version numbers.

## Resource Identity

Resources maintain a stable identity throughout their lifetime.

Example:

```text
pubkey=publisher
d=kjvonly/plans/readings/yearly
```

The resource remains the same logical resource even if its content changes.

Resource identifiers should not include version numbers.

Avoid:

```text
kjvonly/plans/readings/yearly-v1
kjvonly/plans/readings/yearly-v2
kjvonly/plans/readings/yearly-v3
```

Prefer:

```text
kjvonly/plans/readings/yearly
```

with content updates occurring behind the same resource identity.

## Version Detection

KJVOnly uses content identity as the version.

### Blob Resources

For resources stored in Blossom:

```text
sha256
```

acts as the version identifier.

Example:

```json
{
  "resource": "kjvonly/plans/readings/yearly",
  "sha256": "abc123"
}
```

A different hash represents a different version.

### Event Resources

For resources stored directly in Nostr:

```text
event id
```

acts as the version identifier.

A new event ID represents a new version.

### General Rule

Conceptually:

```text
version = sha256 || eventId
```

Version numbers are not required.

## Manifest Behavior

Manifests provide a snapshot of resources at the time they are published.

Example:

```json
{
  "resource": "kjvonly/plans/readings/yearly",
  "sha256": "abc123"
}
```

The manifest represents a known-good version of a resource.

Clients may use manifests to bootstrap datasets.

## Manifest Staleness

A resource may be updated after a manifest is published.

Example:

```text
manifest
↓
sha=abc123
```

Later:

```text
same resource
new sha=xyz789
```

The manifest is now stale.

This is expected behavior.

### Rule

```text
Manifest = bootstrap state
Resource = current state
```

The manifest is authoritative for installation.

The resource is authoritative for updates.

Clients may compare the installed version with the latest resource version to determine whether updates are available.

## Update Detection

Clients may periodically check resource freshness.

Flow:

```text
resource id
↓
query latest resource
↓
compare sha/event id
↓
changed?
↓
update available
```

If the version is unchanged:

```text
do nothing
```

If the version differs:

```text
offer update
```

Updates should be user initiated.

Automatic replacement is discouraged.

## User-Owned Resources

Users should not modify publisher-owned resources directly.

Instead, users create their own resources.

Example:

```text
publisher reading plan
↓
fork
↓
user reading plan
```

The user publishes the fork under their own pubkey.

Example:

```text
publisher:
kjvonly/plans/readings/yearly

user:
kjvonly/plans/readings/my-yearly-plan
```

The user then has complete control over future changes.

## Forking Model

Forking creates a new resource identity.

Example:

```text
publisher:
pubkey=A
d=kjvonly/plans/readings/yearly
```

Fork:

```text
user:
pubkey=B
d=kjvonly/plans/readings/my-yearly-plan
```

These are separate resources.

Future modifications affect only the fork.

The original resource remains unchanged.

## History

The system does not require built-in version history.

History is created naturally through forks.

Examples:

```text
Original Plan
↓
Study Group Fork
↓
Personal Fork
```

Each resource is independently owned and versioned.

Future versions of the application may introduce explicit revision history.

This is intentionally outside the scope of the current design.

## Resource Refresh

When a resource is updated:

```text
new version detected
↓
user approves update
↓
resource downloaded
↓
resource verified
↓
resource re-imported
```

The existing resource contents are replaced.

Re-importing should remove records associated with the previous resource version before importing the new version.

This prevents stale or orphaned records.

## Design Rules

* Resource identifiers remain stable.
* Resources are identified by `(pubkey, d)`.
* Version numbers are not encoded into resource identifiers.
* Hashes and event IDs represent content versions.
* Manifests describe bootstrap state.
* Resources describe current state.
* Updates are detected through content comparison.
* Publisher resources are not edited directly.
* Users create forks when customization is required.
* Forks create independent resource ownership.
* Resource refreshes replace existing imported content.

## Consequences

* Resource identifiers remain simple and stable.
* Nostr replaceable events work naturally.
* Version numbers do not need to be managed manually.
* Users gain complete ownership of customized resources.
* Shared resources remain predictable.
* Manifests remain useful even when newer versions exist.
* Update detection is straightforward.
* Resource history can emerge naturally through forks.
* Future versioning systems can be introduced without changing resource identities.

## Big Takeaway

```text
Resource identity stays stable.

Content versions are determined by hashes or event IDs.

Shared resources are updated.
Customized resources are forked.
```
