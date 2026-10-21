# Normalized Document Notes Integration

**Status:** In progress — Notes Domain, Reader Notes actions, and inline word indicators implemented; integration regression audit pending
**Date:** 2026-10-14
**Worktree:** `wt2`
**Owners:** Notes Domain (associations, Notes lifecycle), Normalized Content Domain (document semantics), Reader (interaction/navigation), generic renderer (presentation)
**Companion implementation documents:**

- `docs/03_implementation/domains/notes/001-notes.md`
- `docs/03_implementation/domains/normalized-content/001-normalized-document.md`
- `docs/03_implementation/domains/bible/004-note-location-selection.md`
- `docs/03_implementation/runtime/016-navigation-architecture.md`

This document specifies the integration. Notes associations, scoped Notes navigation and draft creation, Reader document/word Notes, and inline word indicators are implemented. Integration regression and documentation alignment remain pending. Existing Notes and Normalized Content documentation describes the portions of behavior already available.

---

# 1. Objective and Boundaries

Add Notes for an entire normalized document and for one canonical word identified within that document Resource. Reuse the existing Notes Module, Quill editor, `NotesService`, Domain Object storage, Resource publication, Outbox, search runtime, and pane navigation.

```text
Normalized Content Reader
    ├── Document Notes → Notes Module → list / create / edit
    └── Choose Word Note → canonical word → Notes Module → create / edit
```

The Notes Domain owns association meaning and Note filtering. The Normalized Content Domain owns the canonical document/word address and resolves it against accepted document content. The Reader supplies the current Resource identity, interaction intent, and navigation. The renderer accepts externally supplied marker presentation data and delegates activation; it does not import Notes services, store Note state, or navigate modules.

**Not in this workstream:** block Notes, arbitrary selections/ranges, multi-user overlays, fuzzy re-anchoring, cross-revision migration, a new Notes store or editor, or changes to File Manager's existing Resource-to-Module launch path.

---

# 2. Source Audit (October 14 Archive)

The following describes implementation verified in `kjvonly-new-chat-files-20261014(1).zip`; paths below are relative to `client/kjvonly-pwa/src/lib/` unless indicated otherwise.

| Area | Current behavior | Implication |
| --- | --- | --- |
| `domains/notes/models/note.model.ts` | Note has `bibleLocationRef` and `bibleReferenceText`, with no normalized-document association | Add one optional typed association without repurposing Bible fields |
| `domains/notes/resources/note-data-type-handler.ts` | `kjvonly.note@1` uses strict Zod schemas; supports an individual Note or a named bundle | Extend the existing strict v1 schema with an optional typed association |
| `domains/notes/resources/note-domain-object-factory.ts` | Creates Note IDs from Resource publisher/name/noteId; candidates hard-code `dataVersion: 1` | Preserve Resource version metadata; new local writes continue using v1 |
| `domains/notes/resources/notes-resource-publication.ts` | Publishes `kjvonly.note@1` with an explicit whitelist of Note fields | Include association without introducing a second version during development |
| `domains/notes/persistence/{indexeddb-notes-store,notes-write-transaction}.ts` | Both direct/local write paths persist Note Domain Object metadata at version 1 | Reference `NOTE_DATA_VERSION` rather than hard-coding a number |
| `resource/worker/resource-worker-composition.ts` | Registers one `NoteDataTypeHandler` | Keep one Note handler and one registered semantic version |
| `resource/data-types/resource-data-type-resolver.ts` | Resolves handlers by exact `dataType@dataVersion` | Only the registered current v1 Note contract is accepted |
| `domains/notes/models/notes-navigation.model.ts` | Separates `bibleScope` from `createBibleLocationRef` | Add equivalent, independently serialized document scope and creation target |
| `domains/notes/modules/{notesContainer,notes}.svelte` and `notesList/notesList.svelte` | Parse scope, filter installed Notes, create drafts; Bible-specific creation loads Bible resources | Route normalized-document creation before Bible metadata lookup |
| `domains/notes/resources/notes-module-resource-selection-contributor.ts` | Carries Notes, Bible Chapter and Bible Booknames selections if available | Document Note creation must not require either Bible Resource to be present |
| `domains/notes/workers/kjvnotes.worker.ts` | FlexSearch indexes title, text, tags, Bible chapter/location; emits collection updates | Add document-scoped projections; never search per rendered word |
| `domains/normalized-content/models/normalized-content-address.model.ts` | Exposes Node-safe `NormalizedContentAddress` and `resolveNormalizedContentAtAddress` | Reuse exact `blockId + contentIndex`, checking that result is a `word` |
| `domains/normalized-content/modules/reader/normalizedContentReader.svelte` | Reader loads by descriptor, supports word-activation interception, Text Markup, links, and in-place Previous/Next | Coordinate explicit Note mode and clear stale document-scoped state on switches |
| `domains/normalized-content/ui/components/normalizedWord.svelte` | Calls host word handler before link activation; ordinary links are accent-colored and underlined | Intercept only deliberate Note-mode word activations; preserve ordinary links |
| `domains/normalized-content/modules/reader/normalizedContentTextMarkupEditOptions.svelte` | Edit toolbar owns markup tools, Notes stack, and Add Note controls with a separator, mirroring Bible edit options | Keep Notes actions in the edit toolbar; More Actions remains for splits |

