import {
	createReadingPlanResourceId,
	parseReadingPlanResourceId
} from '../reading-plan-resource-id';

/** Application type represented by Reading Plan Progress Resources. */
export const PLAN_PROGRESS_RESOURCE_TYPE =
	'reading-plans/plan-progress';

/** Semantic payload contract for Reading Plan progress. */
export const PLAN_PROGRESS_DATA_TYPE =
	'kjvonly.reading-plan.progress';

/** Current semantic version of the Reading Plan progress payload contract. */
export const PLAN_PROGRESS_DATA_VERSION =
	1;

export interface PlanProgressResourceIdentity {
	readonly group: string;
	readonly subscriptionId: string;
}

export function createPlanProgressResourceId(
	group: string,
	subscriptionId: string
): string {
	return createReadingPlanResourceId(
		'plan-progress',
		group,
		subscriptionId
	);
}

export function parsePlanProgressResourceId(
	resourceId: string
): PlanProgressResourceIdentity {
	const [
		group,
		subscriptionId
	] = parseReadingPlanResourceId(
		resourceId,
		'plan-progress',
		[2],
		'Plan Progress'
	);

	return {
		group,
		subscriptionId
	};
}
