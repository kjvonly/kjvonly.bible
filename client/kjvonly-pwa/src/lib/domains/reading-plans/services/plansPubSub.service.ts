import {
  PLAN_PUBSUB_SUBSCRIPTIONS
} from '$lib/domains/reading-plans/models/plans.model';
import type { PlanSubscription } from '$lib/domains/reading-plans/models/plan-subscription';
import type { PlanProgress } from '$lib/domains/reading-plans/models/plan-progress';
import {
  PLANS_WORKER_INITIALIZED,
  PLANS_WORKER_REFRESH,
  type PlansSubscriptionsMessage,
  type PlansWorkerCommand,
  type PlansWorkerMessage
} from '$lib/domains/reading-plans/models/plans-worker.model';

export interface PlansWorkerPort {
  onmessage:
    | ((event: MessageEvent<PlansWorkerMessage>) => void)
    | null;

  postMessage(message: PlansWorkerCommand): void;
}

type PlansSubscriber = {
  id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS;
  subscriberID: string;
  listener: (data: PlansSubscriptionsMessage) => void;
};

/**
 * Creates the browser worker used by the Reading Plans runtime projection.
 *
 * Application owns the returned worker through PlansPubSubService. Returning
 * undefined outside the browser keeps Application construction safe in build
 * and test environments where Worker is unavailable.
 */
export function createPlansWorker():
  PlansWorkerPort |
  undefined {
  if (
    typeof window === 'undefined'
  ) {
    return undefined;
  }

  return new Worker(
    new URL(
      '../workers/kjvplans.worker?worker',
      import.meta.url
    ),
    {
      type: 'module'
    }
  );
}

/**
 * Manages communication between the Plans web worker and the main thread.
 *
 * This is a stateful application capability. Application owns its lifetime;
 * Svelte consumers receive the same instance through ApplicationContext.
 */
export class PlansPubSubService {
  private subscribers:
    PlansSubscriber[] = [];

  private initialization:
    Promise<void> |
    undefined;

  private resolveInitialization:
    (() => void) |
    undefined;

  constructor(
    private readonly worker:
      PlansWorkerPort |
      undefined = undefined
  ) {
    if (
      this.worker
    ) {
      this.worker.onmessage =
        (event) => {
          this.onMessage(event);
        };
    }
  }

  onMessage(
    event:
      Pick<
        MessageEvent<PlansWorkerMessage>,
        'data'
      >
  ): void {
    if (
      event.data.id ===
      PLANS_WORKER_INITIALIZED
    ) {
      this.resolveInitialization?.();
      return;
    }

    for (
      const subscriber
      of this.subscribers
    ) {
      if (
        subscriber.id ===
        event.data.id
      ) {
        subscriber.listener(
          event.data
        );
      }
    }
  }

  initialize(
    booknamesById:
      Record<string, string>,
    subscriptions:
      readonly PlanSubscription[],
    progress:
      readonly PlanProgress[]
  ): Promise<void> {
    if (
      this.initialization
    ) {
      return this.initialization;
    }

    const worker =
      this.requireWorker();

    this.initialization =
      new Promise<void>(
        (resolve) => {
          this.resolveInitialization =
            resolve;

          worker.postMessage({
            action: 'init',
            booknamesById,
            subscriptions,
            progress
          });
        }
      );

    return this.initialization;
  }

  subscribe(
    id:
      PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
    listener:
      (data: PlansSubscriptionsMessage) => void,
    subscriberID: string
  ): void {
    this.subscribers.push({
      id,
      listener,
      subscriberID
    });
  }

  unsubscribe(
    subscriberID: string
  ): void {
    this.subscribers =
      this.subscribers.filter(
        (subscriber) =>
          subscriber.subscriberID !==
          subscriberID
      );
  }

  getAllSubs(): void {
    this.requireWorker().postMessage({
      action:
        PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
      id:
        PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS
    });
  }

  putProgress(
    progress: PlanProgress
  ): void {
    this.requireWorker().postMessage({
      action:
        PLAN_PUBSUB_SUBSCRIPTIONS.PUT_PROGRESS,
      data: progress
    });
  }

  putSub(
    subscription: PlanSubscription
  ): void {
    this.requireWorker().postMessage({
      action:
        PLAN_PUBSUB_SUBSCRIPTIONS.PUT_SUB,
      data: subscription
    });
  }

  refresh(): void {
    const initialization =
      this.initialization;

    if (
      !initialization
    ) {
      return;
    }

    void initialization.then(
      () => {
        this.requireWorker().postMessage({
          action: PLANS_WORKER_REFRESH
        });
      }
    );
  }

  private requireWorker():
    PlansWorkerPort {
    if (
      !this.worker
    ) {
      throw new Error(
        'Plans worker is not available.'
      );
    }

    return this.worker;
  }
}
