import {
	BibleLocationReferenceService
} from '$lib/domains/bible';

import {
	createNormalizedDocumentId,
	resolveNormalizedContentAtAddress,
	type NormalizedDocument
} from '$lib/domains/normalized-content';

import type {
	BookmarkTarget,
	NormalizedBookmarkWordAddress
} from '../models/bookmark.model';

const bibleRefs = new BibleLocationReferenceService();

/**
 * Parse a single canonical Bookmark target. Serialized Resources must not
 * contain unrecognized properties, publisher-bound Bible versions, ambiguous
 * variants, or unvalidated addresses.
 *
 * A normalized-document address must additionally resolve to a word against
 * the loaded document before local creation; see assertNormalizedBookmarkWordAddress.
 */
export function parseBookmarkTarget(value: unknown): BookmarkTarget {
	const target = record(value, 'Bookmark target');

	if (target.kind === 'bible') {
		keys(target, ['kind', 'bibleLocationRef'], 'Bible Bookmark target');
		const bibleLocationRef = nonEmpty(target.bibleLocationRef, 'Bible Bookmark reference');
		if (bibleRefs.extractVersion(bibleLocationRef) !== undefined) {
			throw new Error('Bible Bookmark reference must not contain a version');
		}
		const parts = bibleLocationRef.split('_');
		if (parts.length !== 4 || !parts.every((part, index) =>
			canonicalNumber(part, index === 3))) {
			throw new Error('Invalid Bible Bookmark reference');
		}
		return { kind: 'bible', bibleLocationRef };
	}

	if (target.kind === 'normalized-document') {
		keys(target, ['kind', 'document', 'address'], 'Normalized Bookmark target');
		const document = record(target.document, 'Normalized Bookmark document');
		keys(document, ['publisher', 'resourceId'], 'Normalized Bookmark document');
		const publisher = nonEmpty(document.publisher, 'Normalized Bookmark document publisher');
		const resourceId = nonEmpty(document.resourceId, 'Normalized Bookmark document Resource ID');
		// Use the normalized-content owner's Resource-derived identity grammar.
		createNormalizedDocumentId(publisher, resourceId);

		const address = record(target.address, 'Normalized Bookmark address');
		keys(address, ['kind', 'blockId', 'contentIndex'], 'Normalized Bookmark address');
		if (
			address.kind !== 'word' ||
			typeof address.blockId !== 'string' ||
			address.blockId.length === 0 ||
			!Number.isSafeInteger(address.contentIndex) ||
			(address.contentIndex as number) < 0
		) {
			throw new Error('Invalid normalized Bookmark word address');
		}

		return {
			kind: 'normalized-document',
			document: { publisher, resourceId },
			address: { kind: 'word', blockId: address.blockId, contentIndex: address.contentIndex as number }
		};
	}

	throw new Error('Invalid Bookmark target kind');
}

/** Compare semantic locations; normalized targets are Resource-specific. */
export function bookmarkTargetsEqual(a: BookmarkTarget, b: BookmarkTarget): boolean {
	if (a.kind !== b.kind) {
		return false;
	}
	if (a.kind === 'bible' && b.kind === 'bible') {
		return a.bibleLocationRef === b.bibleLocationRef;
	}
	if (a.kind === 'normalized-document' && b.kind === 'normalized-document') {
		return a.document.publisher === b.document.publisher &&
			a.document.resourceId === b.document.resourceId &&
			a.address.kind === b.address.kind &&
			a.address.blockId === b.address.blockId &&
			a.address.contentIndex === b.address.contentIndex;
	}
	return false;
}

/**
 * Resolve a candidate against the *loaded* validated snapshot. Structurally
 * correct indices may refer to anchors/line breaks or non-existent content.
 */
export function assertNormalizedBookmarkWordAddress(
	document: NormalizedDocument,
	address: NormalizedBookmarkWordAddress
): void {
	const content = resolveNormalizedContentAtAddress(document, address);
	if (address.kind !== 'word' || content?.type !== 'word') {
		throw new Error('Normalized Bookmark must reference a canonical word');
	}
}

function record(value: unknown, label: string): Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`Invalid ${label}`);
	}
	return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
	const actual = Object.keys(value);
	if (actual.length !== expected.length || actual.some((key) => !expected.includes(key))) {
		throw new Error(`Invalid ${label} fields`);
	}
}

function nonEmpty(value: unknown, label: string): string {
	if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
		throw new Error(`Invalid ${label}`);
	}
	return value;
}

/** Mirrors the Bible Domain's canonical numeric reference parts. */
function canonicalNumber(value: string, allowZero: boolean): boolean {
	const number = Number(value);
	return Number.isSafeInteger(number) &&
		(allowZero ? number >= 0 : number > 0) &&
		String(number) === value;
}
