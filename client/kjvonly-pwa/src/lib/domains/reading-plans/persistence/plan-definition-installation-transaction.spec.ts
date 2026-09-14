import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanDefinition
} from '$lib/domains/reading-plans/models/plan-definition';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import {
	PLAN_DEFINITION_OBJECT_TYPE
} from './plan-definitions-store';

import {
	IndexedDBPlanDefinitionInstallationTransaction
} from './plan-definition-installation-transaction';

describe(
	'IndexedDBPlanDefinitionInstallationTransaction',
	() => {
		it(
			'opens a readwrite transaction over Domain Objects and Resource Installations',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBPlanDefinitionInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				await transaction.run(
					async () => {}
				);

				expect(
					db.storeNames
				).toEqual([
					DOMAIN_OBJECTS,
					RESOURCE_INSTALLATIONS
				]);

				expect(
					db.mode
				).toBe(
					'readwrite'
				);
			}
		);

		it(
			'exposes transaction-scoped Plan Definition and Resource Installation stores',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBPlanDefinitionInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const definition =
					createDefinition();

				const installation =
					createInstallation();

				await transaction.run(
					async (
						stores
					) => {
						await stores.planDefinitions.put(
							definition
						);

						expect(
							await stores.planDefinitions.get(
								definition.id
							)
						).toEqual(
							definition
						);

						await stores
							.resourceInstallations
							.put(
								installation
							);

						expect(
							await stores
								.resourceInstallations
								.get(
									PLAN_DEFINITION_OBJECT_TYPE,
									definition.id
								)
						).toEqual(
							installation
						);
					}
				);

				expect(
					db.getStoredValue(
						DOMAIN_OBJECTS,
						`${PLAN_DEFINITION_OBJECT_TYPE}:${definition.id}`
					)
				).toEqual({
					id:
						`${PLAN_DEFINITION_OBJECT_TYPE}:${definition.id}`,

					objectType:
						PLAN_DEFINITION_OBJECT_TYPE,

					objectId:
						definition.id,

					value:
						definition
				});

				expect(
					db.getStoredValue(
						RESOURCE_INSTALLATIONS,
						installation.id
					)
				).toEqual(
					installation
				);
			}
		);

		it(
			'returns undefined for missing transaction-scoped records',
			async () => {
				const transaction =
					new IndexedDBPlanDefinitionInstallationTransaction(
						async () =>
							new FakeApplicationDB()
								.asApplicationDB()
					);

				await transaction.run(
					async (
						stores
					) => {
						expect(
							await stores.planDefinitions.get(
								'missing/default/plan'
							)
						).toBeUndefined();

						expect(
							await stores
								.resourceInstallations
								.get(
									PLAN_DEFINITION_OBJECT_TYPE,
									'missing/default/plan'
								)
						).toBeUndefined();
					}
				);
			}
		);

		it(
			'returns the installation operation result',
			async () => {
				const transaction =
					new IndexedDBPlanDefinitionInstallationTransaction(
						async () =>
							new FakeApplicationDB()
								.asApplicationDB()
					);

				const result =
					await transaction.run(
						async () =>
							'installation-complete'
					);

				expect(
					result
				).toBe(
					'installation-complete'
				);
			}
		);

		it(
			'aborts the transaction and preserves the operation error',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBPlanDefinitionInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const error =
					new Error(
						'installation failed'
					);

				await expect(
					transaction.run(
						async () => {
							throw error;
						}
					)
				).rejects.toBe(
					error
				);

				expect(
					db.transactionAbortCount
				).toBe(
					1
				);
			}
		);
	}
);

function createDefinition():
	PlanDefinition {
	return {
		id:
			'publisher/default/mcheyne',

		name:
			'MCheyne',

		description:
			'Read through the Bible.',

		encodedReadings: [
			'1_1'
		]
	};
}

function createInstallation():
	ResourceInstallation {
	const objectId =
		'publisher/default/mcheyne';

	return {
		id:
			createResourceInstallationId(
				PLAN_DEFINITION_OBJECT_TYPE,
				objectId
			),

		objectType:
			PLAN_DEFINITION_OBJECT_TYPE,

		objectId,

		publisher:
			'publisher',

		resourceId:
			'kjvonly/plans/readings/default/mcheyne',

		modifiedAt:
			200
	};
}

class FakeApplicationDB {
	storeNames:
		readonly string[] =
			[];

	mode:
		IDBTransactionMode |
		undefined;

	transactionAbortCount =
		0;

	private readonly stores =
		new Map<
			string,
			Map<string, unknown>
		>();

	asApplicationDB():
		ApplicationDB {
		return {
			transaction:
				(
					storeNames:
						readonly string[],

					mode:
						IDBTransactionMode
				) => {
					this.storeNames = [
						...storeNames
					];

					this.mode =
						mode;

					return this.createTransaction();
				}
		} as unknown as ApplicationDB;
	}

	getStoredValue(
		storeName: string,
		id: string
	): unknown {
		return this.stores
			.get(
				storeName
			)
			?.get(
				id
			);
	}

	private createTransaction() {
		return {
			objectStore:
				(
					storeName:
						string
				) =>
					this.createObjectStore(
						storeName
					),

			done:
				Promise.resolve(),

			abort:
				() => {
					this.transactionAbortCount++;
				}
		};
	}

	private createObjectStore(
		storeName: string
	) {
		let store =
			this.stores.get(
				storeName
			);

		if (!store) {
			store =
				new Map<
					string,
					unknown
				>();

			this.stores.set(
				storeName,
				store
			);
		}

		return {
			get:
				async (
					id:
						string
				) =>
					store.get(
						id
					),

			put:
				async (
					value:
						unknown
				) => {
					const id =
						(
							value as {
								id: string;
							}
						).id;

					store.set(
						id,
						value
					);
				}
		};
	}
}
