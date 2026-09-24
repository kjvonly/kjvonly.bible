import {
	describe,
	expect,
	it
} from 'vitest';

import {
	findSettingsPage,
	findSettingsRow,
	requireSettingsPage,
	requireSettingsCustomRow,
	requireSettingsSelectRow
} from './settings-definition-resolver';

///////////////////////////////////////////////////////////////////////////////

describe(
	'settings definition resolver',
	() => {
		it(
			'finds pages by id',
			() => {
				expect(findSettingsPage('appearance')?.title).toBe('Appearance');
				expect(findSettingsPage('missing')).toBeUndefined();
			}
		);

		it(
			'requires pages by id',
			() => {
				expect(requireSettingsPage('bible')).toMatchObject({
					id: 'bible',
					title: 'Bible'
				});
				expect(
					() => requireSettingsPage('missing')
				).toThrow('Settings page not found: missing');
			}
		);

		it(
			'finds rows across settings pages',
			() => {
				expect(findSettingsRow('font-family')).toMatchObject({
					type: 'select',
					setting: 'fontFamily'
				});
				expect(findSettingsRow('show-pericopes')).toMatchObject({
					type: 'toggle',
					setting: 'showPericopes'
				});
				expect(findSettingsRow('missing')).toBeUndefined();
			}
		);

		it(
			'requires select rows',
			() => {
				expect(requireSettingsSelectRow('font-weight')).toMatchObject({
					type: 'select',
					setting: 'fontWeight'
				});
				expect(
					() => requireSettingsSelectRow('font-size')
				).toThrow('Settings select row not found: font-size');
				expect(
					() => requireSettingsSelectRow('missing')
				).toThrow('Settings select row not found: missing');
			}
		);

		it(
			'requires custom rows',
			() => {
				expect(requireSettingsCustomRow('font-size')).toMatchObject({
					type: 'custom',
					view: 'font-size'
				});
				expect(
					() => requireSettingsCustomRow('font-family')
				).toThrow('Settings custom row not found: font-family');
				expect(
					() => requireSettingsCustomRow('missing')
				).toThrow('Settings custom row not found: missing');
			}
		);
	}
);