The source audit does **not** establish that any Notes-to-normalized-document behavior is already available.

---

# 3. Association Identity: Accepted Proposed Contract

## 3.1 One optional discriminated association

Extend the current application `Note` with an optional `association`. Preserve the existing Bible fields unchanged for old Note objects and existing Bible workflows.

```ts
interface NormalizedDocumentNoteAssociation {
    kind: 'normalized-document';
    document: {
        publisher: string;
        resourceId: string;
    };
    target:
        | { kind: 'document' }
        | {
            kind: 'word';
            address: {
                blockId: string;
                contentIndex: number;
            };
        };
}

interface Note {
    // Existing fields stay unchanged.
    // id, bibleLocationRef, bibleReferenceText, text, html,
    // title, dateCreated, dateUpdated, tags
    association?: NormalizedDocumentNoteAssociation;
}
```

This is the **current in-development association contract**. In future the `association` union can gain other kinds, but this feature only introduces `kind: 'normalized-document'`.

Three valid Note states are:

```text
Standalone:          no association, no Bible location
Bible Note:          Bible location fields, no association
Normalized Note:     typed association, no Bible location fields
```

`association` and populated Bible fields must be mutually exclusive. The strict Note validator rejects mixed associations. Standalone and Bible Notes remain valid without an `association`.

### Document identity

`document.publisher + document.resourceId` is the logical normalized-document Resource identity. Both are nonempty opaque strings. Preserve `resourceId` exactly; it is **not** a File Manager path or a string to split on `/`. The Note's own `id` remains `<note-publisher>/<name>/<note-id>` and is never derived from document identity or address. Multiple Notes may target the same document or word.

### Document target

`target.kind = 'document'` matches the logical Resource (`publisher + resourceId`). No document revision timestamp is stored in a Note association.

### Word target

`target.kind = 'word'` adds the canonical `address` (`blockId`, `contentIndex`) to the same logical Resource identity. No `documentModifiedAt` or other document revision field is stored or checked. The Resource ID remains opaque; neither it nor the address comes from a File Manager path.

Only canonical `word` entries can become word Note targets. Validate `address.contentIndex` as a nonnegative integer and `blockId` as a nonempty string. Before opening a new Note draft, resolve the address against the **currently loaded** `NormalizedDocument` with `resolveNormalizedContentAtAddress` and require `type === 'word'`. The Note Resource handler validates shape and scalar constraints; it must **not** download the document to validate word existence.

## 3.2 Resource updates and visibility

| Query or view | Document Note | Word Note |
| --- | --- | --- |
| Document Notes list | Included by publisher/Resource ID | Included by publisher/Resource ID |
| Exact word Notes list | Excluded | Included when block ID/content index match |
| Inline marker at word | Not applicable | Shown when address matches in the currently loaded Resource |
| New Note target | Logical Resource | Canonical address in the loaded document |

