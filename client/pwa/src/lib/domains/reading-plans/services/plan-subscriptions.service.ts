import type {
	PlanSubscription
} from '../models/plan-subscription';

import type {
	PlanSubscriptionsStore
} from '../persistence/plan-subscriptions-store';

import type {
	PlanSubscriptionWriteTransaction
} from '../resources/subscriptions/plan-subscription-write-stores';

import type {
	PlanSubscriptionResourcePublication
} from '../resources/subscriptions/plan-subscription-resource-publication';

import type {
	OutboxWakeup
} from '$lib/application';

export class PlanSubscriptionsService {

	constructor(
		private readonly subscriptions:
			Pick<
				PlanSubscriptionsStore,
				'get' | 'getAll'
			>,

		private readonly writeTransaction:
			PlanSubscriptionWriteTransaction,

		private readonly resourcePublication:
			Pick<
				PlanSubscriptionResourcePublication,
				'create'
			>,

		private readonly outbox:
			OutboxWakeup
	) {}

	async get(
		id: string
	): Promise<
		PlanSubscription |
		undefined
	> {
		return await this.subscriptions.get(
			id
		);
	}

	async list(): Promise<
		readonly PlanSubscription[]
	> {
		return await this.subscriptions.getAll();
	}

	async put(
		subscription: PlanSubscription
	): Promise<void> {
		const publication =
			this.resourcePublication.create(
				subscription
			);

		await this.writeTransaction.run(
			async (
				stores
			) => {
				await stores
					.subscriptions
					.put(
						subscription
					);

				await stores
					.outbox
					.put(
						subscription.id,
						publication
					);
			}
		);

		this.outbox.wake();
	}
}
