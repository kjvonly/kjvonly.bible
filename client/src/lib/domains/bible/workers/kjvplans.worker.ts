import { plansApi } from '$lib/nostr/events/plans.nostr';
import { completedReadingsApi } from '$lib/nostr/events/completedReadings.nostr';
import { subsApi } from '$lib/nostr/events/subs.nostr';
import {
  cachedPlanToPlan,
  cachedSubToSub,
  NullPlan,
  PLAN_PUBSUB_SUBSCRIPTIONS,
  type CachedPlan,
  type CachedSub,
  type CompletedReadings,
  type Plan,
  type Sub
} from '$lib/models/plans.model';
import { encodedReadingsDecoderService } from '$lib/domains/reading-plans/services/encodedReadingsDecoder.service';
import { subsEnricherService } from '$lib/domains/reading-plans/services/subsEnricher.service';
import FlexSearch from 'flexsearch';

let workerHasInitialized = false;

// ================================ PLANS DATA =================================

let plans: Map<string, Plan> = new Map();
let subs: Map<string, Sub> = new Map();
let completedReadings: Map<string, CompletedReadings> = new Map();

// ================================ FLEX DOCS ==================================

let plansDocument = new FlexSearch.Document({
  document: {
    id: 'id',
    index: []
  }
});

let subsDocument = new FlexSearch.Document({
  document: {
    id: 'id',
    index: []
  }
});

let completedReadingsDocument = new FlexSearch.Document({
  document: {
    id: 'id',
    index: ['subID']
  }
});

// ================================== INIT =====================================

async function init() {
  await initializePlans();
  await initializeSubs();
  await initializeCompletedReadings();
  await enrichSubs();

  workerHasInitialized = true;
  publishPlans();
  publishSubs();
}

async function initializePlans() {
  let cachedPlans: CachedPlan[] = await plansApi.gets();
  for (let cp of cachedPlans) {
    let p = cachedPlanToPlan(cp);
    p.nestedReadings = encodedReadingsDecoderService.parseEncodedReadings(
      cp.encodedReadings
    );
    await plansDocument.addAsync(p.id, p);
    plans.set(p.id, p);
  }
}

async function initializeSubs() {
  let cachedSubs: CachedSub[] = await subsApi.gets();
  for (let cs of cachedSubs) {
    let s = cachedSubToSub(cs);
    await subsDocument.addAsync(s.id, s);
    subs.set(s.id, s);
  }
}

async function initializeCompletedReadings() {
  let cachedReadings = await completedReadingsApi.gets();
  for (let r of cachedReadings) {
    await completedReadingsDocument.addAsync(r.id, r);
    completedReadings.set(r.id, r);
  }
}

// =================================== SUB =====================================

/**
 * User subs are stored normalized in the DB. The Sub readings data exists in
 * the initialized {@link plans} and can be looked up by the {@link Sub.planID}.
 *  Users progress on a subscription is determined by the
 * {@link completedReadings} for the subscription. {@link CompletedReadings} are
 * stored in the DB with an ID of <SubID/ReadingsIndex> and a SubID column.
 * Enriching the sub includes fetching the {@link completedReading} for the Sub
 * and assigning it to {@link Sub.completedReadings} field. Additionally, other
 * useful data is added to the Sub such as {@link Sub.nextReadingsIndex} and
 *  {@link Sub.percentCompleted}.
 *
 * */
async function enrichSubs() {
  for (let [_, sub] of subs) {
    await enrichSub(sub);
  }
}

async function enrichSub(sub: Sub | undefined) {
  if (sub) {
    await setCompletedReadings(sub);
    subsEnricherService.setNextReadingIndex(sub);
    subsEnricherService.setPercentComplete(sub);
  }
}

async function setCompletedReadings(sub: Sub) {
  sub.completedReadings = new Map<number, CompletedReadings>();
  let result = await getCompletedReadings(sub.id, ['subID']);
  result.forEach((r) => {
    r.result.forEach((id) => {
      let cr = completedReadings.get(id.toString());
      if (cr) {
        sub.completedReadings.set(cr.index, cr);
      }
    });
  });
}

async function getCompletedReadings(
  search: string,
  index: string[]
): Promise<FlexSearch.SimpleDocumentSearchResultSetUnit[]> {
  return completedReadingsDocument.searchAsync(search, {
    index: index
  });
}

// ================================== PUB SUB ==================================

function addPlan(planID: string, plan: any) {
  plans.set(planID, plan);
  plansDocument.add(planID, plan);
  publishPlans();
}

function deletePlan(planID: string) {
  plans.delete(planID);
  plansDocument.remove(planID);
  publishPlans();
}

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

async function putReading(data: any, subID: any) {
  await completedReadingsDocument.addAsync(data.id, data);
  completedReadings.set(data.id, data);
  let sub = subs.get(subID);
  if (sub) {
    sub.completedReadings.set(data.index, data);
    await enrichSub(sub);
    publishSubs();
  }
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

function publishPlans() {
  if (workerHasInitialized) {
    postMessage({ id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_PLANS, plans: plans });
  }
}

function publishSubs() {
  if (workerHasInitialized) {
    postMessage({ id: PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS, subs: subs });
  }
}

async function putSub(cs: CachedSub) {
  let s = cachedSubToSub(cs);
  subs.set(s.id, s);
  if (s) {
    await enrichSub(s);
    publishSubs();
  }
}

// ================================= ONMESSAGE =================================

onmessage = async (e) => {
  switch (e.data.action) {
    case PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_PLANS:
      publishPlans();
      break;
    case PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS:
      publishSubs();
      break;
    case PLAN_PUBSUB_SUBSCRIPTIONS.PUT_SUB:
      putSub(e.data.data);
      break;
    case PLAN_PUBSUB_SUBSCRIPTIONS.PUT_READING:
      putReading(e.data.data, e.data.subID);
      break;
  }
};

/**
 * Initialize worker on start
 */
init();
