import type {
	PlanProgress
} from '$lib/domains/reading-plans/models/plan-progress';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from './plan-progress-store';

import type {
	PlanProgressInstallationStores,
	PlanProgressInstallationTransaction
} from '$lib/domains/reading-plans/resources/progress/plan-progress-installation-stores';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource';

export class IndexedDBPlanProgressInstallationTransaction
	implements PlanProgressInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					PlanProgressInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				[
					DOMAIN_OBJECTS,
					RESOURCE_INSTALLATIONS
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

		const stores:
			PlanProgressInstallationStores = {
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

				resourceInstallations: {
					get:
						async (
							objectType,
							objectId
						) => {
							return await resourceInstallations.get(
								createResourceInstallationId(
									objectType,
									objectId
								)
							) as
								| ResourceInstallation
								| undefined;
						},

					put:
						async (
							installation
						) => {
							await resourceInstallations.put(
								installation
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
