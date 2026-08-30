import {
	describe,
	expect,
	it
} from 'vitest';

import {
	ResourceSelectionService
} from './resource-selection.service';

describe(
	'ResourceSelectionService',
	() => {

		it(
			'selects a Resource by its Resource Type',
			() => {

				const service =
					new ResourceSelectionService();

				service.select({
					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});

				expect(
					service.get(
						'kjvonly/bible/chapters'
					)
				).toEqual({
					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});
			}
		);

		it(
			'replaces the current selection for the same Resource Type',
			() => {

				const service =
					new ResourceSelectionService();

				service.select({
					publisher:
						'publisher-a',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				service.select({
					publisher:
						'publisher-b',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});

				expect(
					service.get(
						'kjvonly/bible/chapters'
					)
				).toEqual({
					publisher:
						'publisher-b',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});
			}
		);

		it(
			'keeps selections for different Resource Types independently',
			() => {

				const service =
					new ResourceSelectionService([
						{
							publisher:
								'publisher',

							resourceId:
								'kjvonly/bible/chapters/kjvs'
						},
						{
							publisher:
								'publisher',

							resourceId:
								'kjvonly/strongs/definitions/kjvs'
						}
					]);

				expect(
					service.require(
						'kjvonly/bible/chapters'
					)
				).toEqual({
					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});

				expect(
					service.require(
						'kjvonly/strongs/definitions'
					)
				).toEqual({
					publisher:
						'publisher',

					resourceId:
						'kjvonly/strongs/definitions/kjvs'
				});
			}
		);

		it(
			'throws when a required Resource Type has no selection',
			() => {

				const service =
					new ResourceSelectionService();

				expect(
					() =>
						service.require(
							'kjvonly/bible/chapters'
						)
				).toThrow(
					'No Resource selected for type: kjvonly/bible/chapters'
				);
			}
		);

		it(
			'creates a detached snapshot of the current selections',
			() => {

				const service =
					new ResourceSelectionService([
						{
							publisher:
								'publisher-a',

							resourceId:
								'kjvonly/bible/chapters/kjvs'
						}
					]);

				const snapshot =
					service.snapshot();

				service.select({
					publisher:
						'publisher-b',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				expect(
					snapshot[
						'kjvonly/bible/chapters'
					]
				).toEqual({
					publisher:
						'publisher-a',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});
			}
		);

		it(
			'rejects an invalid Resource Identifier',
			() => {

				const service =
					new ResourceSelectionService();

				expect(
					() =>
						service.select({
							publisher:
								'publisher',

							resourceId:
								'invalid'
						})
				).toThrow(
					'Invalid Resource Identifier'
				);
			}
		);
	}
);