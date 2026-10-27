import {
	NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE
} from '../../models/normalized-content-text-markup.model';

const NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_PREFIX =
	'kjvonly/normalized-content/text-markup';

/** Application type represented by Normalized Content Text Markup Resources. */
export const NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE =
	NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE;

/** Semantic payload contract for Normalized Content Text Markup. */
export const NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE =
	'kjvonly.normalized-content.text-markup';

/** Current semantic version of the Normalized Content Text Markup payload. */
export const NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION =
	1;

export interface NormalizedContentTextMarkupResourceIdentity {
	readonly documentPublisher: string;
	readonly documentResourceId: string;
	readonly documentModifiedAt: number;
}

/**
 * Creates the Resource ID for one user's markup over one exact document
 * Resource snapshot.
 *
 * The target Resource ID is percent-encoded as one segment because the generic
 * Resource layer intentionally treats Resource IDs as opaque strings.
 */
export function createNormalizedContentTextMarkupResourceId(
	documentPublisher: string,
	documentResourceId: string,
	documentModifiedAt: number
): string {
	assertPublisher(
		documentPublisher
	);
	assertResourceId(
		documentResourceId
	);
	assertModifiedAt(
		documentModifiedAt
	);

	return [
		NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_PREFIX,
		documentPublisher,
		encodeURIComponent(
			documentResourceId
		),
		String(documentModifiedAt)
	].join('/');
}

/** Parses the target document snapshot encoded by a Text Markup Resource ID. */
export function parseNormalizedContentTextMarkupResourceId(
	resourceId: string
): NormalizedContentTextMarkupResourceIdentity {
	const prefix =
		`${NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_PREFIX}/`;

	if (!resourceId.startsWith(prefix)) {
		throw new Error(
			`Invalid Normalized Content Text Markup Resource ID: ${resourceId}`
		);
	}

	const parts =
		resourceId
			.slice(prefix.length)
			.split('/');

	if (parts.length !== 3) {
		throw new Error(
			`Invalid Normalized Content Text Markup Resource ID: ${resourceId}`
		);
	}

	const [
		documentPublisher,
		encodedDocumentResourceId,
		modifiedAtValue
	] = parts;

	assertPublisher(
		documentPublisher
	);

	const documentResourceId =
		decodeCanonicalResourceId(
			encodedDocumentResourceId,
			resourceId
		);

	const documentModifiedAt =
		parseCanonicalModifiedAt(
			modifiedAtValue,
			resourceId
		);

	return {
		documentPublisher,
		documentResourceId,
		documentModifiedAt
	};
}

function assertPublisher(
	value: string
): void {
	if (
		value.length === 0 ||
		value.includes('/')
	) {
		throw new Error(
			`Invalid Normalized Content Text Markup document publisher: ${value}`
		);
	}
}

function assertResourceId(
	value: string
): void {
	if (value.length === 0) {
		throw new Error(
			'Invalid Normalized Content Text Markup document Resource ID.'
		);
	}
}

function assertModifiedAt(
	value: number
): void {
	if (
		!Number.isSafeInteger(value) ||
		value < 0
	) {
		throw new Error(
			`Invalid Normalized Content Text Markup document modifiedAt: ${value}`
		);
	}
}

function decodeCanonicalResourceId(
	value: string,
	resourceId: string
): string {
	let decoded: string;

	try {
		decoded =
			decodeURIComponent(
				value
			);
	} catch {
		throw new Error(
			`Invalid Normalized Content Text Markup Resource ID: ${resourceId}`
		);
	}

	if (
		decoded.length === 0 ||
		encodeURIComponent(decoded) !==
			value
	) {
		throw new Error(
			`Invalid Normalized Content Text Markup Resource ID: ${resourceId}`
		);
	}

	return decoded;
}

function parseCanonicalModifiedAt(
	value: string,
	resourceId: string
): number {
	const parsed =
		Number.parseInt(
			value,
			10
		);

	if (
		!Number.isSafeInteger(parsed) ||
		parsed < 0 ||
		String(parsed) !== value
	) {
		throw new Error(
			`Invalid Normalized Content Text Markup Resource ID: ${resourceId}`
		);
	}

	return parsed;
}
