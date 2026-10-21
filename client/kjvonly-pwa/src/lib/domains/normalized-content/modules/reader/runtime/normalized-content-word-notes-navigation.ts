import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { NotesNormalizedDocumentNavigationIntent } from '$lib/domains/notes';
import type { ResourceDescriptor } from '$lib/resource';

import {
	resolveNormalizedContentAtAddress,
	type NormalizedContentAddress
} from '../../../models/normalized-content-address.model';
import {
	createNormalizedContentDocumentNotesIntent
} from './normalized-content-document-notes-navigation';

/**
 * Creates a one-time word Note draft request in a document-wide Notes list.
 *
 * The canonical address is validated against the loaded document rather than
 * trusting a DOM index. Word Notes use only publisher, opaque Resource ID, and
 * block/content index: Resource revisions do not participate in identity.
 *
 * @param descriptor Active Reader Resource descriptor, not a filename.
 * @param title Display-only document title for the eventual Note draft.
 * @param document Currently loaded and accepted canonical document.
 * @param address Canonical block ID and content[] index of the chosen word.
 * @returns Serializable Notes intent with a document scope and one create target.
 * @throws When the address is not a word or the descriptor is invalid.
 */
export function createNormalizedContentWordNotesIntent(
	descriptor: ResourceDescriptor,
	title: string,
	document: NormalizedDocument,
	address: NormalizedContentAddress
): NotesNormalizedDocumentNavigationIntent {
	const content = resolveNormalizedContentAtAddress(document, address);
	if (content?.type !== 'word') {
		throw new Error('Selected Notes location must be a canonical word');
	}

	const documentIntent = createNormalizedContentDocumentNotesIntent(
		descriptor,
		title
	);
	const { scope } = documentIntent.normalizedDocument;

	return {
		normalizedDocument: {
			...documentIntent.normalizedDocument,
			createTarget: {
				kind: 'normalized-document',
				document: { ...scope.document },
				target: {
					kind: 'word',
					address: {
						blockId: address.blockId,
						contentIndex: address.contentIndex
					}
				}
			}
		}
	};
}
