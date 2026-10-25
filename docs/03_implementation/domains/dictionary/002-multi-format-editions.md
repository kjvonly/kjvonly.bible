# Dictionary Multi-Format Editions — Target Design

**Status:** Accepted design; partially implemented (search, storage, raw lookup, and definition validation)
**Last reviewed:** 2026-10-21
**Worktree:** `wt1`
**Scope:** Generic published editions, many-to-many headword search, key-based chunk retrieval, and Strong's integration

This is the **target design** for the next Dictionary refactor. [Dictionary V1](001-dictionary.md) and [Strong's](../strongs/001-strongs.md) describe the **current source**, including assumptions this design will replace. Do not describe this target as already installed or browser-verified.

The four focused `dictionary-flexsearch-document-probe.spec.ts` tests passed on 2026-10-21. They establish the viability of repeated search terms, composite document IDs, stored result fields, and FlexSearch export/import. They do **not** validate the integrated installer, published indexes, memory use, or production search performance.

## 1. Decisions and boundaries

- One `dictionary/entries` Resource per edition: Webster 1828, Webster 1844, and **one** Strong's Concordance edition.
- All editions publish **the same bundle envelope**. No Hebrew-specific, Greek-specific, or Webster-specific fields in the common contract.
- Strong's Hebrew and Greek references can both appear in that edition's results. Return **one headword/key association per hit**; do not merge IDs or introduce language grouping in the search layer.
- One FlexSearch `Document` index per edition indexes both headwords **and definition keys** as searchable fields, and stores `{ headword, key }` with each association. **No separate headword-to-key map or second index** is needed.
- Definition retrieval is by the **opaque definition key**, not by headword. Dictionary owns chunk installation, compressed storage, lookup, and generic retrieval.
- Format-specific behavior is limited to interpreting/validating definition content and choosing its existing presentation. Strong's retains ownership of Strong's meaning, model, and view.
- Replace the existing Webster-only payload and index contracts **directly** during development. Do not add legacy readers, `Index` compatibility, migration, or automatic deletion.

## 2. Standard published edition bundle

```typescript
interface HeadwordMatch {
    headword: string; // Searchable and displayable term
    key: string;      // Opaque key for one definition in this edition
}

interface DictionaryEditionBundle<TDefinition> {
    definitionFormat: string;
    headwords: HeadwordMatch[];
    definitions: Record<string, TDefinition>;
}
```

`headwords` is a **flat list** for every edition. Neither `headword` nor `key` is independently unique. The pair `(headword, key)` uniquely identifies one searchable association *within an edition*; duplicate pairs are discarded by the publisher or rejected at acceptance. Every mapped key must exist in `definitions`. A definition may have no searchable association and still be available by direct key lookup.

For Webster, a headword and key will generally coincide; a definition value keeps its existing ordered HTML-definition representation. For Strong's, a key is a single canonical `H` or `G` identifier and the value is the original structured Strong's content (the Strong's Domain can construct its domain `id` as needed).

Illustrative—not authoritative Bible-derived—Strong's associations:

```typescript
{
    definitionFormat: 'strongs',
    headwords: [
        { headword: 'love', key: 'H157' },
        { headword: 'love', key: 'G25' },
        { headword: 'love', key: 'G26' },
        { headword: 'charity', key: 'G26' }
    ],
    definitions: {
        H157: /* Strong's content */ {},
        G25: /* Strong's content */ {},
        G26: /* Strong's content */ {}
    }
}
```

No `H157;G25`, `G25,G26`, grouped ID, or synthetic definition key is created. Multi-definition navigation, when separately requested, is handled by the existing Strong's references view, not by the Dictionary index format.

An edition's full lookup identity is **publisher + Resource ID + definition key**. The same key in two editions is not the same definition. The definition key must retain its original case; headword search normalization must not rewrite it.

## 3. FlexSearch Document index

The installed index is a `FlexSearch.Document`, not a `FlexSearch.Index` keyed by the headword itself. Each document represents one `HeadwordMatch` association.

Conceptually:

```typescript
const index = new FlexSearch.Document({
    tokenize: 'forward',
    encode: false,
    document: {
        id: 'id',
        index: ['searchableHeadword', 'searchableKey'],
        store: ['headword', 'key']
    }
});

index.add({
    id: JSON.stringify(['love', 'G26']),
    searchableHeadword: encodeHeadwordForSearch('love'),
    searchableKey: encodeHeadwordForSearch('g26'),
    headword: 'love',
    key: 'G26'
});
```

The document `id` is an **internal, stable, collision-safe identity for the association** (the pair, not the definition key). Using `key` alone would overwrite one record when `love` and `charity` both resolve to `G26`. A length-safe tuple encoding such as `JSON.stringify([headword, key])` avoids delimiter collisions. The enclosing edition/source already scopes the index.

Queries use Dictionary's established headword normalization and forward-prefix encoding for both indexed fields; key lookups are case-insensitive for searching while stored definition keys preserve their exact case. Final prefix filtering checks the returned `headword` **or** `key`; results matching both fields are deduplicated by `(headword, key)`, and exact key matches sort first. Results are enriched, returning the stored **`headword` and `key`** fields. Search never decompresses definitions. For a match, preserve the selected edition's publisher/Resource identity alongside those two fields.

Display rule:

- If `headword === key`, show only the headword (normal Webster case).
- Otherwise show both, for example **love — G26**. The H/G prefix identifies the Strong's reference without separate Greek/Hebrew pickers.

Selection always passes `key` to definition retrieval or format-specific navigation. Do not reconstruct a definition key from the displayed headword.

**Persistence:** Export and import the complete Document index, including its stored fields, in the existing edition-scoped `dictionary/search-index` Domain object. Replace the development index format in place without incrementing its version. A previous `Index` export is not compatible with `Document`, so regenerate and republish development indexes; do not add migrations or compatibility code. The published index is required for installation: the PWA imports it rather than building an index locally. Compatibility checking must verify **association coverage**, not merely the count or set of distinct headwords: a missing `(love, G26)` must not pass because `(love, G25)` exists. Ordinary searches must not rebuild indexes.

The accepted edition manifest uses `entryCount` for the number of stored definitions, while the published index uses `headwordCount` for the number of indexed `(headword, key)` associations (not necessarily distinct headword strings). Those counts are independent and must not be compared. Published index acceptance verifies association coverage against the source bundle, and the search worker imports the index for the matching accepted Resource revision. A separate distinct-headword count is not currently persisted.

## 4. Chunk installation and direct definition retrieval

Keep the existing size-balanced compressed Dictionary chunks, range locator, bounded IndexedDB writes, source/generation checks, and final acceptance transaction.

The input to chunk partitioning changes from a headword-keyed Webster bundle to `bundle.definitions`. Sort and locate by **definition key**; do not apply `normalizeDictionaryHeadword()` to definition identifiers such as `G26`. Keep each definition value intact within its chunk. Chunk boundaries are opaque definition-key ranges, not alphabetical search ranges.

The on-demand definition worker exposes a raw lookup through the Dictionary service (illustrative API):

```typescript
dictionaryService.search(source, 'love');    // HeadwordMatch[] + source
dictionaryService.get(source, 'G26');        // One stored definition value
```

A caller with a known key does **not** consult the search index. It locates one chunk, decompresses it off the UI thread, extracts that key, and returns only the requested value. No eager load of all Strong's definitions.

Webster's existing `getNormalized()` path remains a **format-specific read operation**: it retrieves the selected HTML definitions and invokes `@kjvonly/html-normalized-content` in the worker, before `NormalizedContentRenderer` receives a normalized document. The renderer is not responsible for parsing raw HTML. Strong's retrieves structured content without HTML normalization and hands it to the existing Strong's domain/model and view.

**Acceptance invariant:** A completed edition's definitions, chunk map, Document index, and manifest correspond to the same publisher/Resource and accepted revision. Interrupted installation cannot expose a partially ready generation. Keep the existing no-delete policy.

## 5. Strategies: vary only what actually differs

Strategy selection uses accepted edition format metadata (the published `definitionFormat`), **not** string checks sprinkled through the Dictionary UI, nor a guess based on `G`/`H` prefixes.

| Responsibility | Common Dictionary path | Format-specific behavior |
|---|---|---|
| Validate bundle envelope/keys | Yes | Validate Webster HTML vs. structured Strong's content |
| Index and search | Yes; one `Document` per edition | None |
| Partition/compress/store/retrieve by key | Yes | None |
| Decode requested definition | Common chunk read | Webster HTML normalization or Strong's semantic interpretation |
| Open selected match | Common Dictionary search result contract | Webster entry view or existing Strong's/Refs view |

The Resource worker registers Webster HTML and Strong's semantic definition validators against the same Dictionary bundle envelope. The accepted edition manifest also stores `definitionFormat`, so the Dictionary UI can distinguish the definition presentation without inferring it from its Resource ID.

Keep these **small seams**, appropriate to their runtimes: Resource/worker-side definition-format validation or decoding, and application/UI-side result opening. Do not introduce one broad strategy interface requiring each edition to implement search, installation, compression, worker lifecycle, and navigation. The Strong's semantic validator and model remain exposed through its owning Domain API; avoid deep cross-domain imports or a Node-unsafe public barrel.

## 6. Strong's Resource and Bible integration

Publish and install one Strong's bundle at:

```text
kjvonly/dictionary/entries/strongs-kjvs
```

Alongside:

```text
kjvonly/dictionary/entries/webster-1828
kjvonly/dictionary/entries/webster-1844
```

The Strong's bundle belongs in the existing `data/dictionary/entries/bundles/` publication pipeline. The old `strongs/definition` Resource installation and individual Strong's persistence are **retired as part of implementation**, not retained as compatibility paths. The Dictionary installation-on-open list in `application.ts` gains the Strong's edition; direct Bible lookups also need an installation/availability path independent of whether the Dictionary UI was ever opened.

The existing public `StrongsService.get(source, key)` contract remains the Bible/Refs entry point. After Resource-selection callers are updated to the Dictionary Strong's source, its implementation delegates by **key** to Dictionary's raw definition lookup, interprets the returned content using Strong's domain rules, and returns the existing `Strongs` model. It must use the selected Strong's Resource identity, **not the currently selected Dictionary UI edition**. Preserve pane-local Resource selection and existing Bible-to-Strong's navigation.

For search, the Dictionary versions picker lists **one** Strong's Concordance edition. The installation-on-entry configuration includes `strongs-kjvs` alongside Webster, and the same index worker searches all three. **Current integration step:** Strong's headwords and their G/H keys are browsable, but result selection is disabled until its definition-opening path uses Dictionary's raw lookup. Webster results continue to open the existing normalized-document entry view. **Target behavior:** clicking a Strong's `(headword, key)` opens the existing Strong's/Refs presentation with that one key, and Back returns to the mounted search state.

## 7. Generate Strong's headwords from Bible word associations

A build-time publisher/converter script reads the Bible word representation. For each word token, use its **own** Strong's `href` reference(s) to emit distinct `HeadwordMatch` pairs. Normalize the word for search consistently (including punctuation and embedded soft hyphens), and canonicalize accepted G/H IDs according to the existing Bible-reference contract. Do not infer associations from a neighboring word, from English position, or from `usageByWord` in a Strong's definition.

If one word links to several distinct IDs, emit one association per key. Deduplicate identical pairs across verses. The output is the **one flat list** consumed by the standard Dictionary bundle; the script may internally traverse Hebrew/Greek references separately, but it does not publish language-specific maps, grouped results, or multiple Strong's editions.

## 8. Contract revisions and implementation slices

The published Webster bundles currently use `kjvonly.dictionary.entries@1`. Replace the bundle envelope **in place**, keeping the same data-type and index-format version values. The published `FlexSearch.Document` index is already required; rebuild and republish both Webster entries bundles and their corresponding indexes after the envelope changes. Do not add compatibility readers, migrations, or local index-building fallback. Compressed chunk storage remains the existing mechanism, now keyed by opaque definition IDs.

Make reviewable, testable changes in this order:

1. Define and test the common bundle contract, key/association validation, and converters for Webster editions.
2. Generalize Dictionary chunk partitioning and key lookup; preserve the existing bounded transactional installation lifecycle.
3. Use the published `FlexSearch.Document` index in the CLI builder and the PWA import path. Preserve prefix search, export/import, published-index verification, and UI search state; do not build indexes in the browser.
4. Add the raw key-lookup Dictionary API and small format-specific validation/presentation seams; keep Webster rendering unchanged.
5. Generate and publish the single Strong's edition from Bible word/href associations and existing Strong's definitions; update Application installation sources and `StrongsService`/Refs resource selection.
6. Navigate Dictionary Strong's matches to the existing Strong's view. Separately evaluate lazy loading of collapsed multi-definition Strong's rows rather than bundling it into the index change.

### Required validation

- Duplicate headword with distinct keys; distinct headwords with the same key; deduplication of identical pairs.
- Composite Document IDs and stored `headword`/`key` values surviving export/import and worker reload.
- Webster `headword === key`; prefix behavior, deterministic ordering, A–Z browsing, and scrubber semantics.
- Search returns **zero definitions** and performs **zero definition-chunk reads** until selection.
- Accepted index coverage checks detect a missing association even when the distinct headword set is unchanged.
- Arbitrary/case-sensitive definition keys resolve through chunk boundaries; selected Resource scopes all reads.
- Direct Bible lookup works before the Dictionary UI is opened, including offline after successful installation.
- Existing Strong's model/view behavior, multi-reference navigation, search-result presentation, and per-pane Back state.
- Compare real Webster index size, installation time, memory, and query latency against the existing implementation; the four passing probe tests are not a performance benchmark.

Production code and current-implementation guides should only be marked as migrated after these paths have actually been verified.
