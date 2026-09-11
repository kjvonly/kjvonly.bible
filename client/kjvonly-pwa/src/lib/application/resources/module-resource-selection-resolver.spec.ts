import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Pane
} from '$lib/application/runtime/pane/models/pane.model';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

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
				const rootPane =
					createPane('root');

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

				const findNode =
					vi.fn(
						() => modulePane
					);

				const resolver =
					createModuleResourceSelectionResolver({
						rootPane,
						findNode
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
					findNode
				).toHaveBeenCalledWith(
					rootPane,
					'module-pane'
				);
			}
		);

		it(
			'throws when the module Pane does not exist',
			() => {
				const resolver =
					createModuleResourceSelectionResolver({
						rootPane:
							createPane('root'),

						findNode:
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
					createModuleResourceSelectionResolver({
						rootPane:
							pane,

						findNode:
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
					createModuleResourceSelectionResolver({
						rootPane:
							pane,

						findNode:
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
	}
);

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
		updateBuffer:
			undefined,
		toggle:
			undefined
	};
}
