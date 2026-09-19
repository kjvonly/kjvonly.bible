import type {
	PlanSubscription
} from '$lib/domains/reading-plans/models/plan-subscription';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from './plan-subscriptions-store';

import type {
	PlanSubscriptionInstallationStores,
	PlanSubscriptionInstallationTransaction
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-installation-stores';

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

export class IndexedDBPlanSubscriptionInstallationTransaction
	implements PlanSubscriptionInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					PlanSubscriptionInstallationStores
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
			PlanSubscriptionInstallationStores = {
				subscriptions: {
					get:
						async (
							id
						) => {
							const stored =
								await domainObjects.get(
									createStoredDomainObjectId(
										PLAN_SUBSCRIPTION_OBJECT_TYPE,
										id
									)
								);

							return stored?.value as
								| PlanSubscription
								| undefined;
						},

					put:
						async (
							subscription
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											PLAN_SUBSCRIPTION_OBJECT_TYPE,
											subscription.id
										),

									objectType:
										PLAN_SUBSCRIPTION_OBJECT_TYPE,

									objectId:
										subscription.id,

									value:
										subscription
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
