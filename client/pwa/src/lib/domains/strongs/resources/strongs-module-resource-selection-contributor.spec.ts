import { describe, expect, it } from 'vitest';
import { DICTIONARY_RESOURCE_TYPE } from '$lib/domains/dictionary';
import { BIBLE_CHAPTER_RESOURCE_TYPE, BIBLE_BOOKNAMES_RESOURCE_TYPE, BIBLE_SEARCH_RESOURCE_TYPE } from '$lib/domains/bible';
import { StrongsModuleResourceSelectionContributor } from './strongs-module-resource-selection-contributor';

const standard = { publisher: 'default', resourceId: 'kjvonly/dictionary/entries/strongs-kjvs' };
const chapters = { publisher: 'bible', resourceId: 'kjvonly/bible/chapter/kjvs' };
const webster = { publisher: 'default', resourceId: 'kjvonly/dictionary/entries/webster-1828' };

describe("Strong's Resource selection", () => {
    const contributor = new StrongsModuleResourceSelectionContributor(standard);

    it("uses the Strong's Dictionary source for Bible references instead of the selected Webster edition", () => {
        const result = contributor.build({
            originatingSelections: {},
            currentSelections: {
                [DICTIONARY_RESOURCE_TYPE]: webster,
                [BIBLE_CHAPTER_RESOURCE_TYPE]: chapters,
                [BIBLE_SEARCH_RESOURCE_TYPE]: { publisher: 'search', resourceId: 'kjvonly/bible/search-index/kjvs' },
                [BIBLE_BOOKNAMES_RESOURCE_TYPE]: { publisher: 'names', resourceId: 'kjvonly/bible/booknames/default' }
            }
        });
        expect(result[DICTIONARY_RESOURCE_TYPE]).toEqual(standard);
        expect(result[BIBLE_CHAPTER_RESOURCE_TYPE]).toEqual(chapters);
    });

    it("preserves the selected publisher when launched from a Strong's Dictionary result", () => {
        const chosen = { publisher: 'another-publisher', resourceId: standard.resourceId };
        const result = contributor.build({
            originatingSelections: { [DICTIONARY_RESOURCE_TYPE]: chosen },
            currentSelections: { [DICTIONARY_RESOURCE_TYPE]: webster }
        });
        expect(result[DICTIONARY_RESOURCE_TYPE]).toEqual(chosen);
    });

    it("does not accidentally open a Webster edition from a Bible reference", () => {
        const result = contributor.build({ originatingSelections: { [DICTIONARY_RESOURCE_TYPE]: webster }, currentSelections: {} });
        expect(result[DICTIONARY_RESOURCE_TYPE]).toEqual(standard);
    });
});
