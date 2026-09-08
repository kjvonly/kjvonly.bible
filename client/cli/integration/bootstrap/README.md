# Bootstrap Publication Integration Test

## Purpose

This integration test verifies that Resources published by the KJVOnly Resource Publishing CLI can be reconstructed from the remote publication targets without changing their bytes.

The test performs a complete publication round trip:

```text
source files
    ↓
CLI sync
    ↓
Nostr relay + Blossom
    ↓
integration verifier
    ↓
reconstructed files
    ↓
SHA-256 comparison
```

The primary invariant is:

```text
SHA256(source file)
    ==
SHA256(reconstructed published file)
```

The verifier does not validate application Domain Object schemas. Its purpose is to verify the CLI publication pipeline and the integrity of the serialized Resource bytes.

It also verifies that each Collection declared by the manifest has a corresponding Collection event on the relay.

---

# What the Test Verifies

The integration test verifies:

* the expected Resource event exists on the relay,
* the event has the expected `representation`,
* inline `content` Resources can be reconstructed from the Nostr event,
* descriptor-backed Resources contain a matching `ResourceDescriptor`,
* Blossom content can be downloaded,
* Blossom SHA-256 metadata matches the downloaded bytes when present,
* Blossom size metadata matches the downloaded bytes when present,
* reconstructed files preserve the original data hierarchy,
* every reconstructed file has the same SHA-256 hash as its source file,
* no expected reconstructed file is missing,
* no unexpected reconstructed file exists,
* each manifest Collection has exactly one corresponding Collection event,
* the Collection event has the expected representation.

The test deliberately does **not**:

* parse Bible Chapter schemas,
* validate Strong's schemas,
* validate overlay schemas,
* decompress gzip content,
* compare decoded JSON,
* install Domain Objects,
* verify application behavior,
* validate the contents of a Collection descriptor document.

Those concerns belong to other layers.

The integration test operates on serialized bytes.

---

# Test Location

The verifier lives under:

```text
client/cli/
└── integration/
    └── bootstrap/
        ├── README.md
        ├── verify-bootstrap.mjs
        └── lib/
            ├── manifest.mjs
            ├── relay.mjs
            ├── reconstruct.mjs
            └── compare.mjs
```

The files have the following responsibilities.

## `verify-bootstrap.mjs`

Top-level test orchestration.

It:

1. loads the publication manifest,
2. discovers the expected Resources,
3. queries the relay,
4. verifies Collection events,
5. reconstructs Resource files,
6. compares the source and reconstructed trees,
7. reports all detected verification errors.

## `lib/manifest.mjs`

Reads the publication manifest and derives the expected publication state.

It determines:

* manifest kind,
* relay URL,
* Resource source files,
* Resource `d` values,
* Resource representations,
* event encodings,
* object-upload encodings,
* Collection `d` values,
* Collection representations,
* common source root.

## `lib/relay.mjs`

Queries the configured Nostr relay for all events of the manifest kind.

For example:

```text
kind = 37770
```

The test intentionally queries by kind rather than maintaining a separate expected list of remote events.

If the relay requires NIP-42 authentication, the verifier authenticates using `NOSTR_SECRET_KEY`.

## `lib/reconstruct.mjs`

Reconstructs published Resource files.

For inline Resources:

```text
Nostr event
    ↓
event.content
    ↓
hex decode
    ↓
original serialized bytes
```

For descriptor-backed Resources:

```text
Nostr event
    ↓
hex decode
    ↓
ResourceDescriptor[]
    ↓
matching ResourceDescriptor
    ↓
Blossom URL
    ↓
download raw bytes
```

The downloaded bytes are then written into a hierarchy matching the original source hierarchy.

## `lib/compare.mjs`

Compares the original source files with the reconstructed files.

For every file it compares:

```text
SHA256(source)
    ==
SHA256(downloaded)
```

It also detects:

* missing downloaded files,
* unexpected downloaded files,
* SHA-256 mismatches.

---

# The Manifest Is the Source of Truth

The integration test does not contain a hard-coded list of KJVOnly Resources.

The publication manifest is the source of truth.

The verifier derives the expected publication from:

```yaml
kind:

nostr:
  relays:

resources:

collections:
```

For each Resource, it reads:

```yaml
path:

event:
  encoding:
  tags:

object-upload:
```