**Accepted tradeoff:** if a publisher updates a Resource and shifts its canonical word addresses, existing word Notes continue to point to their stored `blockId + contentIndex` under that Resource ID. They may then refer to different content or to an address that no longer exists. Notes do not detect revisions, re-anchor words, or label older-revision Notes. A user/publisher who needs an independent version can fork the document under a different Resource ID. Normalized Content Text Markup may continue using its own snapshot identity; that policy is independent of Notes.

Unrelated Resources with equal filenames or text do not share Notes.

---

# 4. Resource Contract

## 4.1 One in-development contract: `kjvonly.note@1`

Keep `resourceType = notes/note`, `dataType = kjvonly.note`, and `dataVersion = 1`. The strict payload gains an optional typed `association`; Resource IDs are unchanged. The Note payload still supports individual Note content and named bundles, with `id` excluded from payload content.

There is **one** `NoteDataTypeHandler` registered in the Resource Worker. Its strict v1 schema accepts standalone/Bible Notes without an association and normalized-document Notes with one. Discriminated target shapes remain strict; reject unknown fields and mixed Bible/normalized associations.

After validation, Note Resources reconstruct the same application `Note` model, with `association` absent for standalone/Bible Notes. The factory retains the Resource's declared data version in Domain Object candidates. Both local Note write paths and publication use `NOTE_DATA_VERSION` so version metadata remains consistent.

**Development policy:** the Notes payload is not yet a frozen public contract. No separate legacy handler, automatic version migration, or backwards compatibility with pre-release builds is required. Existing standalone/Bible payload shapes remain valid under the single strict schema.

The implementation needs tests for standalone/Bible Notes, document and word associations, and archive export/import under the one supported version. The existing accepted-Resource currentness and Outbox semantics remain unchanged.

## 4.2 Normalization and invariants

- Retain `bibleLocationRef`/`bibleReferenceText` exactly as the existing Bible and standalone Notes need them; no synthetic location sentinel.
- Require nonempty Resource publisher and opaque Resource ID; do not use filesystem path equality.
- Require nonempty `blockId` and nonnegative integer `contentIndex` for `word` only; reject `documentModifiedAt` in the strict payload.
- Reject mixed Bible and normalized associations.
- Keep `title`, `html`, `text`, timestamps, and tags under current Note ownership. Human-readable document title/word preview may initialize the draft but are **not** canonical anchors.
- Keep the Note ID independent of its association so that moving or editing a Note does not silently create a new Note identity.
- Continue using `NotesService.put()`/`delete()`, the existing atomic Domain Object + Resource installation + Outbox write, local Worker update, and Outbox wake.

---

# 5. Notes Navigation Contract

`NotesNavigationIntent` is a **union** of Bible/standalone and normalized-document
contexts. The Notes root parser first dispatches to the applicable parser; the
Bible parser never interprets normalized-document fields and vice versa.

```ts
interface NotesBibleNavigationIntent {
    noteID?: string;
    bibleScope?: NotesBibleScope;
    createBibleLocationRef?: string;
    normalizedDocument?: never;
}

interface NotesNormalizedDocumentNavigation {
    scope: NotesNormalizedDocumentScope;
    createTarget?: NormalizedDocumentNoteAssociation;
    title?: string;
}

interface NotesNormalizedDocumentNavigationIntent {
    noteID?: string;
    normalizedDocument: NotesNormalizedDocumentNavigation;
    bibleScope?: never;
    createBibleLocationRef?: never;
}

type NotesNavigationIntent =
    | NotesBibleNavigationIntent
    | NotesNormalizedDocumentNavigationIntent;
```

The single `normalizedDocument` object travels through the Notes container,
Notes list, and navigation. Its **required `scope`** selects installed Notes,
`createTarget` optionally requests **one immediate draft** (without changing
list scope), and `title` is optional display-only draft metadata. Scope and
creation target must identify the same logical document; a word target may be
opened under a document-wide scope. Without `createTarget`, Add creates a Note
at the current scope. No full document, DOM nodes, Worker state, or editor draft
is serialized in pane navigation.

The root parser rejects mixed Bible and normalized contexts and the obsolete
pre-release flat fields (`normalizedDocumentScope`, `createNormalizedDocumentTarget`,
`normalizedDocumentTitle`). Only one Notes payload version is supported during
development; no migration of experimental navigation shapes is required.

