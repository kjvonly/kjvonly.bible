# Application Filesystem

One durable Filesystem mount (`app-filesystem`) for application-owned documents,
including commentary, sermons, books, and other Normalized Documents. This
reuses the existing CLI directory importer and publication pipeline; it does
not change the Normalized Document format or add Matthew Henry special cases.

The actual source files live outside `zarf/manifest/` and are not included in
Git. Keep one cumulative tree, for example:

```text
~/app-files/
├── commentaries/Matthew Henry/01_Genesis/Commentary-on-Genesis-1.nd.json
├── commentaries/Matthew Henry/02_Exodus/Commentary-on-Exodus-1.nd.json
├── sermons/romans-8.nd.json
└── books/introduction.nd.json
```

From the **repository root**:

```bash
make app-filesystem-build APP_FILESYSTEM_SOURCE="$HOME/app-files"
make app-filesystem-publish

# Or build + publish in one command:
make app-filesystem-sync APP_FILESYSTEM_SOURCE="$HOME/app-files"
```

The source can also be a path relative to the repository root. The Makefile
resolves it to an absolute path before running the CLI from `client/cli`.
Use `VERBOSE=1` with any target to pass `-v` to the CLI, for example:

```bash
make app-filesystem-sync APP_FILESYSTEM_SOURCE="$HOME/app-files" VERBOSE=1

# Route every nonempty .nd.json file to Blossom (still publish Nostr descriptors):
make VERBOSE=1 INLINE_LIMIT_BYTES=0 app-filesystem-sync
```

This import **only discovers `.nd.json` files** recursively. Each document must
validate as Normalized Content; an invalid document stops the build rather
than silently omitting it. Source-relative directory and filename paths are
preserved under `app-filesystem/` in the Filesystem Resource. For example:

```text
app-filesystem/commentaries/Matthew Henry/01_Genesis/Commentary-on-Genesis-1.nd.json
```

The source tree is the complete set of files intended for this mount. To add a
collection, add its directory underneath the existing source root and rebuild.
Do not repoint the import at a disjoint folder and expect an automatic union
with earlier batches. Removal from a later Filesystem payload is not a client
tombstone: previously accepted mappings are non-destructive.

## Publication configuration

The default target is **development** (`APP_FILESYSTEM_ENV=development`),
using `zarf/manifest/app-filesystem-development.yaml` with
`ws://localhost:3334` and `http://localhost:3335`.

`APP_FILESYSTEM_ENV=production` uses the unchanged
`zarf/manifest/app-filesystem.yaml` with
`wss://kjvonly.bible.home:3334` and `https://kjvonly.bible.home:3335`.
Both configurations publish the same Filesystem Resource identity and root,
but use separate local staging generations and publication manifests.

```bash
# Default: localhost development backend.
make app-filesystem-sync

# Explicitly publish with the main app's production/home endpoints.
make app-filesystem-sync APP_FILESYSTEM_ENV=production
```

`app-filesystem-build` stages signed document Resource events and a gzip+hex
encoded Filesystem Resource in a new local staging generation. Compressing the
Filesystem index limits relay payload size for large document libraries without
changing its semantic datatype or mount identity. It writes the generated
publication manifest to
`zarf/manifest/app-filesystem/.publication-development.generated.json`
for development, or `.publication.generated.json` for production. Publish reads
the selected manifest and uses the existing `NOSTR_SECRET_KEY` environment variable; the
secret is not stored in the YAML. `NODE_USE_SYSTEM_CA=1` is set for publication,
as in the existing app-data targets.

### Document size and storage format

The default inline limit is **1 MiB (1,048,576 bytes of original `.nd.json`
source)**. It is not a limit on gzip output size or on the resulting Nostr event:

| Original document size | Staged content | Remote destination |
| --- | --- | --- |
| Up to and including 1 MiB | gzip+hex event content | Nostr |
| Greater than 1 MiB | Uncompressed, original JSON bytes | Blossom, with a Nostr descriptor event |

Blossom-backed Normalized Documents currently use `application/json` and
`object-upload.encoding: []`. The gzip+hex encoding on their **descriptor
events** does not compress the uploaded JSON artifact. The Filesystem index is
also gzip+hex, independently of document size. Nostr still carries descriptors
and the Filesystem Resource for externally stored documents.

Use `INLINE_LIMIT_BYTES=<bytes>` on `app-filesystem-build` or `app-filesystem-sync`
to override the per-file original-byte threshold. The Makefile forwards it to
`kjvonly import normalized-documents --inline-limit-bytes <bytes>`. Omitting it
preserves the 1 MiB default; `INLINE_LIMIT_BYTES=0` routes **all nonempty**
`.nd.json` sources to Blossom, even files that were previously staged inline.
Only the document storage representation changes: Nostr still publishes
signed descriptors and the Filesystem index. The Blossom artifacts remain raw
JSON, not gzip. The value must be a nonnegative safe integer. `VERBOSE=1`
only controls logging.

Changing the threshold requires `app-filesystem-build` again, followed by
`app-filesystem-publish`; `app-filesystem-publish` alone uses the already
staged Manifest and cannot change storage selection. The importer updates
changed Resource definitions and their dependent Filesystem event while
reusing unaffected signed events.

### Local staging and publication

A successful rebuild reuses eligible signed events and artifacts based on
source modification time, byte size, and definition revision (plus signer where
applicable). A normal unchanged rebuild does not rehash every source file.
Original JSON artifacts can be staged as **symlinks to `$HOME/app-files`**;
they are not necessarily independent archival copies. Keep the source files
available and unchanged between build and publish, or rebuild before publishing.

Staged event filenames encode revision metadata and can approach the Linux
255-byte **per-filename** limit. Atomic writes now create a short,
UUID-derived `.tmp` name in the same directory before renaming it to the
validated deterministic final filename. The temporary name does not append to
the full descriptive final name. This avoids the former `ENAMETOOLONG` failure
without renaming source files or changing Resource identities; final filenames
must still fit their staging format's own limits. The relay's configured
`d`-tag value limit is separate from this local filename limit.

Keep staging generations referenced by publication manifests. Generated
manifests and staging are Git-ignored. Build only prepares local artifacts;
`app-filesystem-publish` reconciles and uploads to the configured Blossom and
Nostr services.

## Application startup / File Manager

The PWA's `FILESYSTEM_BOOTSTRAP_RESOURCE` now refers to
`kjvonly/filesystem/app-filesystem` under `VITE_NOSTR_KJVONLY_PUBKEY`.
The CLI signer (`NOSTR_SECRET_KEY`) must derive this same public key.
Published files are not installed merely because they are staged.

For local development, enable the existing bootstrap release feature and use
the real IndexedDB Filesystem runtime:

```ini
VITE_NOSTR_COMMA_DELIMITED_RELAY_URLS=ws://localhost:3334
VITE_FILESYSTEM_BOOTSTRAP_MODE=enabled
VITE_FILESYSTEM_DEV_MODE=indexeddb
```

The bootstrap feature defaults to disabled; enable it only once the Filesystem
Resource has been published. Restart Vite after changing environment values.
The smoke fixture remains independent of the application mount.

## Validate the first import

```bash
find "$HOME/app-files" -type f -name '*.nd.json' | wc -l
make app-filesystem-build
jq '{staging, resourceCount: (.resources | length), filesystemCount: (.filesystems | length)}' \
  zarf/manifest/app-filesystem/.publication-development.generated.json
make app-filesystem-publish
```

The importer rejects invalid `.nd.json` documents. Publication targets the
selected manifest's Blossom and relay URLs; the localhost services and signer
must be available on the machine running the commands.
