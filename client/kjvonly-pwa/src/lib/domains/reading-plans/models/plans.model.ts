import { encodedReadingsDecoderService } from '$lib/domains/reading-plans/services/encodedReadingsDecoder.service';
import type { BookNameLookup } from '$lib/domains/reading-plans/services/encodedReadingsDecoder.service';
import type { BCV } from '../../bible/models/bible.model';
import type { PlanDefinition } from './plan-definition';
import type { PlanSubscription } from './plan-subscription';

// ============================= PLAN DEFINITION VIEW =============================

/**
 * Runtime/UI projection of an accepted Plan Definition.
 *
 * The Plan Definition remains the authoritative persisted Domain Object.
 * nestedReadings is derived locally from encodedReadings + selected Booknames.
 */
export interface PlanDefinitionView extends PlanDefinition {
  nestedReadings: Readings[];
}

export function NullPlanDefinitionView(): PlanDefinitionView {
  return {
    id: '',
    name: '',
    description: '',
    encodedReadings: [],
    nestedReadings: []
  };
}

// =================================== SUBS ====================================

/**
 * Runtime/UI projection of an accepted Plan Subscription.
 *
 * The subscription Domain Object remains authoritative persisted state.
 * Readings and progress metadata are derived locally for display/navigation.
 */
export interface Sub {
  id: string;
  planDefinitionId: string;
  dateSubscribed: number;

  name: string;
  description: string;
  nestedReadings: Readings[];
  completedReadingIndexes: Set<number>;

  nextReadingsIndex: number;
  percentCompleted: number;
}

export function NullSub(): Sub {
  return {
    id: '',
    planDefinitionId: '',
    dateSubscribed: 0,
    name: '',
    description: '',
    nestedReadings: [],
    completedReadingIndexes: new Set(),
    nextReadingsIndex: 0,
    percentCompleted: 0
  };
}

export function planSubscriptionToSub(
  subscription: PlanSubscription,
  bookNameLookup: BookNameLookup
): Sub {
  const nestedReadings = encodedReadingsDecoderService.parseEncodedReadings(
    [...subscription.encodedReadings],
    bookNameLookup
  );

  return {
    id: subscription.id,
    planDefinitionId: subscription.planDefinitionId,
    dateSubscribed: subscription.dateSubscribed,
    name: subscription.name,
    description: subscription.description,
    nestedReadings,
    completedReadingIndexes: new Set(),
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
  GET_ALL_SUBS = 2,
  PUT_SUB = 3,
  PUT_PROGRESS = 4
}
