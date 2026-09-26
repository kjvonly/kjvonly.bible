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
			'resolves a Resource from navigation-owned selections',
			() => {
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
					createResolver({
						related
					});

				expect(
					resolver.require(
						navigationState,
						RESOURCE_TYPE
					)
				).toEqual(SOURCE);

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
					createResolver({
						independent
					});

				expect(
					resolver.require(
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

		it(
			'returns undefined for a missing optional navigation Resource selection',
			() => {
				const navigationState:
					NavigationState = {
						module: Modules.PLANS,
						view: 'plans',
						state: {}
					};

				const resolver =
					createResolver();

				expect(
					resolver.find(
						navigationState,
						RESOURCE_TYPE
					)
				).toBeUndefined();
			}
		);

		it(
			'uses the Resource selection requirement for navigation state',
			() => {
				const navigationState:
					NavigationState = {
						module: Modules.PLANS,
						view: 'plans',
						state: {}
					};

				const resolver =
					createResolver();

				expect(
					() => resolver.require(
						navigationState,
						RESOURCE_TYPE
					)
				).toThrow(
					`No Resource selection for type: ${RESOURCE_TYPE}`
				);
			}
		);
	}
);

function createResolver(
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
	return createModuleResourceSelectionResolver({
		independent:
			overrides.independent ??
			(() => ({})),
		related:
			overrides.related ??
			((_module, selections) => selections)
	});
}
