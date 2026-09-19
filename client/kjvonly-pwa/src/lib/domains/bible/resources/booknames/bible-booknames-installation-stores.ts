import type {
	BibleBooknamesStore
} from '$lib/domains/bible/persistence/bible-booknames-store';

import type {
	ResourceInstallationStore,
	InstallationTransaction
} from '$lib/resource';

export interface BibleBooknamesInstallationStores {
	readonly booknames:
		BibleBooknamesStore;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export type BibleBooknamesInstallationTransaction =
	InstallationTransaction<
		BibleBooknamesInstallationStores
	>;
