export type SearchViewState =
	| 'initial'
	| 'searching'
	| 'results'
	| 'no-results'
	| 'failure';

/**
 * Domain-owned result state consumed by the shared search workflow.
 */
export interface SearchViewResultSummary {
	query: string;
	renderedCount: number;
	totalCount: number;
}

/**
 * State exposed to a domain-owned search-results renderer.
 */
export interface SearchViewResultsContext {
	query: string;
	showResults: boolean;
}
