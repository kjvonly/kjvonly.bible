# KJVOnly Data

Source data and generated publication artifacts tracked in the KJVOnly application repository and consumed by its Resource Publishing CLI.

This directory contains serialized Bible Resources, Dictionary entries and indexes, Reading Plans, and related checksum records used during publication.

The checked-in data is **bundle-first**: compressed bundles and other publication inputs are stored in Git LFS. Large collections of individual `content/` files are not kept in Git LFS by default because tracking thousands of separate files makes Git/LFS operations slow. Individual content can be expanded locally when bundles do not suffice.

---

## Repository Purpose

The `data/` directory is the source-data side of the KJVOnly Resource publishing workflow.

Conceptually:

```text
KJVOnly Data
    ↓
Resource Publishing CLI
    ↓
Nostr + Blossom
    ↓
Published Resources
    ↓
KJVOnly Application
```

This directory contains the serialized Resource content that the publishing CLI consumes.

Application runtime and publication implementation live outside `data/`, in their owning code directories.

---

# Repository Organization

The `data/` directory is the data root. Unless otherwise noted, Resource examples in this document are relative to `data/`; shell commands run from the main repository root.

Data is organized by application domain and Resource category. The following is the current checked-in layout (filenames included):

```text
data/
├── bible/
│   ├── chapters/bundles/
│   │   ├── kjv.json.gz
│   │   └── kjvs.json.gz
│   ├── indexes/bible/bundles/
│   │   └── bibleindex.json.gz
│   ├── metadata/booknames/bundles/
│   │   └── booknames.json.gz
│   └── overlays/
│       ├── paragraphs/bundles/
│       │   └── paragraphs.json.gz
│       └── pericopes/bundles/
│           └── pericopes.json.gz
├── dictionary/
│   ├── entries/bundles/
│   │   ├── strongs-kjvs.json.gz
│   │   ├── webster-1828.json.gz
│   │   └── webster-1844.json.gz
│   └── indexes/bundles/
│       ├── strongs-kjvs.json.gz
│       ├── webster-1828.json.gz
│       └── webster-1844.json.gz
├── plans/readings/default/
│   ├── nt-in-a-month.json.gz
│   ├── nt-5-year-plan.json.gz
│   ├── mcheyne.json.gz
│   ├── proverbs.json.gz
│   └── wisdom.json.gz
├── shasum/
│   ├── plans-20260912.sha256
│   ├── dictionary-20261025.sha256
│   └── check-20260907.sha256
└── README.md
```

Resource categories commonly use `bundles/` for compressed publication inputs. Some categories use another appropriate layout, such as `plans/readings/default/`. A `content/` directory is optional and is not part of the current tracked layout.

---

# `content/` — Optional Local Expansion

`content/` represents individual serialized Resources that can be published directly in Nostr events when chapter-level or other individual publication is needed.

**The current tracked `data/` tree does not contain a `content/` directory.** Keeping thousands of individually compressed Resources under Git LFS makes routine checkout, pull, and worktree operations slow. Prefer the checked-in bundles when they suffice.

When a workflow requires individual Resources, content can be expanded **locally** from the corresponding bundle rather than committing thousands of generated files to Git LFS. For example, a locally expanded Bible Chapter layout could be:

```text
bible/chapters/content/kjvs/
├── 1_1.json.gz
├── 1_2.json.gz
└── ...
```

This is an illustrative local output, **not a directory currently tracked in the repository**. Each generated file represents one Resource; Chapter filenames use `<book-id>_<chapter>.json.gz`.

Local expansion does not automatically make these files part of the committed data set or publication manifest. Locally expanded Bible Chapter files under `data/bible/chapters/content/` are ignored by `data/.gitignore`; they can be force-added deliberately if needed. Only retain and publish individual files when the relevant workflow requires them.

---

# `bundles/`

`bundles/` contains larger serialized Resources intended to be published through external object storage such as Blossom.

For example:

```text
bible/chapters/bundles/
├── kjv.json.gz
└── kjvs.json.gz
```

These files are Resource content.

