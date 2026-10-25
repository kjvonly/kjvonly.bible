## Seeding Data

The seed scripts publish Bible content, Strong's Concordance data, and reading plans to the relay and Blossom storage.

### Environment Variables

| Variable           | Description                           | Default                 |
| ------------------ | ------------------------------------- | ----------------------- |
| `NOSTR_SECRET_KEY` | Nostr private key used to sign events | Required                |
| `RELAY_URL`        | Relay websocket endpoint              | `ws://localhost:3334`   |
| `BLOSSOM_URL`      | Blossom HTTP endpoint                 | `http://localhost:3335` |
| `DATA_DIR`         | Source data directory                 | Script specific         |
| `PARALLEL`         | Number of parallel workers            | `10`                    |

### Nostr Key

Generate a development key:

```bash
make nostr-key
```

View the public key:

```bash
make nostr-pub
```

The key is stored at:

```text
~/.config/nostr/dev.key
```

The Makefile exports `NOSTR_SECRET_KEY` for all seed targets.

---

## Bible Chapters

Chapter files are published directly to the relay using Kind `37770`.

### Relay

```bash
make seed-chapters-relay
```

### Blossom

Uploads aggregated Bible files to Blossom and publishes reference events.

```bash
make seed-chapters-blossom
```

### Everything

```bash
make seed-chapters
```

### Individual Bible Bundles

```bash
make seed-kjv
make seed-kjvs
```

---

## Strong's Concordance

Individual Strong's entries are published directly to the relay using Kind `37770`.

### Relay

```bash
make seed-strongs-relay
```

### Blossom

Uploads the aggregated concordance file and publishes a reference event.

```bash
make seed-strongs-blossom
```

### Everything

```bash
make seed-strongs
```

### Individual Bundle

```bash
make seed-strongs-all-file
```

---

## Reading Plans

Reading plans are published directly to the relay using Kind `37775`.

```bash
make seed-plans-relay
```

---

## Custom Nostr Kinds

| Kind    | Purpose                                  |
| ------- | ---------------------------------------- |
| `37770` | Bible chapter and Strong's entry content |
| `37775` | Reading plans                            |
| `37778` | Blossom file reference events            |

### Relay Content Events

Small files are stored directly in Nostr events.

* Content is hex-encoded `json.gz`
* Data is immediately available from the relay
* Used for chapters, Strong's entries, and reading plans

### Blossom Reference Events

Large files are uploaded to Blossom first.

A Kind `37778` event is then published containing:

* SHA256 hash (`x` tag)
* File URL (`url` tag)
* MIME/type metadata
* Deterministic identifier (`d` tag)

The relay stores metadata and discovery information while Blossom stores the actual file bytes.

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

Use **the PWA's installed FlexSearch 0.7 dependency**. From the `wt1`
repository root, the data directory is `../../data`. To generate the index
files without publishing them:

```bash
for edition in webster-1828 webster-1844; do
  node zarf/scripts/seed/build-dictionary-headword-index.mjs \
    "../../data/dictionary/entries/bundles/$edition.json.gz" \
    "../../data/dictionary/indexes/bundles/$edition.json.gz" \
    "kjvonly/dictionary/entries/$edition"
done
```

To **regenerate and publish** both indexes through the existing manifest CLI:

```bash
zarf/scripts/seed/publish-dictionary-headword-indexes.sh local
# Or use 'home' for zarf/manifest/dictionary-search-indexes-home.yaml
```

The script generates:

- `../../data/dictionary/indexes/bundles/webster-1828.json.gz`
- `../../data/dictionary/indexes/bundles/webster-1844.json.gz`

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
    "../../data/dictionary/entries/bundles/$edition.json.gz" \
    "../../data/dictionary/entries/repacked/$edition.json.gz"
done
```

Inspect the repacked output before replacing the published entries-bundle
inputs. Then publish the new entries Resources using the normal manifest
workflow, and regenerate/publish their matching headword indexes using the
command above. The index `sourceSha256` must match the **exact compressed bytes**
of the corresponding entries bundle. Existing local development installations
must be reinstalled; no migration or legacy reader is provided.

### Strong's as a Dictionary edition

The Strong's edition uses these **existing source bundles** (no changes to
those inputs):

- `../../data/strongs/definitions/bundles/strongs.json.gz`
- `../../data/bible/chapters/bundles/kjvs.json.gz`

Build one standard Dictionary edition at
`../../data/dictionary/entries/bundles/strongs-kjvs.json.gz` by copying the
original Strong's definitions keyed by their `G`/`H` IDs and generating
`{ headword, key }` associations from each Bible word's own Strong's `href`
references. Semicolon-separated Scripture cross-references are ignored. Tokens
without Strong's references do not contribute associations; punctuation and
soft hyphens are removed from searchable English headwords. Repeated pairs are
deduplicated. If a Bible reference points to a Strong's ID absent from the
definitions bundle, the generator omits only that association and warns with
the missing IDs; it does not invent definitions or drop existing definitions.
A build with no usable associations still fails. Missing IDs will remain
unavailable to direct Bible lookups until the source definitions are corrected.

The output keeps **one edition** for Greek and Hebrew, one flat association
list, and one separate published `FlexSearch.Document` index at
`../../data/dictionary/indexes/bundles/strongs-kjvs.json.gz`.

From the `wt1` repository root, build both files without publishing:

```bash
node zarf/scripts/seed/build-strongs-dictionary-edition.mjs \
  ../../data/strongs/definitions/bundles/strongs.json.gz \
  ../../data/bible/chapters/bundles/kjvs.json.gz \
  ../../data/dictionary/entries/bundles/strongs-kjvs.json.gz
node zarf/scripts/seed/build-dictionary-headword-index.mjs \
  ../../data/dictionary/entries/bundles/strongs-kjvs.json.gz \
  ../../data/dictionary/indexes/bundles/strongs-kjvs.json.gz \
  kjvonly/dictionary/entries/strongs-kjvs
```

Or build and publish **both** Resources through their dedicated manifest:

```bash
zarf/scripts/seed/publish-strongs-dictionary-edition.sh local
# Or use home for the home relay/Blossom environment.
```

The full `app-data.yaml` and `app-data-home.yaml` manifests also include the
new entries and index Resources. The existing `strongs/definition` Resource
remains in those manifests **until Bible/Strong's consumers are switched** in
a separate implementation slice. These publishing tools do not change client
Resource selection or definition presentation. All existing data and index
version values remain `1` during development.
