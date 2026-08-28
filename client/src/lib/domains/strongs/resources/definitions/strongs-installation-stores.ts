import type {
	InstallationTransaction
} from '$lib/resource/installation/installation-transaction';

import type {
	ResourceInstallationStore
} from '$lib/resource/installation/resource-installation-store';

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