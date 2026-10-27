import type {
	NormalizedContentTextMarkupStore
} from '../../persistence/normalized-content-text-markup-store';

import type {
	ResourcePublication
} from '$lib/resource';

/** Transaction-scoped stores required for one durable Text Markup write. */
export interface NormalizedContentTextMarkupWriteStores {
	readonly textMarkup:
		Pick<
			NormalizedContentTextMarkupStore,
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

/** Atomic write boundary for Text Markup, installation state, and Outbox intent. */
export interface NormalizedContentTextMarkupWriteTransaction {
	run<TResult>(
		operation:
			(
				stores:
					NormalizedContentTextMarkupWriteStores
			) => Promise<TResult>
	): Promise<TResult>;
}
