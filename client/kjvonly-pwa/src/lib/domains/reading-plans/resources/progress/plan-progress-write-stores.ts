import type {
	PlanProgressStore
} from '../../persistence/plan-progress-store';

import type {
	ResourcePublication
} from '$lib/resource';

export interface PlanProgressWriteStores {
	readonly progress:
		Pick<
			PlanProgressStore,
			'get' | 'put'
		>;

	readonly outbox: {
		put(
			objectId: string,
			resource: ResourcePublication
		): Promise<void>;
	};
}

export interface PlanProgressWriteTransaction {
	run<TResult>(
		operation:
			(
				stores:
					PlanProgressWriteStores
			) => Promise<TResult>
	): Promise<TResult>;
}
