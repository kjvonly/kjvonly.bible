# Normalized Content Reader — Bookmarks Integration

**Status:** In progress. Add Bookmark, inline indicators, current-document Browse, destination-first relocation, and global Bookmarks → mounted normalized-document Reader launch are implemented.

## Boundaries

The Bookmarks Domain continues to own Bookmark identity, validation, persistence, publication, and the Bookmarks Module. The Normalized Content Reader owns the active published Resource descriptor, canonical word selection, preview extraction, and navigation. The generic normalized renderer never accesses `BookmarksService`.

A normalized Bookmark targets one word using the **exact** `(publisher, opaque resourceId, blockId, contentIndex)` tuple. `contentIndex` indexes the block's canonical `content[]` including anchors and line breaks. Resource modification timestamps, filenames, and previews are not Bookmark identity. The Bookmarks service validates only the target structure and Resource identity; it trusts the Reader to select a real canonical word. It never receives normalized document content.

The Reader validates a selection with the Normalized Content Domain's
`assertNormalizedContentWordAddress()` and creates the bounded plain-text
`previewText`. Only `{ kind, document: { publisher, resourceId }, address }`
and the preview cross into Bookmarks. Neither creating a Bookmark nor projecting
its indicators requires `$state.snapshot(document)` or passing document contents
to `BookmarksService`.

## Add Bookmark — implemented

1. With an authenticated publisher, enter the Reader's Edit mode.
2. Select **Add Bookmark**, after the Text Markup and Notes controls in the bottom edit toolbar.
3. The toolbar displays **Select a word for the bookmark** and **Cancel**. This is distinct from Note selection and Text Markup editing.
4. Select one canonical word. Linked words are consumed before application-reference navigation, and markup gestures are disabled while selecting.
5. The Reader builds a typed normalized Bookmark target from the active descriptor and extracts a short, plain-text preview surrounding the word from the canonical content block. The preview is display-only and bounded; it is not the filename.
6. The Reader saves pending Text Markup before calling `BookmarksService.create(target, previewText)`. The service owns its existing atomic Domain Object/Outbox publication transaction.
7. A successful creation exits Edit and stays in the **same mounted Reader**. A failed Bookmark write shows an error and restores selection for retry if the account/document is unchanged. Cancel does not write a Bookmark.

Selection is invalidated on authentication or document changes; repeated word clicks during an in-flight write must not create duplicates. Previous/Next and More Actions remain disabled during active selection. Notes and ordinary link behavior outside selection mode remain unchanged.

## Inline Bookmark indicators — implemented

The Reader subscribes to `BookmarksService` changes and requests the accepted Bookmarks for the active `(publisher, resourceId)` once per change. Generation checks prevent out-of-order results from a prior document or a destroyed Reader from restoring stale markers. The Reader projects Bookmark addresses without cloning or traversing the document. The generic renderer displays markers only on actual rendered word entries, so a missing or non-word address has no visible marker. Duplicate Bookmarks at one address share one marker, including for block IDs such as `__proto__`.

The generic renderer receives an address-membership projection and displays the existing Bookmark icon immediately **left** of the associated word, before an optional Note icon. Neither marker is nested inside a linked word; activation is independent of links, markup, and selection gestures. Conditional rendering must not add whitespace or break `joinPrevious`.

Clicking a Bookmark marker opens the existing Bookmarks Module with `normalizedTarget` as an exact-word Browse filter. The list shows only Bookmarks at that target, retains its Delete confirmation, and returns to the mounted Reader when a row is activated. In the unscoped main Bookmarks list, normalized Bookmark rows open the registered Reader for the bookmarked Resource when that Resource is available in an accepted mounted filesystem mapping.

## Browse current document — implemented

The Reader's More Actions menu includes **Browse document bookmarks**. This opens
`bookmarks.root` with `normalizedDocument: { publisher, resourceId }`, listing
all accepted normalized-word Bookmarks for the **active logical Resource**.
Bible Bookmarks and other documents are excluded; duplicate Bookmarks remain
independent. Selecting a row returns a validated normalized Bookmark target via
`backWithResult`, and the same mounted Reader checks its active Resource and
canonical word before scrolling the rendered word into view. Opaque Resource
IDs and unusual block IDs are not interpreted as paths or CSS selectors.
Unavailable words are reported rather than navigating to a different word.
The exact-word marker scope continues to work independently.

This action is deliberately scoped to the current document. The unscoped
main Bookmarks list has a separate Resource-aware launch path (below).

## Main Bookmarks → Normalized Document — implemented

Selecting a normalized-document Bookmark from the unscoped main Bookmarks
Module resolves its `(publisher, opaque resourceId)` against accepted mounted
Filesystem mappings. The Filesystem owner returns the latest matching entry,
including the Resource descriptor and the mounted path. The application
`ResourceModuleResolver` selects its registered Reader, receiving the path's
basename as display-only `fileName` context (as it does for File Manager).
The Bookmark target travels as a serializable `bookmarkTarget` launch intent,
so the Reader can load the document, validate the canonical word, and scroll
to it once its DOM has mounted. Normal in-place Previous/Next navigation
does not replay this initial launch intent.

The Bookmark target never contains a filesystem path or fabricated descriptor.
If no mounted mapping advertises the Resource, the main Bookmarks view reports
its unavailability instead of navigating to an unrelated document. A Resource
resolved to a different application Module is likewise rejected. This lookup
currently reads accepted mounted roots on demand; it does not add a persistent
reverse index or change the Resource installation lifecycle. Reader-scoped
Browse retains its existing `backWithResult` behavior and returns to the same
mounted Reader rather than pushing a new one.

## Update Bookmark — implemented

The Reader Edit toolbar places **Update Bookmark** next to Add Bookmark using
`bookmarkCheck.svelte`. The update gesture is distinct from Add, Notes selection,
and Text Markup: **select the new word first**, then choose an existing Bookmark
from the Bookmarks Module. Cancel during selection changes nothing. The selected
word is validated against the active document and its canonical context preview
is captured before saving the pending Text Markup draft.

The Bookmarks Module receives a validated `normalizedDestination` and
`destinationPreviewText` under `mode: 'relocate'`. Its normalized relocation list
contains existing normalized-document Bookmarks (including those in other
Resources) but excludes Bible Bookmarks. It presents the same confirmation
view used by Bible relocation, showing the old and new locations and previews;
a no-op move to the identical target is disabled. The selected Bookmark's
**stable ID**, rather than a location or timestamp, identifies the Bookmark to
update. Cancel or Back from the confirmation creates no Bookmark mutation.

Unlike Bible relocation, the normalized confirmation does **not** serialize a
full `NormalizedDocument` into pane navigation or fetch one inside Bookmarks.
Instead it returns a validated, typed confirmation containing the selected
Bookmark ID, destination target, and preview. The mounted Reader verifies that
the active publisher/document still match, and then calls
`BookmarksService.relocate(id, target, preview)`. The Reader owns content-address validation. The service trusts its target,
retains the original Bookmark ID, and owns persistence and publication. On success the same mounted Reader reveals the destination word;
on failure a toast reports the error. Authentication changes invalidate the
pending operation. The separate Bible confirmation still performs Bible
relocation through its original service call and result flow.

## Remaining Reader integration

- Cover rapid document changes, imported updates, multi-pane updates, and
  account changes with browser regression tests. Existing Bible Bookmarks must
  remain unchanged.
