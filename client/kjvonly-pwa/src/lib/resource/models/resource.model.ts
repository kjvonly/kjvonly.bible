export const RESOURCE_KIND =
	37770;

export type ResourceRepresentationType =
	| 'content'
	| 'descriptors';

/**
 * Protocol-agnostic scalar metadata attached to a Resource envelope.
 *
 * The generic Resource layer transports these values without assigning meaning
 * to individual keys. Owning Domains may interpret keys they define.
 */
export type ResourceMetadata =
	Readonly<Record<string, string>>;

export interface PublishedResourceReference {
	publisher: string;
	resourceId: string;
}

export interface ResourceRepresentation {
	publisher: string;

	resourceId: string;

	resourceType: string;

	eventId: string;

	modifiedAt: number;

	representation:
		ResourceRepresentationType;

	mediaType: string;

	/** Additional protocol-agnostic Resource metadata. */
	metadata?: ResourceMetadata;

	payload: string;
}

export type SerializedResourceContent =
	| string
	| Uint8Array;

export interface VerifiedResourceContent {
	readonly publisher: string;

	readonly resourceId: string;

	readonly resourceType: string;

	readonly modifiedAt: number;

	readonly mediaType: string;

	/** Optional semantic application data contract advertised by a descriptor. */
	readonly dataType?: string;

	/** Additional protocol-agnostic Resource metadata. */
	readonly metadata?: ResourceMetadata;

	readonly content:
		SerializedResourceContent;
}

export interface DecodedResourceContent {
	readonly publisher: string;

	readonly resourceId: string;

	readonly resourceType: string;

	readonly modifiedAt: number;

	readonly mediaType: string;

	/** Optional normalized semantic application data contract. */
	readonly dataType?: string;

	/** Additional protocol-agnostic Resource metadata. */
	readonly metadata?: ResourceMetadata;

	readonly value: unknown;
}
