import {
	describe,
	expect,
	it
} from 'vitest';

import {
	settingsDefinition
} from '../definitions/settings.definition';
import type {
	SettingsDefinition
} from '../models/settings-definition.model';
import {
	createSettingsSearchEntries,
	searchSettings
} from './settings-search';

///////////////////////////////////////////////////////////////////////////////

const entries = createSettingsSearchEntries(
	settingsDefinition
);

describe(
	'settings search',
	() => {
		it(
			'creates stable page and row destinations',
			() => {
				const result = searchSettings(
					entries,
					'pericope'
				);

				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({
					pageID: 'bible',
					rowID: 'show-pericopes',
					title: 'Pericopes',
					pageTitle: 'Bible',
					sectionLabel: 'Display'
				});
			}
		);

		it(
			'searches row keywords and category metadata',
			() => {
				expect(
					searchSettings(entries, 'typeface').map(
						(entry) => entry.rowID
					)
				).toContain('font-family');

				expect(
					searchSettings(entries, 'appearance text').map(
						(entry) => entry.rowID
					)
				).toContain('font-weight');
			}
		);

		it(
			'searches select option labels',
			() => {
				expect(
					searchSettings(entries, 'night colorblind').map(
						(entry) => entry.rowID
					)
				).toContain('color-theme');
			}
		);

		it(
			'normalizes case and whitespace',
			() => {
				expect(
					searchSettings(entries, '  BIBLE   VERSION  ').map(
						(entry) => entry.rowID
					)
				).toContain('show-bible-version');
			}
		);

		it(
			'excludes rows hidden from search',
			() => {
				const definition: SettingsDefinition = {
					rootPageID: 'settings',
					pages: [
						{
							id: 'settings',
							title: 'Settings',
							sections: [
								{
									id: 'hidden',
									rows: [
										{
											type: 'custom',
											id: 'hidden-row',
											title: 'Hidden setting',
											view: 'font-size',
											search: {
												hidden: true
											}
										}
									]
								}
							]
						}
					]
				};

				expect(
					createSettingsSearchEntries(definition)
				).toEqual([]);
			}
		);
	}
);
