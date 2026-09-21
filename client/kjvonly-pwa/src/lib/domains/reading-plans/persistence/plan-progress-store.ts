import type {
	PlanProgress
} from '../models/plan-progress';

export const PLAN_PROGRESS_OBJECT_TYPE =
	'reading-plans/plan-progress';

export interface PlanProgressStore {
	get(
		id: string
	): Promise<
		PlanProgress |
		undefined
	>;

	getAll(): Promise<
		readonly PlanProgress[]
	>;

	put(
		progress: PlanProgress
	): Promise<void>;
}
