import type {
	PlanDefinition
} from '../../models/plan-definition';

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