The relevant event tags include:

```yaml
- ["d", "..."]
- ["representation", "..."]
```

The test therefore uses the same contract that the CLI used when publishing the Resource.

Conceptually:

```text
manifest
    ↓
defines source path
    ↓
defines Resource identity
    ↓
defines representation
    ↓
CLI publishes it
    ↓
integration test reconstructs it
```

There is no second test-specific Resource registry.

---

# Source Paths Define the Downloaded Hierarchy

The verifier does not derive filesystem paths from Nostr Resource IDs.

For example, it does **not** assume:

```text
d:
kjvonly/overlays/paragraphs/default
```

must correspond to some particular hard-coded filesystem location.

Instead, the manifest defines the relationship:

```yaml
bible-paragraphs:
  path: ./data/bible/overlays/paragraphs/bundles/default.json.gz

  event:
    tags:
      - ["d", "kjvonly/overlays/paragraphs/default"]
```

The manifest therefore bridges:

```text
filesystem organization
        ↔
Published Resource identity
```

This allows the filesystem to follow application/domain organization without forcing it to exactly mirror the Nostr Resource namespace.

---

# Data Hierarchy

Integration test data should follow the same domain-first organization intended for production data.

The general convention is:

```text
data/
└── <domain>/
    └── <resource category>/
        ├── content/
        └── bundles/
```

Not every Resource category must contain both directories.

Only create the directories that are actually used.

---

# `content/`

`content/` contains serialized files that are published directly inside Nostr Resource events.

For example:

```text
data/
└── bible/
    └── chapters/
        └── content/
            ├── kjv/
            │   ├── 1_1.json.gz
            │   └── 1_2.json.gz
            └── kjvs/
                ├── 1_1.json.gz
                └── 1_2.json.gz
```

A manifest Resource can point at one of these directories:

```yaml
resources:
  bible-chapters-kjvs:
    path: ./data/bible/chapters/content/kjvs
```

Each file becomes a concrete Resource.

For example:

```text
1_1.json.gz
    ↓
key = 1_1
    ↓
kjvonly/bible/chapters/kjvs/1_1
```

The current verifier derives the key from the filename before the first `.`.

---

# `bundles/`

`bundles/` contains serialized Resource objects intended for external publication, currently through Blossom.

For example:

```text
data/
└── bible/
    └── chapters/
        └── bundles/
            ├── kjv.json.gz
            └── kjvs.json.gz
```

These are normal serialized Resource files.

They are not ResourceDescriptor files.

The CLI uploads the file to Blossom and generates the `ResourceDescriptor`.

Conceptually:

```text
kjvs.json.gz
    ↓
Blossom
    ↓
ResourceDescriptor
    ↓
Nostr descriptors event
```

---

# Current Bootstrap Test Hierarchy

A small bootstrap fixture can use:

```text
data/
├── bible/
│   ├── chapters/
│   │   ├── content/
│   │   │   ├── kjv/
│   │   │   │   ├── 1_1.json.gz
│   │   │   │   └── 1_2.json.gz
│   │   │   └── kjvs/
│   │   │       ├── 1_1.json.gz
│   │   │       └── 1_2.json.gz
│   │   └── bundles/
│   │       ├── kjv.json.gz
│   │       └── kjvs.json.gz
│   │
│   ├── overlays/
│   │   ├── paragraphs/
│   │   │   └── bundles/
│   │   │       └── default.json.gz
│   │   └── pericopes/
│   │       └── bundles/
│   │           └── default.json.gz
│   │
│   ├── indexes/
│   │   └── bible/
│   │       └── bundles/
│   │           └── kjv.json.gz
│   │
│   └── metadata/
│       └── booknames/
│           └── bundles/
│               └── default.json.gz
│
└── strongs/
    └── definitions/
        └── bundles/
            └── kjvs.json.gz
```

Overlays live under the domain they modify.

For example:

```text
bible/overlays/
```

rather than:

```text
overlays/
```

This leaves room for another domain to define its own overlays later without treating all overlays as one global domain.

---

# Directory Resources

When a manifest Resource points at a directory, the verifier expands the immediate files in that directory.

For example:

```yaml
path: ./data/bible/chapters/content/kjvs
```

with:

```text
1_1.json.gz
1_2.json.gz
```

produces two expected Resources.

Hidden files are ignored.

