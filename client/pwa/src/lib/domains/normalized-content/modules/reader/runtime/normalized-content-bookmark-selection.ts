import type {
	NormalizedBlock,
	NormalizedContent,
	NormalizedDocument
} from '@kjvonly/normalized-content';
import type { NormalizedDocumentBookmarkTarget } from '$lib/domains/bookmarks';
import type { ResourceDescriptor } from '$lib/resource';

import {
	assertNormalizedContentWordAddress,
	type NormalizedContentAddress
} from '../../../models/normalized-content-address.model';
import { requireNormalizedContentDocumentIdentity } from './normalized-content-document-identity';
import { shouldInsertNormalizedWordSeparator } from '../../../ui/presentation/normalized-inline-spacing';

/** The validated Bookmark target and human-readable, non-identity preview. */
export interface NormalizedContentBookmarkSelection {
	readonly target: NormalizedDocumentBookmarkTarget;
	readonly previewText: string;
}

/**
 * Builds a validated canonical word target for browsing an existing Bookmark.
 * No preview text is needed: the target is the complete navigation identity.
 *
 * @throws When the descriptor is invalid or the address is not a word.
 */
export function createNormalizedContentBookmarkTarget(
	descriptor: ResourceDescriptor,
	document: NormalizedDocument,
	address: NormalizedContentAddress
): NormalizedDocumentBookmarkTarget {
	const target: NormalizedDocumentBookmarkTarget = {
		kind: 'normalized-document',
		document: requireNormalizedContentDocumentIdentity(descriptor),
		address: { kind: 'word', blockId: address.blockId, contentIndex: address.contentIndex }
	};
	assertNormalizedContentWordAddress(document, target.address);
	return target;
}

/**
 * Builds one word Bookmark for creation or relocation, including its preview.
 *
 * The address is the exact canonical content[] index, including non-word items.
 * The preview is a bounded plain-text window around the word; it is not used
 * for identity and never comes from the displayed filename or browser DOM.
 *
 * @throws When the descriptor is invalid or the address is not a word.
 */
export function createNormalizedContentBookmarkSelection(
	descriptor: ResourceDescriptor,
	document: NormalizedDocument,
	address: NormalizedContentAddress
): NormalizedContentBookmarkSelection {
	const target = createNormalizedContentBookmarkTarget(descriptor, document, address);
	const content = findBlockContent(document.blocks, address.blockId);
	if (!content) {
		throw new Error('Selected Bookmark word has no source block');
	}
	return { target, previewText: createWordPreview(content, address.contentIndex) };
}

/** Finds canonical inline content even when the selected block is nested. */
function findBlockContent(blocks: readonly NormalizedBlock[], id: string): readonly NormalizedContent[] | undefined {
	for (const block of blocks) {
		if (block.id === id && 'content' in block) {
			return block.content;
		}
		if ('blocks' in block) {
			const result = findBlockContent(block.blocks, id);
			if (result) {
				return result;
			}
		}
	}
	return undefined;
}

/** Keeps the selected word in a short preview while honoring canonical spacing. */
function createWordPreview(content: readonly NormalizedContent[], selectedIndex: number): string {
	const wordIndexes = content.flatMap((entry, index) => entry.type === 'word' ? [index] : []);
	const selectedPosition = wordIndexes.indexOf(selectedIndex);
	if (selectedPosition < 0) throw new Error('Selected Bookmark address is not a word');

	const first = wordIndexes[Math.max(0, selectedPosition - 12)]!;
	const last = wordIndexes[Math.min(wordIndexes.length - 1, selectedPosition + 12)]!;
	let preview = '';
	for (let index = first; index <= last; index++) {
		const entry = content[index];
		if (entry?.type === 'line-break') {
			preview += ' ';
		} else if (entry?.type === 'word') {
			if (shouldInsertNormalizedWordSeparator(content, index)) preview += ' ';
			preview += entry.text;
		}
	}
	return preview.replace(/\s+/g, ' ').trim().slice(0, 320).trim();
}
