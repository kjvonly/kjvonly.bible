import type { SearchAdapter } from '$lib/application/ui';
import type { PublishedResourceReference } from '$lib/resource';

import type { SearchResultResponse } from '../../models/search.model';
import type { SearchService } from '../../services/search.service';

/**
 * Adapts the Bible search service to the shared search workflow contract.
 */
export class BibleSearchAdapter
	implements SearchAdapter<SearchResultResponse> {
	constructor(
		private readonly searchService: Pick<
			SearchService,
			'search' | 'subscribe' | 'unsubscribe'
		>,
		private readonly searchID: string,
		private readonly searchSource: PublishedResourceReference
	) {}

	search(query: string): Promise<void> {
		return this.searchService.search(
			this.searchID,
			this.searchSource,
			query
		);
	}

	subscribe(
		listener: (result: SearchResultResponse) => void
	): () => void {
		this.searchService.subscribe(this.searchID, listener);

		return () => {
			this.searchService.unsubscribe(this.searchID);
		};
	}
}
