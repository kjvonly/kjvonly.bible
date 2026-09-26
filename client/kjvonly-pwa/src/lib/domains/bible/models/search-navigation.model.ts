export const SEARCH_VIEWS = {
	RESULTS: 'search.results'
} as const;

export type SearchView =
	typeof SEARCH_VIEWS[
		keyof typeof SEARCH_VIEWS
	];
