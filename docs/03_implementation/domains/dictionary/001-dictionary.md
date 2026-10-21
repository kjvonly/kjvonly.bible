# Dictionary Domain and Module — V1 Design Specification

**Status:** Chunked installation, Resource-selected search, and normalized definition rendering implemented; focused browser regressions exist, but full acceptance with published datasets remains to be verified
**Last reviewed:** 2026-10-20
**Worktree:** `wt1`
**Scope:** Two Application-configured editions installed on Dictionary entry, compact chunk persistence, headword-only search, on-demand definition reading through Normalized Content
**Placement:** `docs/03_implementation/domains/dictionary/001-dictionary.md`

This document records **both the accepted design and the current implementation**. Chunk installation, published-index fallback, persisted FlexSearch search, selectable headwords, worker-side chunk lookup, and normalized definition rendering are wired. The latest reported browser blocker—passing Svelte reactive proxies into `Worker.postMessage()`—was corrected and the user confirmed that fix. Focused browser regression tests now exercise navigation, search, worker lifecycle, and definition rendering; acceptance and performance with real published Webster bundles should still be verified. `chunks-v1` is the only supported Dictionary storage format; legacy per-entry compatibility and migration are intentionally out of scope during development. The no-delete policy remains in effect.

Related references:

- [Domain implementation map](../../010-domain-implementation-map.md)
- [Strong's Domain](../strongs/001-strongs.md)
- [Normalized Document](../normalized-content/001-normalized-document.md)
- [Bookmarks](../bookmarks/001-bookmarks.md)
- [Search indexes](../../persistence/003-search-indexes.md)
- [File Manager](../../modules/007-file-manager.md)
- [Application startup](../../platform/005-application-startup.md)
- [Resource installation](../../../02_resource-boundary/08-resource-installation-lifecycle.md)
- [Resource discovery](../../../02_resource-boundary/06-resource-discovery.md)

---

## Implementation checkpoint (2026-10-20)

This checkpoint separates source-level integration from browser-verified behavior. It does not replace the V1 acceptance criteria later in this document.

| Area | Current status |
|---|---|
| Edition publishing | Webster 1828 (60,948 headwords) and Webster 1844 (72,863 headwords) keyed gzip Resources are published. Their accepted local installation format is `chunks-v1`. |
| Dictionary selection | **Webster 1828** is the Application's default `dictionary/entries` selection. The root reads its navigation Resource, and a separate picker lists accepted local editions (including Webster 1844 when installed). Browser acceptance remains pending. |
| Chunk contracts and installation | **Implemented.** Deterministic size-balanced `dictionary/chunk` partitioning, `dictionary/chunk-map` range locator, chunk gzip, bounded IndexedDB writes, and final `dictionary/edition` completion transaction; default target **384 KiB decoded**, **4 chunks per write batch**. |
| Search index publication | **Implemented.** The CLI generates gzip-compressed, headword-only FlexSearch exports and publishes optional `dictionary/search-index` Resources through existing manifests/Resource descriptors. The user reported publishing these to the **local** relay/storage environment. |
| Search-index installation | **Implemented.** Try the optional published index through generic Resource resolution, verify headword coverage and format, then import; if unavailable or incompatible, build locally during Dictionary installation. Persist the accepted `dictionary/search-index` Domain object. |
| Search worker | **Implemented.** On-demand `dictionary-search.worker.ts` loads the selected edition index, supports Resource-scoped forward-prefix queries, and returns **headword identities**, not HTML. One request targets one edition; the shared worker serves multiple panes. |
| Search UI | **Implemented, with browser regression coverage.** Dictionary root uses the shared focused `SearchInput`, a More actions → Dictionary versions picker, full-width selectable headword rows, and the shared scrubber. With an empty query, it defaults to A-prefix browsing, with an ABC toggle and an A–Z button strip; this is not an unrestricted continuous catalog. |
| Definition worker | **Implemented.** `dictionary-definition.worker.ts` reads a selected chunk, decompresses it, extracts only that headword's definitions, normalizes HTML via the shared package, and returns a transferable `ArrayBuffer` containing only the requested result. |
| Entry view | **Implemented.** `dictionary.entry` receives publisher/Resource ID/headword navigation state, prepares that specific edition when opened directly, and renders the normalized result with `NormalizedContentRenderer`. The attribution uses the Application pet name when available, otherwise the first 16 pubkey bytes (32 hexadecimal characters). |
| HTML parser sharing | **Implemented.** `@kjvonly/html-normalized-content` was extracted from the CLI; parser/processor logic was preserved. CLI test-resolution and declaration-emission integration fixes were subsequently made. Browser parity/build still require validation on current source. |
| Worker message clone fix | **Verified by the user.** Search and definition clients snapshot the source `publisher` and `resourceId` into plain objects before `postMessage()`; Svelte reactive proxies cannot be structured-cloned. |
| Storage support policy | **`chunks-v1` only.** Obsolete per-entry storage services, models, and tests have been removed. No legacy compatibility or automatic migration is planned; no runtime data deletion is introduced. |
| Browser acceptance/performance | **Partially covered by regression tests.** Confirm a fresh chunk installation, published-index import, selected-Resource search and edition switching, selected-word rendering, offline reopening, and responsiveness against real published data. |

**Default selection and installation:** The Application sets Webster 1828 as the default `dictionary/entries` Resource and configures both Webster 1828 and Webster 1844 for lazy installation. Neither belongs to the published `application-defaults` collection, so opening the application alone does not download them. When a Dictionary view first opens, `DictionaryService.enter()` starts preparing both editions using the existing serial Resource-worker installation path; locally accepted editions are reused. Failed editions may be retried on a later view entry. The Dictionary root resolves and searches only its own selected Resource through navigation, matching Bible Search. No definition HTML is preloaded into the UI. The header names the selected edition. The Dictionary versions action is accessed through More actions; its picker lists accepted local editions and returns a Resource reference through `updateResourceSelection()`. Webster 1844 appears once installed; reopening the picker reads the newly accepted editions (the picker does not subscribe to in-progress installations). Republish `application-defaults` to remove dictionary entries from the deployed bootstrap collection.

### Worker-message invariant

Worker requests must contain **structured-cloneable snapshots**, not Svelte `$state` proxies or other reactive containers. Both `DictionarySearchWorkerClient.search()` and `DictionaryDefinitionWorkerClient.getNormalized()` copy only the primitive publisher and Resource ID into message-owned objects before posting. Tests use `structuredClone()` in fake ports to catch this regression. Do not solve message-cloning errors by moving parsing or search onto the UI thread.

## 1. Purpose and decision summary

Dictionary is one Domain containing independently identifiable editions. The published datasets contain **60,948** headwords in Webster 1828 and **72,863** in Webster 1844; both are distributed as one compressed Dictionary Resource each. An earlier development experiment installed each headword and a separate ResourceInstallation receipt, causing unacceptable browser-wide IndexedDB pressure even after pacing and request pipelining. That per-entry implementation has been removed and is not a supported storage path.

### Accepted target design

1. **One downloadable Dictionary Resource per edition** remains the distribution boundary. Existing verified gzip bundles remain eligible for reuse on interrupted installation. Do not publish 60,000 individual Resources or separate remote files for each chunk.
2. **Dictionary-owned, compressed `dictionary/chunk` objects** are the only supported persistent representation of definitions. Chunks contain complete ordered HTML definitions, not normalized documents.
3. **Chunks are balanced by approximate decoded byte size, not fixed first letters.** Lexicographically adjacent headwords stay together; chunk boundaries may split within any initial letter. The number of chunks is determined by size, not hardcoded to 26.
4. **A persisted `dictionary/chunk-map` locator** maps a canonical headword to its chunk through ordered key-range boundaries; it need not store one map entry per word.
5. **A persisted, edition-specific FlexSearch headword index** indexes/searches words only. V1 supports an **optional, separately published** prebuilt index Resource, resolved through the generic Resource descriptor; the installer falls back to building the index once from accepted keyed-bundle headwords. A future co-packaged index would require an explicit versioned contract. Neither index path loads HTML into the search worker.
6. **The Dictionary search UI shows words only.** Each pane searches its selected edition and receives canonical headword and publisher/Resource ID; the result row displays only the headword key. Do not load 20 definitions merely because 20 results are visible.
7. **Selecting a word** triggers an IndexedDB chunk lookup, worker-side decompression, exact headword lookup, and on-demand HTML → `NormalizedDocument` conversion for rendering. A bounded worker cache may retain decompressed recently used chunks.
8. **Preserve the existing Resource/Domain boundary, on-demand worker ownership, Resource selection and strict no-delete policy.** No generic installer changes or automatic storage cleanup.
9. **Defer generalized discovery, install management, full-definition search, and user-directed deletion** to their own designs.

The chunked persistence and search paths are now implemented. `chunks-v1` is mandatory, with no legacy reader, reprocessing path, or migration requirement. Remaining work concerns browser verification, browse UX refinement, and future data-version/update policy.

---

## 2. Goals, non-goals, and design constraints

### Goals

- Opening Dictionary (including a direct entry view) starts installation of both configured Webster editions through the existing Resource worker, without blocking Application startup. A direct entry also prepares its specifically requested edition before loading the definition. Already accepted editions are reused; failed editions can retry on a later entry. Preserve edition readiness and error reporting across panes.
- Persist approximately **one chunk object per bounded portion of content**, plus one locator, one search-index object (or bounded export parts), and one edition manifest per edition; do not persist one definition object and receipt per headword.
- Search only canonical headwords with FlexSearch prefix matching (`tokenize: "forward"`); include single-letter prefixes and the beginning of a complete multiword headword, not interior words.
- Return displayable words (and their source identities) from the search index. Selecting one word resolves only its chunk; never require definition HTML to display the results list.
- Search exactly one selected edition per request; share the on-demand worker across panes, even when the panes select different editions.
- Read definitions offline after completed installation, render via shared normalized-content parsing, and preserve accepted prior Domain state on failure.
- Keep Domain object identities stable across publisher/edition and preserve every source definition belonging to a headword.

### Out of scope

- New per-word network Resources, remote searches, and a separate download per chunk.
- Prefix matching inside the definition body, fuzzy/stemming search, or search through normalized HTML.
- Installing a full dictionary by writing every headword/definition as a standalone IndexedDB record.
- Automatic deletion, uninstall, legacy-format compatibility/migration, or generic Resource installer redesign.
- A general discover → inspect → install → manage UI, and browser-side eager HTML normalization.
- Preloading all compressed chunks into RAM to service headword search.

### Boundaries

- **Resource:** externally distributed edition bundle, verified transport/decode, semantic validation, accepted revision.
- **Dictionary Domain:** chunk content, edition manifest, chunk locator, index contracts and word lookup semantics.
- **Workers:** decode/partition/compress at installation; import/query FlexSearch and decompress selected chunks at read time. No 25 MB decoded dictionary is posted to the main thread.
- **Module:** list/search/filter/navigation, selection and errors; never owns raw IndexedDB transactions or directly injects HTML.
- **Normalized Content:** shared conversion and renderer; dictionary-specific definition HTML remains untrusted input until converted.

Application root exports remain Node-safe; browser/Svelte-specific APIs remain under the owning `/ui` boundary.

---

## 3. Source data and publication contract

### 3.1 Current keyed input (already published)

The source converter accepts JSON-array/NDJSON `{word, content}` records and produces one gzip-compressed keyed JSON payload per edition:

```json
{
  "a": [{"word":"A","content":"<div><p>Example definition.</p></div>"}],
  "aam": [{"word":"AAM","content":"<div><p>A measure of liquids.</p></div>"}]
}
```

The canonical key identifies a headword; its array preserves all definitions in source order and their original display spelling. Invalid/empty source records are reported and skipped by the source converter. The Resource semantic validator rejects invalid accepted payload shapes or versions. Resource publisher identity is taken from the verified envelope, never trusted from the HTML body.

### 3.2 Versioning and a prebuilt index

Keep **one downloadable compressed *entries* Resource per edition**. Its current semantic contract remains `kjvonly.dictionary.entries@1`.

1. **Current v1 keyed bundle:** the installation worker validates and partitions the entries into compressed chunks and builds the headword index from keys **only when a compatible published index is unavailable**. No per-headword objects are written.
2. **Current optional publication optimization:** the CLI separately generates and publishes a headword-only index Resource. The installation service attempts it through the ordinary Resource lifecycle **before** installing entries. A missing, mismatched, or incompatible index falls back to local generation. The index Resource is optional, not a dependency on any storage provider or a mandatory network request.
3. **Possible future combined payload:** packing a prebuilt index alongside definitions in one entries Resource would change the envelope and therefore requires a new explicit semantic data version. It is **not** the current publishing format.

An additional optional published **Resource** may carry a separate headword-only
FlexSearch export (`dictionary/search-index`, data type
`kjvonly.dictionary.headword-index@1`) under each edition.
The generator and `zarf/manifest/dictionary-search-indexes*.yaml`
publish this Resource through the configured publication/storage infrastructure
without modifying existing `entries@1` Resources. **Blossom is a publishing destination, not a Dictionary runtime
dependency**: the client passes publisher and Resource ID to the generic Resource
resolver, and the Resource descriptor chooses the storage mechanism. The index
Resource contains the source gzip SHA-256 and portable versioned export chunks;
publisher and accepted revision come from the Resource boundary. During
first-entry installation the application **optionally** resolves this index
Resource through the ordinary Resource lifecycle and persists it as
`dictionary/published-headword-index`. The chunk installer imports it when its
format, total count, and **every canonical headword ID** match the accepted
bundle. This detects stale same-count indexes without rebuilding FlexSearch.
Otherwise the installer builds the index locally. The source-gzip SHA-256 is
provenance metadata; the V1 client verifies exact headword membership rather
than claiming to have compared gzip bytes after Resource decoding. An optional index
Resource must never be a mandatory download or be confused with the locally installed
`dictionary/search-index` Domain object.

The prebuilt index must use the same canonical key normalization and tokenizer version as the browser search worker. Persist its export for future sessions; do not rebuild unless missing or incompatible. If browser/CLI FlexSearch serialization differs, reject the incompatible export and build from keys in the install worker rather than accepting misleading results.

### 3.3 Identity and object contracts

| Concept | Contract / rule |
|---|---|
| Published Resource type | `dictionary/entries` |
| Existing published semantic contract | `kjvonly.dictionary.entries@1` |
| Published Resource ID | `kjvonly/dictionary/entries/<edition>` (publisher supplied separately) |
| Persisted compressed data | `dictionary/chunk` |
| Persisted headword → chunk locator | `dictionary/chunk-map` |
| Persisted headword index | `dictionary/search-index` |
| Accepted completeness/metadata | `dictionary/edition` |
| Identity scope | Publisher + Resource ID (and accepted revision / chunk generation) |
| Chosen entry identity | Publisher + Resource ID + canonical headword key |

Use **`dictionary/chunk`**, with the conventional spelling *chunk* (rather than `dictionary/chunck`). These are **Domain object types, not additional published Resource types**. The unsupported `dictionary/entry` persistence contract and its store/service APIs have been removed. The installer must not emit per-word entries or per-word ResourceInstallation receipts. Accepted chunked objects use the existing `domain_objects` store and its `objectType` secondary index.

`dictionary/edition` requires `storageFormat: 'chunks-v1'`, `chunkGeneration`, and `chunkCount`, and records the accepted Resource revision and headword count. The associated locator and index must identify the accepted generation. No giant `activeKeys` array is persisted. The existing Resource installation currentness rules continue to govern whether an incoming edition is accepted; do not change the generic installer.

### 3.4 Chunk semantics

A compressed chunk is a keyed object of complete definition groups:

```json
{
  "abandon": [{"word":"ABANDON","content":"<div>...</div>"}],
  "abandonment": [{"word":"ABANDONMENT","content":"<div>...</div>"}]
}
```

Persist as binary gzip (`Uint8Array` in the current chunk model), not base64 strings or inflated JSON inside a Domain object. `dictionary/chunk` metadata records publisher, Resource ID, generation, ordinal, key range and uncompressed/compressed sizes. The adapter uses the existing IndexedDB `domain_objects` store; real-browser binary round-trip/storage-pressure testing remains an acceptance check.

One headword and all its definitions remain within exactly one chunk. An individual oversized headword is allowed a single oversized chunk and must be reported, never silently split or truncated.

---

## 4. Domain model and ownership

The Dictionary Domain owns edition identity, canonical headword normalization, chunk installation, locator lookup, definition retrieval, search-index compatibility and worker-facing capabilities. Application-owned `PetNameService` provides publisher display names; Dictionary does not own the user’s local pet names. No generic Resource/Filesystem/Outbox behavior is redesigned.

Conceptual shapes (`DictionaryEditionSource` is shared by the index, chunk, and accepted-edition models; the chunk-map construction and validation contracts are implemented in `models/dictionary-chunk.model.ts`, chunk identities in `models/dictionary-chunk-identity.ts`, and range lookup/partitioning in their respective services; consult those types rather than copying these sketches):

```ts
type DictionaryEditionSource = { publisher: string; resourceId: string };

type DictionaryChunk = {
  source: DictionaryEditionSource;
  generation: string;
  chunkId: string;
  ordinal: number;
  firstKey: string; // inclusive
  lastKey: string;  // inclusive
  gzip: Uint8Array; // illustration; choose verified structured-clone type
};

type DictionaryChunkRange = {
  chunkId: string;
  firstKey: string;
  lastKey: string;
};

type DictionaryChunkMap = {
  source: DictionaryEditionSource;
  generation: string;
  ranges: readonly DictionaryChunkRange[]; // ordered, disjoint
};
```

The search index returns canonical headword identities without accessing definition HTML; the current UI displays the key as the label. A selected word is expressed as `(publisher, resourceId, headwordKey)`, not a filename, offset, DOM node, or serialized definition.

### Ownership flow

```text
One verified Dictionary Resource per edition
    ↓
Dictionary Resource Worker: parse + validate
    ├── chunk partitioning / compression → dictionary/chunk
    ├── ordered ranges             → dictionary/chunk-map
    └── prebuilt index import OR key-only build → dictionary/search-index
    ↓ (manifest committed last)
Dictionary/edition installed
    ↓
Dictionary search worker → words + publisher/Resource identity
    ↓ user selects a word
Dictionary definition lookup → range locator → one compressed chunk
    ↓ (worker decompression + exact lookup)
Shared HTML normalizer → NormalizedDocument → NormalizedContentRenderer
```

- **Application composition** supplies configured default sources and one `DictionaryService` facade; it delegates edition preparation to the existing `DictionaryInstallationService`, while `DictionaryRuntime` owns the on-demand search and definition worker clients. Svelte views do not directly access installation or worker clients.
- **Normalized Content** owns source-neutral rendering; dictionary owns which edition/word is selected.
- **Bookmarks** remains unchanged. Future bookmarks to dictionary words need a stable Dictionary-owned target; do not impersonate a Normalized Resource.
- **File Manager** and future discovery expose Resource availability without owning Dictionary installation semantics.

---

## 5. HTML to NormalizedDocument as a reusable capability

The HTML parser/converter and its golden fixtures live under:

```text
client/packages/html-normalized-content/
```

Its public `createHtmlNormalizer()` factory composes `CheerioHtmlParser`, `HtmlNormalizedDocumentConverter`, block/inline processors, diagnostics, and block-ID generation. Both the CLI and a browser worker can use that same source interpretation. The canonical source-neutral contract remains `@kjvonly/normalized-content`.

### 5.1 Package boundary

```text
client/packages/normalized-content/       # existing normalized semantic contract
client/packages/html-normalized-content/  # shared source-format converter

client/cli/                               # consumes shared HTML conversion
client/kjvonly-pwa/                       # consumes shared HTML conversion
```

The HTML package is named `@kjvonly/html-normalized-content`. Keep it a separate dependency *toward* `@kjvonly/normalized-content`; do not add HTML/Cheerio dependencies to the canonical normalized-content contract.

Requirements:

1. Parser + converter must run in Node and in a browser Web Worker with the same semantics and diagnostics.
2. Reuse existing block/inline processors, validation, source-identity collision recovery, and golden fixtures. Do not implement a second `DOMParser`-specific dictionary converter with divergent behavior.
3. Verify Cheerio/parse5/domhandler's actual browser compatibility, bundle size, and worker import graph; reuse or replace the syntax adapter deliberately if it cannot ship cleanly.
4. The public API should expose a simple `normalize(html, options)`/`normalizeWithDiagnostics(...)` capability. Exact interface signatures follow the existing `NormalizedDocumentValidator` and `ParseResult` contracts.
5. Invalid or unsupported markup should produce the existing actionable diagnostics where possible. The normalized renderer must never receive a raw HTML string.
6. Converter validation and link-target safety are mandatory; scripts, event handlers, unsafe URLs, and unsupported embeds must not be executed or injected as HTML.
7. Any generated block IDs or word `contentIndex` addresses are **snapshot-local**. Re-normalization or source updates can change them; do not promise persistent word-level bookmarks without a matching revision/anchoring design.

### 5.2 V1 execution policy

- Preserve HTML when installing the dictionary.
- Convert only the definition selected for display, preferably off the main thread.
- Consider bounded session/in-memory caching keyed by edition/generation/headword **only after measuring real definition lookup latency**; it is not implemented yet.
- Do not eagerly normalize the entire dictionary, and do not persist a second copy of every `NormalizedDocument` as a prerequisite to browse/search.
- Display the result with the existing `NormalizedContentRenderer`. The current definition worker normalizes the selected headword’s ordered HTML definitions **as one document**, maintaining a single generated block-ID namespace. Dictionary Module owns title, edition attribution, loading/error states, and navigation.

The example `<div><p><b>...</b>, <i>...</i></p></div>` should be a golden acceptance fixture; paragraphs, bold and italics must survive conversion with the correct visible word order.

---

### Resource selection and multiple editions

The existing `ResourceSelections` map permits **one primary Resource reference per
Resource Type**, and the Dictionary module follows that convention via its
`DictionaryModuleResourceSelectionContributor`. This does **not** limit installation to one Dictionary edition. Each Dictionary
pane searches its selected Resource, and each search worker request accepts exactly
one publisher/Resource reference. Multiple panes can still share the worker.
Do not overwrite the selected primary Resource to represent additional
installed editions, or add invented Resource Types for edition labels.

Dictionary Resource worker registration, first-entry acquisition and module
views are separate responsibilities even when some of them are implemented.
Migrating local persistence from per-word entries to chunk objects must not
change the selected publisher/Resource identities. Future edition updates must
retain access to accepted older words without automatically deleting their
content or receipts.

---

## 6. First-entry installation lifecycle

**Trigger:** Opening a Dictionary root or a directly navigated definition view, not starting the whole PWA.

```text
Open Dictionary
    ↓
Check accepted dictionary/edition manifests
    ├── ready → import existing headword index; show words
    └── missing → acquire ONE full compressed Resource for that edition
                    ↓ existing Resource Worker
                 verify, decode, validate once
                    ↓
                 partition sorted headwords by target decoded bytes
                    ↓
                 compress/persist dictionary/chunk objects in bounded writes
                    ↓
                 persist dictionary/chunk-map + search index
                    ↓
                 commit dictionary/edition manifest LAST
                    ↓
                 show searchable words
```

Install missing editions **serially**, preserving independent retry/readiness and deduplicating simultaneous requests across panes. `DictionaryService.enter()` starts preparation of both Application-configured editions, while the root and a directly opened entry call `prepareSource()` for their specific selected edition; the service delegates to the existing `DictionaryInstallationService`. The normal Resource worker owns download and handling, and the Dictionary-specific handler owns chunking and persistence. Keep the generic Resource installer untouched and do not introduce one Resource/receipt per word.

The worker processes the decoded edition only during installation. It should avoid retaining both the full decoded input and many inflated output copies longer than necessary. Use bounded partition/compression and avoid posting the bundle to the UI. Installation is still CPU/memory work; measure and pace it, rather than claiming a worker guarantees no browser impact.

### Chunk partition algorithm

1. Validate and sort **canonical headword keys** once, using a deterministic normalization/ordering contract shared with the locator and index.
2. Iterate in sorted order and add each **entire definition group** to the current chunk. Estimate the UTF-8 serialized byte count (including HTML) to maintain a configured target decoded size. This is a size target, not a promise of byte-perfect equality.
3. Close/compress a chunk when adding another group would exceed the target; start the next chunk with that group. Do not use the first letter as a partition boundary.
4. Give chunks stable **ordinal IDs within an accepted generation** (`0000`, `0001`, ...); generate the ordered, nonoverlapping inclusive `[firstKey,lastKey]` ranges at the same time.
5. Choose the initial target via measurement (e.g. **256–512 KiB decoded per chunk**), then benchmark real decompression latency, storage size and quota; do not hardcode 26 or 52 chunks. A very large definition may exceed this threshold alone.
6. Gzip each chunk in the Resource worker and persist the binary. The compressed Resource download and compressed local chunks serve different purposes; retaining a verified download for retry is optional/best effort.
7. Persist `dictionary/chunk-map` and the compatible FlexSearch export. Only after all referenced chunks and index are readable do we write the accepted edition manifest. Its published-resource processed receipt follows successful installation.

### Failure/retry/no-delete behavior

- Do not mark an edition ready because its compressed Resource was downloaded. Readiness means its committed manifest references a complete locator, all required chunks and an importable headword index.
- An interrupted install leaves prior accepted generations unchanged. New partially written generation objects can remain and be reused/overwritten on retry; there is **no automatic deletion**.
- A new accepted Resource revision uses a new chunk generation and locator/index metadata. Never overwrite the active manifest to point at an incomplete generation. Preserve prior accepted data if installation fails.
- There is no legacy-entry upgrade path. A development profile containing an obsolete per-entry installation is not a supported test fixture for the chunked implementation; use a clean test profile when validating installation. The application performs no automatic deletion of stored data or receipts.
- Current application policy does not automatically refresh installed editions. If updates are introduced, the lookup/index contract must **explicitly preserve retained words** from prior accepted generations when a newer bundle omits them. A simple switch to a newest-only map would hide them and is not sufficient. A layered-generation or cumulative-map design is required before enabling such updates.
- Keep the verified compressed-download cache best-effort. Cache Storage failure does not invalidate a successfully installed edition.

During installation, show: "Installing dictionary in the background. Keep the app open; this may take a few minutes. You can continue using the app." Do not invent percentage progress. Offline/authentication failures remain source-specific and retryable, and a working edition remains usable if the other fails.

---

## 7. IndexedDB persistence and installation completeness

All accepted Dictionary persistence uses the existing `domain_objects` store, whose `objectType` index distinguishes Dictionary object types. The target representation is *small numbers of chunk and metadata objects*, not tens of thousands of HTML definition objects.

| Object type | Content | Typical count per edition |
|---|---|---|
| `dictionary/chunk` | One gzip-compressed keyed group of HTML definitions | Variable; bounded by configured decoded-byte size |
| `dictionary/chunk-map` | Ordered headword ranges → chunk IDs | One object (unless size requires paging) |
| `dictionary/search-index` | Versioned headword-only FlexSearch export + compact display labels | One logical index (possibly several export parts) |
| `dictionary/edition` | Complete accepted generation, publisher/Resource/revision/count | One current manifest identity |

`dictionary/chunk-map` is the **third piece of data** connecting headword results to compressed content. It should not contain definition HTML. Prefer a sorted range table (one entry per chunk) over a redundant headword → chunk mapping for every word:

```json
{
  "generation": "m123",
  "ranges": [
    {"firstKey":"a", "lastKey":"abandon", "chunkId":"0000"},
    {"firstKey":"abandonment", "lastKey":"absolute", "chunkId":"0001"}
  ]
}
```

Example ranges are illustrative, not measured. For lookup, binary-search the ordered ranges for `firstKey <= headwordKey <= lastKey` using the **same lexical comparator** used for chunking. Validate that ranges are ordered/disjoint and cover every indexed headword. An index result whose locator is missing or whose chunk lacks the claimed headword is an integrity error, not an empty definition.

Persist binary content in IndexedDB without base64 inflation. The `domain_objects` `objectType` index is suitable for discovery of chunk/manifest object classes, while direct primary-key lookups locate a particular edition/generation/chunk. The definition-reader API owns this lookup and must not expose database details to Svelte components.

Keep generation IDs/revision checks in the manifest and in chunk/index metadata. The locator and index must refer to the same accepted generation, or to a deliberately versioned retained-generation overlay if update inheritance is later supported. Do not use `activeKeys`, per-word receipts, or a full decoded dictionary as a persistent singleton.

---

## 8. Headword search, index, and definition lookup

### 8.1 Search contract: words only

The Dictionary search worker owns FlexSearch. Use `tokenize: "forward"` with a complete-headword field so prefixes match the **beginning** of a headword only (`a` and `ab` match `abandon`; `band` does not). Single-character queries are supported. Normalize queries with the same policy as the publisher/installer.

Search results are lightweight, e.g.:

```ts
type DictionarySearchMatch = {
  publisher: string;
  resourceId: string;
  headwordKey: string;
};
```

The current result label is derived from `headwordKey`; the index must **not index or retain HTML definitions**. Its stored export is versioned by FlexSearch serialization, tokenizer, canonical-key policy and accepted edition revision. A version mismatch rejects the search request from the **search worker**, exposing the existing search Retry action. Index construction or fallback is an **installation-time** responsibility, never a side effect of an ordinary search. Do not reintroduce per-entry IndexedDB key scans.

One search request names one selected publisher/Resource edition. The worker loads the selected edition's index and returns source-attributed headword matches. It may reuse cached indexes when a different edition is selected. A search never combines dictionaries or triggers installation of another edition. Exact matches rank before prefixes; stable deterministic order thereafter. The UI may render or window thousands of **word labels** without loading definitions. Results do not need a hard 500/100000 result cap that would break absolute-position scrolling.

### 8.2 Search UI and existing scrubber

The **Dictionary root/search screen displays headwords only**. The header identifies the selected edition; individual result rows contain only the headword. It uses `DictionarySearchResults`, `ScrubbedWindow`, and `KJVScrubbedViewport` to window inexpensive **word rows**, not HTML definitions. The implemented UI runs a **250 ms debounced prefix search** on the selected Resource edition. With an empty input it defaults to **A**, with a toggleable ABC header action revealing wrapped A–Z letter buttons (active letter in `support-a-500` with an underline). Typing a query hides alphabetical browsing; re-enabling ABC clears the query and selects A. The edition header displays its total word count as a subtitle. This is letter-by-letter prefix browsing, **not** an unrestricted continuous all-headwords catalog. The root view persists its query, browse letter, and alphabetical-browse toggle in `NavigationState`; the selected publisher/Resource edition is stored in the navigation entry's existing `resourceSelections` map. Only one edition is searched at a time. `DictionaryService` publishes per-edition preparation/retry results to active Dictionary roots, so a completed retry in one pane updates the other panes without restarting their workers. On Dictionary module entry the service starts preparing both Application-configured editions; the root independently prepares its selected Resource for view readiness. The installation service deduplicates concurrent requests and serializes heavy installation work; failures remain retryable. After a successfully handled `dictionary/entries` archive import, application composition asks `DictionaryService` to read installed editions' accepted manifests from IndexedDB and notify open roots **only if** an edition's last reported readiness or accepted generation changed; an archive import does not initiate downloads or reset the search worker. The search worker already compares each accepted edition revision on subsequent searches and reimports the index when it changes; no extra reset protocol is needed for ordinary search. Results, installation status, worker instances, and scroll DOM state are not serialized. The persistent pane navigation stack keeps the root view mounted under an entry view, preserving its current scrubbed-list position across Back. Browser regressions cover both mounted-view Back navigation and reconstruction of the query, letter, and selected Resource from serialized navigation state; verification with real published dictionaries remains pending.

```text
User types "ab"
   ↓ search worker queries the selected Resource's FlexSearch index
[ abandon ]
[ abandonment ]
   ↓ user taps ONE word
Load one definition → separate entry view
```

The root owns a `DictionaryHeadwordSearchSession` for transient UI search state, using the application's shared `DebounceService` (250 ms). It invalidates stale responses when the query, browse initial, or the selected ready edition changes, and ignores replies after the root unmounts. Search and index failures expose a manual retry that reissues the current prefix/selection without requiring an input change; retry supersedes any older in-flight response. Svelte binds the session state while `DictionaryService`/`DictionaryRuntime` continue to own worker execution and lifetime. This is deliberately narrower than Bible Search's `SearchView`/`SearchSession`, whose single-query subscription workflow does not directly model the Dictionary's A–Z browsing.

The A–Z control is a **prefix selector**, not a second index or a new chunking strategy. It queries the existing FlexSearch worker with a one-character prefix when the input is empty; moving between letters must not read or decompress definition HTML. Typing a query hides ABC; clearing it does not reopen the A–Z strip. Turning ABC back on clears the query and selects A. Other leading characters remain reachable by typing.

### 8.3 Exact definition lookup (not a search operation)

```text
Select (publisher, resourceId, headwordKey)
    ↓
Load edition's accepted dictionary/chunk-map
    ↓
Binary-search chunk ranges → chunkId
    ↓
Read one dictionary/chunk binary from IndexedDB
    ↓
Worker decompresses that chunk
    ↓
Exact key lookup → ordered HTML definition bodies
    ↓
Shared HTML normalizer → NormalizedDocument
    ↓
NormalizedContentRenderer in dictionary.entry
```

- The main/UI thread must not decompress gzip, parse a chunk's JSON, or convert large HTML documents. The worker returns only the normalized document for the requested headword, not an entire decoded chunk.
- The definition worker reads `dictionary/chunk-map` and `dictionary/chunk` from `domain_objects` by accepted edition/generation. It decompresses and selects the entry inside the worker. Normalize the selected definitions inside the worker, then encode the resulting `NormalizedDocument` as UTF-8 into a standalone `Uint8Array` and transfer its `ArrayBuffer` via `postMessage`. Do not transfer the stored chunk's binary buffer, which may be reused in the worker cache. The consumer decodes the returned document and displays it with `NormalizedContentRenderer`. No full chunk or raw dictionary bundle crosses the UI boundary.
- A bounded decoded-chunk LRU is an **optional future optimization**, not a requirement already implemented. The current definition runtime loads, decompresses, and parses the requested chunk when selected; measure repeat-lookup latency before introducing caching.
- Keep each headword's complete definition array; multiple senses are rendered in source order.
- A missing locator/chunk, corrupt gzip, or missing requested key must surface an entry-specific error and preserve other editions.
- Previous/Next entry navigation is deferred. If added, it must stay within the selected edition and use the same locator rather than switching editions implicitly.

### 8.4 Worker lifecycle

Follow Bible Search runtime ownership: application composition constructs one `DictionaryRuntime`, and Svelte views enter/leave lightweight sessions through `DictionaryService`. The runtime owns the two lazily created clients; worker instances are reused across Dictionary views and panes and terminated only when the last mounted Dictionary view releases its lease. Hidden entries in the persistent navigation stack retain their leases. Messages use typed correlated requests and stale-response suppression; workers never access Svelte ApplicationContext. The **separate** `dictionary-search.worker.ts` and `dictionary-definition.worker.ts` own index operations and selected-definition work respectively. Snapshot reactive source selections into plain cloneable objects before posting to either worker; the user confirmed this fixed the `DataCloneError`.

The Resource worker still installs editions. The search worker imports indexes and returns headwords; the definition-loading worker code reads/decompresses chunks on selection. Do not move installation parsing or IndexedDB mass writes to the UI thread.

### 8.5 Single-edition worker protocol (illustrative)

```ts
// Search worker (one of two distinct protocols):
{ type: 'search', id, query, source: plainSourceSnapshot }
// Search automatically loads accepted indexes when required.
// Results: headwordKey, publisher, resourceId (never HTML).

// Definition worker:
{ type: 'get-normalized-definition', id, source: plainSourceSnapshot, headwordKey }
// Response: 'normalized-ready' with a transferable ArrayBuffer containing
// only the requested headword's NormalizedDocument (or 'error').
```

Headword selection must never be resolved using only the string `abandon` when both dictionaries contain that word; the publisher and Resource ID are part of the selection identity. The UI controls result rendering independently of search preparation.

### 8.6 Deferred features

Full-definition search, fuzzy matching, additional languages' collation policies, per-word network fetches, and generalized dictionary removal remain separate features. The current optional prebuilt-index **Resource is separate from the entries Resource**; a future co-packaged format would need a new semantic data version. The current v1 entries installer builds the index locally when the optional published index is unusable.

---

## 9. Dictionary module and navigation

Follow `Pane.state.navigation`, keeping hidden views mounted and restoring the previous search state on Back. Do not add new screen shells or scroll-controller abstractions when the existing shared list/scrubber primitives suffice.

| View | Responsibility |
|---|---|
| `dictionary.root` | Resolves the selected Resource from navigation; installation/retry, prefix-based search, and A–Z initial-letter browsing |
| `dictionary.edition` | Lists locally accepted editions; returns the chosen Resource via `backWithResult()` |
| `dictionary.overflow-actions` | Shared More actions view with split horizontal/vertical header actions and the Dictionary versions menu item; returns intent to the root |
| `dictionary.entry` | Selected word + source attribution; prepare its edition on direct navigation, fetch/decompress one relevant chunk in the definition worker, then normalize and render definitions |

### User flow

```text
Modules → Dictionary root
           ├── missing edition? download/install in background; keep app usable
           ├── More actions → Dictionary versions → edition picker → persist selected Resource
           └── list ONLY headwords, prefix-search via FlexSearch
                  ↓ select a word
            Dictionary entry view
                  ├── loading a single definition
                  ├── normalized HTML reading
                  ├── previous/next in same edition (future enhancement)
                  └── Back → same mounted word list + query/scroll position
```

Navigation stores only `{publisher, resourceId, headwordKey}` (or an equivalent stable edition reference and key). The entry displays the selected edition followed by `petNameService.resolve(publisher, publisher.slice(0, 32))`: a local/default pet name when available, otherwise the first 16 bytes (32 hexadecimal characters) of the Nostr publisher key. This affects presentation only; all lookups and navigation retain the full publisher identity. Never serialize HTML, `NormalizedDocument`, chunk binary, or worker state in the pane stack. Render labels with the theme and shared header conventions (leading Back, restrained trailing actions), preserving narrow-pane and split-pane behavior. A source missing or a corrupt chunk shows a recoverable entry-level error without discarding the search view.

---

## 10. Resource selection and other modules

- The Dictionary contributes its required `dictionary/entries` Resource type. The Application configures the initial Webster 1828 selection through the generic Resource selection service.
- Webster 1828 and 1844 are configured for lazy installation when a Dictionary view opens, not Application startup. Both become available in the picker after installation. The picker lists only accepted editions, matching the Bible version picker pattern; installation does not change the default selection.
- The Dictionary module, navigation views, and ApplicationContext-facing capabilities are registered through the application composition root; do not construct a second implicit singleton inside a Svelte component.
- A future File Manager registration for `dictionary/entries` may open the Dictionary module with the **specific selected Resource descriptor**, overriding or supplementing default selection without changing its publisher identity. File Manager itself only routes.
- Do not add dictionary-specific conditions to general Resource resolution or generic module navigation.
- The generic normalized renderer may be reused directly inside Dictionary views. The standalone Normalized Reader currently has its own published-document identity/markup behavior; it should **not** be invoked with a fabricated Dictionary Resource to obtain a renderer.
- Word-to-dictionary lookup from Bible/Normalized Reader is a future cross-Domain navigation feature, using Dictionary's public API and canonical headword selection.

---

## 11. Deferred discovery and installation UX

The edition picker lists locally installed Dictionary editions. General Resource discovery and user-directed installation remain separate from the picker, as with the existing Bible version picker.

A future cross-application flow should distinguish:

```text
Discovery Roots / known publishers / curated catalogs
    ↓
Available Resource descriptions
    ↓
Browse & inspect (publisher, edition, size when known, content type)
    ↓
Choose Install
    ↓
Generic Resource resolution + semantic validation + acceptance
    ↓
Installed Domain data
    ↓
Open owning Module
    ↓
Manage: update, retry, remove, storage usage
```

Required future UX states include `available-not-installed`, `installing`, `installed`, `update-available` (when verifiable), `failed`, and `unavailable/offline`. An available Resource description is not already a Domain object. A trusted/known publisher or Discovery Root does not automatically grant installation or replacement authority.

The installing module may surface installation controls itself in V1. A later general-purpose UI could surface them through a content catalog/discovery module, Filesystem/File Manager metadata, or shared application-managed installation controls. **Do not create that framework now.** Designing a generalized install/uninstall contract belongs to a separate workstream touching the appropriate Application Architecture and Resource Boundary documents.

**Rejected alternative:** one Resource per word would allow targeted downloads but add many published identities and requests, complicating full-dictionary headword discovery and search.

**Implemented optimization:** each edition keeps one compressed entries Resource and may have an optional, separately published prebuilt headword-index Resource. The installer resolves the optional index through the generic Resource lifecycle and falls back to building the index locally if it is unavailable or incompatible. Neither choice creates a network Resource per word or per local chunk.

---

## 12. Publication and ingestion pipeline

```text
Source dictionary array/NDJSON {word, content}
    ↓ existing converter
One canonical keyed JSON edition bundle
    ↓ existing gzip + Resource publication
One published Dictionary Resource per edition
    ↓ first-entry Resource worker
Verify/decompress/parse/validate
    ├── partition into size-balanced compressed dictionary/chunk objects
    ├── write sorted dictionary/chunk-map ranges
    └── prepare/import headword-only FlexSearch index
    ↓
Publish accepted dictionary/edition manifest LAST in IndexedDB
    ↓
Dictionary headword UI + on-demand definition reader
```

A separately published prebuilt headword-index Resource is **already implemented** and optional; generic Resource resolution obtains it when available, otherwise the installer builds the index from accepted headwords. A future **versioned single-package** enhancement could embed an index in the entries Resource, but would need a new semantic data version and validator. Current `kjvonly.dictionary.entries@1` bundles remain the supported entries format.

The converter must preserve repeated definitions, original display spelling and HTML, report skipped/invalid records, and avoid silent canonical-key collisions. It should report: input records, accepted definitions, unique headwords, rejected records, estimated size, actual compressed size, and distribution of chunk sizes after client install. Existing published Resource ID, publisher, modifiedAt, and descriptor metadata remain Resource-boundary concepts separate from Domain chunk IDs.

---

## 13. Validation and tests

### Publication and contract tests

- Existing v1 keyed bundles with repeated definitions are accepted and remain one Resource per edition; unsupported package versions are rejected with consistent diagnostics.
- The current optional published index must have matching tokenizer/normalization/export version and complete headword coverage; incompatible exports trigger **installation-time local index generation**, not silent search omissions or a rebuild during ordinary search.
- Resource publisher/Resource ID + edition identity cannot cross-contaminate chunks, locator ranges, or index caches.

### Chunk generation, storage and interruption

- Deterministic headword sorting yields nonoverlapping, ordered chunk ranges with no dropped or duplicated headwords; duplicate definitions for one key are never split across chunks.
- Highly skewed first-letter distributions produce **size-balanced chunks** rather than 26 alphabet buckets; a large single definition forms a valid oversize chunk.
- Chunk lookup succeeds for the exact first and last key of every range and across adjacent boundaries. Unknown keys return missing; invalid overlapping/missing ranges cause clear errors.
- Stored `dictionary/chunk` contains gzip-compressed binary and no inflated definition JSON or base64 copy; worker can round-trip HTML safely.
- IndexedDB stores the chunk, locator, index and edition manifest as Domain objects with correct `objectType` values; there are no per-headword definition writes or receipts for a new install.
- Manifest is committed after referenced chunks, locator and index become available; an interrupted or failed install does not expose an incomplete generation as ready.
- Concurrent panes share download/install work; 1828 and 1844 install serially; failure of one does not block the other or affect an accepted prior generation.
- No test path performs automatic deletion of Domain objects, Resource receipts, or old generations. A future update preserves omitted historical headwords according to a separately approved layered/cumulative lookup design.

### Search and definition reader

- Forward-token headword matching: `a`, `ab`, `aba` find `abandon`, interior `band` does not; multiword headwords match from the beginning only.
- The selected Dictionary Resource is passed to the worker. Results retain source identity, and switching editions never reads all HTML definitions into the UI.
- Search results include display headwords and source identity, **zero HTML definitions**. Merely showing, scrolling or scrubbing 20+ result rows performs **zero `dictionary/chunk` reads**.
- Selecting a word looks up exactly one appropriate chunk (unless bounded cache already holds it), decompresses in a worker, and retrieves that word's complete ordered HTML definition bodies.
- Back preserves the existing root-view instance, query, selected Resource, browse letter and list scroll position; reload/reconstruction restores the persisted query, letter and Resource selection (covered by focused browser regressions); selecting the same word in different dictionaries resolves to different source content.
- Missing/corrupt chunk raises an entry-level error; worker cancellation and disposal do not leak listeners or leave the UI stuck.
- Shared Node/browser HTML conversion matches existing CLI golden fixtures and never injects raw HTML directly.

### Performance and acceptance

- Measure Resource decode/parse, partition/compression, IndexedDB write counts and durations, source/index import, per-word lookup, chunk decompression and normalized rendering separately.
- Benchmark real initial installation on a constrained device, including whether Chrome remains interactive. Worker isolation alone is not a responsiveness guarantee.
- Verify search loads zero HTML, index reuse after reload, selected-word latency, offline lookup and interruption/retry. Evaluate bounded decoded-chunk caching only if profiling justifies implementing it.
- Record actual chunk count and max/min/p50/p95 decoded/compressed sizes for both 1828 and 1844; adjust target decoded size by data rather than assuming alphabet or a fixed number of chunks.
- Compare chunk-object write counts with the historical ~60k/73k per-headword write counts to quantify the storage improvement.

---

## 14. Delivery status and next validation slices

Completed at the source/integration level (not necessarily end-to-end browser verified):

1. Chunk models, deterministic size-balanced partitioner, range locator, and tests.
2. Dictionary-specific Resource worker chunk installer with final manifest/index/map completion transaction; no per-headword writes for new installations.
3. Search-worker import of accepted, persisted FlexSearch indexes; headword-only result list with navigation-owned Resource selection.
4. CLI-generated optional prebuilt index Resource, generic Resource resolution, compatibility check, and local installation-time fallback.
5. Definition worker with selected-chunk IndexedDB lookup, decompression, exact headword extraction, and transferable definition bytes.
6. Shared HTML normalization package, CLI integration/type-declaration fixes, and `dictionary.entry` normalized renderer hookup.
7. Worker startup diagnostics and **cloneable identity snapshots** in search and definition worker clients; the latest `postMessage` cloning failure was confirmed fixed by the user.

Next small, reviewable slices:

1. **Browser acceptance:** verify search suggestions/results after the clone fix, select a word, confirm actual rendered HTML formatting via `NormalizedContentRenderer`, and check worker lifetimes in DevTools.
2. **Storage/installation validation:** with each edition selected or imported, test fresh chunk installation, serial installation/failure isolation, genuine published prebuilt-index import versus local fallback, offline reload, memory impact, and browser responsiveness. The existence of published editions is not proof these scenarios pass.
3. **Browsing and polish:** browser-verify initial A–Z headword browsing, verify saved search/Resource/scroll state across Back, consider a future continuous all-headwords catalog and previous/next entry actions, and measure whether a bounded decompressed-chunk cache is justified.
4. **Documentation reconciliation:** replace any remaining aspirational implementation notes only after browser verification, and record observed installation and lookup metrics for both dictionaries.

Keep patches incremental in `wt1`. Do not touch the generic Resource installer, reintroduce per-entry compatibility, or introduce general-purpose deletion logic.

---

## 15. Risks and explicit deferrals

| Risk/choice | Decision | Validation or deferral |
|---|---|---|
| Fixed 26/52 alphabetical chunks | **Rejected** | Data size is uneven by letter; use size-targeted contiguous lexical ranges |
| Extra headword→chunk mapping object | **Accepted** as `dictionary/chunk-map` | Prefer compact ordered ranges, not ~133k individual mapping records |
| FlexSearch contains definitions | **Rejected** | Headword-only index with display labels; definitions live in compressed chunks |
| Results load 20 HTML definitions | **Rejected** | Results are words only; definition loading begins at selection |
| One network Resource per edition | **Kept** | Existing two gzip bundles remain inputs to client-side chunk installation |
| CLI-prebuilt index | **Implemented as optional separate published Resource** | Current v1 entries unchanged; generic Resource resolution + compatibility/fallback. Combined package would require a new semantic version |
| Target chunk decoded size | Configurable, initially benchmark 256–512 KiB | Verify actual distribution, decompression time, memory/IDB overhead |
| Dictionary storage format | **`chunks-v1` only** | Legacy per-entry implementation and migration are unsupported during development; no automatic deletion of stored data |
| Updated edition omits earlier words | Preserve old accepted content | Updates need layered/cumulative lookup + index semantics before enabling them |
| Binary IndexedDB compatibility | Implemented, browser validation pending | Compressed `Uint8Array` chunk objects use `domain_objects`; validate real-browser round trips and quota usage |
| Full HTML normalization | On-demand only | Worker returns one normalized document per selected headword; no raw HTML insertion. Verify rendering in the browser |
| Initial A–Z headword browsing | Implemented, browser verification pending | Empty search defaults to A and allows selection of another initial; unrestricted continuous all-headwords catalog is not implemented |
| `postMessage` with Svelte state | Fixed, user-confirmed | Snapshot source identities to plain data in both worker clients; keep structured-clone regression tests |
| General discovery/install/manage | Deferred | Do not fold into current Dictionary feature |

The manifest/index/map are authoritative for which chunk generation is **complete**, not a license to delete stored data. All content access remains scoped to the selected edition Resource identity.

---

## 16. V1 completion criteria

V1 **is not yet browser-verified as complete**. Completion requires that both dictionaries can be installed from their existing single compressed Resources through the normal Resource workers, persisted as a small set of compressed `dictionary/chunk` objects plus `dictionary/chunk-map`, `dictionary/search-index`, and `dictionary/edition` metadata, and re-opened offline without per-word IndexedDB writes.

The Dictionary root must show **headwords only** from the selected edition with forward-prefix search and a usable existing list/scrubber. Selecting one result must load/decompress only the necessary chunk off the main thread, convert that definition with the shared HTML normalizer and display it in the separate entry view. Per-edition Resource identity, interrupted-install safety, non-destructive accepted storage, index/version consistency, and measured browser responsiveness are mandatory. Generic discovery/install management and user-directed cleanup remain separate features.

---
