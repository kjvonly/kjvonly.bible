import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';

/**
 * The production resolver imports Svelte components eagerly. Some of those
 * components import browser-only libraries (for example Quill), so evaluating
 * them in Vitest's Node environment would require a DOM even though this test
 * only cares about the module-to-component mapping contract.
 *
 * Mock the component modules at this boundary so the resolver can be exercised
 * without loading their browser/runtime dependencies.
 */
vi.mock(
	'$lib/domains/bible/ui',
	() => ({
		BibleContainer: { component: 'BibleContainer' },
		RefsContainer: { component: 'RefsContainer' },
		SearchContainer: { component: 'SearchContainer' }
	})
);
vi.mock(
	'$lib/application/modules/login/loginContainer.svelte',
	() => ({ default: { component: 'LoginContainer' } })
);
vi.mock(
	'$lib/application/modules/modules/modules.svelte',
	() => ({ default: { component: 'ModulesContainer' } })
);
vi.mock(
	'$lib/domains/notes/ui',
	() => ({ NotesContainer: { component: 'NotesContainer' } })
);
vi.mock(
	'$lib/domains/reading-plans/ui',
	() => ({ PlansContainer: { component: 'PlansContainer' } })
);
vi.mock(
	'$lib/application/modules/settings/settingsContainer.svelte',
	() => ({ default: { component: 'SettingsContainer' } })
);
vi.mock(
	'$lib/application/modules/profile/profileContainer.svelte',
	() => ({ default: { component: 'ProfileContainer' } })
);

import {
	resolveModuleComponent
} from './module-component-resolver';

describe(
	'resolveModuleComponent',
	() => {
		it.each([
			[Modules.MODULES, 'ModulesContainer'],
			[Modules.BIBLE, 'BibleContainer'],
			[Modules.STRONGS, 'RefsContainer'],
			[Modules.SEARCH, 'SearchContainer'],
			[Modules.NOTES, 'NotesContainer'],
			[Modules.PLANS, 'PlansContainer'],
			[Modules.LOGIN, 'LoginContainer'],
			[Modules.SETTINGS, 'SettingsContainer'],
			[Modules.PROFILE, 'ProfileContainer']
		] as const)(
			'resolves module %s to %s',
			(module, expectedComponent) => {
				expect(
					resolveModuleComponent(
						module
					)
				).toMatchObject({
					component: expectedComponent
				});
			}
		);

		it(
			'returns no component for the NULL module sentinel',
			() => {
				expect(
					resolveModuleComponent(
						Modules.NULL
					)
				).toBeUndefined();
			}
		);

		it(
			'throws for an unknown persisted module value',
			() => {
				expect(
					() =>
						resolveModuleComponent(
							999 as Modules
						)
				).toThrow(
					'Unsupported module: 999'
				);
			}
		);
	}
);
