import type {
	PlanDefinition
} from '$lib/domains/reading-plans/models/plan-definition';

import {
	PLAN_DEFINITION_OBJECT_TYPE
} from './plan-definitions-store';

import type {
	PlanDefinitionInstallationStores,
	PlanDefinitionInstallationTransaction
} from '$lib/domains/reading-plans/resources/definitions/plan-definition-installation-stores';

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

export class IndexedDBPlanDefinitionInstallationTransaction
	implements PlanDefinitionInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					PlanDefinitionInstallationStores
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
			PlanDefinitionInstallationStores = {
				planDefinitions: {
					get:
						async (
							id
						) => {
							const stored =
								await domainObjects.get(
									createStoredDomainObjectId(
										PLAN_DEFINITION_OBJECT_TYPE,
										id
									)
								);

							return stored?.value as
								| PlanDefinition
								| undefined;
						},

					put:
						async (
							definition
						) => {
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
