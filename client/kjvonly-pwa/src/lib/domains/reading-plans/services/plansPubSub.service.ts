import {
  PLAN_PUBSUB_SUBSCRIPTIONS
} from '$lib/domains/reading-plans/models/plans.model';
import type { PlanSubscription } from '$lib/domains/reading-plans/models/plan-subscription';
import type { PlanProgress } from '$lib/domains/reading-plans/models/plan-progress';

const PLANS_WORKER_INITIALIZED = 'plans-worker-initialized';

const isBrowser = typeof window !== 'undefined';
let plansWorker: any;

if (isBrowser) {
  plansWorker = new Worker(
    new URL('../workers/kjvplans.worker?worker', import.meta.url),
    {
      type: 'module'
    }
  );
}

/**
 * Manages communication between the Plans web worker and the main thread.
 */
export class PlansPubSubService {
  subscribers: any[] = [];
  private initialization: Promise<void> | undefined;
  private resolveInitialization: (() => void) | undefined;

  constructor() {
    if (isBrowser) {
      plansWorker.onmessage = (e: any) => {
        this.onMessage(e);
      };
    }
  }

  onMessage(e: any) {
    if (e.data.id === PLANS_WORKER_INITIALIZED) {
      this.resolveInitialization?.();
      return;
    }

    this.subscribers.forEach((s) => {
      if (s.id === e.data.id) {
        s.fn(e.data);
      }
    });
  }

  initialize(
    booknamesById: Record<string, string>,
    subscriptions: readonly PlanSubscription[],
    progress: readonly PlanProgress[]
  ): Promise<void> {
    if (this.initialization) {
      return this.initialization;
    }

    this.initialization = new Promise<void>((resolve) => {
      this.resolveInitialization = resolve;

      plansWorker.postMessage({
        action: 'init',
        booknamesById,
        subscriptions,
        progress
      });
    });

    return this.initialization;
  }

  subscribe(id: any, fn: any, subID: any) {
    this.subscribers.push({ id: id, fn: fn, subID: subID });
  }

  unsubscribe(subID: any) {
    let tmpSubscribers: any[] = [];
    this.subscribers.forEach((s) => {
      if (s.subID !== subID) {
        tmpSubscribers.push(s);
      }
    });
    this.subscribers = tmpSubscribers;
  }

  getAllSubs() {
    plansWorker.postMessage({
      action: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
      id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS
    });
  }

  putProgress(progress: PlanProgress) {
    plansWorker.postMessage({
      action: PLAN_PUBSUB_SUBSCRIPTIONS.PUT_PROGRESS,
      data: progress
    });
  }

  putSub(subscription: PlanSubscription) {
    // TODO type post messages
    plansWorker.postMessage({
      action: PLAN_PUBSUB_SUBSCRIPTIONS.PUT_SUB,
      data: subscription
    });
  }
}

export let plansPubSubService = new PlansPubSubService();
