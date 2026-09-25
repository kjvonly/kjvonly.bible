import { DebounceService } from '../../services/debounce.service';

import type {
	SearchViewResultSummary,
	SearchViewState
} from './search-view.model';

export interface SearchSessionOptions {
	initialQuery: string;
	minimumQueryLength: number;
	debounceMilliseconds: number;
	onSearch: (query: string) => Promise<void>;
	onQueryInput?: (query: string) => void;
}

/**
 * Owns the reusable query/debounce/result-state lifecycle for SearchView.
 *
 * Domain adapters provide the search operation and result summaries while this
 * session owns only UI-facing search state.
 */
export class SearchSession {
	query = $state('');
	searchState = $state<SearchViewState>('initial');
	renderedResultsCount = $state(0);
	totalResultsCount = $state(0);

	private readonly searchDebounce: DebounceService;
	private requestGeneration = 0;

	constructor(private readonly options: SearchSessionOptions) {
		this.query = options.initialQuery;
		this.searchDebounce = new DebounceService(
			options.debounceMilliseconds
		);
	}

	start(): void {
		if (this.query.length < this.options.minimumQueryLength) {
			return;
		}

		void this.runSearch(this.query);
	}

	destroy(): void {
		this.searchDebounce.cancel();
		this.requestGeneration += 1;
	}

	handleQueryInput(value: string): void {
		this.requestGeneration += 1;
		this.query = value;
		this.options.onQueryInput?.(value);
		this.renderedResultsCount = 0;
		this.totalResultsCount = 0;

		if (value.length < this.options.minimumQueryLength) {
			this.searchDebounce.cancel();
			this.searchState = 'initial';
			return;
		}

		this.searchState = 'searching';

		this.searchDebounce.schedule(() => {
			void this.runSearch(value);
		});
	}

	applyResultSummary(summary?: SearchViewResultSummary): void {
		if (!summary || summary.query !== this.query) {
			return;
		}

		this.renderedResultsCount = summary.renderedCount;
		this.totalResultsCount = summary.totalCount;

		if (this.searchState === 'searching') {
			this.searchState = summary.totalCount > 0
				? 'results'
				: 'no-results';
		}
	}

	retrySearch(): void {
		this.searchDebounce.cancel();
		void this.runSearch(this.query);
	}

	private async runSearch(value: string): Promise<void> {
		const requestGeneration = ++this.requestGeneration;
		this.searchState = 'searching';

		try {
			await this.options.onSearch(value);
		} catch {
			if (requestGeneration === this.requestGeneration) {
				this.searchState = 'failure';
			}
		}
	}
}
