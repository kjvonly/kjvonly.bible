import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	SearchSession
} from './search-session.svelte';

function createSearchSession(options?: {
	initialQuery?: string;
	minimumQueryLength?: number;
	debounceMilliseconds?: number;
	onSearch?: (query: string) => Promise<void>;
	onQueryInput?: (query: string) => void;
}) {
	return new SearchSession({
		initialQuery: options?.initialQuery ?? '',
		minimumQueryLength: options?.minimumQueryLength ?? 3,
		debounceMilliseconds: options?.debounceMilliseconds ?? 300,
		onSearch: options?.onSearch ?? vi.fn(async () => undefined),
		onQueryInput: options?.onQueryInput
	});
}

describe(
	'SearchSession',
	() => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it(
			'runs an initial query immediately when started',
			() => {
				const onSearch = vi.fn(async () => undefined);
				const searchSession = createSearchSession({
					initialQuery: 'faith',
					onSearch
				});

				searchSession.start();

				expect(onSearch).toHaveBeenCalledWith('faith');
				expect(searchSession.searchState).toBe('searching');
			}
		);

		it(
			'does not run an initial query below the minimum query length',
			() => {
				const onSearch = vi.fn(async () => undefined);
				const searchSession = createSearchSession({
					initialQuery: 'ab',
					onSearch
				});

				searchSession.start();

				expect(onSearch).not.toHaveBeenCalled();
				expect(searchSession.searchState).toBe('initial');
			}
		);

		it(
			'debounces user input and restarts the delay after each edit',
			() => {
				vi.useFakeTimers();

				const onSearch = vi.fn(async () => undefined);
				const searchSession = createSearchSession({ onSearch });

				searchSession.handleQueryInput('faith');
				vi.advanceTimersByTime(200);
				searchSession.handleQueryInput('grace');
				vi.advanceTimersByTime(299);

				expect(onSearch).not.toHaveBeenCalled();

				vi.advanceTimersByTime(1);

				expect(onSearch).toHaveBeenCalledTimes(1);
				expect(onSearch).toHaveBeenCalledWith('grace');
			}
		);

		it(
			'cancels pending search work below the minimum query length',
			() => {
				vi.useFakeTimers();

				const onSearch = vi.fn(async () => undefined);
				const searchSession = createSearchSession({ onSearch });

				searchSession.handleQueryInput('faith');
				vi.advanceTimersByTime(200);
				searchSession.handleQueryInput('ab');
				vi.advanceTimersByTime(300);

				expect(onSearch).not.toHaveBeenCalled();
				expect(searchSession.searchState).toBe('initial');
			}
		);

		it(
			'ignores result summaries for stale queries',
			() => {
				const searchSession = createSearchSession();

				searchSession.handleQueryInput('grace');
				searchSession.applyResultSummary({
					query: 'faith',
					renderedCount: 10,
					totalCount: 20
				});

				expect(searchSession.searchState).toBe('searching');
				expect(searchSession.renderedResultsCount).toBe(0);
				expect(searchSession.totalResultsCount).toBe(0);
			}
		);

		it(
			'distinguishes results from no results',
			() => {
				const searchSession = createSearchSession();

				searchSession.handleQueryInput('grace');
				searchSession.applyResultSummary({
					query: 'grace',
					renderedCount: 0,
					totalCount: 0
				});

				expect(searchSession.searchState).toBe('no-results');

				searchSession.handleQueryInput('faith');
				searchSession.applyResultSummary({
					query: 'faith',
					renderedCount: 10,
					totalCount: 25
				});

				expect(searchSession.searchState).toBe('results');
				expect(searchSession.renderedResultsCount).toBe(10);
				expect(searchSession.totalResultsCount).toBe(25);
			}
		);

		it(
			'enters failure for the current query and retries it',
			async () => {
				vi.useFakeTimers();

				const onSearch = vi
					.fn<(query: string) => Promise<void>>()
					.mockRejectedValueOnce(new Error('search failed'))
					.mockResolvedValue(undefined);
				const searchSession = createSearchSession({ onSearch });

				searchSession.handleQueryInput('faith');
				vi.advanceTimersByTime(300);
				await Promise.resolve();

				expect(searchSession.searchState).toBe('failure');

				searchSession.retrySearch();

				expect(searchSession.searchState).toBe('searching');
				expect(onSearch).toHaveBeenCalledTimes(2);
				expect(onSearch).toHaveBeenLastCalledWith('faith');
			}
		);

		it(
			'does not let a stale failed request replace the current search state',
			async () => {
				vi.useFakeTimers();

				let rejectFaith: ((reason?: unknown) => void) | undefined;
				const onSearch = vi.fn((query: string) => {
					if (query === 'faith') {
						return new Promise<void>((_, reject) => {
							rejectFaith = reject;
						});
					}

					return Promise.resolve();
				});
				const searchSession = createSearchSession({ onSearch });

				searchSession.handleQueryInput('faith');
				vi.advanceTimersByTime(300);
				searchSession.handleQueryInput('grace');
				vi.advanceTimersByTime(300);

				rejectFaith?.(new Error('stale failure'));
				await Promise.resolve();

				expect(searchSession.query).toBe('grace');
				expect(searchSession.searchState).toBe('searching');
			}
		);
	}
);
