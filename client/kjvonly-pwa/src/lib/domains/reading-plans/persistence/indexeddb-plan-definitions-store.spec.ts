import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PlanDefinition
} from '$lib/domains/reading-plans/models/plan-definition';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	PLAN_DEFINITION_OBJECT_TYPE
} from './plan-definitions-store';

import {
	IndexedDBPlanDefinitionsStore
} from './indexeddb-plan-definitions-store';

describe(
	'IndexedDBPlanDefinitionsStore',
	() => {
		it(
			'gets a Plan Definition from the shared Domain Object store',
			async () => {
				const definition =
					createDefinition();

				const get =
					vi.fn()
						.mockResolvedValue({
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
						});

				const store =
					createStore({
						get
					});

				await expect(
					store.get(
						definition.id
					)
				).resolves.toEqual(
					definition
				);

				expect(
					get
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					createStoredDomainObjectId(
						PLAN_DEFINITION_OBJECT_TYPE,
						definition.id
					)
				);
			}
		);

		it(
			'lists Plan Definitions with one objectType index query',
			async () => {
				const definitions = [
					createDefinition(),
					createDefinition({
						id:
							'publisher/default/proverbs',
						name:
							'Proverbs'
					})
				];

				const getAllFromIndex =
					vi.fn()
						.mockResolvedValue(
							definitions.map(
								(definition) => ({
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
								})
							)
						);

				const store =
					createStore({
						getAllFromIndex
					});

				await expect(
					store.getAll()
				).resolves.toEqual(
					definitions
				);

				expect(
					getAllFromIndex
				).toHaveBeenCalledOnce();

				expect(
					getAllFromIndex
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					OBJECT_TYPE_INDEX,
					PLAN_DEFINITION_OBJECT_TYPE
				);
			}
		);

		it(
			'puts a Plan Definition in the shared Domain Object envelope',
			async () => {
				const put =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const store =
					createStore({
						put
					});

				const definition =
					createDefinition();

				await store.put(
					definition
				);

				expect(
					put
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					{
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
					}
				);
			}
		);
	}
);

function createStore(
	db: Partial<ApplicationDB>
): IndexedDBPlanDefinitionsStore {
	return new IndexedDBPlanDefinitionsStore(
		async () =>
			db as ApplicationDB
	);
}

function createDefinition(
	overrides:
		Partial<PlanDefinition> =
		{}
): PlanDefinition {
	return {
		id:
			'publisher/default/mcheyne',

		name:
			'MCheyne',

		description:
			'Read through the Bible.',

		encodedReadings: [
			'1_1'
		],

		...overrides
	};
}