The current integration fixture should keep directory Resource files directly inside that directory rather than introducing another nested hierarchy beneath it.

---

# File Resources

When a manifest Resource points directly at a file:

```yaml
path: ./data/bible/chapters/bundles/kjvs.json.gz
```

that file represents one concrete Resource.

This is the normal structure for bundle Resources.

---

# Current Supported Round-Trip Encodings

The current verifier intentionally supports the publication formats used by the bootstrap test.

## Inline content

Expected:

```yaml
event:
  encoding:
    - hex
```

The source file is already gzip-compressed when applicable.

Therefore:

```text
source .json.gz bytes
    ↓
hex
    ↓
event.content
```

The verifier reverses only the hex encoding.

---

## Descriptor events

Expected:

```yaml
event:
  encoding:
    - hex
```

The descriptor document is:

```text
ResourceDescriptor[]
    ↓
JSON
    ↓
hex
    ↓
event.content
```

---

## Blossom objects

For byte-for-byte testing, the current fixture uses:

```yaml
object-upload:
  encoding: []
```

This means the source file already contains the final bytes uploaded to Blossom.

For example:

```text
kjvs.json.gz
    ↓
uploaded unchanged
    ↓
Blossom
```

This allows the integration test to compare the original file directly with the downloaded Blossom object.

If a future manifest uses transformations such as:

```yaml
object-upload:
  encoding:
    - gzip
```

the round-trip verifier will need to be extended intentionally.

The current verifier fails rather than silently applying assumptions.

---

# Collections

Collections are generated publication state and do not correspond to source files in the `data/` tree.

For example:

```yaml
collections:
  application-defaults:
    event:
      tags:
        - ["d", "kjvonly/resources/collections/default"]
        - ["representation", "descriptors"]
```

The verifier checks that the relay contains exactly one matching Collection event and that its representation matches the manifest.

Collections are not written into the reconstructed filesystem.

Therefore:

```text
manifest Resource
    → source file
    → reconstructed file
    → SHA comparison

manifest Collection
    → generated event
    → existence/representation check
```

The current test does not inspect the Collection's descriptor payload.

---

# Disposable Docker Test Environment

Integration tests should run against the dedicated Docker Compose test project rather than the normal development stack.

Both environments use the same Compose file.

They are separated using Compose project names.

Conceptually:

```text
normal:
    project = kjvonly

integration:
    project = kjvonly-test
```

This produces isolated Compose resources such as:

```text
kjvonly-postgres-1
kjvonly-minio-1
kjvonly-relay-1
kjvonly-blossom-1
```

and:

```text
kjvonly-test-postgres-1
kjvonly-test-minio-1
kjvonly-test-relay-1
kjvonly-test-blossom-1
```

The projects also receive separate default networks and normal Compose-managed volumes.

Do not define fixed `container_name` values if both projects need to run simultaneously.

---

# Test Environment Ports

The test project currently uses separate host ports from the normal development stack.

For example:

```text
Postgres:      localhost:15432
MinIO API:     localhost:19000
MinIO Console: localhost:19001
Nostr relay:   ws://localhost:13334
Blossom:       http://localhost:13335
```

The bootstrap integration manifest should point at the test endpoints.

For example:

```yaml
nostr:
  relays:
    - ws://localhost:13334
```

and the Blossom publication strategy should use:

```text
http://localhost:13335
```

The verifier itself does not need a separate Blossom configuration.

It discovers Blossom locations from the ResourceDescriptors published by the CLI.

---

# Starting the Test Environment

From the repository root:

```bash
make test-up
```

To inspect the environment:

```bash
make test-logs
```

Individual services can also be inspected with targets such as:

```bash
make test-logs-postgres
make test-logs-minio
make test-logs-relay
make test-logs-blossom
```

Database access is available through:

```bash
make test-psql
```

and:

```bash
make test-psql-blossom
```

---

# Starting With a Clean Test Environment

For a deterministic integration run, clear the previous test project first:

```bash
make test-down-clean
make test-up
```

This is preferable when testing publication behavior because the verifier queries the relay by kind:

```text
kind = manifest.kind
```

The test environment is intentionally treated as disposable.

A clean test relay prevents unrelated or stale test events from affecting the results.

---

# Nostr Authentication

The test relay may require NIP-42 authentication.

Export the same test signing key used for CLI publication:

