import type {
	PlanSubscriptionsStore
} from '../../persistence/plan-subscriptions-store';

import type {
	ResourceInstallation
} from '$lib/resource';

export interface PlanSubscriptionInstallationStores {
	readonly subscriptions:
		Pick<
			PlanSubscriptionsStore,
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

export interface PlanSubscriptionInstallationTransaction {
	run<TResult>(
		operation:
			(
				stores:
					PlanSubscriptionInstallationStores
			) => Promise<TResult>
	): Promise<TResult>;
}
