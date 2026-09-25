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
	'$lib/application/modules/settings/settingsContainer.svelte',
	() => ({ default: { component: 'SettingsContainer' } })
);
vi.mock(
	'$lib/application/modules/profile/profileContainer.svelte',
	() => ({ default: { component: 'ProfileContainer' } })
);
vi.mock(
	'$lib/application/modules/archive/archiveContainer.svelte',
	() => ({ default: { component: 'ArchiveContainer' } })
);

import {
	resolveModuleComponent
} from './module-component-resolver';

describe(
	'resolveModuleComponent',
	() => {
		it.each([
			[Modules.MODULES, 'ModulesContainer'],
			[Modules.STRONGS, 'RefsContainer'],
			[Modules.SEARCH, 'SearchContainer'],
			[Modules.NOTES, 'NotesContainer'],
			[Modules.LOGIN, 'LoginContainer'],
			[Modules.SETTINGS, 'SettingsContainer'],
			[Modules.PROFILE, 'ProfileContainer'],
			[Modules.ARCHIVE, 'ArchiveContainer']
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

		it.each([
			Modules.BIBLE,
			Modules.PLANS
		])(
			'does not resolve migrated module %s through the legacy Module renderer',
			(module) => {
				expect(
					() =>
						resolveModuleComponent(
							module
						)
				).toThrow(
					`Unsupported module: ${module}`
				);
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
