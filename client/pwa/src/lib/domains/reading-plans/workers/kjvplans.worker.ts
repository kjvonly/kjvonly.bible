import {
  planSubscriptionToSub,
  PLAN_PUBSUB_SUBSCRIPTIONS,
  type Sub
} from '../models/plans.model';
import type { PlanSubscription } from '../models/plan-subscription';
import type { PlanProgress } from '../models/plan-progress';
import {
  EncodedReadingsDecoderService,
  type BookNameLookup
} from '../services/encodedReadingsDecoder.service';
import { SubsEnricherService } from '../services/subsEnricher.service';
import {
  PLANS_WORKER_INITIALIZED,
  PLANS_WORKER_REFRESH,
  type PlansSubscriptionsMessage,
  type PlansWorkerCommand,
  type PlansWorkerInitializedMessage
} from '../models/plans-worker.model';

import {
  IndexedDBPlanSubscriptionsStore
} from '../persistence/indexeddb-plan-subscriptions-store';
import {
  IndexedDBPlanProgressStore
} from '../persistence/indexeddb-plan-progress-store';
import {
  getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

const planSubscriptionsStore =
  new IndexedDBPlanSubscriptionsStore(
    getApplicationDB
  );

const planProgressStore =
  new IndexedDBPlanProgressStore(
    getApplicationDB
  );

const encodedReadingsDecoderService =
  new EncodedReadingsDecoderService();

const subsEnricherService = new SubsEnricherService();

let bookNameLookup: BookNameLookup | undefined;
let workerHasInitialized = false;

// ================================ PLANS DATA =================================

let subs: Map<string, Sub> = new Map();
let progressBySubscriptionId: Map<string, PlanProgress> = new Map();

// ================================== INIT =====================================

async function init(
  booknamesById: Record<string, string>,
  subscriptions: readonly PlanSubscription[],
  progress: readonly PlanProgress[]
) {
  bookNameLookup = (bookID: string): string =>
    booknamesById[bookID] ?? '';

  initializeProgress(progress);
  initializeSubs(subscriptions);
  await enrichSubs();

  workerHasInitialized = true;
  publishSubs();

  const message: PlansWorkerInitializedMessage = {
    id: PLANS_WORKER_INITIALIZED
  };

  postMessage(message);
}

function initializeSubs(
  subscriptions: readonly PlanSubscription[]
) {
  for (const subscription of subscriptions) {
    const sub = planSubscriptionToSub(
      subscription,
      requireBookNameLookup(),
      encodedReadingsDecoderService
    );

    subs.set(sub.id, sub);
  }
}

function initializeProgress(
  progress: readonly PlanProgress[]
) {
  for (const planProgress of progress) {
    progressBySubscriptionId.set(
      planProgress.id,
      planProgress
    );
  }
}

// =================================== SUB =====================================

/**
 * Accepted Plan Subscriptions and Plan Progress are stored in shared Domain
 * persistence. The worker combines those accepted objects into a derived Sub
 * projection for display/navigation.
 */
async function enrichSubs() {
  for (let [_, sub] of subs) {
    await enrichSub(sub);
  }
}

async function enrichSub(sub: Sub | undefined) {
  if (sub) {
    setCompletedReadingIndexes(sub);
    subsEnricherService.setNextReadingIndex(sub);
    subsEnricherService.setPercentComplete(sub);
  }
}

function setCompletedReadingIndexes(sub: Sub) {
  const progress =
    progressBySubscriptionId.get(sub.id);

  sub.completedReadingIndexes =
    new Set(
      progress?.completedReadingIndexes ?? []
    );
}

// ================================== PUB SUB ==================================

function publishSubs() {
  if (workerHasInitialized) {
    const message: PlansSubscriptionsMessage = {
      id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
      subs
    };

    postMessage(message);
  }
}

async function putSub(subscription: PlanSubscription) {
  let s = planSubscriptionToSub(
    subscription,
    requireBookNameLookup(),
    encodedReadingsDecoderService
  );
  subs.set(s.id, s);
  if (s) {
    await enrichSub(s);
    publishSubs();
  }
}

async function putProgress(progress: PlanProgress) {
  progressBySubscriptionId.set(
    progress.id,
    progress
  );

  const sub =
    subs.get(progress.id);

  if (sub) {
    await enrichSub(sub);
    publishSubs();
  }
}

async function refresh() {
  const [
    subscriptions,
    progress
  ] = await Promise.all([
    planSubscriptionsStore.getAll(),
    planProgressStore.getAll()
  ]);

  subs.clear();
  progressBySubscriptionId.clear();

  initializeProgress(progress);
  initializeSubs(subscriptions);

  await enrichSubs();
  publishSubs();
}

function requireBookNameLookup(): BookNameLookup {
  if (!bookNameLookup) {
    throw new Error('Plans worker Booknames have not been initialized');
  }

  return bookNameLookup;
}

// ================================= ONMESSAGE =================================

onmessage = async (e: MessageEvent<PlansWorkerCommand>) => {
  switch (e.data.action) {
    case 'init':
      await init(
        e.data.booknamesById,
        e.data.subscriptions,
        e.data.progress
      );
      break;
    case PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS:
      publishSubs();
      break;
    case PLAN_PUBSUB_SUBSCRIPTIONS.PUT_SUB:
      putSub(e.data.data);
      break;
    case PLAN_PUBSUB_SUBSCRIPTIONS.PUT_PROGRESS:
      putProgress(e.data.data);
      break;
    case PLANS_WORKER_REFRESH:
      await refresh();
      break;
  }
};
