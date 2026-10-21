import type { DictionaryEditionSource } from './dictionary.model';
import { assertDictionaryEditionSource } from './dictionary-identity';

/** V1 matches prefixes of headwords, not arbitrary interior substrings. */
export const DICTIONARY_HEADWORD_INDEX_TOKENIZER = 'forward' as const;

/** Increment when changing FlexSearch settings, headword normalization or export format. */
export const DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION = 1;

/**
 * Encode an entire canonical headword as one ASCII token for the v1 index.
 * Preserve leading prefixes across spaces and punctuation; index installation
 * and search must use the identical encoding.
 */
export function encodeHeadwordForSearch(headword: string): string {
	return Array.from(headword, char => char.codePointAt(0)!.toString(36).padStart(4, '0')).join('');
}

/** Locally generated cache; the HTML definitions never appear in its chunks. */
export interface DictionaryHeadwordIndex extends DictionaryEditionSource {
	readonly id: string;
	/** Accepted Dictionary edition Resource revision (`modifiedAt`). */
	readonly sourceRevision: number;
	readonly formatVersion: number;
	readonly headwordCount: number;
	/** FlexSearch export entries (not definition text). */
	readonly chunks: Readonly<Record<string, string>>;
}

/** The Resource reference, not the edition display label, is the cache key. */
export function createDictionaryHeadwordIndexId(source: DictionaryEditionSource): string {
	assertDictionaryEditionSource(source);
	return `${encodeURIComponent(source.publisher)}/${encodeURIComponent(source.resourceId)}`;
}

/** Treat stale, incompatible and malformed cache records as rebuildable misses. */
export function isCurrentDictionaryHeadwordIndex(
	value: unknown,
	source: DictionaryEditionSource,
	sourceRevision: number
): value is DictionaryHeadwordIndex {
	if (!isRecord(value) || !Number.isFinite(sourceRevision)) return false;
	if (
		value.publisher !== source.publisher ||
		value.resourceId !== source.resourceId ||
		value.sourceRevision !== sourceRevision ||
		value.formatVersion !== DICTIONARY_HEADWORD_INDEX_FORMAT_VERSION ||
		!Number.isSafeInteger(value.headwordCount) ||
		(value.headwordCount as number) < 1 ||
		!isRecord(value.chunks) ||
		Object.keys(value.chunks).length === 0 ||
		!Object.values(value.chunks).every(chunk => typeof chunk === 'string')
	) return false;

	try {
		return value.id === createDictionaryHeadwordIndexId(source);
	} catch {
		return false;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
