import type {
	BibleSearchIndexStore
} from '$lib/domains/bible/persistence/bible-search-index-store';

import type {
	ResourceInstallationStore,
	InstallationTransaction
} from '$lib/resource';

export interface BibleSearchIndexInstallationStores {
	readonly searchIndexes:
		BibleSearchIndexStore;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export type BibleSearchIndexInstallationTransaction =
	InstallationTransaction<
		BibleSearchIndexInstallationStores
	>;
