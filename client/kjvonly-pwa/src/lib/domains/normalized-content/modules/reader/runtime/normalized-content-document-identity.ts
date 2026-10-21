import type { ResourceDescriptor } from '$lib/resource';

import {
	assertNormalizedDocumentDataContract
} from '../../../resources/normalized-content-resource-contract';

/** Logical Resource identity; it does not include the document revision or display title. */
export interface NormalizedContentDocumentIdentity {
	readonly publisher: string;
	readonly resourceId: string;
}

/**
 * Requires the logical identity of a normalized document Resource.
 *
 * Shared by Notes navigation and marker lookups so reading a document's
 * identity does not require constructing a Notes navigation intent.
 * The Resource ID is opaque, and `modifiedAt` does not participate in
 * Note association identity.
 *
 * @throws For a missing publisher/Resource ID or unsupported data contract.
 */
export function requireNormalizedContentDocumentIdentity(
	descriptor: ResourceDescriptor
): NormalizedContentDocumentIdentity {
	const { publisher, resourceId, dataType, dataVersion } = descriptor.metadata;
	assertNormalizedDocumentDataContract(dataType, dataVersion);
	if (!publisher || !resourceId) {
		throw new Error('Invalid normalized document identity');
	}
	return { publisher, resourceId };
}
