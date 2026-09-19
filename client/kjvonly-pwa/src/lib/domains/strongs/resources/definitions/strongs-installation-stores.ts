import type {
	InstallationTransaction,
	ResourceInstallationStore
} from '$lib/resource';

import type {
	StrongsStore
} from '$lib/domains/strongs/persistence/strongs-store';

export interface StrongsInstallationStores {
	readonly strongs:
		StrongsStore;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export type StrongsInstallationTransaction =
	InstallationTransaction<
		StrongsInstallationStores
	>;