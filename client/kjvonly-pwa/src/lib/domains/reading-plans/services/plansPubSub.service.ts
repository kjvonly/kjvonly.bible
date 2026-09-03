import {
  PLAN_PUBSUB_SUBSCRIPTIONS,
  type CachedSub,
  type Sub
} from '$lib/domains/reading-plans/models/plans.model';
import { plansApi } from '$lib/nostr/events/plans.nostr';
import { relayService } from '$lib/nostr/services/relay.service';

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

  constructor() {
    if (isBrowser) {
      plansWorker.onmessage = (e: any) => {
        this.onMessage(e);
      };
    }
  }

  onMessage(e: any) {
    this.subscribers.forEach((s) => {
      if (s.id === e.data.id) {
        s.fn(e.data);
      }
    });
  }

  subscribe(id: any, fn: any, subID: any) {
    this.subscribers.push({ id: id, fn: fn, subID: subID });
  }

  unsubscribe(subID: any) {
    let tmpSubscribers: any = [];
    this.subscribers.forEach((s) => {
      if (s.subID !== subID) {
        tmpSubscribers.push();
      }
    });
    this.subscribers = tmpSubscribers;
  }

  getAllPlans() {
    plansWorker.postMessage({
      action: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_PLANS,
      id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_PLANS
    });
  }

  getAllSubs() {
    plansWorker.postMessage({
      action: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
      id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS
    });
  }

  putReading(data: any, subID: string) {
    plansWorker.postMessage({
      action: PLAN_PUBSUB_SUBSCRIPTIONS.PUT_READING,
      id: PLAN_PUBSUB_SUBSCRIPTIONS.PUT_READING,
      data: data,
      subID: subID
    });
  }

  putSub(cachedSub: CachedSub) {
    // TODO type post messages
    plansWorker.postMessage({
      action: PLAN_PUBSUB_SUBSCRIPTIONS.PUT_SUB,
      data: cachedSub
    });
  }

  async getPeopleYouFollowPlans() {
    let plans = await plansApi.getPlansFromPeopleYouFollow()

  }
}

export let plansPubSubService = new PlansPubSubService();
