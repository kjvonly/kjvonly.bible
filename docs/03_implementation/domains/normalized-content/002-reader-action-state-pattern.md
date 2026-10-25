# Normalized Content Reader — Action State Pattern

**Status:** Implemented (2026-10-21)

**Scope:** Document actions in the normalized-content Reader

This documents the implemented state ownership and navigation behavior.
The Text Markup persistence and lookup lifecycle is documented in
[Normalized Document Implementation](./001-normalized-document.md#107-implemented-v1-lifecycle-and-boundaries).

## Purpose and boundaries

The former mutable `documentEditMode`/`selectedWordAction` action flags and
conditional gesture handlers have been replaced with **one active behavior-owning
state** in `normalizedContentReader.svelte`. Each state owns its action behavior;
the Reader forwards word/drag/link interactions to that state.

Use a small **State design pattern**, not a general event dispatcher or a Harel
statechart. An ordinary state can perform entry/exit actions and await an
asynchronous save. No parallel state regions, action registry, or nested return
stack is currently justified.

Responsibilities remain separate:

- **Reader:** compose document presentation, lifecycle/lookup collaborators,
  action controller, header/toolbar, and existing renderer callbacks.
- **Action state:** implement its own gesture behavior, local action data, and
  entry/exit effects; never import or construct another concrete action state.
- **Controller:** activate states, sequence exits/entries, prevent overlapping
  transitions, and remember the return target for a temporary action. It does
  not contain Note, Bookmark, Text Markup, or future Tag business logic.
- **Owning Domain services:** canonical acceptance, validation, persistence,
  publication, and change notifications remain with the appropriate Domain.
- **Navigation Runtime:** owns pushed Notes, Bookmarks, and recovery views and
  their typed return results. Opening those views does not create corresponding
  Reader action states.

Document availability, current publisher, relay verification, and cross-pane
Domain notifications are inputs to this workflow, **not** more action states.
The Pane's `ViewBody` remains the only primary vertical scroll container; the
block-window and document-loading implementations are outside this refactor.

## States and their actions

| State | Owned behavior | Gesture behavior | Exit/completion |
|---|---|---|---|
| `ReadingState` | Ordinary document interaction and initiating Edit | Existing word/link behavior; no markup | Begin the configured action session |
| `TextMarkupState` | Draft, selected markup tool, changed-only save, recovery entry decision | Word click toggles; drag applies/removes markup | Save on successful switch/Done; discard on Cancel |
| `WithoutMarkupState` | Explicit recovery choice to continue without markup | Consume word click without marking; ignore markup drag | Switch/close without a markup write |
| `AddNoteState` | Select canonical word and initiate word Note navigation | Click selects word; drag ignored; document link suppressed | Complete/cancel through controller; navigation handoff follows agreed return policy |
| `AddBookmarkState` | Select canonical word; create Bookmark | Click selects word; drag ignored; document link suppressed | On success return to captured state; on create failure remain for retry |
| `MoveBookmarkState` | Select destination and open existing Bookmarks relocation picker | Click selects destination; drag ignored; document link suppressed | Cancel or picker handoff; typed picker result is handled separately |

`TextMarkupState` is the **usual first action state** when the user selects
Edit. This choice belongs to Reader composition/session setup, **not** to a
controller hardcoded to the Text Markup class. A recovery decision can instead
start the session in `WithoutMarkupState`.

Selecting a markup color/tool changes Text Markup's local data; it is not a
transition to a different state. Toolbar/header visibility derives from the
active state rather than becoming another source of workflow truth.

## Implemented state contract

The concrete contract lives in `modules/reader/actions/reader-action-state.ts`:

```ts
interface ReaderActionState {
  readonly kind: ReaderActionKind;

  enter(entry: ReaderActionEntry): ReaderActionEntryResult | Promise<ReaderActionEntryResult>;
  exit(reason: ReaderActionExitReason): boolean | Promise<boolean>;

  onWordClick(address: NormalizedContentAddress): boolean;
  onDragApply(address: NormalizedContentAddress): void;
  onDragRemove(address: NormalizedContentAddress): void;
  onLinkActivate(hrefs: readonly string[]): boolean;
}
```

`ReaderActionKind`, `ReaderActionEntry`, `ReaderActionOutcome`, and
`ReaderActionExitReason` are enums. The entry results are `Entered`, `Deferred`,
and `Rejected`; controller transitions additionally permit `Blocked`. A future
`AddTagsState` would implement the same contract when Tag requirements exist.

Every concrete state implements the agreed interface, including intentional no-op methods. Word activation remains
synchronous for the renderer's consumed/not-consumed contract; a state can begin
asynchronous persistence/navigation after consuming an interaction.

Avoid duplicate `onCancel()` and `exit(ReaderActionExitReason.Cancel)`
responsibilities. The UI can request cancellation from the controller, which calls the state's `exit()`.
Do not introduce a generic `onEvent()` dispatcher alongside typed handlers.

## Controller and transitions

The controller holds the active state and offers a transition operation, not a
set of `if (state === ...)` business-action branches:

1. Ask `currentState.exit(reason)` to finish or discard its work as required.
2. Wait for asynchronous exits; complete synchronous exits immediately. If an exit
   fails/vetoes, leave the current state and draft active.
3. When activating a temporary action, capture the outgoing state as its
   **return target**. This is a state reference/contract, not a concrete class
   name or a separately hardcoded default.
4. Enter the requested state; only publish it as active on a successful entry.
   A deferred/rejected entry must not expose a half-activated toolbar.
5. When the temporary action reports completion or cancellation, transition
   to the captured target; that state receives `enter(ReaderActionEntry.Resume)`.

For example:

```text
currentState: TextMarkupState
    Add Bookmark requested
        -> currentState.exit(ReaderActionExitReason.SwitchAction)
             -> unchanged draft: no write
             -> changed draft: await Text Markup Domain put()
             -> failed write: veto, remain in TextMarkupState
        -> capture current state as return target
        -> AddBookmarkState.enter(ReaderActionEntry.Initial)
        -> currentState: AddBookmarkState
    Word clicked
        -> AddBookmarkState creates Bookmark through owning service
        -> on success, controller resumes captured state
```

The identical return mechanism works when `WithoutMarkupState` launches a
word-selection action. States do not know which other state will be entered
next. Only **one return target** is needed for the currently identified flows;
do not add `defaultState`, `previousState`, `originState`, and a stack together.
If nested temporary actions become real, revisit that constraint then.

### Text Markup exit semantics

| Exit reason | Required behavior |
|---|---|
| Switch to another action | Save only changed markings; veto transition on failure |
| Save/Done | Save only changed markings; end action session |
| Cancel edits | Restore accepted markings; **do not write** |
| Document/account reset | Clear abandoned session; **do not write** |

Changed-only comparison is against accepted markings (including an edit followed
by undo). Do not introduce a second mutable `dirty` flag. Text Markup owns
completion of its changes; temporary Note/Bookmark states no longer need to
save Text Markup after selecting a word. The accepted Domain pub/sub path
continues to update the displayed draft according to the current contract.

### Text Markup entry and recovery

`TextMarkupState.enter(ReaderActionEntry.Initial)` determines whether Text
Markup is available for the authenticated publisher/document and whether
verification requires recovery. It **uses the existing** `TEXT_MARKUP_LOOKUP` Navigation view:

| Existing recovery outcome | Action session behavior |
|---|---|
| Lookup loaded / Use local / Start new | Enter Text Markup using the selected accepted/draft data |
| Continue without Text Markup | Controller activates `WithoutMarkupState` |
| Back/dismiss | Remain in Reading |

Retry and the recovery UI remain in the existing Navigation view. Returned
results are validated against the publisher and document before enabling an
action state; no duplicate recovery UI or `RecoveryState` is introduced.
Within one action session, resuming Text Markup from a temporary state should
**not** reopen recovery for an already accepted `Use local` or `Start new`
choice. A new session must still respect an unresolved relay lookup. Do not
turn a session choice into a fabricated global verification success.

## Notes, Bookmarks, toolbar, and overflow

- **Open Document Notes** and **Browse document bookmarks** are available in
  Reader overflow. They are navigation commands, not word-selection states.
- Opening overflow and using its Notes, Bookmarks, or split/navigation commands
  **does not exit or replace the active Reader action state**. The mounted Reader
  retains its draft, palette, and current mode while another view is open.
  Returning resumes the same state; an external Bookmark result may change the
  displayed location without ending the action session. Only a real state
  switch or explicit Save/Done invokes Text Markup's save-on-exit behavior.
- The existing toolbar and header derive their controls from
  `ReaderActionKind`. Their presentation checks are not a second gesture
  dispatcher or a second source of action state.
- Notes/Bookmarks are Navigation-owned views over a preserved mounted Reader,
  not `NotesOpenState`/`BookmarksOpenState`. On return, use the controller's
  retained session and existing Domain notifications. Bookmark relocation still
  completes from the typed `backWithResult`, even if the selecting state has
  already handed off control.

When a temporary word-selection action launches Notes or a Bookmark relocation
picker, the controller returns to the captured action state; Navigation owns the
pushed view and its typed result. Merely opening or returning from that view is
not an additional state transition.

The Reader overflow remains available while editing. It is disabled only
while a transition or word action is busy; Document Notes is reachable from
the overflow in both Text Markup and Without Markup sessions.

Existing Note and Bookmark markers remain visible in every action state, but
are interactive **only in `ReadingState`** (and while no Reader action is busy).
Their disabled buttons do not navigate, consume word-selection gestures, or
present a clickable cursor. New word-selection states do not need additional
marker-handler exclusion checks.

## Implementation shape and Svelte reactivity

Implemented per-Reader organization:

```text
modules/reader/
  normalizedContentReader.svelte           # host, Domain subscriptions, rendering
  normalizedContentTextMarkupEditOptions.svelte  # presentation-only toolbar
  actions/
    reader-action-state.ts                  # contracts and enums
    reader-action-controller.svelte.ts      # active state and temporary return target
    reading-state.ts
    text-markup-state.svelte.ts             # reactive draft and palette
    without-markup-state.ts
    add-note-state.svelte.ts
    add-bookmark-state.svelte.ts
    move-bookmark-state.svelte.ts
    word-action-ports.ts                    # narrow shared word-action capabilities
```

Each state/controller has a focused `.spec.ts`. The toolbar and integrated
Reader behavior are covered by browser tests, including recovery, draft saving,
Notes/Bookmarks navigation, and File Manager sequence navigation.

Ordinary `.ts` files can implement behavior, delegate through **small typed
collaborator ports**, and remain independently testable. Use `.svelte.ts` only
where a state/controller needs Svelte 5 runes such as `$state`. Do not pass a
snapshot of a reactive primitive to a constructor and expect later updates;
use a live getter or reactive model where required. Avoid a broad
`ReaderActionContext` carrying every Domain service, and avoid module-level
singletons: each mounted Reader/pane has its own controller and session state.

Reuse existing canonical addressing, draft, Navigation, and Domain helpers
rather than reimplementing their rules in state files. This extraction should
**reduce** the Reader's responsibilities, not move those responsibilities into
an oversized controller.

## Regression verification

- Switching from Text Markup saves **before** entering a temporary action,
  writes only if changed, and stays in Text Markup on save failure.
- Completing/canceling an action returns to the captured state without naming
  its concrete class; failure creating a Bookmark permits retry without a
  duplicate write.
- Word clicks, drag, link and marker activation obey the active state; selection
  states never apply Text Markup.
- Cancel versus Save/Done versus context reset preserve their distinct effects.
- Recovery uses the existing view and typed results, including a return to
  Text Markup within the same session without another recovery prompt.
- Opening overflow/Notes/Bookmarks and returning preserves the active Reader
  state without an implicit save; relocation may change the displayed location.
- Multiple mounted Readers remain independent; no second scroll owner is added.

## Related implementation documentation

- [Normalized document and markup lifecycle](./001-normalized-document.md)
- [Normalized Reader Notes integration](../notes/002-normalized-document-notes.md)
- [Normalized Reader Bookmarks integration](../bookmarks/002-normalized-content-reader-integration.md)
- [Navigation Runtime](../../runtime/016-navigation-architecture.md)
