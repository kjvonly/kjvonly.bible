import type {
	NormalizedContentAddress
} from './normalized-content-address.model';

/** Application type for user Text Markup over one normalized-document snapshot. */
export const NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE =
	'normalized-content/text-markup';

/** Presentation classes applied to one canonical Normalized Content word. */
export interface NormalizedContentTextMarkupMarking {
	class: string[];
}

/** Markings keyed by canonical `contentIndex` within one normalized block. */
export type NormalizedContentTextMarkupContentMap =
	Record<
		string,
		NormalizedContentTextMarkupMarking
	>;

/**
 * Whole-word Text Markup keyed by canonical Normalized Content address.
 *
 * The outer key is the exact `blockId`; the inner key is the canonical
 * `contentIndex` inside that block's `content[]`. Only addresses resolving to
 * canonical `word` entries are valid Text Markup targets.
 */
export type NormalizedContentTextMarkupMap =
	Record<
		string,
		NormalizedContentTextMarkupContentMap
	>;

/** Exact Resource snapshot whose normalized token addresses the markup targets. */
export interface NormalizedContentTextMarkupDocumentReference {
	readonly publisher: string;
	readonly resourceId: string;
	readonly modifiedAt: number;
}

/** User-owned Text Markup for one exact normalized-document Resource snapshot. */
export interface NormalizedContentTextMarkup {
	readonly id: string;
	readonly document:
		NormalizedContentTextMarkupDocumentReference;
	readonly markings:
		NormalizedContentTextMarkupMap;
}

export interface NormalizedContentTextMarkupIdentity {
	readonly publisher: string;
	readonly document:
		NormalizedContentTextMarkupDocumentReference;
}

/**
 * Creates the durable Domain identity for one user's markup over one exact
 * normalized-document Resource snapshot.
 *
 * The target Resource ID is encoded as one segment so generic Resource IDs
 * remain opaque to this Domain even when they contain `/` or `%` characters.
 *
 * @param publisher Authenticated owner of the Text Markup object.
 * @param documentPublisher Publisher of the target Normalized Document.
 * @param documentResourceId Opaque target Resource ID (not a generic path).
 * @param documentModifiedAt Exact target Resource revision timestamp.
 */
export function createNormalizedContentTextMarkupId(
	publisher: string,
	documentPublisher: string,
	documentResourceId: string,
	documentModifiedAt: number
): string {
	assertPublisher(
		publisher,
		'Normalized Content Text Markup publisher'
	);
	assertPublisher(
		documentPublisher,
		'Normalized Content Text Markup document publisher'
	);
	assertResourceId(
		documentResourceId
	);
	assertModifiedAt(
		documentModifiedAt
	);

	return [
		publisher,
		documentPublisher,
		encodeURIComponent(
			documentResourceId
		),
		String(documentModifiedAt)
	].join('/');
}

/**
 * Parses one canonical Normalized Content Text Markup Domain identity.
 *
 * @param id Canonical ID produced by `createNormalizedContentTextMarkupId`.
 * @returns Markup owner and exact target document Resource snapshot.
 */
export function parseNormalizedContentTextMarkupId(
	id: string
): NormalizedContentTextMarkupIdentity {
	const parts = id.split('/');

	if (parts.length !== 4) {
		throw new Error(
			`Invalid Normalized Content Text Markup id: ${id}`
		);
	}

	const [
		publisher,
		documentPublisher,
		encodedDocumentResourceId,
		modifiedAtValue
	] = parts;

	assertPublisher(
		publisher,
		'Normalized Content Text Markup publisher'
	);
	assertPublisher(
		documentPublisher,
		'Normalized Content Text Markup document publisher'
	);

	const documentResourceId =
		decodeCanonicalResourceId(
			encodedDocumentResourceId,
			id
		);

	const documentModifiedAt =
		parseCanonicalModifiedAt(
			modifiedAtValue,
			id
		);

	return {
		publisher,
		document: {
			publisher:
				documentPublisher,
			resourceId:
				documentResourceId,
			modifiedAt:
				documentModifiedAt
		}
	};
}

/**
 * Reads one Text Markup marking by exact semantic token address.
 *
 * Own-property lookup is intentional because canonical source block IDs may
 * legally collide with JavaScript prototype property names such as
 * `__proto__`.
 *
 * @param markings Reader draft or accepted map; may be absent.
 * @param address Exact canonical word location (block ID and content index).
 * @returns Own marking at that address, if any.
 */
export function getNormalizedContentTextMarkupMarking(
	markings: NormalizedContentTextMarkupMap | undefined,
	address: NormalizedContentAddress
): NormalizedContentTextMarkupMarking | undefined {
	if (!markings) {
		return undefined;
	}

	const blockMarkings = getOwnProperty(
		markings,
		address.blockId
	);

	if (!blockMarkings) {
		return undefined;
	}

	return getOwnProperty(
		blockMarkings,
		String(address.contentIndex)
	);
}

function getOwnProperty<T>(
	record: Record<string, T>,
	key: string
): T | undefined {
	// Read missing keys too: a Svelte $state proxy must observe the lookup
	// before a newly created block or word marking can trigger a rerender.
	const value = record[key];

	return Object.prototype.hasOwnProperty.call(record, key)
		? value
		: undefined;
}

function assertPublisher(
	value: string,
	label: string
): void {
	if (
		value.length === 0 ||
		value.includes('/')
	) {
		throw new Error(
			`Invalid ${label}: ${value}`
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
	id: string
): string {
	let decoded: string;

	try {
		decoded =
			decodeURIComponent(
				value
			);
	} catch {
		throw new Error(
			`Invalid Normalized Content Text Markup id: ${id}`
		);
	}

	if (
		decoded.length === 0 ||
		encodeURIComponent(decoded) !==
			value
	) {
		throw new Error(
			`Invalid Normalized Content Text Markup id: ${id}`
		);
	}

	return decoded;
}

function parseCanonicalModifiedAt(
	value: string,
	id: string
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
			`Invalid Normalized Content Text Markup id: ${id}`
		);
	}

	return parsed;
}