They are **not** ResourceDescriptor documents.

The Resource Publishing CLI uploads the bundle bytes and generates the corresponding ResourceDescriptor during publication.

Conceptually:

```text
bundle
    ↓
Blossom
    ↓
ResourceDescriptor
    ↓
Nostr Resource event
```

---

# Bible Chapter Bundles

Bible chapter bundles contain multiple Chapter Resources keyed by version and chapter location.

Example:

```json
{
  "kjvs/1_1": {},
  "kjvs/1_2": {}
}
```

The checked-in bundles support efficient installation of an entire Bible version. Individual Chapter Resources remain possible for chapter-level publication and resolution, but their `content/` files may be expanded locally only when needed.

---

# Bible Overlays

Bible-specific overlays live under the Bible domain:

```text
bible/overlays/
```

Current overlays include:

```text
paragraphs/
pericopes/
```

Keeping overlays inside their owning domain allows other domains to define their own overlays later without introducing a global overlay namespace.

---

# Bible Indexes

Search indexes live under:

```text
bible/indexes/
```

For example:

```text
bible/indexes/bible/bundles/bibleindex.json.gz
```

Indexes are generated serialized Resources consumed by the application rather than source documents intended for manual editing.

---

# Bible Metadata

Bible metadata lives under:

```text
bible/metadata/
```

Current metadata includes:

```text
booknames/
```

For example:

```text
bible/metadata/booknames/bundles/booknames.json.gz
```

---

# Dictionary and Reading Plan Data

Dictionary entry bundles are stored under `dictionary/entries/bundles/`, with corresponding generated search indexes under `dictionary/indexes/bundles/`. The current editions are:

```text
strongs-kjvs.json.gz
webster-1828.json.gz
webster-1844.json.gz
```

Dictionary indexes are generated from the exact compressed source edition bytes and must be regenerated when those bundles change. See [the seed guide](../zarf/scripts/seed/README.SEED.md) for generation and publication commands.

Reading Plan Resources currently live under `plans/readings/default/` as individual compressed plan files:

```text
nt-in-a-month.json.gz
nt-5-year-plan.json.gz
mcheyne.json.gz
proverbs.json.gz
wisdom.json.gz
```

These files do not need a `bundles/` directory solely to match other domains; the publishing manifest defines how each file is used.

---

# Checksums

`shasum/` contains committed `.sha256` checksum lists, currently named:

```text
plans-20260912.sha256
dictionary-20261025.sha256
check-20260907.sha256
```

These are checksum records rather than compressed Resource payloads. Their names reflect specific snapshots; do not assume any one of them describes every current file. For a full comparison during migration or verification, generate a fresh checksum inventory as shown under Data Integrity.

---

# Git LFS

Compressed Resource payloads under `data/` use Git LFS in the **main repository**.
The root `.gitattributes` tracks:

```gitattributes
data/**/*.gz filter=lfs diff=lfs merge=lfs -text
```

This keeps small compressed integration fixtures elsewhere in the repository in regular Git. A second `data/.gitattributes` is not required. Plain `data/shasum/*.sha256` checksum records also remain in regular Git.

Have Git LFS installed before cloning or working with the repository. Each Git worktree checks out the Resource files at its own branch commit. Bundle-first tracking avoids placing thousands of individually expanded files into every worktree.

## Install Git LFS

macOS:

```bash
brew install git-lfs
```

Initialize it for your user:

```bash
git lfs install
```

---

# Clone and Update from GitHub

Contributors can clone the main KJVOnly repository directly from GitHub. The
`data/` directory is part of that repository; there is no separate data clone
or submodule setup. Install Git LFS first (see above):

```bash
git clone <github-repository-url>
cd kjvonly.bible
```

With Git LFS installed, ordinary Git operations normally download the required
compressed Resource files. To update an existing checkout:

```bash
git pull --ff-only
```

If any LFS contents were skipped or remain as pointer files, download and
restore the files needed by the checked-out commit:

```bash
git lfs pull
```

To list the LFS-tracked files in the current checkout:

```bash
git lfs ls-files
```

