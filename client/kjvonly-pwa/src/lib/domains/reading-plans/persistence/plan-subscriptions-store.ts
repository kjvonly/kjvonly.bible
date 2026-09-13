import type {
	PlanSubscription
} from '$lib/domains/reading-plans/models/plan-subscription';

export const PLAN_SUBSCRIPTION_OBJECT_TYPE =
	'reading-plans/plan-subscription';

export interface PlanSubscriptionsStore {
	get(
		id: string
	): Promise<
		PlanSubscription |
		undefined
	>;

	getAll(): Promise<
		readonly PlanSubscription[]
	>;

	put(
		subscription: PlanSubscription
	): Promise<void>;
}
