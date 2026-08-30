import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

export type ResourceSelections =
	Record<
		string,
		PublishedResourceReference
	>;