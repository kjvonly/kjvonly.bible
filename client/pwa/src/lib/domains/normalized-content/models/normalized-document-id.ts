
/** Application type for standalone normalized-document Domain Objects. */
export const NORMALIZED_DOCUMENT_OBJECT_TYPE =
	'normalized-content/document';

import type {
	ResourceDescriptor
} from '$lib/resource';

/**
 * Creates the Domain identity for a standalone normalized-document Resource.
 *
 * Resource ID is intentionally independent from Resource Type and filesystem
 * organization. The full Resource id remains part of the Domain identity.
 */
export function createNormalizedDocumentId(
	publisher: string,
	resourceId: string
): string {
	if (
		publisher.length === 0 ||
		publisher.includes('/')
	) {
		throw new Error(
			`Invalid normalized document publisher: ${publisher}`
		);
	}

	if (resourceId.length === 0) {
		throw new Error(
			'Invalid normalized document Resource ID.'
		);
	}

	return `${publisher}/${resourceId}`;
}

/** Creates the standalone Domain identity represented by one descriptor. */
export function createNormalizedDocumentIdForDescriptor(
	descriptor: ResourceDescriptor
): string {
	return createNormalizedDocumentId(
		descriptor.metadata.publisher,
		descriptor.metadata.resourceId
	);
}
