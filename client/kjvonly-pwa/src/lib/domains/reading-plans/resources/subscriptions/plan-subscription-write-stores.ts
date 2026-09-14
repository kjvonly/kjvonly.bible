import type {
	PlanSubscriptionsStore
} from '$lib/domains/reading-plans/persistence/plan-subscriptions-store';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

export interface PlanSubscriptionWriteStores {
	readonly subscriptions:
		Pick<
			PlanSubscriptionsStore,
			'put'
		>;

	readonly outbox: {
		put(
			objectId: string,
			resource: ResourcePublication
		): Promise<void>;
	};
}

export interface PlanSubscriptionWriteTransaction {
	run<TResult>(
		operation:
			(
				stores:
					PlanSubscriptionWriteStores
			) => Promise<TResult>
	): Promise<TResult>;
}
