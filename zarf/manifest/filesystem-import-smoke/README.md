# Filesystem Import Smoke (mixed files)

This smoke fixture uses the same **`import filesystem`** directory walker,
file-compiler registry, Manifest builder, staging, Blossom publisher, and Nostr
publisher as `app-filesystem`. Unlike `zarf/manifest/filesystem-smoke.yaml`
(which tests hand-written Resource/Collection/Filesystem definitions), this
smoke imports a **directory tree** and generates one Filesystem Resource.

Configuration: `../filesystem-import-smoke.yaml`. Source: `source/`.
Local relay: `ws://localhost:3334`; Blossom: `http://localhost:3335`.
The mount name is `filesystem-import-smoke`, separate from `app-filesystem`.

## Run from the repository root

```bash
make filesystem-import-smoke-build
make filesystem-import-smoke-publish
# Or run both, once each, with CLI diagnostics:
make VERBOSE=1 filesystem-import-smoke-sync
# Force all nonempty Normalized Documents to Blossom:
make VERBOSE=1 INLINE_LIMIT_BYTES=0 filesystem-import-smoke-sync
```

Build stages locally; publish uploads the stored artifact bytes to Blossom and
publishes Nostr events. `sync` builds before publishing and does not publish a
previous generated Manifest if the import fails. The optional `INLINE_LIMIT_BYTES`
changes only `.nd.json` inline-vs-Blossom handling; generic files and
`.nd.json.gz` are always external. No source file is recompressed by the generic
file strategy.

## Fixture coverage

| File under `source/` | Expected behavior |
|---|---|
| `books/intro.nd.json` | Strict validation, inline by default |
| `books/intro.nd.json.gz` | Decode for validation, original gzip bytes to Blossom |
| `sermons/romans-8.nd.json` | Strict validation, inline by default |
| `sermons/large.nd.json` | Generated >1 MiB, Blossom by default |
| `documents/sample.pdf` | Opaque PDF, Blossom |
| `office/sample.docx` | Opaque DOCX, Blossom |
| `office/sample.odt` | Opaque ODT, Blossom |
| `audio/sample.mp3` | Original audio bytes, Blossom |
| `images/mark.svg` | Original SVG bytes, Blossom |
| `archives/sample.zip` | Original ZIP bytes, Blossom |
| `archives/sample.tar.xz` | Original XZ archive bytes, Blossom |
| `texts/readme.txt` | Generic plain text, Blossom |
| `unknown/opaque.bin` | Unknown/binary fallback, Blossom |

There are **13 Filesystem entries** after fixture generation: three small
Normalized Document files including the pre-gzipped copy, one generated large
Normalized Document, and nine generic files. The displayed Filesystem paths
are `filesystem-import-smoke/<relative source path>`.

The large source is generated from committed `large.nd.json.stub` and a
1 MiB word block. Both generated files and publication/staging artifacts are
Git-ignored; Make retains the generated file when unchanged to exercise reuse.

## Inspect generated data

```bash
MANIFEST=zarf/manifest/filesystem-import-smoke/.publication.generated.json
jq '{staging, resourceCount: (.resources|length), filesystemCount: (.filesystems|length)}' "$MANIFEST"
STAGING=$(jq -r '.staging.path' "$MANIFEST")
find "$STAGING" -type f | sort
```

Expect **13 Resource definitions** and **one Filesystem definition**. Check
representative Nostr descriptor media types and Blossom hashes/bytes after
publishing. Gzipped Normalized Documents must not be gzipped again; generic
file artifacts must match the committed source bytes. An unchanged second
build should reuse signed event IDs. Changing a single generic file should
rebuild only that Resource and the dependent Filesystem event.

Filesystem overlays remain non-destructive. The old smoke mount, if previously
published, will not be removed by renaming this test fixture.