```bash
export NOSTR_SECRET_KEY="<64-character-hex-secret-key>"
```

Do not store the secret key in the manifest.

The integration verifier uses `NOSTR_SECRET_KEY` only if the relay responds with `auth-required`.

---

# Installing CLI Dependencies

The integration verifier uses dependencies already installed by the CLI package, including:

* `nostr-tools`,
* `ws`,
* `yaml`.

From:

```text
client/cli
```

install dependencies normally if needed:

```bash
npm install
```

No separate integration-test package is required.

---

# Running the CLI Tests and Build

Before performing the live integration test:

```bash
cd client/cli

npm run test
npm run build
```

Or use the repository Make target if one has been configured for this workflow.

---

# Publishing the Bootstrap Fixture

The remote environment must first contain the publication being tested.

From:

```text
client/cli
```

run the CLI against the integration manifest:

```bash
node dist/main.js sync -v <manifest.yaml>
```

For example, if using the verbose log formatter:

```bash
node dist/main.js sync -v <manifest.yaml> \
    | node scripts/format-verbose-log.mjs
```

The manifest must point at the disposable test relay and Blossom environment.

---

# Running the Integration Verifier

From:

```text
client/cli
```

run:

```bash
node integration/bootstrap/verify-bootstrap.mjs <manifest.yaml>
```

For example:

```bash
node integration/bootstrap/verify-bootstrap.mjs \
    ../../zarf/manifest/bootstrap-test.yaml
```

Use the actual path of the integration manifest in the repository.

---

# Complete Manual Test Flow

A clean integration run is conceptually:

```bash
make test-down-clean
make test-up

cd client/cli

npm run test
npm run build

node dist/main.js sync -v <manifest.yaml> \
    | node scripts/format-verbose-log.mjs

node integration/bootstrap/verify-bootstrap.mjs \
    <manifest.yaml>
```

Afterward:

```bash
cd ../..
make test-down
```

Or destroy the test volumes as well:

```bash
make test-down-clean
```

---

# Reconstructed Output

Before reconstruction, the verifier removes the previous downloaded test tree.

New files are written beneath:

```text
client/cli/.tmp/bootstrap/downloaded/
```

The hierarchy mirrors the Resource source hierarchy relative to the common source root.

For the bootstrap fixture this will look approximately like:

```text
client/cli/.tmp/bootstrap/downloaded/
├── bible/
│   ├── chapters/
│   │   ├── content/
│   │   └── bundles/
│   ├── overlays/
│   ├── indexes/
│   └── metadata/
└── strongs/
    └── definitions/
```

This directory is test output and should not be committed.

The CLI `.gitignore` should exclude:

```text
.tmp/
```

---

# Relay Discovery

The verifier queries:

```text
kinds:
    [manifest.kind]
```

It intentionally does not maintain a separate list of event IDs.

Returned events are indexed by their `d` tags.

For every expected Resource:

```text
manifest Resource
    ↓
concrete d value
    ↓
matching relay event
```

Exactly one matching event is expected.

The same rule is applied to manifest Collections.

Because discovery is kind-based, a disposable test relay is important.

---

# Inline Resource Reconstruction

For a Resource such as:

```text
data/bible/chapters/content/kjvs/1_1.json.gz
```

with:

```yaml
representation: content
encoding:
  - hex
```

the published path is:

```text
1_1.json.gz
    ↓
hex encoding
    ↓
Nostr event.content
```

The integration verifier performs:

```text
event.content
    ↓
hex decode
    ↓
1_1.json.gz
```

It does not decompress the gzip file.

The recovered bytes are written directly to the downloaded tree.

---

# Descriptor Resource Reconstruction

For:

```text
data/bible/chapters/bundles/kjvs.json.gz
```

the publication path is:

```text
kjvs.json.gz
    ↓
Blossom upload
    ↓
ResourceDescriptor
    ↓
descriptor event
    ↓
Nostr relay
```

The verifier performs the reverse:

```text
Nostr descriptor event
    ↓
hex decode
    ↓
ResourceDescriptor[]
    ↓
find descriptor where:
metadata.resourceId == expected d
    ↓
Blossom strategy
    ↓
download first available URL
    ↓
raw kjvs.json.gz bytes
```

The verifier understands both:

```json
"url": "..."
```

and:

