import type {
	BibleBooknamesStore
} from '$lib/domains/bible/persistence/bible-booknames-store';

import type {
	ResourceInstallationStore
} from '$lib/resource/installation/resource-installation-store';

import type {
	InstallationTransaction
} from '$lib/resource/installation/installation-transaction';

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
