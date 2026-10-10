# Normalized Document Filesystem Smoke

This example uses the CLI's normal recursive import, Manifest build, staging, and
publication pipeline. It imports the two small committed `.nd.json` documents and generates a separate
Git-ignored large document for Blossom testing. No PWA behavior is involved.

Configuration: `../normalized-document-smoke.yaml` (relative to this directory).
Source: `source/` (recursively scanned for `.nd.json`).

## Build and publish

From the repository root, with a local test `NOSTR_SECRET_KEY` configured:

```bash
make normalized-document-smoke-build
make normalized-document-smoke-publish
```

Use `make normalized-document-smoke-build-verbose` or
`make normalized-document-smoke-publish-verbose` for verbose CLI output.
Build stages the signed Resources and Filesystem without contacting the relay;
publish uses the generated Manifest and ordinary Blossom/Nostr publishers.
The YAML targets a local relay at `ws://localhost:3334` and Blossom at
`http://localhost:3335` if external storage is needed.

## Inspect files

After building, inspect
`zarf/manifest/normalized-document-smoke/.publication.generated.json` and
the referenced staging generation:

```bash
MANIFEST=zarf/manifest/normalized-document-smoke/.publication.generated.json
jq '{staging, resources, filesystems}' "$MANIFEST"
STAGING=$(jq -r '.staging.path' "$MANIFEST")
find "$STAGING" -type f | sort
```

The two committed fixtures and generated large document should produce these Filesystem locations:

```text
normalized-document-smoke/books/intro.nd.json
normalized-document-smoke/sermons/large.nd.json
normalized-document-smoke/sermons/romans-8.nd.json
```

Their Resource `d` path portions mirror the same root and relative paths.
The Filesystem Resource has its own `d` identity and the root `f` tag;
Filesystem entries must point to Nostr Resource descriptors, not Blossom blobs.

The build target also prepares `source/sermons/large.nd.json` from the small
committed `large.nd.json.stub`. The stub contains a `__LARGE_WORD__` marker;
Make writes a deterministic 1 MiB JSON word to an ignored `.large-content-block`
and uses `sed` to insert it into the ignored expanded document. The stub and
both committed documents remain unchanged. Make generates the large source only
if it is missing or older than its stub, so unchanged rebuilds can reuse events.

The three documents exercise **two inline Resources and one Blossom-backed
Resource** (source size >1 MiB), plus the Filesystem Resource. Run `build` before
`publish` and retain the generated source until external artifact publication
finishes. The ignored files are local smoke artifacts, not repository fixtures.

A second unchanged build should reuse signed event IDs. An edit to one source
file should rebuild its Resource and the dependent Filesystem event, leaving
unrelated Resource events unchanged. Generated staging generations are retained
so older output Manifests do not refer to deleted artifacts.

Filesystem overlays remain non-destructive: omitting a path in a later build
does not delete an already accepted Filesystem entry.
