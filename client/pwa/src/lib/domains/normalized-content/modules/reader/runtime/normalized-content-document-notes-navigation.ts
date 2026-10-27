import type {
	NotesNormalizedDocumentNavigationIntent
} from '$lib/domains/notes';

import type {
	ResourceDescriptor
} from '$lib/resource';

import {
	requireNormalizedContentDocumentIdentity
} from './normalized-content-document-identity';

/**
 * Builds the Notes-owned document scope from the active Resource descriptor.
 *
 * The displayed filename and document title never determine Note identity. The
 * Resource ID is opaque, so slashes and percent signs are preserved verbatim.
 * Neither document nor word Notes track Resource revisions. Word Notes add
 * a canonical block/content index to this same logical Resource identity.
 *
 * @param descriptor - Current Reader Resource, not its initial navigation entry.
 * @param title - Display-only label for a new Note draft.
 * @returns Serializable Notes navigation state for the logical document.
 * @throws When the Resource is not a valid normalized-document descriptor.
 */
export function createNormalizedContentDocumentNotesIntent(
	descriptor: ResourceDescriptor,
	title: string
): NotesNormalizedDocumentNavigationIntent {
	const document = requireNormalizedContentDocumentIdentity(descriptor);

	return {
		normalizedDocument: {
			scope: {
				kind: 'document',
				document
			},
			title
		}
	};
}
