import type {
	PlanProgress
} from '../models/plan-progress';

import {
	PLAN_PROGRESS_OBJECT_TYPE,
	type PlanProgressStore
} from './plan-progress-store';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBPlanProgressStore
	implements PlanProgressStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		PlanProgress |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					PLAN_PROGRESS_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			| PlanProgress
			| undefined;
	}

	async getAll(): Promise<
		readonly PlanProgress[]
	> {
		const db =
			await this.getDB();

		const stored =
			await db.getAllFromIndex(
				DOMAIN_OBJECTS,
				OBJECT_TYPE_INDEX,
				PLAN_PROGRESS_OBJECT_TYPE
			);

		return stored.map(
			(object: StoredDomainObject) =>
				object.value as PlanProgress
		);
	}

	async put(
		progress: PlanProgress
	): Promise<void> {
		const db =
			await this.getDB();

		const stored:
			StoredDomainObject = {
				id:
					createStoredDomainObjectId(
						PLAN_PROGRESS_OBJECT_TYPE,
						progress.id
					),

				objectType:
					PLAN_PROGRESS_OBJECT_TYPE,

				objectId:
					progress.id,

				value:
					progress
			};

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
