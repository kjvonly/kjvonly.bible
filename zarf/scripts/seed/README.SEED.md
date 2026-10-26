# Resource Publishing and Data Preparation

The Resource Publishing CLI publishes serialized Resources from the worktree-local
`data/` directory to the configured Nostr relay and Blossom server. The active
application manifests are `zarf/manifest/app-data.yaml` (local) and
`zarf/manifest/app-data-home.yaml` (home). The legacy `nak`-based chapter,
Strong's, reading-plan and bootstrap seed scripts have been removed.

The usual bundle-first workflow does not require individual Bible chapter files.
If direct chapter events are needed to speed up an initial chapter load, expand
`data/bible/chapters/bundles/kjvs.json.gz` into
`data/bible/chapters/content/kjvs/` locally and uncomment the
`bible-chapters-kjvs` Resource in the selected app-data manifest. Expansion
is optional; thousands of individual chapter files are not normally committed
through Git LFS. The manifest does not perform this expansion automatically.

## Application publication

From the repository/worktree root, prepare the configured application Resources
without publishing:

```bash
make app-data-build
```

Publication uses the existing CLI targets (these contact the configured relay
and Blossom server):

```bash
make app-data-sync
```

Ensure `data/` contains the manifest's referenced Resource files before
building or publishing. Use `git lfs pull` if a checked-out bundle is still an
LFS pointer rather than a gzip file.

## Development signing key

The Makefile obtains `NOSTR_SECRET_KEY` from `~/.config/nostr/dev.key` for its
publication commands. Generate a development key with `make nostr-keygen`,
inspect its public key with `make nostr-pub`, and keep the private key out of
Git. Publishing still requires the appropriate configured service endpoints.

---

## Dictionary Headword Indexes (published Blossom Resources)

Build the published `FlexSearch.Document` index from the current Dictionary
edition bundle's `headwords` associations. Each association indexes both
its searchable headword and its definition key, while storing the original
`{ headword, key }` for display and retrieval. Keys such as `G1` and `H1`
are searchable (case-insensitively) using the same index, independently
of the `definitions` map. The
index contains no definition content and retains `formatVersion: 1` while we
replace the development contract in place.

Use **the PWA's installed FlexSearch 0.7 dependency**. From the active worktree root (including `wt1`), generated files are read
from and written to that worktree's `data/` directory. To generate the index
files without publishing them:

```bash
for edition in webster-1828 webster-1844; do
  node zarf/scripts/seed/build-dictionary-headword-index.mjs \
    "data/dictionary/entries/bundles/$edition.json.gz" \
    "data/dictionary/indexes/bundles/$edition.json.gz" \
    "kjvonly/dictionary/entries/$edition"
done
```

To **regenerate and publish** both indexes through the existing manifest CLI:

```bash
zarf/scripts/seed/publish-dictionary-headword-indexes.sh local
# Or use 'home' for zarf/manifest/dictionary-search-indexes-home.yaml
```

The script generates:

- `data/dictionary/indexes/bundles/webster-1828.json.gz`
- `data/dictionary/indexes/bundles/webster-1844.json.gz`

The targeted manifests publish **only these two index Resources** to Blossom
and their descriptors to the relay. The same entries also exist in the full
`app-data.yaml` and `app-data-home.yaml` manifests for normal deployments.

Each index is publisher-independent, contains no definitions, and includes the
source dictionary's compressed-file SHA-256. The client validates the source
identity, checksum, `formatVersion: 1`, tokenizer, and encoding before
accepting an index.

**The published index is required for Dictionary installation.** The PWA
installs and imports the published `FlexSearch.Document` export; it does not
build a replacement index in the browser. Rebuild and republish the index after
changing a source Dictionary bundle or the index builder so the published
metadata and source checksum match the entries being installed. After changing
indexed fields, republish both Webster indexes with the command above and the
Strong's index with `publish-strongs-dictionary-edition.sh local` (or `home`).
Existing accepted development editions retain their old installed index until
reinstalled; opening Dictionary alone does not refresh an already-ready edition.


### Repacking existing Webster bundles

The current Dictionary entries format is an edition envelope with
`definitionFormat`, `headwords`, and `definitions`. Convert the existing keyed
Webster `.json.gz` source files without reprocessing raw definition records:

```bash
for edition in webster-1828 webster-1844; do
  node zarf/scripts/seed/convert-dictionary-bundle.mjs \
    "data/dictionary/entries/bundles/$edition.json.gz" \
    "data/dictionary/entries/repacked/$edition.json.gz"
done
```

Inspect the repacked output before replacing the published entries-bundle
inputs. Then publish the new entries Resources using the normal manifest
workflow, and regenerate/publish their matching headword indexes using the
command above. The index `sourceSha256` must match the **exact compressed bytes**
of the corresponding entries bundle. Existing local development installations
must be reinstalled; no migration or legacy reader is provided.

### Strong's as a Dictionary edition

The maintained Strong's publication inputs are the existing compressed
Dictionary edition and its matching search index:

- `data/dictionary/entries/bundles/strongs-kjvs.json.gz`
- `data/dictionary/indexes/bundles/strongs-kjvs.json.gz`

The standalone `data/strongs/definitions/bundles/strongs.json.gz` source bundle
has been retired and is **not** a normal publication input. Strong's entries
are published as Dictionary Resources, not as a separate `strongs/definition`
bundle in the current application manifests.

To rebuild the search index *without publishing* from the retained edition,
run from the active worktree root:

```bash
node zarf/scripts/seed/build-dictionary-headword-index.mjs \
  data/dictionary/entries/bundles/strongs-kjvs.json.gz \
  data/dictionary/indexes/bundles/strongs-kjvs.json.gz \
  kjvonly/dictionary/entries/strongs-kjvs
```

To regenerate the matching index and publish the existing edition and index
through the dedicated manifest:

```bash
zarf/scripts/seed/publish-strongs-dictionary-edition.sh local
# Or use 'home' for the home relay/Blossom environment.
```

The index's `sourceSha256` must match the **exact compressed edition bytes**.
The published index is required for Dictionary installation. When the edition
changes, regenerate and publish its matching index too.

`build-strongs-dictionary-edition.mjs` is retained as a tested offline
conversion utility for cases where the original Strong's definitions source
is supplied separately; the source is no longer part of this repository.
The normal publication script does not run that converter.
