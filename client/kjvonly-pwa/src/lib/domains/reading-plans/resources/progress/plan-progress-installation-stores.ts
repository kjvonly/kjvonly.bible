import type {
	PlanProgressStore
} from '../../persistence/plan-progress-store';

import type {
	ResourceInstallation
} from '$lib/resource';

export interface PlanProgressInstallationStores {
	readonly progress:
		Pick<
			PlanProgressStore,
			'get' | 'put'
		>;

	readonly resourceInstallations: {
		get(
			objectType: string,
			objectId: string
		): Promise<
			ResourceInstallation |
			undefined
		>;

		put(
			installation:
				ResourceInstallation
		): Promise<void>;
	};
}

export interface PlanProgressInstallationTransaction {
	run<TResult>(
		operation:
			(
				stores:
					PlanProgressInstallationStores
			) => Promise<TResult>
	): Promise<TResult>;
}
