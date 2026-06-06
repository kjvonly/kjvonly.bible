import { encodedReadingsDecoderService } from '$lib/services/plans/encodedReadingsDecoder.service';
import uuid4 from 'uuid4';
import type { BCV } from './bible.model';

// =================================== PLAN ====================================

export interface Plan {
  id: string;
  userID: string;
  name: string;
  description: string;
  encodedReadings: string[],
  nestedReadings: Readings[];
  dateCreated: number;
  version: number;
}

export function NullPlan(): Plan {
  return {
    id: '',
    userID: '',
    name: '',
    description: '',
    encodedReadings: [],
    nestedReadings: [],
    dateCreated: 0,
    version: 0
  };
}

export interface CachedPlan {
  id: string;
  userID: string;
  name: string;
  description: string;
  encodedReadings: string[];
  dateCreated: number;
  version: number;
}

export function cachedPlanToPlan(cp: CachedPlan): Plan {
  return {
    id: cp.id,
    userID: cp.userID,
    name: cp.name,
    description: cp.description,
    encodedReadings: cp.encodedReadings,
    nestedReadings: [],
    dateCreated: cp.dateCreated,
    version: cp.version
  };
}

// =================================== SUBS ====================================

export interface Sub {
  id: string;
  planID: string;
  userID: string;
  dateSubscribed: number;
  version: number;

  name: string;
  description: string;
  nestedReadings: Readings[];
  completedReadings: Map<number, CompletedReadings>;

  nextReadingsIndex: number;
  percentCompleted: number;
}

export function NullSub(): Sub {
  return {
    id: '',
    planID: '',
    userID: '',
    dateSubscribed: 0,
    version: 0,
    name: '',
    description: '',
    nestedReadings: [],
    completedReadings: new Map(),
    nextReadingsIndex: 0,
    percentCompleted: 0
  };
}
export function PlanToCachedSub(p: Plan): CachedSub {
  return {
    id: uuid4(),
    planID: p.id,
    userID: '00000000-0000-0000-0000-000000000000',
    name: p.name,
    description: p.description,
    encodedReadings: p.encodedReadings,
    dateSubscribed: Date.now(),
    version: 0
  };
}


export function CachedPlanToCachedSub(p: CachedPlan): CachedSub {
  return {
    id: uuid4(),
    planID: p.id,
    userID: '00000000-0000-0000-0000-000000000000',
    name: p.name,
    description: p.description,
    encodedReadings: p.encodedReadings,
    dateSubscribed: Date.now(),
    version: 0
  };
}

export interface CachedSub {
  id: string;
  planID: string;
  userID: string;
  name: string;
  description: string;
  encodedReadings: string[];
  dateSubscribed: number;
  version: number;
}

export function cachedSubToSub(cs: CachedSub): Sub {
  let nestedReadings = encodedReadingsDecoderService.parseEncodedReadings(
    cs.encodedReadings
  );

  return {
    id: cs.id,
    planID: cs.planID,
    userID: cs.userID,
    dateSubscribed: cs.dateSubscribed,
    version: cs.version,
    name: cs.name,
    description: cs.description,
    nestedReadings: nestedReadings,
    completedReadings: new Map(),
    nextReadingsIndex: 0,
    percentCompleted: 0
  };
}

// ================================= READINGS ==================================

/**
 * Readings consist of the {@link BCV}[] (book, chapter, verses) to read. The
 * {@link BCV}s
 */
export interface Readings {
  // TODO move totalVerses to new interface
  // TODO add a date field to track when the reading should be completed if
  //      user desires a scheduled plan vs tracked reading.
  totalVerses: number;
  bcvs: BCV[];
}

/**
 * @returns An zero value Readings
 */
export function NullReadings(): Readings {
  return {
    totalVerses: 0,
    bcvs: []
  };
}

/**
 * Simple data structure that tracks completed subscription readings.
 * {@link CompletedReadings.id} is the {@link Sub.id}/{@link CompletedReadings.index}
 * eg. "00000000-0000-0000-0000-000000000000/0". The index is the {@link Sub.nestedReadings}
 * index.
 */
export interface CompletedReadings {
  id: string;
  subID: string;
  index: number;
  version: number;
  // TODO date created/updated
}

export function NullCompletedReadings(): CompletedReadings {
  return {
    id: '',
    subID: '',
    index: 0,
    version: 0
  };
}

/**
 * The next readings in a plan.
 */
export interface NextReadings {
  subID: string;
  name: string;
  readings: Readings;
  dateSubscribed: number;
  percentCompleted: number;
  subReadingsIndex: number;
  totalReadings: number;
}

/**
 * When a user selects a reading for a subscription, the app routes to the bible
 * module. The bible module will check the {@link Buffer.bag} for a plan
 * variable. If it exists the bible module restricts the module to only display
 * the {@link BCV}[] in the readings.
 */
export interface NavReadings {
  subID: string;
  subNestedReadingsIndex: number;
  readings: Readings;
  currentNavReadingsIndex: number;
  returnView: PLANS_VIEWS;
}

export const PLANS_MAX_VIEW_ID = 19;
export const SUBS_MAX_VIEW_ID = 39;
export const NEXT_MAX_VIEW_ID = 59;

export enum PLANS_VIEWS {
  // PLAN

  PLANS_LIST = 1,
  PLANS_ACTIONS = 2,
  PLANS_DETAILS = 3,

  // SUB
  SUBS_LIST = 20,
  SUBS_ACTIONS = 21,
  SUBS_DETAILS = 22,

  // NEXT READINGS
  NEXT_LIST = 40
}

export enum PLAN_PUBSUB_SUBSCRIPTIONS {
  GET_ALL_PLANS = 1,
  GET_ALL_SUBS,
  PUT_SUB,
  PUT_READING
}
