import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	SearchResultResponse
} from '$lib/domains/bible/models/search.model';

import type {
	SearchRuntime
} from '$lib/domains/bible/runtime/search/search-runtime';

export interface SearchService {
	subscribe(
		id: string,
		fn: (response: SearchResultResponse) => void
	): void;

	unsubscribe(
		searchID: string
	): void;

	search(
		id: string,
		source:
			PublishedResourceReference,
		text: string
	): Promise<void>;
}

class DefaultSearchService
	implements SearchService {

	private readonly subscribers:
		Array<{
			readonly id: string;
			readonly fn:
				(response: SearchResultResponse) => void;
		}> = [];

	constructor(
		private readonly runtime:
			Pick<
				SearchRuntime,
				'search' |
				'setResultHandler'
			>
	) {
		this.runtime.setResultHandler(
			(response) => {
				this.publish(
					response
				);
			}
		);
	}

	subscribe(
		id: string,
		fn: (response: SearchResultResponse) => void
	): void {
		this.subscribers.push({
			id,
			fn
		});
	}

	unsubscribe(
		searchID: string
	): void {
		for (
			let index =
				this.subscribers.length - 1;
			index >= 0;
			index--
		) {
			if (
				this.subscribers[index].id ===
				searchID
			) {
				this.subscribers.splice(
					index,
					1
				);
			}
		}
	}

	search(
		id: string,
		source:
			PublishedResourceReference,
		text: string
	): Promise<void> {
		return this.runtime.search(
			id,
			source,
			text
		);
	}

	private publish(
		response:
			SearchResultResponse
	): void {
		this.subscribers.forEach(
			(subscriber) => {
				if (
					subscriber.id ===
					response.id
				) {
					subscriber.fn(
						response
					);
				}
			}
		);
	}
}

export function createSearchService(
	runtime:
		Pick<
			SearchRuntime,
			'search' |
			'setResultHandler'
		>
): SearchService {
	return new DefaultSearchService(
		runtime
	);
}
