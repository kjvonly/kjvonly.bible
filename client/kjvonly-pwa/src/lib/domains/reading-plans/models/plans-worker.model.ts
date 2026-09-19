import type { PlanProgress } from './plan-progress';
import type { PlanSubscription } from './plan-subscription';
import { PLAN_PUBSUB_SUBSCRIPTIONS, type Sub } from './plans.model';

export const PLANS_WORKER_INITIALIZED = 'plans-worker-initialized' as const;

export interface PlansSubscriptionsMessage {
	id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS;
	subs: Map<string, Sub>;
}

export interface PlansWorkerInitializedMessage {
	id: typeof PLANS_WORKER_INITIALIZED;
}

export type PlansWorkerMessage =
	PlansSubscriptionsMessage | PlansWorkerInitializedMessage;

export type PlansWorkerCommand =
	| {
			action: 'init';
			booknamesById: Record<string, string>;
			subscriptions: readonly PlanSubscription[];
			progress: readonly PlanProgress[];
	  }
	| {
			action: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS;
			id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS;
	  }
	| {
			action: PLAN_PUBSUB_SUBSCRIPTIONS.PUT_SUB;
			data: PlanSubscription;
	  }
	| {
			action: PLAN_PUBSUB_SUBSCRIPTIONS.PUT_PROGRESS;
			data: PlanProgress;
	  };
