import type {
	PlanProgress
} from '../models/plan-progress';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from './plan-progress-store';

import type {
	PlanProgressWriteStores,
	PlanProgressWriteTransaction
} from '../resources/progress/plan-progress-write-stores';

import {
	createPendingPublication
} from '$lib/application';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	OUTBOX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBPlanProgressWriteTransaction
	implements PlanProgressWriteTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>,

		private readonly nowEpochSeconds:
			() => number =
				() => Math.floor(
					Date.now() / 1000
				)
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					PlanProgressWriteStores
			) => Promise<TResult>
	): Promise<TResult> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				[
					DOMAIN_OBJECTS,
					RESOURCE_INSTALLATIONS,
					OUTBOX
				],
				'readwrite'
			);

		const domainObjects =
			transaction.objectStore(
				DOMAIN_OBJECTS
			);

		const resourceInstallations =
			transaction.objectStore(
				RESOURCE_INSTALLATIONS
			);

		const outbox =
			transaction.objectStore(
				OUTBOX
			);

		const stores:
			PlanProgressWriteStores = {
				progress: {
					get:
						async (
							id
						) => {
							const stored =
								await domainObjects.get(
									createStoredDomainObjectId(
										PLAN_PROGRESS_OBJECT_TYPE,
										id
									)
								);

							return stored?.value as
								| PlanProgress
								| undefined;
						},

					put:
						async (
							progress
						) => {
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

							await domainObjects.put(
								stored
							);
						}
				},

				outbox: {
					put:
						async (
							objectId,
							resource
						) => {
							const storedId =
								createStoredDomainObjectId(
									PLAN_PROGRESS_OBJECT_TYPE,
									objectId
								);

							const existing =
								await resourceInstallations.get(
									storedId
								);

							const modifiedAt =
								Math.max(
									this.nowEpochSeconds(),
									(existing?.modifiedAt ?? 0) + 1
								);

							await resourceInstallations.put({
								id:
									storedId,
								objectType:
									PLAN_PROGRESS_OBJECT_TYPE,
								objectId,
								publisher:
									resource.publisher,
								modifiedAt
							});

							await outbox.put(
								createPendingPublication(
									storedId,
									{
										...resource,
										modifiedAt
									}
								)
							);
						}
				}
			};

		try {
			const result =
				await operation(
					stores
				);

			await transaction.done;

			return result;
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				// Transaction may already be inactive.
			}

			try {
				await transaction.done;
			} catch {
				// Preserve the original operation error.
			}

			throw error;
		}
	}
}
