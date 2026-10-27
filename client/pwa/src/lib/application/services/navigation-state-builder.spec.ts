import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Modules
} from '../models/modules.model';

import type {
	ResourceSelections
} from '../resources/resource-selections';

import type {
	NavigationState
} from './navigation.service';

import {
	NavigationStateBuilder
} from './navigation-state-builder';

const SOURCE = {
	publisher: 'publisher',
	resourceId: 'test/resource/source'
};

const TARGET = {
	publisher: 'publisher',
	resourceId: 'test/resource/target'
};

const RESOURCE_TYPE =
	'test/resource';

describe(
	'NavigationStateBuilder',
	() => {
		it(
			'uses independent Module selections when there is no originating Resource state',
			() => {
				const independent =
					vi.fn(
						() => ({
							[RESOURCE_TYPE]: TARGET
						})
					);

				const related =
					vi.fn();

				const builder =
					createBuilder({
						independent,
						related
					});

				const result =
					builder.create(
						Modules.PLANS,
						'details',
						{
							planID: 'plan-1'
						}
					);

				expect(
					independent
				).toHaveBeenCalledWith(
					Modules.PLANS
				);

				expect(
					related
				).not.toHaveBeenCalled();

				expect(result).toEqual({
					module: Modules.PLANS,
					view: 'details',
					state: {
						planID: 'plan-1',
						resourceSelections: {
							[RESOURCE_TYPE]: TARGET
						}
					}
				});
			}
		);

		it(
			'uses related Module selections when the originating navigation entry has Resource state',
			() => {
				const originatingSelections = {
					[RESOURCE_TYPE]: SOURCE
				};

				const originatingState:
					NavigationState = {
						module: Modules.BIBLE,
						view: 'reader',
						state: {
							resourceSelections:
								originatingSelections
						}
					};

				const independent =
					vi.fn();

				const related =
					vi.fn(
						(
							_module: Modules,
							selections: ResourceSelections
						) => selections
					);

				const builder =
					createBuilder({
						independent,
						related
					});

				const result =
					builder.create(
						Modules.STRONGS,
						'definition',
						{
							strongsID: 'G25'
						},
						originatingState
					);

				expect(
					independent
				).not.toHaveBeenCalled();

				expect(
					related
				).toHaveBeenCalledWith(
					Modules.STRONGS,
					expect.objectContaining({
						[RESOURCE_TYPE]: SOURCE
					})
				);

				const relatedSelections =
					related.mock.calls[0]?.[1];

				expect(
					relatedSelections
				).not.toBe(
					originatingSelections
				);

				expect(
					result.state.resourceSelections
				).not.toBe(
					relatedSelections
				);

				expect(
					originatingState.state
						.resourceSelections
				).toBe(
					originatingSelections
				);
			}
		);

		it(
			'uses independent selections when an originating navigation entry has no Resource state',
			() => {
				const independent =
					vi.fn(
						() => ({})
					);

				const related =
					vi.fn();

				const builder =
					createBuilder({
						independent,
						related
					});

				builder.create(
					Modules.ARCHIVE,
					'export',
					{},
					{
						module: Modules.SETTINGS,
						view: 'appearance',
						state: {}
					}
				);

				expect(
					independent
				).toHaveBeenCalledWith(
					Modules.ARCHIVE
				);

				expect(
					related
				).not.toHaveBeenCalled();
			}
		);

		it(
			'omits Resource selections when the target Module produces none',
			() => {
				const builder =
					createBuilder({
						independent:
							() => ({}),
						related:
							() => ({})
					});

				const result =
					builder.create(
						Modules.ARCHIVE,
						'export',
						{
							filter: 'notes'
						}
					);

				expect(result).toEqual({
					module: Modules.ARCHIVE,
					view: 'export',
					state: {
						filter: 'notes'
					}
				});
			}
		);

		it(
			'derives Resource selections instead of accepting them from destination view state',
			() => {
				const builder =
					createBuilder({
						independent:
							() => ({
								[RESOURCE_TYPE]: TARGET
							}),
						related:
							() => ({})
					});

				const result =
					builder.create(
						Modules.PLANS,
						'details',
						{
							resourceSelections: {
								[RESOURCE_TYPE]: SOURCE
							}
						}
					);

				expect(
					result.state.resourceSelections
				).toEqual({
					[RESOURCE_TYPE]: TARGET
				});
			}
		);
	}
);

function createBuilder(
	resourceSelections: {
		independent(
			module: Modules
		): ResourceSelections;

		related(
			module: Modules,
			originatingSelections:
				ResourceSelections
		): ResourceSelections;
	}
): NavigationStateBuilder {
	return new NavigationStateBuilder(
		resourceSelections
	);
}
