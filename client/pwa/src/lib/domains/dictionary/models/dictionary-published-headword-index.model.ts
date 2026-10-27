import { createDictionaryHeadwordIndexId } from './dictionary-headword-index.model';
import { parseDictionaryResourceId } from './dictionary-identity';

/** Published Resource for a portable headword index, independent of its storage provider. */
export const DICTIONARY_PUBLISHED_INDEX_RESOURCE_TYPE = 'dictionary/search-index';
export const DICTIONARY_PUBLISHED_INDEX_DATA_TYPE = 'kjvonly.dictionary.headword-index';
export const DICTIONARY_PUBLISHED_INDEX_DATA_VERSION = 1;
export const DICTIONARY_PUBLISHED_INDEX_OBJECT_TYPE = 'dictionary/published-headword-index';
export const DICTIONARY_PUBLISHED_INDEX_ENCODING = 'codepoint-base36-padded4';

/** Portable CLI export; publisher and edition revision are deliberately absent. */
export interface DictionaryPublishedHeadwordIndex {
	readonly resourceId: string;
	readonly sourceSha256: string;
	readonly formatVersion: number;
	readonly tokenizer: 'forward';
	readonly encoding: string;
	/** Number of indexed (headword, key) associations. */
	readonly headwordCount: number;
	readonly chunks: Readonly<Record<string, string>>;
}

/** Map the published index Resource ID to the corresponding entries Resource ID. */
export function createDictionaryPublishedIndexResourceId(entriesResourceId: string): string {
	const { edition } = parseDictionaryResourceId(entriesResourceId);
	return `kjvonly/dictionary/search-index/${edition}`;
}

/** Ensure the index Resource represents the edition identified by its Resource envelope. */
export function entriesResourceIdForPublishedIndex(indexResourceId: string): string {
	const parts = indexResourceId.split('/');
	if (parts.length !== 4 || parts[0] !== 'kjvonly' || parts[1] !== 'dictionary' ||
		parts[2] !== 'search-index' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(parts[3] ?? '')) {
		throw new Error(`Invalid Dictionary published index Resource ID: ${indexResourceId}`);
	}
	return `kjvonly/dictionary/entries/${parts[3]}`;
}

/** Scope the installed published-index object by publisher and entries Resource ID. */
export function createDictionaryPublishedIndexObjectId(publisher: string, entriesResourceId: string): string {
	return createDictionaryHeadwordIndexId({ publisher, resourceId: entriesResourceId });
}

/** Validate a published index without evaluating its FlexSearch export contents. */
export function validateDictionaryPublishedHeadwordIndex(value: unknown): DictionaryPublishedHeadwordIndex {
	if (!isRecord(value) || typeof value.resourceId !== 'string' || typeof value.sourceSha256 !== 'string' ||
		!/^[0-9a-f]{64}$/.test(value.sourceSha256) || value.formatVersion !== 1 ||
		value.tokenizer !== 'forward' || value.encoding !== DICTIONARY_PUBLISHED_INDEX_ENCODING ||
		!Number.isSafeInteger(value.headwordCount) || (value.headwordCount as number) < 1 ||
		!isRecord(value.chunks) || !Object.keys(value.chunks).length ||
		!Object.values(value.chunks).every(chunk => typeof chunk === 'string')) {
		throw new Error('Invalid published Dictionary headword index.');
	}
	parseDictionaryResourceId(value.resourceId);
	return value as unknown as DictionaryPublishedHeadwordIndex;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
