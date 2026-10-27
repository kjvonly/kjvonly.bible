import { describe, expect, it } from 'vitest';
import {
	assertDictionaryEditionSource,
	compareDictionaryDefinitionKeys,
	createDictionaryEditionId,
	createDictionaryEntryId,
	createDictionaryResourceId,
	normalizeDictionaryHeadword,
	parseDictionaryResourceId
} from './dictionary-identity';

describe('Dictionary identity', () => {
	it('orders definition keys by code units, not locale collation', () => {
		expect(['é', '2', 'z', '10', 'a'].sort(compareDictionaryDefinitionKeys))
			.toEqual(['10', '2', 'a', 'z', 'é']);
		expect(compareDictionaryDefinitionKeys('a', 'a')).toBe(0);
	});

	it('canonicalizes case, compatibility forms and whitespace without stripping punctuation', () => {
		expect(normalizeDictionaryHeadword('  ＡＡＭ  ')).toBe('aam');
		expect(normalizeDictionaryHeadword('A  B')).toBe('a b');
		expect(normalizeDictionaryHeadword('A-B')).toBe('a-b');
		expect(normalizeDictionaryHeadword('É')).toBe('é');
	});

	it('distinguishes publishers, editions and path-shaped headwords', () => {
		expect(createDictionaryEditionId('owner', 'webster-1828')).toBe('owner/webster-1828');
		expect(createDictionaryEntryId('owner', 'webster-1828', 'a/b'))
			.toBe('owner/webster-1828/a%2Fb');
		expect(createDictionaryEntryId('owner', 'webster-1828', 'a%2fb'))
			.not.toBe(createDictionaryEntryId('owner', 'webster-1828', 'a/b'));
		expect(createDictionaryEntryId('another', 'webster-1828', 'a'))
			.not.toBe(createDictionaryEntryId('owner', 'webster-1828', 'a'));
		expect(createDictionaryEntryId('owner', 'another-edition', 'a'))
			.not.toBe(createDictionaryEntryId('owner', 'webster-1828', 'a'));
	});

	it('validates a selected publisher and Resource independently of index identity', () => {
		const source = { publisher: 'owner', resourceId: createDictionaryResourceId('webster-1828') };
		expect(() => assertDictionaryEditionSource(source)).not.toThrow();
		for (const invalid of [
			{ ...source, publisher: '' },
			{ ...source, publisher: 'owner/path' },
			{ ...source, resourceId: 'kjvonly/dictionary/indexes/webster-1828' },
			{ ...source, resourceId: source.resourceId + '/extra' }
		]) {
			expect(() => assertDictionaryEditionSource(invalid)).toThrow();
		}
	});

	it('owns strict Resource grammar and rejects malformed identity', () => {
		const resourceId = createDictionaryResourceId('webster-1828');
		expect(parseDictionaryResourceId(resourceId)).toEqual({ edition: 'webster-1828' });
		expect(() => parseDictionaryResourceId(resourceId + '/a')).toThrow();
		expect(() => createDictionaryResourceId('bad/edition')).toThrow();
		expect(() => createDictionaryEntryId('owner', 'webster-1828', 'A')).toThrow();
		expect(() => createDictionaryEditionId('owner/sub', 'webster-1828')).toThrow();
	});
});
