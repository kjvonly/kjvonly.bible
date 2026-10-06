import {
	NORMALIZED_DOCUMENT_OBJECT_TYPE
} from '../models/normalized-document-id';

/** Standalone normalized documents owned by the Normalized Content Domain. */
export const NORMALIZED_CONTENT_RESOURCE_TYPE =
	NORMALIZED_DOCUMENT_OBJECT_TYPE;

/** Reusable semantic structured-document data contract. */
export const NORMALIZED_DOCUMENT_DATA_TYPE =
	'kjvonly.normalized-document';

/** Current semantic structured-document data version. */
export const NORMALIZED_DOCUMENT_DATA_VERSION =
	1;

/**
 * Requires the normalized-document semantic contract understood by this app.
 *
 * Resource Type remains independent: other owning Domains may reuse this
 * same semantic data type/version while installing the accepted value under
 * their own Domain identity.
 */
export function assertNormalizedDocumentDataContract(
	dataType: string | undefined,
	dataVersion: number | undefined
): void {
	if (dataType === undefined) {
		throw new Error(
			'Normalized document data type is required.'
		);
	}

	if (
		dataType !==
		NORMALIZED_DOCUMENT_DATA_TYPE
	) {
		throw new Error(
			`Unsupported normalized document data type: ${dataType}`
		);
	}

	if (dataVersion === undefined) {
		throw new Error(
			'Normalized document data version is required.'
		);
	}

	if (
		dataVersion !==
		NORMALIZED_DOCUMENT_DATA_VERSION
	) {
		throw new Error(
			`Unsupported normalized document data version: ${dataVersion}`
		);
	}
}
