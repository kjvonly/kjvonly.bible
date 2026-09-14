import type {
	PlanProgressStore
} from '$lib/domains/reading-plans/persistence/plan-progress-store';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

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
