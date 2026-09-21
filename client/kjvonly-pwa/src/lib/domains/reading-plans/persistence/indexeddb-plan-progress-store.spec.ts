import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PlanProgress
} from '../models/plan-progress';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from './plan-progress-store';

import {
	IndexedDBPlanProgressStore
} from './indexeddb-plan-progress-store';

describe(
	'IndexedDBPlanProgressStore',
	() => {
		it(
			'gets Plan Progress from the shared Domain Object store',
			async () => {
				const progress =
					createProgress();

				const get =
					vi.fn()
						.mockResolvedValue({
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
						});

				const store =
					createStore({
						get
					});

				await expect(
					store.get(
						progress.id
					)
				).resolves.toEqual(
					progress
				);

				expect(
					get
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					createStoredDomainObjectId(
						PLAN_PROGRESS_OBJECT_TYPE,
						progress.id
					)
				);
			}
		);

		it(
			'lists Plan Progress with one objectType index query',
			async () => {
				const progress = [
					createProgress(),
					createProgress({
						id:
							'publisher/default/subscription-2',
						completedReadingIndexes:
							[0, 1]
					})
				];

				const getAllFromIndex =
					vi.fn()
						.mockResolvedValue(
							progress.map(
								(item) => ({
									id:
										createStoredDomainObjectId(
											PLAN_PROGRESS_OBJECT_TYPE,
											item.id
										),
									objectType:
										PLAN_PROGRESS_OBJECT_TYPE,
									objectId:
										item.id,
									value:
										item
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
					progress
				);

				expect(
					getAllFromIndex
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					OBJECT_TYPE_INDEX,
					PLAN_PROGRESS_OBJECT_TYPE
				);
			}
		);

		it(
			'puts Plan Progress in the shared Domain Object envelope',
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

				const progress =
					createProgress();

				await store.put(
					progress
				);

				expect(
					put
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					{
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
					}
				);
			}
		);
	}
);

function createStore(
	db: Partial<ApplicationDB>
): IndexedDBPlanProgressStore {
	return new IndexedDBPlanProgressStore(
		async () =>
			db as ApplicationDB
	);
}

function createProgress(
	overrides:
		Partial<PlanProgress> =
		{}
): PlanProgress {
	return {
		id:
			'publisher/default/subscription-1',
		completedReadingIndexes:
			[0, 2, 4],
		...overrides
	};
}
