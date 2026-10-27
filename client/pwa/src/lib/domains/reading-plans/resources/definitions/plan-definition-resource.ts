import {
	createReadingPlanResourceId,
	parseReadingPlanResourceId
} from '../reading-plan-resource-id';

/** Application type represented by Reading Plan Definition Resources. */
export const PLAN_DEFINITION_RESOURCE_TYPE =
	'reading-plans/plan-definition';

/** Semantic payload contract for Reading Plan definitions. */
export const PLAN_DEFINITION_DATA_TYPE =
	'kjvonly.reading-plan.definition';

/** Current semantic version of the Reading Plan definition payload contract. */
export const PLAN_DEFINITION_DATA_VERSION =
	1;

export interface PlanDefinitionResourceIdentity {
	readonly group: string;
	readonly planKey?: string;
}

export function createPlanDefinitionResourceId(
	group: string,
	planKey?: string
): string {
	return createReadingPlanResourceId(
		'plan-definition',
		group,
		...(planKey === undefined
			? []
			: [planKey])
	);
}

export function parsePlanDefinitionResourceId(
	resourceId: string
): PlanDefinitionResourceIdentity {
	const [
		group,
		planKey
	] = parseReadingPlanResourceId(
		resourceId,
		'plan-definition',
		[1, 2],
		'Plan Definition'
	);

	return {
		group,
		...(planKey === undefined
			? {}
			: { planKey })
	};
}
