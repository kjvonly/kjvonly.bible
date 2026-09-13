import {
  planSubscriptionToSub,
  PLAN_PUBSUB_SUBSCRIPTIONS,
  type Sub
} from '$lib/domains/reading-plans/models/plans.model';
import type { PlanSubscription } from '$lib/domains/reading-plans/models/plan-subscription';
import type { PlanProgress } from '$lib/domains/reading-plans/models/plan-progress';
import type { BookNameLookup } from '$lib/domains/reading-plans/services/encodedReadingsDecoder.service';
import { subsEnricherService } from '$lib/domains/reading-plans/services/subsEnricher.service';
import FlexSearch from 'flexsearch';

const PLANS_WORKER_INITIALIZED = 'plans-worker-initialized';

let bookNameLookup: BookNameLookup | undefined;
let workerHasInitialized = false;

// ================================ PLANS DATA =================================

let subs: Map<string, Sub> = new Map();
let progressBySubscriptionId: Map<string, PlanProgress> = new Map();

// ================================ FLEX DOCS ==================================

let subsDocument = new FlexSearch.Document({
  document: {
    id: 'id',
    index: []
  }
});

// ================================== INIT =====================================

async function init(
  booknamesById: Record<string, string>,
  subscriptions: readonly PlanSubscription[],
  progress: readonly PlanProgress[]
) {
  bookNameLookup = (bookID: string): string =>
    booknamesById[bookID] ?? '';

  initializeProgress(progress);
  await initializeSubs(subscriptions);
  await enrichSubs();

  workerHasInitialized = true;
  publishSubs();
  postMessage({ id: PLANS_WORKER_INITIALIZED });
}

async function initializeSubs(
  subscriptions: readonly PlanSubscription[]
) {
  for (const subscription of subscriptions) {
    const sub = planSubscriptionToSub(
      subscription,
      requireBookNameLookup()
    );

    await subsDocument.addAsync(sub.id, sub);
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

async function addSubs(subID: string, sub: any) {
  subs.set(subID, sub);
  subsDocument.add(subID, sub);
  await enrichSubs(); //TODO this could be enrich sub only
  publishSubs();
}

function deleteSub(subID: string) {
  subs.delete(subID);
  subsDocument.remove(subID);
  publishSubs();
}

async function search(
  id: string,
  searchTerm: string,
  indexes: string[],
  flexDocument: any,
  map: any
) {
  const results = await flexDocument.searchAsync(searchTerm, {
    index: indexes
  });

  let filtered: any = {};
  results.forEach((r: any) => {
    r.result.forEach((id: any) => {
      filtered[id] = map[id];
    });
  });

  if (Object.keys(filtered).length > 0) {
    postMessage({ id: id, results: filtered });
  }
}

function publishSubs() {
  if (workerHasInitialized) {
    postMessage({ id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS, subs: subs });
  }
}

async function putSub(subscription: PlanSubscription) {
  let s = planSubscriptionToSub(
    subscription,
    requireBookNameLookup()
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

function requireBookNameLookup(): BookNameLookup {
  if (!bookNameLookup) {
    throw new Error('Plans worker Booknames have not been initialized');
  }

  return bookNameLookup;
}

// ================================= ONMESSAGE =================================

onmessage = async (e) => {
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
  }
};
