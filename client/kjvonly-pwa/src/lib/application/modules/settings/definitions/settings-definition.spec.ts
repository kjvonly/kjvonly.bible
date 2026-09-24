import {
	describe,
	expect,
	it
} from 'vitest';

import {
	resolveSettingsCustomViewComponent
} from '../resolvers/settings-custom-view-component-resolver';
import {
	resolveSettingsIconComponent
} from '../resolvers/settings-icon-component-resolver';
import {
	settingsDefinition
} from './settings.definition';

///////////////////////////////////////////////////////////////////////////////

describe(
	'settings definition',
	() => {
		it(
			'contains the configured root page',
			() => {
				expect(
					settingsDefinition.pages.some(
						(page) => page.id === settingsDefinition.rootPageID
					)
				).toBe(true);
			}
		);

		it(
			'uses unique page ids',
			() => {
				const pageIDs = settingsDefinition.pages.map(
					(page) => page.id
				);

				expect(new Set(pageIDs).size).toBe(pageIDs.length);
			}
		);

		it(
			'uses unique section ids within each page',
			() => {
				for (const page of settingsDefinition.pages) {
					const sectionIDs = page.sections.map(
						(section) => section.id
					);

					expect(new Set(sectionIDs).size).toBe(sectionIDs.length);
				}
			}
		);

		it(
			'uses globally unique row ids',
			() => {
				const rowIDs = settingsDefinition.pages.flatMap(
					(page) => page.sections.flatMap(
						(section) => section.rows.map(
							(row) => row.id
						)
					)
				);

				expect(new Set(rowIDs).size).toBe(rowIDs.length);
			}
		);

		it(
			'points group rows at existing pages',
			() => {
				const pageIDs = new Set(
					settingsDefinition.pages.map(
						(page) => page.id
					)
				);

				for (const page of settingsDefinition.pages) {
					for (const section of page.sections) {
						for (const row of section.rows) {
							if (row.type === 'group') {
								expect(pageIDs.has(row.pageID)).toBe(true);
							}
						}
					}
				}
			}
		);

		it(
			'resolves every configured icon',
			() => {
				for (const page of settingsDefinition.pages) {
					for (const section of page.sections) {
						for (const row of section.rows) {
							if (row.icon) {
								expect(
								resolveSettingsIconComponent(row.icon.name)
							).toBeTruthy();
							}
						}
					}
				}
			}
		);

		it(
			'resolves every configured custom view',
			() => {
				for (const page of settingsDefinition.pages) {
					for (const section of page.sections) {
						for (const row of section.rows) {
							if (row.type === 'custom') {
								expect(
								resolveSettingsCustomViewComponent(row.view)
							).toBeTruthy();
							}
						}
					}
				}
			}
		);
	}
);
