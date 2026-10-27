import type {
	PlanSubscriptionsStore
} from '../../persistence/plan-subscriptions-store';

import type {
	ResourcePublication
} from '$lib/resource';

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
