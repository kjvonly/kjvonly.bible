import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';

import {
	NoResourceModuleResourceSelectionContributor
} from './no-resource-module-resource-selection-contributor';

describe(
	'NoResourceModuleResourceSelectionContributor',
	() => {
		it.each([
			Modules.MODULES,
			Modules.USER_GUIDE,
			Modules.LOGIN,
			Modules.SETTINGS,
			Modules.NULL,
			Modules.PROFILE
		])(
			'resource-free module %s explicitly builds an empty selection',
			module => {
				const contributor =
					new NoResourceModuleResourceSelectionContributor(
						module
					);

				expect(
					contributor.build({
						originatingSelections: {
							'test/origin': {
								publisher: 'origin',
								resourceId: 'test/origin/default'
							}
						},
						currentSelections: {
							'test/current': {
								publisher: 'current',
								resourceId: 'test/current/default'
							}
						}
					})
				).toEqual({});
			}
		);
	}
);
