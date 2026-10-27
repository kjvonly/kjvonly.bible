import { describe, expect, it } from 'vitest';
import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';
import { BookmarksModuleResourceSelectionContributor } from './bookmarks-module-resource-selection-contributor';

describe('BookmarksModuleResourceSelectionContributor', () => {
	it('captures the configured Bible Booknames Resource', () => {
		const originating = {
			publisher: 'origin',
			resourceId: 'kjvonly/bible/booknames/default'
		};
		const selections = new BookmarksModuleResourceSelectionContributor().build({
			originatingSelections: { [BIBLE_BOOKNAMES_RESOURCE_TYPE]: originating },
			currentSelections: {
				[BIBLE_BOOKNAMES_RESOURCE_TYPE]: {
					publisher: 'current',
					resourceId: 'kjvonly/bible/booknames/default'
				}
			}
		});
		expect(selections).toEqual({ [BIBLE_BOOKNAMES_RESOURCE_TYPE]: originating });
	});

	it('retains no unrelated Resources', () => {
		const selections = new BookmarksModuleResourceSelectionContributor().build({
			originatingSelections: {},
			currentSelections: { unrelated: { publisher: 'x', resourceId: 'y' } }
		});
		expect(selections).toEqual({});
	});
});
