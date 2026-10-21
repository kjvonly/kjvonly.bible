import { describe, expect, it } from 'vitest';

import type { Bookmark, BookmarkTarget } from '../models/bookmark.model';

import {
	bookmarkTargetsEqual,
	parseBookmarkTarget
} from './bookmark-target-validation';

const normalizedTarget = {
	kind: 'normalized-document',
	document: { publisher: 'a'.repeat(64), resourceId: 'library/doc/one' },
	address: { kind: 'word', blockId: 'p1', contentIndex: 0 }
} as const;


describe('Bookmark targets', () => {
	it('accepts version-independent Bible verse and word references', () => {
		for (const ref of ['43_3_16_0', '43_3_16_7']) {
			expect(parseBookmarkTarget({ kind: 'bible', bibleLocationRef: ref }))
				.toEqual({ kind: 'bible', bibleLocationRef: ref });
		}
	});

	it.each([
		'kjv/43_3_16_0', '43_3_16', '43_3_16_-1',
		'043_3_16_0', '43_0_16_0', '43_3_16_1.5', '43_3_16_99999999999999999999'
	])('rejects non-canonical Bible reference %s', (ref: string) => {
		expect(() => parseBookmarkTarget({ kind: 'bible', bibleLocationRef: ref })).toThrow();
	});

	it('allows different Bookmark identities at an identical target', () => {
		const target = parseBookmarkTarget({ kind: 'bible', bibleLocationRef: '43_3_16_0' });
		const first: Bookmark = { id: 'owner/default/first', target, updatedAt: 1, previewText: '' };
		const second: Bookmark = { id: 'owner/default/second', target, updatedAt: 1, previewText: '' };
		expect(first.id).not.toBe(second.id);
		expect(bookmarkTargetsEqual(first.target, second.target)).toBe(true);
	});

	it('preserves the owning Resource identity without interpreting its path', () => {
		const target = parseBookmarkTarget({
			...normalizedTarget,
			document: { ...normalizedTarget.document, resourceId: 'library/doc/%2Fone' }
		});
		expect(target).toMatchObject({ document: {
			publisher: 'a'.repeat(64), resourceId: 'library/doc/%2Fone'
		} });
	});

	it('compares normalized targets by exact Resource identity and word address', () => {
		const first = parseBookmarkTarget(normalizedTarget);
		const otherPublisher = parseBookmarkTarget({
			...normalizedTarget,
			document: { publisher: 'b'.repeat(64), resourceId: 'library/doc/one' }
		});
		const otherResource = parseBookmarkTarget({
			...normalizedTarget,
			document: { ...normalizedTarget.document, resourceId: 'other/path' }
		});
		expect(bookmarkTargetsEqual(first, otherPublisher)).toBe(false);
		expect(bookmarkTargetsEqual(first, otherResource)).toBe(false);
		expect(bookmarkTargetsEqual(first, {
			...normalizedTarget, address: { ...normalizedTarget.address, contentIndex: 2 }
		} as BookmarkTarget)).toBe(false);
		expect(bookmarkTargetsEqual(first, parseBookmarkTarget({ ...normalizedTarget }))).toBe(true);
		const bible = parseBookmarkTarget({ kind: 'bible', bibleLocationRef: '43_3_16_0' });
		expect(bookmarkTargetsEqual(first, bible)).toBe(false);
		expect(bookmarkTargetsEqual(bible, { kind: 'bible', bibleLocationRef: '43_3_16_0' })).toBe(true);
	});

	it.each([
		{ ...normalizedTarget, document: { ...normalizedTarget.document, publisher: '' } },
		{ ...normalizedTarget, document: { ...normalizedTarget.document, publisher: 'a/b' } },
		{ ...normalizedTarget, document: { ...normalizedTarget.document, resourceId: '' } },
		{ ...normalizedTarget, document: { ...normalizedTarget.document, algorithm: 'sha256' } },
		{ ...normalizedTarget, address: { ...normalizedTarget.address, contentIndex: -1 } },
		{ ...normalizedTarget, address: { ...normalizedTarget.address, contentIndex: 0.25 } },
		{ ...normalizedTarget, address: { ...normalizedTarget.address, kind: 'block' } },
		{ ...normalizedTarget, source: { publisher: 'a', resourceId: 'path' } },
		{ ...normalizedTarget, unexpected: 'value' },
		{ kind: 'bible', bibleLocationRef: '43_3_16_0', version: 'kjv' },
		{ kind: 'other', bibleLocationRef: '43_3_16_0' }
	])('rejects malformed or ambiguous target %#', (target: unknown) => {
		expect(() => parseBookmarkTarget(target)).toThrow();
	});

	it('trusts structurally valid word addresses without loading source content', () => {
		const target = parseBookmarkTarget({
			...normalizedTarget,
			address: { kind: 'word', blockId: 'not-locally-installed', contentIndex: 999 }
		});
		expect(target).toMatchObject({
			address: { kind: 'word', blockId: 'not-locally-installed', contentIndex: 999 }
		});
	});

});
