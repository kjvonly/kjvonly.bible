export const RESOURCE_KIND =
	37770;

export type ResourceRepresentationType =
	| 'content'
	| 'descriptor'
	| 'descriptors';

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

	payload: string;
}


export type SerializedResourceContent =
	| string
	| Uint8Array;

export interface VerifiedResourceContent {
	readonly publisher: string;

	readonly resourceId: string;

	readonly resourceType: string;

	readonly eventId: string;

	readonly modifiedAt: number;

	readonly mediaType: string;

	readonly content: SerializedResourceContent;
}

export interface DecodedResourceContent {
	readonly publisher: string;

	readonly resourceId: string;

	readonly resourceType: string;

	readonly eventId: string;

	readonly modifiedAt: number;

	readonly mediaType: string;

	readonly value: unknown;
}