import type {
	PlanDefinition
} from '$lib/domains/reading-plans/models/plan-definition';

import {
	PLAN_DEFINITION_OBJECT_TYPE,
	type PlanDefinitionsStore
} from './plan-definitions-store';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBPlanDefinitionsStore
	implements PlanDefinitionsStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		PlanDefinition |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					PLAN_DEFINITION_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			| PlanDefinition
			| undefined;
	}

	async getAll(): Promise<
		readonly PlanDefinition[]
	> {
		const db =
			await this.getDB();

		const stored =
			await db.getAllFromIndex(
				DOMAIN_OBJECTS,
				OBJECT_TYPE_INDEX,
				PLAN_DEFINITION_OBJECT_TYPE
			);

		return stored.map(
			(object: StoredDomainObject) =>
				object.value as PlanDefinition
		);
	}

	async put(
		definition: PlanDefinition
	): Promise<void> {
		const db =
			await this.getDB();

		const stored:
			StoredDomainObject = {
				id:
					createStoredDomainObjectId(
						PLAN_DEFINITION_OBJECT_TYPE,
						definition.id
					),

				objectType:
					PLAN_DEFINITION_OBJECT_TYPE,

				objectId:
					definition.id,

				value:
					definition
			};

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
