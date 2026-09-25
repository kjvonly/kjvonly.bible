import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';

import type {
	Pane
} from '$lib/application/runtime/pane/models/pane.model';

import type {
	NavigationState
} from '$lib/application/services/navigation.service';

import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	ResourceSelections
} from './resource-selections';

import {
	createModuleResourceSelectionResolver
} from './module-resource-selection-resolver';

const RESOURCE_TYPE =
	'kjvonly/bible/booknames';

const SOURCE:
	PublishedResourceReference = {
	publisher:
		'publisher',

	resourceId:
		`${RESOURCE_TYPE}/default`
};

describe(
	'ModuleResourceSelectionResolver',
	() => {
		it(
			'returns the selected Resource from the module Buffer',
			() => {
				const modulePane =
					createPane(
						'module-pane',
						{
							resourceSelections: {
								[RESOURCE_TYPE]:
									SOURCE
							}
						}
					);

				const findPane =
					vi.fn(
						() => modulePane
					);

				const resolver =
					createResolver({
						findPane
					});

				expect(
					resolver.require(
						'module-pane',
						RESOURCE_TYPE
					)
				).toEqual(
					SOURCE
				);

				expect(
					findPane
				).toHaveBeenCalledWith(
					'module-pane'
				);
			}
		);

		it(
			'throws when the module Pane does not exist',
			() => {
				const resolver =
					createResolver({
						findPane:
							() => undefined
					});

				expect(
					() => resolver.require(
						'missing-pane',
						RESOURCE_TYPE
					)
				).toThrow(
					'Module Pane not found: missing-pane'
				);
			}
		);

		it(
			'throws when the module Pane has no Buffer',
			() => {
				const pane =
					createPane('module-pane');

				const resolver =
					createResolver({
						findPane:
							() => pane
					});

				expect(
					() => resolver.require(
						'module-pane',
						RESOURCE_TYPE
					)
				).toThrow(
					'Module Buffer not found for Pane: module-pane'
				);
			}
		);

		it(
			'returns undefined when an optional Resource selection is missing',
			() => {
				const pane =
					createPane(
						'module-pane',
						{
							resourceSelections:
								{}
						}
					);

				const resolver =
					createResolver({
						findPane:
							() => pane
					});

				expect(
					resolver.find(
						'module-pane',
						RESOURCE_TYPE
					)
				).toBeUndefined();
			}
		);

		it(
			'uses the Buffer Resource selection requirement',
			() => {
				const pane =
					createPane(
						'module-pane',
						{
							resourceSelections:
								{}
						}
					);

				const resolver =
					createResolver({
						findPane:
							() => pane
					});

				expect(
					() => resolver.require(
						'module-pane',
						RESOURCE_TYPE
					)
				).toThrow(
					`No Resource selection for type: ${RESOURCE_TYPE}`
				);
			}
		);

		it(
			'resolves a Resource from navigation-owned selections without Pane lookup',
			() => {
				const findPane =
					vi.fn();

				const navigationState:
					NavigationState = {
					module: Modules.PLANS,
					view: 'plans',
					state: {
						resourceSelections: {
							[RESOURCE_TYPE]: SOURCE
						}
					}
				};

				const related =
					vi.fn(
						(
							_module: Modules,
							selections: ResourceSelections
						) => selections
					);

				const resolver =
					createResolver(
						{ findPane },
						{ related }
					);

				expect(
					resolver.requireWithNavigationState(
						navigationState,
						RESOURCE_TYPE
					)
				).toEqual(SOURCE);

				expect(findPane).not.toHaveBeenCalled();
				expect(related).toHaveBeenCalledWith(
					Modules.PLANS,
					navigationState.state.resourceSelections
				);
			}
		);

		it(
			'uses module defaults when navigation state has no Resource selections',
			() => {
				const navigationState:
					NavigationState = {
					module: Modules.PLANS,
					view: 'plans',
					state: {}
				};

				const independent =
					vi.fn(
						() => ({
							[RESOURCE_TYPE]: SOURCE
						})
					);

				const resolver =
					createResolver(
						{
							findPane:
								() => undefined
						},
						{ independent }
					);

				expect(
					resolver.requireWithNavigationState(
						navigationState,
						RESOURCE_TYPE
					)
				).toEqual(SOURCE);

				expect(independent).toHaveBeenCalledWith(
					Modules.PLANS
				);

				expect(
					navigationState.state.resourceSelections
				).toEqual({
					[RESOURCE_TYPE]: SOURCE
				});
			}
		);
	}
);

function createResolver(
	panes: {
		findPane(
			paneID: string
		): Pane | undefined;
	},
	overrides: {
		independent?: (
			module: Modules
		) => ResourceSelections;
		related?: (
			module: Modules,
			selections: ResourceSelections
		) => ResourceSelections;
	} = {}
) {
	return createModuleResourceSelectionResolver(
		panes,
		{
			independent:
				overrides.independent ??
				(() => ({})),
			related:
				overrides.related ??
				((_module, selections) => selections)
		}
	);
}

function createPane(
	id: string,
	buffer?: unknown
): Pane {
	return {
		id,
		left:
			undefined,
		right:
			undefined,
		split:
			undefined,
		buffer,
		toggle:
			undefined
	};
}
