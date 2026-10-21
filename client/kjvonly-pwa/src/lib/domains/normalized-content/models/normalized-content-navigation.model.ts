export const NORMALIZED_CONTENT_VIEWS = {
	READER: 'normalized-content.reader',
	OVERFLOW_ACTIONS: 'normalized-content.overflow-actions',
	TEXT_MARKUP_LOOKUP: 'normalized-content.text-markup-lookup'
} as const;

export type NormalizedContentView =
	typeof NORMALIZED_CONTENT_VIEWS[
		keyof typeof NORMALIZED_CONTENT_VIEWS
	];

/** Result values returned by the Reader's More Actions child view. */
export const NORMALIZED_CONTENT_NAVIGATION_RESULTS = {
	OVERFLOW_ACTION: 'normalized-content.overflow-action',
	TEXT_MARKUP_LOOKUP: 'normalized-content.text-markup-lookup-choice'
} as const;

export const NORMALIZED_CONTENT_OVERFLOW_ACTIONS = {
	SPLIT_HORIZONTAL: 'split-horizontal',
	SPLIT_VERTICAL: 'split-vertical',
	BROWSE_DOCUMENT_BOOKMARKS: 'browse-document-bookmarks'
} as const;

export type NormalizedContentOverflowAction =
	typeof NORMALIZED_CONTENT_OVERFLOW_ACTIONS[
		keyof typeof NORMALIZED_CONTENT_OVERFLOW_ACTIONS
	];

/** Outcomes returned to the Reader. Retrying is handled within the lookup view. */
export const NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES = {
	LOADED: 'loaded',
	USE_LOCAL: 'use-local',
	START_NEW: 'start-new',
	WITHOUT_MARKUP: 'without-markup'
} as const;

export type NormalizedContentTextMarkupLookupOutcome =
	typeof NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES[
		keyof typeof NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES
	];
