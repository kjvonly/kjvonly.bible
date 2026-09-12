import type {
	BibleSearchIndexStore
} from '$lib/domains/bible/persistence/bible-search-index-store';

import type {
	ResourceInstallationStore
} from '$lib/resource/installation/resource-installation-store';

import type {
	InstallationTransaction
} from '$lib/resource/installation/installation-transaction';

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
