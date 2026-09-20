import type {
	PlanDefinition
} from '../models/plan-definition';

export const PLAN_DEFINITION_OBJECT_TYPE =
	'reading-plans/plan-definition';

export interface PlanDefinitionsStore {
	get(
		id: string
	): Promise<
		PlanDefinition |
		undefined
	>;

	getAll(): Promise<
		readonly PlanDefinition[]
	>;

	put(
		definition: PlanDefinition
	): Promise<void>;
}
