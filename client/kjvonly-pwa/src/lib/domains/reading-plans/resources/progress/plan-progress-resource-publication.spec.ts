import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanProgress
} from '$lib/domains/reading-plans/models/plan-progress';

import {
	PLAN_PROGRESS_RESOURCE_TYPE
} from './plan-progress-resource';

import {
	PlanProgressResourcePublication
} from './plan-progress-resource-publication';

describe(
	'PlanProgressResourcePublication',
	() => {
		it(
			'derives the outbound Resource from the Plan Progress Domain identity',
			() => {
				const progress:
					PlanProgress = {
						id:
							'publisher/default/subscription-1',
						completedReadingIndexes: [
							0,
							2
						]
					};

				expect(
					new PlanProgressResourcePublication()
						.create(
							progress
						)
				).toEqual({
					type:
						'resource',

					publisher:
						'publisher',
					resourceType:
						PLAN_PROGRESS_RESOURCE_TYPE,
					resourceId:
						`${PLAN_PROGRESS_RESOURCE_TYPE}/default/subscription-1`,
					representation:
						'content',
					mediaType:
						'application/json+gzip+hex',
					value: {
						completedReadingIndexes: [
							0,
							2
						]
					}
				});
			}
		);

		it(
			'does not publish the application id in Resource content',
			() => {
				const publication =
					new PlanProgressResourcePublication()
						.create({
							id:
								'publisher/study/subscription-1',
							completedReadingIndexes: [
								1
							]
						});

				expect(
					publication.value
				).toEqual({
					completedReadingIndexes: [
						1
					]
				});
			}
		);

		it(
			'rejects an invalid Plan Subscription identity',
			() => {
				expect(
					() =>
						new PlanProgressResourcePublication()
							.create({
								id:
									'subscription-1',
								completedReadingIndexes: []
							})
				).toThrow(
					'Invalid Plan Subscription id'
				);
			}
		);
	}
);
