import type {
	InstallationTransaction,
	ResourceInstallationStore
} from '$lib/resource';

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
