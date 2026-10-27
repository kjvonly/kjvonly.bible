import type { NormalizedContentAddress } from '../../../models/normalized-content-address.model';

/** Distinct Reader behaviors; adding a new action adds a state, not a Reader gesture branch. */
export enum ReaderActionKind {
	Reading = 'reading',
	TextMarkup = 'text-markup',
	WithoutMarkup = 'without-markup',
	AddNote = 'add-note',
	AddBookmark = 'add-bookmark',
	MoveBookmark = 'move-bookmark'
}

export enum ReaderActionEntry {
	Initial = 'initial',
	Resume = 'resume'
}

/** Shared explicit outcomes for entry and controller transitions. */
export enum ReaderActionOutcome {
	Entered = 'entered',
	Deferred = 'deferred',
	Rejected = 'rejected',
	Blocked = 'blocked'
}

export type ReaderActionEntryResult =
	| ReaderActionOutcome.Entered
	| ReaderActionOutcome.Deferred
	| ReaderActionOutcome.Rejected;

/** A context reset must discard, not publish, the previous document's draft. */
export enum ReaderActionExitReason {
	SwitchAction = 'switch-action',
	ActionComplete = 'action-complete',
	SaveAndClose = 'save-and-close',
	Cancel = 'cancel',
	ContextReset = 'context-reset'
}

export type ReaderActionTransitionResult =
	| ReaderActionOutcome.Entered
	| ReaderActionOutcome.Deferred
	| ReaderActionOutcome.Rejected
	| ReaderActionOutcome.Blocked;

/**
 * One state's interaction contract. Each implementation owns its effects and
 * action-specific dependencies; it never chooses or imports a destination state.
 *
 * Word/link activation stays synchronous to preserve the renderer's consumed
 * callback. A state may start asynchronous work after consuming a word click.
 */
export interface ReaderActionState {
	readonly kind: ReaderActionKind;

	enter(entry: ReaderActionEntry): ReaderActionEntryResult | Promise<ReaderActionEntryResult>;
	/** Return false when exit must be vetoed, e.g. a failed Text Markup save. */
	exit(reason: ReaderActionExitReason): boolean | Promise<boolean>;

	onWordClick(address: NormalizedContentAddress): boolean;
	onDragApply(address: NormalizedContentAddress): void;
	onDragRemove(address: NormalizedContentAddress): void;
	onLinkActivate(hrefs: readonly string[]): boolean;
}
