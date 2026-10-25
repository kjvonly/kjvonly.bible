import type { DictionaryEditionSource } from './dictionary.model';

/**
 * Dictionary V1 key policy: NFKC, locale-independent JavaScript lowercase,
 * trim, and collapse whitespace. This is not full Unicode case folding.
 * Punctuation/diacritics are preserved; source `word` is never rewritten.
 * Changes to this policy require rebuilding the published search indexes.
 */
export function normalizeDictionaryHeadword(word: string): string {
	return word.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, ' ');
}

/**
 * Stable JavaScript code-unit ordering for persisted Dictionary definition keys.
 * Chunk partitioning and worker-side range lookups must use the same order.
 */
export function compareDictionaryDefinitionKeys(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/** Stable, publisher-scoped identity independent of the publication Resource ID. */
export function createDictionaryEditionId(publisher: string, edition: string): string {
	assertIdentityPart(publisher, 'publisher');
	assertEdition(edition);
	return `${encodeURIComponent(publisher)}/${encodeURIComponent(edition)}`;
}

/** Validate a selected Dictionary Resource without depending on an index or storage ID. */
export function assertDictionaryEditionSource(source: DictionaryEditionSource): void {
	const { edition } = parseDictionaryResourceId(source.resourceId);
	createDictionaryEditionId(source.publisher, edition);
}

/** Segment encoding prevents word separators, `%`, and Unicode from colliding. */
export function createDictionaryEntryId(
	publisher: string,
	edition: string,
	headwordKey: string
): string {
	if (!headwordKey || normalizeDictionaryHeadword(headwordKey) !== headwordKey) {
		throw new Error(`Invalid canonical Dictionary headword key: ${headwordKey}`);
	}
	return `${createDictionaryEditionId(publisher, edition)}/${encodeURIComponent(headwordKey)}`;
}

/** Domain-owned grammar; generic Resource infrastructure treats IDs as opaque. */
export function createDictionaryResourceId(edition: string): string {
	assertEdition(edition);
	return `kjvonly/dictionary/entries/${edition}`;
}

export function parseDictionaryResourceId(resourceId: string): { readonly edition: string } {
	const parts = resourceId.split('/');
	if (
		parts.length !== 4 ||
		parts[0] !== 'kjvonly' ||
		parts[1] !== 'dictionary' ||
		parts[2] !== 'entries'
	) {
		throw new Error(`Invalid Dictionary Resource ID: ${resourceId}`);
	}
	const edition = parts[3];
	if (edition === undefined) {
		throw new Error(`Invalid Dictionary Resource ID: ${resourceId}`);
	}
	assertEdition(edition);
	return { edition };
}

function assertIdentityPart(value: string, name: string): void {
	if (!value || value.trim() !== value || value.includes('/')) {
		throw new Error(`Invalid Dictionary ${name}: ${value}`);
	}
}

function assertEdition(edition: string): void {
	// Keep edition labels safe as one Resource ID path segment.
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(edition)) {
		throw new Error(`Invalid Dictionary edition: ${edition}`);
	}
}
