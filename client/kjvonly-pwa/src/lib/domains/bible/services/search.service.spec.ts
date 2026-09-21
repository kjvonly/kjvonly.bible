import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	SearchResultResponse
} from '../models/search.model';

import {
	createSearchService
} from './search.service';

describe(
	'SearchService',
	() => {
		it(
			'forwards searches to the runtime',
			async () => {
				const runtime =
					new FakeSearchRuntime();

				const service =
					createSearchService(
						runtime
					);

				const source =
					createSource();

				await service.search(
					'search-1',
					source,
					'grace'
				);

				expect(
					runtime.searches
				).toEqual([
					{
						id:
							'search-1',
						source,
						text:
							'grace'
					}
				]);
			}
		);

		it(
			'publishes a result only to subscribers for the matching search id',
			() => {
				const runtime =
					new FakeSearchRuntime();

				const service =
					createSearchService(
						runtime
					);

				const first:
					SearchResultResponse[] = [];

				const second:
					SearchResultResponse[] = [];

				service.subscribe(
					'search-1',
					(response) =>
						first.push(
							response
						)
				);

				service.subscribe(
					'search-2',
					(response) =>
						second.push(
							response
						)
				);

				const response =
					createResponse(
						'search-2'
					);

				runtime.emit(
					response
				);

				expect(first)
					.toEqual([]);

				expect(second)
					.toEqual([
						response
					]);
			}
		);

		it(
			'unsubscribes every callback registered for a search id',
			() => {
				const runtime =
					new FakeSearchRuntime();

				const service =
					createSearchService(
						runtime
					);

				const responses:
					SearchResultResponse[] = [];

				service.subscribe(
					'search-1',
					(response) =>
						responses.push(
							response
						)
				);

				service.subscribe(
					'search-1',
					(response) =>
						responses.push(
							response
						)
				);

				service.unsubscribe(
					'search-1'
				);

				runtime.emit(
					createResponse(
						'search-1'
					)
				);

				expect(responses)
					.toEqual([]);
			}
		);
	}
);

class FakeSearchRuntime {
	readonly searches:
		Array<{
			readonly id: string;
			readonly source:
				PublishedResourceReference;
			readonly text: string;
		}> = [];

	private handler:
		(response: SearchResultResponse) => void =
			() => {};

	setResultHandler(
		handler:
			(response: SearchResultResponse) => void
	): void {
		this.handler = handler;
	}

	async search(
		id: string,
		source:
			PublishedResourceReference,
		text: string
	): Promise<void> {
		this.searches.push({
			id,
			source,
			text
		});
	}

	emit(
		response:
			SearchResultResponse
	): void {
		this.handler(
			response
		);
	}
}

function createSource(): PublishedResourceReference {
	return {
		publisher:
			'publisher',
		resourceId:
			'kjvonly/bible/search/kjvs'
	};
}

function createResponse(
	id: string
): SearchResultResponse {
	return {
		id,
		bibleLocationRefs:
			['1_1_1'],
		stats: {
			count: 1,
			time: '1ms'
		}
	};
}
