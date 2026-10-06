import {
	describe,
	expect,
	it
} from 'vitest';

import {
	ResourceSelectionService
} from './resource-selection.service';

import type {
	ResourceSelectionStore
} from './resource-selection-store';

import type {
	ResourceSelections
} from './resource-selections';

describe(
	'ResourceSelectionService',
	() => {

		it(
			'selects a Resource by its Resource Type',
			() => {

				const service =
					new ResourceSelectionService();

				service.select({
					resourceType:
						'bible/chapter',

					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});

				expect(
					service.get(
						'bible/chapter'
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
					resourceType:
						'bible/chapter',

					publisher:
						'publisher-a',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				service.select({
					resourceType:
						'bible/chapter',

					publisher:
						'publisher-b',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});

				expect(
					service.get(
						'bible/chapter'
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
							resourceType:
								'bible/chapter',

							publisher:
								'publisher',

							resourceId:
								'kjvonly/bible/chapters/kjvs'
						},
						{
							resourceType:
								'strongs/definition',

							publisher:
								'publisher',

							resourceId:
								'kjvonly/strongs/definitions/kjvs'
						}
					]);

				expect(
					service.require(
						'bible/chapter'
					)
				).toEqual({
					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});

				expect(
					service.require(
						'strongs/definition'
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
							'bible/chapter'
						)
				).toThrow(
					'No Resource selected for type: bible/chapter'
				);
			}
		);

		it(
			'creates a detached snapshot of the current selections',
			() => {

				const service =
					new ResourceSelectionService([
						{
							resourceType:
								'bible/chapter',

							publisher:
								'publisher-a',

							resourceId:
								'kjvonly/bible/chapters/kjvs'
						}
					]);

				const snapshot =
					service.snapshot();

				service.select({
					resourceType:
						'bible/chapter',

					publisher:
						'publisher-b',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				expect(
					snapshot[
						'bible/chapter'
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
			'keeps Resource Type independent from Resource Identifier shape',
			() => {

				const service =
					new ResourceSelectionService();

				service.select({
					resourceType:
						'bible/chapter',

					publisher:
						'publisher',

					resourceId:
						'opaque-bible-resource'
				});

				expect(
					service.require(
						'bible/chapter'
					)
				).toEqual({
					publisher:
						'publisher',

					resourceId:
						'opaque-bible-resource'
				});
			}
		);
	}
);

describe(
	'ResourceSelectionService persistence',
	() => {

		it(
			'does not persist fallback selections during construction',
			() => {

				const store =
					new FakeResourceSelectionStore();

				new ResourceSelectionService(
					[
						{
							resourceType:
								'bible/chapter',

							publisher:
								'publisher',

							resourceId:
								'kjvonly/bible/chapters/kjvs'
						},
						{
							resourceType:
								'strongs/definition',

							publisher:
								'publisher',

							resourceId:
								'kjvonly/strongs/definitions/kjvs'
						}
					],
					store
				);

				expect(
					store.saved
				).toEqual([]);
			}
		);

		it(
			'restores persisted selection over a fallback selection for the same Resource Type',
			() => {

				const store =
					new FakeResourceSelectionStore({
						'bible/chapter': {
							publisher:
								'publisher-b',

							resourceId:
								'kjvonly/bible/chapters/kjv'
						}
					});

				const service =
					new ResourceSelectionService(
						[
							{
								resourceType:
									'bible/chapter',

								publisher:
									'publisher-a',

								resourceId:
									'kjvonly/bible/chapters/kjvs'
							}
						],
						store
					);

				service.restore();

				expect(
					service.require(
						'bible/chapter'
					)
				).toEqual({
					publisher:
						'publisher-b',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});
			}
		);

		it(
			'retains fallback selections for Resource Types missing from persisted selections',
			() => {

				const store =
					new FakeResourceSelectionStore({
						'bible/chapter': {
							publisher:
								'publisher-b',

							resourceId:
								'kjvonly/bible/chapters/kjv'
						}
					});

				const service =
					new ResourceSelectionService(
						[
							{
								resourceType:
									'bible/chapter',

								publisher:
									'publisher-a',

								resourceId:
									'kjvonly/bible/chapters/kjvs'
							},
							{
								resourceType:
									'strongs/definition',

								publisher:
									'publisher-a',

								resourceId:
									'kjvonly/strongs/definitions/kjvs'
							}
						],
						store
					);

				service.restore();

				expect(
					service.require(
						'bible/chapter'
					)
				).toEqual({
					publisher:
						'publisher-b',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				expect(
					service.require(
						'strongs/definition'
					)
				).toEqual({
					publisher:
						'publisher-a',

					resourceId:
						'kjvonly/strongs/definitions/kjvs'
				});
			}
		);

		it(
			'persists only established current selections when a selection changes',
			() => {

				const store =
					new FakeResourceSelectionStore();

				const service =
					new ResourceSelectionService(
						[
							{
								resourceType:
									'bible/chapter',

								publisher:
									'publisher-a',

								resourceId:
									'kjvonly/bible/chapters/kjvs'
							},
							{
								resourceType:
									'strongs/definition',

								publisher:
									'publisher-a',

								resourceId:
									'kjvonly/strongs/definitions/kjvs'
							}
						],
						store
					);

				service.select({
					resourceType:
						'bible/chapter',

					publisher:
						'publisher-b',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				expect(
					service.require(
						'bible/chapter'
					)
				).toEqual({
					publisher:
						'publisher-b',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				expect(
					store.saved
				).toEqual([
					{
						'bible/chapter': {
							publisher:
								'publisher-b',

							resourceId:
								'kjvonly/bible/chapters/kjv'
						}
					}
				]);
			}
		);
	}
);

describe(
	'initializeMissing',
	() => {

		it(
			'initializes a missing Resource selection',
			() => {

				const service =
					new ResourceSelectionService();

				service.initializeMissing([
					{
						resourceType:
							'bible/chapter',

						publisher:
							'publisher-a',

						resourceId:
							'kjvonly/bible/chapters/kjvs'
					}
				]);

				expect(
					service.require(
						'bible/chapter'
					)
				).toEqual({
					publisher:
						'publisher-a',

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				});
			}
		);

		it(
			'replaces a fallback selection with an initialized selection',
			() => {

				const service =
					new ResourceSelectionService([
						{
							resourceType:
								'bible/chapter',

							publisher:
								'publisher-fallback',

							resourceId:
								'kjvonly/bible/chapters/kjvs'
						}
					]);

				service.initializeMissing([
					{
						resourceType:
							'bible/chapter',

						publisher:
							'publisher-bootstrap',

						resourceId:
							'kjvonly/bible/chapters/kjv'
					}
				]);

				expect(
					service.require(
						'bible/chapter'
					)
				).toEqual({
					publisher:
						'publisher-bootstrap',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});
			}
		);

		it(
			'preserves current selections while replacing fallbacks',
			() => {

				const service =
					new ResourceSelectionService([
						{
							resourceType:
								'bible/chapter',

							publisher:
								'publisher-fallback',

							resourceId:
								'kjvonly/bible/chapters/kjvs'
						},
						{
							resourceType:
								'strongs/definition',

							publisher:
								'publisher-fallback',

							resourceId:
								'kjvonly/strongs/definitions/kjvs'
						}
					]);

				service.select({
					resourceType:
						'bible/chapter',

					publisher:
						'publisher-user',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				service.initializeMissing([
					{
						resourceType:
							'bible/chapter',

						publisher:
							'publisher-bootstrap',

						resourceId:
							'kjvonly/bible/chapters/kjvs'
					},
					{
						resourceType:
							'strongs/definition',

						publisher:
							'publisher-bootstrap',

						resourceId:
							'kjvonly/strongs/definitions/enhanced'
					}
				]);

				expect(
					service.require(
						'bible/chapter'
					)
				).toEqual({
					publisher:
						'publisher-user',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				expect(
					service.require(
						'strongs/definition'
					)
				).toEqual({
					publisher:
						'publisher-bootstrap',

					resourceId:
						'kjvonly/strongs/definitions/enhanced'
				});
			}
		);

		it(
			'persists the updated snapshot when missing selections are added',
			() => {

				const store =
					new FakeResourceSelectionStore();

				const service =
					new ResourceSelectionService(
						[
							{
								resourceType:
									'bible/chapter',

								publisher:
									'publisher-fallback',

								resourceId:
									'kjvonly/bible/chapters/kjvs'
							},
							{
								resourceType:
									'strongs/definition',

								publisher:
									'publisher-fallback',

								resourceId:
									'kjvonly/strongs/definitions/kjvs'
							}
						],
						store
					);

				service.initializeMissing([
					{
						resourceType:
							'bible/chapter',

						publisher:
							'publisher-bootstrap',

						resourceId:
							'kjvonly/bible/chapters/kjv'
					}
				]);

				expect(
					store.saved
				).toEqual([
					{
						'bible/chapter': {
							publisher:
								'publisher-bootstrap',

							resourceId:
								'kjvonly/bible/chapters/kjv'
						}
					}
				]);
			}
		);

		it(
			'preserves restored selections while initializing missing Resource Types',
			() => {

				const store =
					new FakeResourceSelectionStore({
						'bible/chapter': {
							publisher:
								'publisher-user',

							resourceId:
								'kjvonly/bible/chapters/kjv'
						}
					});

				const service =
					new ResourceSelectionService(
						[
							{
								resourceType:
									'bible/chapter',

								publisher:
									'publisher-fallback',

								resourceId:
									'kjvonly/bible/chapters/kjvs'
							},
							{
								resourceType:
									'strongs/definition',

								publisher:
									'publisher-fallback',

								resourceId:
									'kjvonly/strongs/definitions/kjvs'
							}
						],
						store
					);

				service.restore();

				service.initializeMissing([
					{
						resourceType:
							'bible/chapter',

						publisher:
							'publisher-default',

						resourceId:
							'kjvonly/bible/chapters/kjvs'
					},
					{
						resourceType:
							'strongs/definition',

						publisher:
							'publisher-default',

						resourceId:
							'kjvonly/strongs/definitions/kjvs'
					}
				]);

				expect(
					service.require(
						'bible/chapter'
					)
				).toEqual({
					publisher:
						'publisher-user',

					resourceId:
						'kjvonly/bible/chapters/kjv'
				});

				expect(
					service.require(
						'strongs/definition'
					)
				).toEqual({
					publisher:
						'publisher-default',

					resourceId:
						'kjvonly/strongs/definitions/kjvs'
				});

				expect(
					store.saved
				).toEqual([
					{
						'bible/chapter': {
							publisher:
								'publisher-user',

							resourceId:
								'kjvonly/bible/chapters/kjv'
						},

						'strongs/definition': {
							publisher:
								'publisher-default',

							resourceId:
								'kjvonly/strongs/definitions/kjvs'
						}
					}
				]);
			}
		);

		it(
			'does not persist when every supplied Resource Type already has a current selection',
			() => {

				const store =
					new FakeResourceSelectionStore({
						'bible/chapter': {
							publisher:
								'publisher-user',

							resourceId:
								'kjvonly/bible/chapters/kjv'
						}
					});

				const service =
					new ResourceSelectionService(
						[
							{
								resourceType:
									'bible/chapter',

								publisher:
									'publisher-fallback',

								resourceId:
									'kjvonly/bible/chapters/kjvs'
							}
						],
						store
					);

				service.restore();

				service.initializeMissing([
					{
						resourceType:
							'bible/chapter',

						publisher:
							'publisher-bootstrap',

						resourceId:
							'kjvonly/bible/chapters/kjvs'
					}
				]);

				expect(
					store.saved
				).toEqual([]);
			}
		);
	}
);

class FakeResourceSelectionStore
	implements ResourceSelectionStore {

	saved:
		ResourceSelections[] =
			[];

	constructor(
		private readonly persisted?:
			ResourceSelections
	) {}

	load():
		ResourceSelections |
		undefined {

		return this.persisted;
	}

	save(
		selections:
			ResourceSelections
	): void {

		this.saved.push(
			structuredClone(
				selections
			)
		);
	}
}