Each Git worktree has its own `data/` checkout at its branch commit and normally
shares the repository's local LFS object cache. Run `git lfs pull` from a
worktree when it needs its Resource files restored.

When updating committed Resource bundles, stage and push them using normal Git
commands; Git LFS's installed pre-push hook handles uploading new LFS objects
to GitHub:

```bash
git add data/
git commit -m "Update resource data"
git push
```

---

# Verify a File Was Downloaded

A checked-out LFS file should contain the actual Resource bytes rather than the small Git LFS pointer document.

For example:

```bash
gzip -t data/bible/chapters/bundles/kjv.json.gz
```

A successful command with no output indicates that the gzip file is valid.

---

# Data Integrity

For migrations, repository rebuilds, or fresh-clone verification, the compressed Resource files can be checked with SHA-256 hashes. The following commands hash **all local `.gz` files** under `data/`, including any locally expanded `content/` files; remove such local expansions first if comparing only the committed bundle-first data set.

Generate a checksum list:

```bash
find data -type f -name '*.gz' -print0 \
  | xargs -0 shasum -a 256 \
  | sort \
  > data.sha256
```

The resulting file contains both the SHA-256 digest and filename:

```text
<sha256>  data/bible/chapters/bundles/kjv.json.gz
<sha256>  data/bible/chapters/bundles/kjvs.json.gz
...
```

After cloning or migrating the repository, generate another list:

```bash
find data -type f -name '*.gz' -print0 \
  | xargs -0 shasum -a 256 \
  | sort \
  > data-clone.sha256
```

Compare them:

```bash
diff -u data.sha256 data-clone.sha256
```

No output means the filenames and file contents match exactly.

The checksum command covers gzip files across all domains, but it does not hash plain `.sha256` records or `README.md`. Run it from the main repository root. During migration, compare filenames relative to each respective data root. The files under `data/shasum/` are separate committed checksum records, not replacements for a fresh full inventory.

---

# Publication

This repository is intended to be consumed by the **KJVOnly Resource Publishing CLI**.

Publication manifests define how files in this repository become Published Resources.

The manifest is responsible for mapping:

```text
filesystem path
    ↓
Resource identity
    ↓
Resource representation
    ↓
publication strategy
```

For example, a file such as:

```text
bible/chapters/bundles/kjvs.json.gz
```

may be published as:

```text
kjvonly/bible/chapters/kjvs
```

The filesystem hierarchy and Published Resource namespace do not need to be identical.

The publication manifest is the explicit bridge between them.

---

# Generated Data

Most Resource payloads in `data/` are generated artifacts.

When changing the data pipeline:

1. regenerate the relevant Resource bundles or other publication inputs,
2. regenerate dependent indexes when their source bundles change,
3. verify the compressed files and relevant checksums,
4. review the changed tracked files,
5. commit the updated Git LFS objects.

Expand individual `content/` files locally only when a workflow requires them; do not automatically commit large expanded sets to Git LFS. Avoid manually modifying generated `.json.gz` files unless specifically debugging the generation process.

---

# Adding New Data

New data should follow the domain-first hierarchy and use the representation appropriate to the Resource category:

```text
<domain>/
└── <resource-category>/
    └── bundles/           # when the category publishes bundles
```

Prefer a small set of compressed publication inputs under Git LFS. Use optional `content/` expansion for individual Resources when a workflow cannot use bundles; local expansion does not need to become part of the versioned data tree.

Not every category needs `bundles/` or `content/`. For example, the current Reading Plan files live directly in `plans/readings/default/`. Do not create empty directories or move existing Resources solely for structural symmetry.

---

# Design Principle

This directory represents application data, not transport infrastructure.

The important separation is:

```text
KJVOnly Data
    =
serialized Resource content

Publication Manifest
    =
publication contract

Resource Publishing CLI
    =
publication implementation

Nostr / Blossom
    =
transport and remote storage

KJVOnly Application
    =
Resource consumer
```

Keeping those responsibilities separate allows the data layout to remain domain-oriented while publication strategies can evolve independently.