**Flows:**

```text
Document Notes action
  pushModule(NOTES, notes.root, {
      normalizedDocument: {
          scope: { kind: 'document', document },
          title: normalizedDocumentTitle
      }
  })
  → list of document-associated Notes → Add creates document Note

Add Word Note → select canonical word
  pushModule(NOTES, notes.root, {
      normalizedDocument: {
          scope: { kind: 'document', document },
          createTarget: { kind: 'normalized-document', document,
              target: { kind: 'word', address } },
          title: normalizedDocumentTitle
      }
  })
  → Notes opens a transient word Note draft → Save or Cancel

Existing word marker
  pushModule(NOTES, notes.root, {
      normalizedDocument: {
          scope: { kind: 'word', document, address }
      }
  })
  → list of Notes for that exact word → Add creates a Note at this word
```

The Notes module branches between Bible and normalized-document filtering;
its Add action likewise dispatches to separate Bible and normalized-document
draft functions. Only the Notes Resource ID generator is shared. This is an
explicit separation: it does not assume Bible text will be converted to the
Normalized Content model.

The Notes root consumes an **explicit** create intent only once, as the Bible create flow already does. Simply opening Document Notes must not auto-create a draft. Cancel/close returns to the scoped Notes list instead of creating the draft again. Back pops Notes and reveals the **same mounted Reader**. All pane interactions use the established navigation runtime; there is no second stack or direct persisted-stack mutation.

---

# 6. Notes Filtering and Projection

Define **pure Notes-owned association predicates**, independently testable with installed Notes:

- `document` scope: exact Resource publisher/ID match, includes document and word Notes; excludes standalone/Bible Notes.
- `word` scope: exact Resource publisher/ID plus block ID and content index; excludes document Notes and other words, without testing document revisions.
- No scope: existing all-Notes behavior unchanged.

The existing Notes list combines worker-delivered accepted Notes with local filtering and free-text search. In the first implementation, project document Notes from a **single scoped collection update**, not from a new Notes Service or one query per word. Recompute the membership map on document change or collection change, not on every rendered token. If measured collection size warrants it, add a Notes-owned Worker query/index by association with typed request IDs, without altering the Reader/renderer boundary.

Text search while scoped intersects search results with the active scope; search does not reintroduce Notes from other documents. Each search uses a unique response ID, replacing the previous NotesService result subscription. Clearing the query or receiving a collection refresh invalidates earlier searches so out-of-order Worker results cannot replace newer results. The Notes Module already hides unresolved/discoverable Note descriptors for Bible scopes because their content cannot be filtered without installation; apply the same installed-only rule for normalized scopes.

A Reader-local projection can map word addresses from the active logical Resource to a boolean or count for rendering markers, deriving keys safely (nested `Map` or own-property lookups). Do not use unguarded object indexing when `blockId` may be `__proto__`. When the active Resource changes, immediately clear old markers, invalidate outstanding results, and project only results matching the active publisher/Resource ID and current load generation. Unsubscribe on component destruction. Subscription callbacks and remote/archive refreshes must update the markers without reloading the Reader.

No Notes body/content is rendered inline. The renderer receives only generic marker presentation data and a semantic activation callback.

---

# 7. User Interface and Interaction Modes

## 7.1 Document Notes

**Implemented:** In the Reader's **Edit** options, a vertical divider after the Text Markup tools separates the two Notes controls. The **Document Notes** stack icon saves the current Text Markup draft through the established service, exits edit mode, and pushes `Modules.NOTES` / `NOTES_VIEWS.ROOT` with a whole-document scope. This mirrors the Bible Chapter Notes edit-toolbar action. Saving must succeed before navigation; otherwise the Reader remains in edit mode and reports the error.

The Notes scope uses the current descriptor's `metadata.publisher` and opaque `metadata.resourceId`, not a filename, title, or Resource revision. The title is draft display metadata only. Document Notes shows associated Notes and Add creates a document-level Note. The mounted Reader remains underneath the Notes view.

## 7.2 Add Note — Select a word

