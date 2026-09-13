export const RESOURCE_KIND =
	37770;

export type ResourceRepresentationType =
	| 'content'
	| 'descriptors';

export interface PublishedResourceReference {
	publisher: string;
	resourceId: string;
}

export type SerializedResourceContent =
	| string
	| Uint8Array;

export interface ResolvedResourceRepresentation {
	readonly publisher: string;

	readonly resourceId: string;

	readonly resourceType: string;

	readonly modifiedAt: number;

	readonly representation:
		ResourceRepresentationType;

	readonly mediaType: string;

	readonly payload:
		SerializedResourceContent;
}

export interface ResourceRepresentation
	extends ResolvedResourceRepresentation {
	eventId: string;

	payload: string;
}

export interface VerifiedResourceContent {
	readonly publisher: string;

	readonly resourceId: string;

	readonly resourceType: string;

	readonly modifiedAt: number;

	readonly mediaType: string;

	readonly content:
		SerializedResourceContent;
}

export interface DecodedResourceContent {
	readonly publisher: string;

	readonly resourceId: string;

	readonly resourceType: string;

	readonly modifiedAt: number;

	readonly mediaType: string;

	readonly value: unknown;
}
