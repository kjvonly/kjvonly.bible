import type {
	PlanDefinition
} from '../models/plan-definition';

import type {
	PlanDefinitionsStore
} from '../persistence/plan-definitions-store';

export class PlanDefinitionsService {

	constructor(
		private readonly definitions:
			Pick<
				PlanDefinitionsStore,
				'get' | 'getAll'
			>
	) {}

	async get(
		id: string
	): Promise<
		PlanDefinition |
		undefined
	> {
		return await this.definitions.get(
			id
		);
	}

	async list(): Promise<
		readonly PlanDefinition[]
	> {
		return await this.definitions.getAll();
	}
}
