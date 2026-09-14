import type {
	PlanDefinition
} from '$lib/domains/reading-plans/models/plan-definition';

export interface ValidatedPlanDefinitionCandidate {
	readonly group:
		string;

	readonly planKey:
		string;

	readonly definition:
		Omit<
			PlanDefinition,
			'id'
		>;
}
