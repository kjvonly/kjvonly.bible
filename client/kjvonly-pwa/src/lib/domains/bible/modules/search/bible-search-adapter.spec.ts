import {
	describe,
	expect,
	it
} from 'vitest';

import type { PublishedResourceReference } from '$lib/resource';

import type { SearchResultResponse } from '../../models/search.model';
import { BibleSearchAdapter } from './bible-search-adapter';

describe('BibleSearchAdapter', () => {
	it('binds the search id and resource source to every search', async () => {
		const searchService = new FakeSearchService();
		const searchSource = createSearchSource();
		const adapter = new BibleSearchAdapter(
			searchService,
			'search-1',
			searchSource
		);

		await adapter.search('grace');

		expect(searchService.searches).toEqual([
			{
				id: 'search-1',
				source: searchSource,
				query: 'grace'
			}
		]);
	});

	it('returns a cleanup function for its result subscription', () => {
		const searchService = new FakeSearchService();
		const adapter = new BibleSearchAdapter(
			searchService,
			'search-1',
			createSearchSource()
		);
		const listener = (_result: SearchResultResponse) => undefined;

		const unsubscribe = adapter.subscribe(listener);

		expect(searchService.subscriptions).toEqual([
			{
				id: 'search-1',
				listener
			}
		]);

		unsubscribe();

		expect(searchService.unsubscribedSearchIDs).toEqual(['search-1']);
	});
});

class FakeSearchService {
	readonly searches: Array<{
		id: string;
		source: PublishedResourceReference;
		query: string;
	}> = [];

	readonly subscriptions: Array<{
		id: string;
		listener: (response: SearchResultResponse) => void;
	}> = [];

	readonly unsubscribedSearchIDs: string[] = [];

	search(
		id: string,
		source: PublishedResourceReference,
		query: string
	): Promise<void> {
		this.searches.push({ id, source, query });
		return Promise.resolve();
	}

	subscribe(
		id: string,
		listener: (response: SearchResultResponse) => void
	): void {
		this.subscriptions.push({ id, listener });
	}

	unsubscribe(searchID: string): void {
		this.unsubscribedSearchIDs.push(searchID);
	}
}

function createSearchSource(): PublishedResourceReference {
	return {
		publisher: 'publisher',
		resourceId: 'kjvonly/bible/search/kjvs'
	};
}