**Implemented:** Next to the Document Notes icon in the same edit toolbar, **Add Note** starts a Reader-owned canonical-word selection mode. Like the Bible edit options, the normal toolbar is replaced by an instruction and **Cancel**. Cancel restores Text Markup editing and the unchanged in-memory draft; it does not create a Note. The feature is not in the Reader's More Actions list.

The Reader interaction is exclusive:

```text
reading              normal link + reading behavior
text-markup-edit     word click/drag mutates Text Markup draft
choose-note-word     word activation selects the Note target; markup drag disabled
```

During selection, floating Previous/Next are hidden and Text Markup drag is disabled. A document reload or account change cancels selection. Clicking a word validates the selected `blockId + contentIndex` against the loaded normalized document and requires `type === 'word'`. The Reader then **saves existing Text Markup before opening Notes**, just as the Bible Reader does. A failed save leaves the selection active without creating a Note draft. Successful completion opens the Notes Module with document scope and a one-time word `createTarget`, without a revision timestamp.

Word activation is consumed before reference-link dispatch; ordinary native links (including modified clicks) are also suppressed in selection mode. Reading-mode links remain unchanged. No Note is persisted until the existing Notes editor saves it.

## 7.3 Inline word markers

After word creation works end-to-end, project Resource-scoped word Note membership into a small, accessible inline indicator at words with one or more Notes. Activating it opens an exact word Notes scope and does not also activate a reference link, a Note selection, or Text Markup. Use an actual interactive element and keyboard/accessible label; visual icon size may be restrained but touch target must remain usable in narrow panes. Avoid nesting interactive controls inside an `<a>`; ensure marker and linked word have independent valid interaction targets. Retain one `ViewBody` scroll owner and bottom padding for floating Previous/Next.

Prefer a **generic** word-marker presentation contract in the renderer rather than importing Notes Domain types. The Reader maps Notes membership to renderer props and handles marker activation by address. Do not persist marker state in normalized documents.

---

# 8. Async, Identity, and Lifecycle Rules

- Derive the logical document identity from the validated **active Resource descriptor** (`publisher + resourceId`), not the displayed filename, formatted title, timestamp, or a stale Reader navigation initial descriptor.
- On `Next`/`Previous`: clear document and Notes markers, invalidate Notes projections, reload the new document, and retain the same Reader navigation entry.
- Guard async Notes responses by document generation (and scope/request identity if multiple requests are in flight), not merely by a callback's closure referencing a mutable `descriptor`.
- Do not allow a late result from document A to display markers in document B, including A → B → A races.
- On authentication change, ensure old user's active creation intent and subscriptions do not accidentally lead to new user's Note publication. Follow established Notes source/authentication behavior; signed-out creation should fail visibly rather than invent a Note owner.
- Use `$state.snapshot` (or plain reconstructed data) when serializing Svelte-owned values across Worker/pane boundaries; do not send Svelte proxies to `postMessage`.
- Import/archive refresh and cross-pane `NotesService` updates should invalidate and reproject membership without remounting the Reader.
- The Reader may be hidden under the Notes view, but remains mounted and returns with its current document, sequence index, and scroll state.

---

# 9. Incremental Delivery Plan

### Slice A — Domain and Resource foundation

Implemented: typed association, strict v1 handler, version-consistent reconstruction/storage, publication, draft creation, association predicates, and focused tests. No Reader controls yet.

### Slice B — Document Notes UI

Implemented: Notes navigation parser, installed-only document/word scopes, one-time create intent, scope-derived Add drafts, and Reader Edit toolbar → document-scoped Notes navigation after saving Text Markup. Focused tests cover the toolbar action and descriptor-to-Notes intent. Browser verification still needed for create/edit/delete/Back, document switching, Notes search, existing Bible Notes, and cross-pane updates.

### Slice C — Explicit word location selection

Implemented: Reader Edit toolbar → Add Note → Reader-owned word-selection mode → canonical address validation → save Text Markup → Notes Module with a one-time word draft target. Cancel restores the markup toolbar without saving; account/document changes cancel selection; link dispatch and Text Markup gestures remain isolated. Focused tests cover toolbar controls and word intent validation; full browser verification remains pending.

