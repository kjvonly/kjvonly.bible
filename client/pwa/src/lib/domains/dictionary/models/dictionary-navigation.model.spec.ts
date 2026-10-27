import { describe, expect, it } from 'vitest';
import {
	DICTIONARY_VIEWS,
	createDictionaryEntryNavigationState,
	parseDictionaryEntryNavigationState,
	parseDictionaryRootNavigationState,
	createDictionaryEditionNavigationResult,
	parseDictionaryEditionNavigationResult,
	DICTIONARY_OVERFLOW_ACTIONS,
	createDictionaryOverflowActionResult,
	parseDictionaryOverflowActionResult
} from './dictionary-navigation.model';

const source = { publisher: 'pubkey', resourceId: 'kjvonly/dictionary/entries/webster-1844' };

describe('Dictionary entry navigation', () => {
	it('uses a distinct entry view and persists only Resource identity and headword', () => {
		expect(DICTIONARY_VIEWS.ENTRY).toBe('dictionary.entry');
		const state = createDictionaryEntryNavigationState(source, 'abandon');
		expect(state).toEqual({ ...source, headwordKey: 'abandon' });
		expect(parseDictionaryEntryNavigationState(JSON.parse(JSON.stringify(state)))).toEqual(state);
	});

	it('keeps identical headwords in different editions distinct', () => {
		const earlier = createDictionaryEntryNavigationState(
			{ ...source, resourceId: 'kjvonly/dictionary/entries/webster-1828' }, 'abandon');
		const later = createDictionaryEntryNavigationState(source, 'abandon');
		expect(earlier.resourceId).not.toBe(later.resourceId);
	});

	it('rejects malformed and noncanonical navigation state', () => {
		for (const state of [null, [], {}, { ...source },
			{ ...source, headwordKey: 'Abandon' },
			{ ...source, headwordKey: ' ' },
			{ ...source, headwordKey: 5 },
			{ publisher: '', resourceId: source.resourceId, headwordKey: 'abandon' },
			{ publisher: source.publisher, resourceId: 'invalid', headwordKey: 'abandon' }]) {
			expect(() => parseDictionaryEntryNavigationState(state)).toThrow();
		}
	});
});


describe('Dictionary root navigation', () => {
	it('defaults new entries to A browsing without embedding Resource choices', () => {
		expect(parseDictionaryRootNavigationState({})).toEqual({ query: '', browseLetter: 'a', showAlphabet: true });
	});

	it('restores the query and browse letter independently of Resource selection', () => {
		expect(parseDictionaryRootNavigationState({ query: 'aban', browseLetter: 'z' }))
			.toEqual({ query: 'aban', browseLetter: 'z', showAlphabet: false });
	});

	it('restores the alphabetical browsing toggle with the selected letter', () => {
		expect(parseDictionaryRootNavigationState({ query: '', browseLetter: 'q', showAlphabet: false }))
			.toEqual({ query: '', browseLetter: 'q', showAlphabet: false });
	});

	it('rejects malformed root query and browse state', () => {
		for (const state of [null, [], { query: 8 }, { query: 'a'.repeat(257) },
			{ browseLetter: 'AB' }, { browseLetter: '1' }, { showAlphabet: 'yes' }]) {
			expect(() => parseDictionaryRootNavigationState(state)).toThrow();
		}
	});

	it('validates the query type before deriving its default browsing state', () => {
		for (const query of [8, true, [], {}]) {
			expect(() => parseDictionaryRootNavigationState({ query }))
				.toThrow('Invalid Dictionary root search preferences.');
		}
		expect(parseDictionaryRootNavigationState({ query: '  ' }))
			.toEqual({ query: '  ', browseLetter: 'a', showAlphabet: true });
	});
});

describe('Dictionary edition picker result', () => {
	it('carries only the selected publisher and Resource identity', () => {
		const result = createDictionaryEditionNavigationResult(source);
		expect(parseDictionaryEditionNavigationResult(JSON.parse(JSON.stringify(result)))).toEqual(source);
	});

	it('rejects malformed and unrelated results', () => {
		for (const result of [null, {}, { ...source, type: 'other' },
			{ ...source, resourceId: 'invalid', type: 'dictionary.edition-selected' },
			{ ...source, publisher: 'owner/path', type: 'dictionary.edition-selected' }]) {
			expect(parseDictionaryEditionNavigationResult(result)).toBeUndefined();
		}
	});
});


describe('Dictionary More actions navigation', () => {
	it('returns Dictionary versions without confusing the result with an edition selection', () => {
		const result = createDictionaryOverflowActionResult(DICTIONARY_OVERFLOW_ACTIONS.VERSIONS);
		expect(parseDictionaryOverflowActionResult(structuredClone(result)))
			.toBe(DICTIONARY_OVERFLOW_ACTIONS.VERSIONS);
		expect(parseDictionaryEditionNavigationResult(result)).toBeUndefined();
	});

	it('accepts split actions returned by the overflow header', () => {
		for (const action of [DICTIONARY_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL, DICTIONARY_OVERFLOW_ACTIONS.SPLIT_VERTICAL]) {
			const result = createDictionaryOverflowActionResult(action);
			expect(parseDictionaryOverflowActionResult(structuredClone(result))).toBe(action);
		}
	});

	it('ignores unrelated or malformed results', () => {
		for (const result of [null, {}, { type: 'other', action: 'dictionary-versions' },
			{ type: 'dictionary.overflow-action', action: 'unknown' },
			createDictionaryEditionNavigationResult(source)]) {
			expect(parseDictionaryOverflowActionResult(result)).toBeUndefined();
		}
	});
});
