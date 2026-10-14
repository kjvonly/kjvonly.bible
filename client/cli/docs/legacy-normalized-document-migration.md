# Legacy Normalized Document Migration

The original PDF extraction pipeline produced an early JSON document shape with
block-level `text` duplicates, nullable word presentation fields, and often null
block IDs. Those documents are **not** the current canonical NormalizedDocument
contract. Migration is an explicit import operation, never a reader fallback.

## Core converter

`application/parse/legacy/legacy-normalized-document-converter.ts` implements
`LegacyNormalizedDocumentConverter` independently of HTML and the filesystem.
It accepts one decoded legacy JSON value and returns a document accepted by the
shared `NormalizedDocumentValidator`.

The converter:

- Preserves word boundaries, word ordering, formatting, links, line breaks,
  block nesting, and source provenance; it does not re-tokenize.
- Uses the old `text` field to recover `joinPrevious` exactly and rejects
  disagreements between the duplicate text and the token sequence.
- Drops the redundant block `text` property, nulls, source-specific colors,
  and historical marker/quote presentation classes.
- Retains canonical presentation hints such as `indent`, `text-center`,
  `list-roman`, and `list-arabic`.
- Uses the shared ordinal block ID generator; preserves authored IDs and
  prevents generated identities from colliding with them.
- Converts 1-based, consistently numbered Roman and Arabic lists to native
  ordered lists, removing just the redundant explicit marker tokens.
- For non-1 starts, repeated Roman numerals, or irregular numbering, retains
  every original marker and uses an unordered list with its existing list-style
  hint. The reader suppresses generated bullets for such lists, so text and
  nesting stay intact. A two-pass check prevents partial marker removal.
- Refuses unsupported block types and unrecognized source fields rather than
  silently losing content.

## Authored list numbering

The legacy reader displayed an unbulleted `<ul>` with authored markers. The
current reader generates list markers. We support both cases without expanding
the canonical class vocabulary:

- **Sequential from 1:** `ordered: true`, `list-roman`/`list-arabic`; remove
  the authored marker words and let `<ol>` create the visible markers.
- **Any irregular or non-1-based sequence:** `ordered: false` with the same
  canonical list-style hint. Retain the source marker words, and the reader
  presents `<ul class="list-none">` so there are no duplicate bullets.
- **Ordinary unordered lists:** no numbering hint and normal bullets.

For example, `I., II., II., III.` and `25., 26.` retain their original text.
Nested lists retain their own independent ordered/author-numbered semantics.
No implicit renumbering, re-tokenization, or list flattening occurs.

## Recursive CLI migration

The `migrate normalized-document` command explicitly treats every discovered
legacy `.json` input as a first-generation document; it does not try to infer
versions, reconstruct HTML, or fall back to the reader. Existing `.nd.json`
artifacts are excluded from input discovery.

From the repository root after building the CLI:

```bash
node client/cli/dist/main.js migrate normalized-document \
  "/path/to/legacy-spurgeon-json" \
  --output-dir "$HOME/app-files/sermons/Charles Spurgeon"
```

The output root is mandatory. Directory structure is preserved, with
`volume/chs1.json` becoming `volume/chs1.nd.json`, and the document's original
`source: "chs1.pdf"` kept as provenance. The converter validates every document
before writing. Existing output is protected unless `--overwrite` is supplied;
source JSON is never overwritten. Individual errors are logged and other files
continue, with a nonzero CLI exit status if any file fails. Output publication
reuses the existing atomic-writer and collision preflight.

The migration leaves `.nd.json` files ready for the shared
`import filesystem` workflow; migration itself does not stage Resources or
publish Nostr events.
