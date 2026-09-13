import type {
	InstallationTransaction
} from '$lib/resource/installation/installation-transaction';

import type {
	ResourceInstallationStore
} from '$lib/resource/installation/resource-installation-store';

import type {
	PlanDefinitionsStore
} from '$lib/domains/reading-plans/persistence/plan-definitions-store';

export interface PlanDefinitionInstallationStores {
	readonly planDefinitions:
		Pick<
			PlanDefinitionsStore,
			'get' |
			'put'
		>;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export type PlanDefinitionInstallationTransaction =
	InstallationTransaction<
		PlanDefinitionInstallationStores
	>;