```json
"urls": [
  "...",
  "..."
]
```

for Blossom strategy data.

When multiple URLs exist, they are attempted until one succeeds.

---

# Descriptor Integrity Checks

When present, the verifier checks:

```text
strategy.data.sha256
```

against the actual downloaded Blossom bytes.

It also checks:

```text
strategy.data.size
```

when it is an integer.

This gives two integrity checks for descriptor-backed Resources:

```text
descriptor SHA
    ==
downloaded Blossom SHA
```

followed later by:

```text
source SHA
    ==
downloaded Blossom SHA
```

---

# Final SHA-256 Comparison

After reconstruction, the verifier compares every expected source Resource file against the reconstructed file.

It detects:

```text
missing file
unexpected file
SHA mismatch
```

A successful result ends with output similar to:

```text
Verification summary
  Collections: 1/1
  Resources:   11/11
  Files:       11/11 SHA-256 matches
  Downloaded:  .../.tmp/bootstrap/downloaded

PASS: 11/11 files match by SHA-256.
```

---

# Failure Reporting

Manifest loading and relay access are prerequisites.

Fatal setup failures stop immediately.

Examples include:

* manifest cannot be read,
* invalid YAML,
* missing required manifest values,
* invalid Resource paths,
* unsupported manifest structure required by the verifier,
* relay connection failure,
* relay authentication failure.

Once remote verification begins, the verifier attempts to discover as many problems as possible in one run.

It accumulates:

* Collection errors,
* Resource reconstruction errors,
* missing files,
* unexpected files,
* SHA mismatches.

For example:

```text
Verification summary
  Collections: 0/1
  Resources:   9/11
  Files:       8/11 SHA-256 matches

Verification errors (4)

[collection] kjvonly/resources/collections/default
  Expected exactly one Collection event, found 0.

[resource] kjvonly/bible/chapters/kjvs/1_2
  Expected exactly one relay event, found 0.

[file] bible/chapters/content/kjvs/1_2.json.gz
  Missing downloaded file.

[file] bible/chapters/bundles/kjvs.json.gz
  SHA-256 mismatch.
  source:     ...
  downloaded: ...

FAIL: 4 verification errors.
```

This behavior is intentional.

A single bad Resource should not prevent the test from detecting problems with the other published Resources.

---

# Adding a New Resource to the Integration Test

To test another Resource:

1. place the source file under the appropriate domain hierarchy,
2. add the Resource to the manifest,
3. publish the manifest,
4. rerun the verifier.

No verifier code should be needed for an ordinary Resource that uses an already-supported publication shape.

For example:

```text
data/
└── plans/
    └── readings/
        └── bundles/
            └── default.json.gz
```

could be added to the manifest as a descriptor-backed Resource.

The verifier discovers it from the manifest automatically.

This is one of the primary reasons the manifest remains the source of truth.

---

# Adding a New Domain

The filesystem hierarchy is domain-first.

For example:

```text
data/
├── bible/
├── strongs/
└── plans/
```

Each domain can define its own Resource categories:

```text
data/
└── <domain>/
    └── <resource-category>/
        ├── content/
        └── bundles/
```

There is no global requirement that categories such as `overlays` live at the root.

For example:

```text
bible/overlays/
```

means Bible overlays.

A future domain could independently have:

```text
maps/overlays/
```

without changing the integration-test architecture.

---

# When the Verifier Should Be Extended

The verifier should only gain additional decoding behavior when the integration fixtures actually use a new publication shape.

Examples include:

```text
event.encoding:
  - gzip
  - hex
```

or:

```text
object-upload:
  encoding:
    - gzip
```

or a new external strategy other than Blossom.

Do not silently infer these transformations from filenames.

The manifest explicitly defines the publication contract, and the verifier should follow that contract deliberately.

---

# Mental Model

The simplest way to understand this integration test is:

```text
manifest
    =
expected publication contract

data/
    =
source serialized Resources

Nostr + Blossom
    =
actual remote publication

.tmp/bootstrap/downloaded/
    =
reconstructed remote publication

SHA-256 comparison
    =
proof that serialized bytes survived the round trip
```

A passing test means:

> Every Resource described by the integration manifest was recoverable from the publication infrastructure as the same serialized bytes that were provided to the CLI, and every declared Collection was present on the relay.

That is the boundary this integration test is intended to prove.
