import type { DictionaryEditionSource } from './dictionary.model';
import { assertDictionaryEditionSource, normalizeDictionaryHeadword } from './dictionary-identity';

/** Dictionary-owned, persisted navigation view identifiers. */
export const DICTIONARY_VIEWS = {
	ROOT: 'dictionary.root',
	EDITION: 'dictionary.edition',
	OVERFLOW_ACTIONS: 'dictionary.overflow-actions',
	ENTRY: 'dictionary.entry'
} as const;

export type DictionaryView = typeof DICTIONARY_VIEWS[keyof typeof DICTIONARY_VIEWS];

/** More Actions returns intent to its owning Dictionary root before navigating. */
export const DICTIONARY_NAVIGATION_RESULTS = {
	OVERFLOW_ACTION: 'dictionary.overflow-action'
} as const;

export const DICTIONARY_OVERFLOW_ACTIONS = {
	VERSIONS: 'dictionary-versions',
	SPLIT_HORIZONTAL: 'split-horizontal',
	SPLIT_VERTICAL: 'split-vertical'
} as const;

export type DictionaryOverflowAction = typeof DICTIONARY_OVERFLOW_ACTIONS[keyof typeof DICTIONARY_OVERFLOW_ACTIONS];

export function createDictionaryOverflowActionResult(action: DictionaryOverflowAction) {
	return { type: DICTIONARY_NAVIGATION_RESULTS.OVERFLOW_ACTION, action };
}

/** Ignore malformed or unrelated navigation results. */
export function parseDictionaryOverflowActionResult(value: unknown): DictionaryOverflowAction | undefined {
	if (!isRecord(value) || value.type !== DICTIONARY_NAVIGATION_RESULTS.OVERFLOW_ACTION ||
		(value.action !== DICTIONARY_OVERFLOW_ACTIONS.VERSIONS &&
		value.action !== DICTIONARY_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL &&
		value.action !== DICTIONARY_OVERFLOW_ACTIONS.SPLIT_VERTICAL)) return undefined;
	return value.action;
}

/** A selected definition is identified by its publisher, Resource, and canonical word. */
export interface DictionaryEntryNavigationState extends DictionaryEditionSource {
	readonly headwordKey: string;
}

/** Capture the selected word without persisting HTML, chunk bytes or worker state. */
export function createDictionaryEntryNavigationState(
	source: DictionaryEditionSource,
	headwordKey: string
): DictionaryEntryNavigationState {
	return parseDictionaryEntryNavigationState({ ...source, headwordKey });
}

/** Validate persisted entry navigation state before opening a Dictionary worker. */
export function parseDictionaryEntryNavigationState(value: unknown): DictionaryEntryNavigationState {
	if (!isRecord(value)) throw new Error('Invalid Dictionary entry navigation state.');
	const { publisher, resourceId, headwordKey } = value;
	if (typeof publisher !== 'string' || typeof resourceId !== 'string' ||
		typeof headwordKey !== 'string' || !headwordKey ||
		normalizeDictionaryHeadword(headwordKey) !== headwordKey) {
		throw new Error('Invalid Dictionary entry navigation identity.');
	}
	// Validate the selected Dictionary Resource without assuming an index exists.
	assertDictionaryEditionSource({ publisher, resourceId });
	return { publisher, resourceId, headwordKey };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Dictionary search preferences belong to the navigation entry, not to the edition. */
export interface DictionaryRootNavigationState {
	readonly query: string;
	readonly browseLetter: string;
	readonly showAlphabet: boolean;
}

/** Restore only search preferences; Resource selections live on NavigationState. */
export function parseDictionaryRootNavigationState(value: unknown): DictionaryRootNavigationState {
	if (!isRecord(value)) throw new Error('Invalid Dictionary root navigation state.');
	const query = value.query ?? '';
	if (typeof query !== 'string' || query.length > 256) {
		throw new Error('Invalid Dictionary root search preferences.');
	}
	const browseLetter = value.browseLetter ?? 'a';
	const showAlphabet = value.showAlphabet ?? !query.trim();
	if (typeof browseLetter !== 'string' || !/^[a-z]$/.test(browseLetter) ||
		typeof showAlphabet !== 'boolean') {
		throw new Error('Invalid Dictionary root search preferences.');
	}
	return { query, browseLetter, showAlphabet };
}

/** The picker returns a Resource reference, never a Domain manifest or worker object. */
export const DICTIONARY_EDITION_RESULT = 'dictionary.edition-selected';

export function createDictionaryEditionNavigationResult(source: DictionaryEditionSource) {
	assertDictionaryEditionSource(source);
	return { type: DICTIONARY_EDITION_RESULT, publisher: source.publisher, resourceId: source.resourceId };
}

export function parseDictionaryEditionNavigationResult(value: unknown): DictionaryEditionSource | undefined {
	if (!isRecord(value) || value.type !== DICTIONARY_EDITION_RESULT ||
		typeof value.publisher !== 'string' || typeof value.resourceId !== 'string') return undefined;
	const source = { publisher: value.publisher, resourceId: value.resourceId };
	try { assertDictionaryEditionSource(source); } catch { return undefined; }
	return source;
}
