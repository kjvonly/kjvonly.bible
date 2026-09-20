import type {
	BibleTextMarkupStore
} from '../../persistence/bible-text-markup-store';

import type {
	ResourceInstallationStore
} from '$lib/resource';

export interface BibleTextMarkupInstallationStores {
	readonly textMarkup:
		BibleTextMarkupStore;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export interface BibleTextMarkupInstallationTransaction {
	run<TResult>(
		operation:
			(
				stores:
					BibleTextMarkupInstallationStores
			) => Promise<TResult>
	): Promise<TResult>;
}
