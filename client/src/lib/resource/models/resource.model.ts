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

	createdAt: number;

	representation:
		ResourceRepresentationType;

	mediaType: string;

	payload: string;
}