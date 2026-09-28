export const SEARCH_VIEWS = {
	RESULTS: 'search.results',
	OVERFLOW_ACTIONS: 'search.overflow-actions'
} as const;

export type SearchView =
	typeof SEARCH_VIEWS[
		keyof typeof SEARCH_VIEWS
	];

export const SEARCH_NAVIGATION_RESULTS = {
	OVERFLOW_ACTION: 'search.overflow-action'
} as const;

export const SEARCH_OVERFLOW_ACTIONS = {
	BIBLE_VERSION: 'bible-version'
} as const;

export type SearchOverflowAction =
	typeof SEARCH_OVERFLOW_ACTIONS[
		keyof typeof SEARCH_OVERFLOW_ACTIONS
	];
