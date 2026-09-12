import type {
	BibleTextMarkupStore
} from '$lib/domains/bible/persistence/bible-text-markup-store';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

export interface BibleTextMarkupWriteStores {
	readonly textMarkup:
		Pick<
			BibleTextMarkupStore,
			'put'
		>;

	readonly outbox: {
		put(
			objectId:
				string,

			resource:
				ResourcePublication
		): Promise<void>;
	};
}

export interface BibleTextMarkupWriteTransaction {
	run<TResult>(
		operation:
			(
				stores:
					BibleTextMarkupWriteStores
			) => Promise<TResult>
	): Promise<TResult>;
}
