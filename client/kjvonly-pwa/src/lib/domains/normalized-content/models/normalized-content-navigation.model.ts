export const NORMALIZED_CONTENT_VIEWS = {
	READER: 'normalized-content.reader',
	OVERFLOW_ACTIONS: 'normalized-content.overflow-actions'
} as const;

export type NormalizedContentView =
	typeof NORMALIZED_CONTENT_VIEWS[
		keyof typeof NORMALIZED_CONTENT_VIEWS
	];

/** Result values returned by the Reader's More Actions child view. */
export const NORMALIZED_CONTENT_NAVIGATION_RESULTS = {
	OVERFLOW_ACTION: 'normalized-content.overflow-action'
} as const;

export const NORMALIZED_CONTENT_OVERFLOW_ACTIONS = {
	SPLIT_HORIZONTAL: 'split-horizontal',
	SPLIT_VERTICAL: 'split-vertical'
} as const;

export type NormalizedContentOverflowAction =
	typeof NORMALIZED_CONTENT_OVERFLOW_ACTIONS[
		keyof typeof NORMALIZED_CONTENT_OVERFLOW_ACTIONS
	];
