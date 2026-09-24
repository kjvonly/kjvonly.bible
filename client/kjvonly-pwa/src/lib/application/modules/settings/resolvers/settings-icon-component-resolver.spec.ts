import {
	describe,
	expect,
	it
} from 'vitest';

import {
	resolveSettingsIconAccentClass
} from './settings-icon-component-resolver';

///////////////////////////////////////////////////////////////////////////////

describe(
	'resolveSettingsIconAccentClass',
	() => {
		it(
			'resolves configured root icon accents to static Tailwind classes',
			() => {
				expect(
					resolveSettingsIconAccentClass('vivid-b-500')
				).toBe('text-vivid-b-500');
				expect(
					resolveSettingsIconAccentClass('support-a-500')
				).toBe('text-support-a-500');
			}
		);

		it(
			'uses the neutral icon color when no accent is configured',
			() => {
				expect(
					resolveSettingsIconAccentClass()
				).toBe('text-neutral-700');
			}
		);
	}
);