### Slice D — Inline indicators

Implemented: the Reader subscribes to the existing Notes collection-change channel, requests one accepted Notes snapshot, derives exact word membership keyed by Resource publisher/ID and canonical `blockId + contentIndex`, and supplies generic marker presentation data to the renderer. A marker button appears outside linked word anchors and opens the existing Notes Module with an exact word scope. Membership is cleared on document transitions and asynchronous responses are generation-guarded. Duplicate Notes at one word produce one indicator. The renderer does not import Notes Domain types or query persistence.

### Slice E — Regression and documentation alignment

Validate Resource identity through document updates, rapid document switching, auth switching, archive, Worker updates, multi-pane Back, publication, browser interactions, and update `001-notes.md` and `001-normalized-document.md` to describe what is **actually implemented**. Do not preemptively mark this proposed document as completed.

---

# 10. Test Matrix and Acceptance Criteria

## Domain/Resource (Node unit tests)

1. Standalone/Bible individual/bundle payloads validate and reconstruct without an association; unknown fields are rejected.
2. The same strict v1 individual/bundle handler validates document and word associations; rejects unknown fields, missing identities, mixed Bible association, malformed word address or obsolete revision fields, and payload `id`.
3. New Note publication contains the exact target, omits Domain `id` from payload, and uses `kjvonly.note@1`.
4. Factory candidates and both local Note storage write paths use correct semantic data-version metadata.
5. Editing standalone/Bible Notes preserves identity, title/content/tags and Bible relationship. No standalone/Bible Note becomes a normalized Note accidentally.
6. Document scope matches every association target on the logical Resource; word scope matches the Resource and canonical address (independent of revision); false positives across similarly named files, publishers, and different Resource IDs are excluded.
7. Word validation accepts only a canonical `word` at the exact `contentIndex`, including non-word inline entries interleaved before it; accepts unusual but valid block IDs without property collisions.
8. Archive round-trip and Resource installation/publication preserve Note associations under v1 and the existing Outbox contract.

## Navigation/Reader (browser tests)

1. File Manager → Reader → Edit → Document Notes → Add → Save → Back preserves same Reader document, scroll/sequence, and return path.
2. Document-scoped list includes document and word Notes for the Resource, but no Notes from other Resource IDs or Bible.
3. Edit → Add Note enters an explicit word-selection mode, captures Resource publisher/ID and `blockId + contentIndex` (without a revision timestamp), and Cancel leaves no persisted Note.
4. Word selection on a linked word does not follow the link; reading-mode link, local anchor, and modified-click behavior still work.
5. Text Markup click/drag and explicit Save/Cancel remain independent of Note selection.
6. Inline marker click opens only Notes for the Resource-scoped word address; two Notes on one word require only one marker.
7. Switching documents and rapid A → B → A loads never display stale Notes markers.
8. Updating the content of a Resource without changing its Resource ID does not break Notes matching; changed word positions are accepted without automatic re-anchoring.
9. Cross-pane updates, deletion, archive refresh, and authentication changes reproject correctly.
10. All existing Bible chapter/verse/word Note flows still work, including Bible-only resource selections.

Ordinary tests must not require a live relay. Use the project's existing in-memory or browser integration harnesses. Run focused tests before the normal `npm run test && npm run build`, then browser tests where applicable; report unrun tests explicitly.

---

# 11. Architectural Invariants

1. **Notes remains the only Note Domain and publication owner.**
2. **Normalized Content owns canonical addresses; DOM coordinates are not durable identity.**
3. **Document and word Notes both match by logical Resource identity; word Notes additionally match a canonical address, never a revision timestamp.**
4. **Navigation scope and creation intent are separate and serializable.**
5. **The renderer never imports Notes services or manipulates pane navigation.**
6. **The Reader never writes directly to IndexedDB, Outbox, or Nostr for Notes.**
7. **One strict `kjvonly.note@1` handler accepts standalone, Bible, and normalized-document Notes.**
8. **Word selection and Text Markup editing are mutually exclusive.**
9. **Reader Previous/Next, File Manager handoff, and pane Back behavior are preserved.**
10. **New capabilities land as small, separately reviewable changes.**
