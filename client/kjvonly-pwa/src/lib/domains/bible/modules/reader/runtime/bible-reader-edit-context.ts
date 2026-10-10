import {
	getContext,
	setContext
} from 'svelte';

export const BIBLE_READER_EDIT_INTENTS = {
	MARKUP: 'markup',
	NOTE_LOCATION: 'note-location'
} as const;

export type BibleReaderEditIntent =
	(typeof BIBLE_READER_EDIT_INTENTS)[keyof typeof BIBLE_READER_EDIT_INTENTS];

/**
 * Reader-local edit interaction shared by the toolbar and rendered chapter.
 *
 * This state coordinates temporary UI intent only. Persistent Bible mode and
 * Text Markup remain owned by their existing models.
 */
export interface BibleReaderEditContext {
	/** Current mutually exclusive Reader edit interaction. */
	intent: BibleReaderEditIntent;

	/** Switches from markup editing to explicit Note-location selection. */
	startNoteLocationSelection(): void;

	/** Returns the Reader to normal Text Markup editing. */
	cancelNoteLocationSelection(): void;

	/** Reports the selected exact verse or word location to the Reader owner. */
	completeNoteLocationSelection(
		bibleLocationRef: string
	): Promise<void>;
}

const BIBLE_READER_EDIT_CONTEXT =
	Symbol(
		'kjvonly.bible-reader-edit-context'
	);

/**
 * Provides one Reader's reactive edit interaction to descendants.
 *
 * @param context - Reader-scoped interaction state owned by `bibleContainer`.
 */
export function provideBibleReaderEditContext(
	context: BibleReaderEditContext
): void {
	setContext(
		BIBLE_READER_EDIT_CONTEXT,
		context
	);
}

/**
 * Returns the edit interaction owned by the nearest Bible Reader.
 *
 * @returns Reader-scoped temporary edit intent and coordination callbacks.
 * @throws When called outside a Bible Reader context provider.
 */
export function useBibleReaderEditContext():
	BibleReaderEditContext {
	const context =
		getContext<
			BibleReaderEditContext |
				undefined
		>(
			BIBLE_READER_EDIT_CONTEXT
		);

	if (!context) {
		throw new Error(
			'Bible Reader edit context is not available.'
		);
	}

	return context;
}
