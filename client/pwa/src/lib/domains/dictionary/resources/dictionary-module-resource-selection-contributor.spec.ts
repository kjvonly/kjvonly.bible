import { describe, expect, it } from 'vitest';

import { Modules } from '$lib/application';
import type { PublishedResourceReference } from '$lib/resource';

import { createDictionaryResourceId } from '../models/dictionary-identity';
import { DICTIONARY_RESOURCE_TYPE } from './entries/dictionary-resource-contract';
import { DictionaryModuleResourceSelectionContributor } from './dictionary-module-resource-selection-contributor';

const edition1828: PublishedResourceReference = {
	publisher: 'publisher-one',
	resourceId: createDictionaryResourceId('webster-1828')
};
const edition1844: PublishedResourceReference = {
	publisher: 'publisher-two',
	resourceId: createDictionaryResourceId('webster-1844')
};

describe('DictionaryModuleResourceSelectionContributor', () => {
	const contributor = new DictionaryModuleResourceSelectionContributor();

	it('owns the Dictionary module identity and retains its configured primary edition', () => {
		expect(contributor.module).toBe(Modules.DICTIONARY);
		expect(contributor.build({
			originatingSelections: {},
			currentSelections: { [DICTIONARY_RESOURCE_TYPE]: edition1828 }
		})).toEqual({ [DICTIONARY_RESOURCE_TYPE]: edition1828 });
	});

	it('prefers a related pane selection without mutating the original', () => {
		const selections = contributor.build({
			originatingSelections: { [DICTIONARY_RESOURCE_TYPE]: edition1844 },
			currentSelections: { [DICTIONARY_RESOURCE_TYPE]: edition1828 }
		});
		expect(selections[DICTIONARY_RESOURCE_TYPE]).toEqual(edition1844);
		expect(selections[DICTIONARY_RESOURCE_TYPE]).not.toBe(edition1844);
	});

	it('does not invent a default or inherit another module’s Resource types', () => {
		expect(contributor.build({
			originatingSelections: { 'bible/chapter': edition1828 },
			currentSelections: {}
		})).toEqual({});
	});
});
