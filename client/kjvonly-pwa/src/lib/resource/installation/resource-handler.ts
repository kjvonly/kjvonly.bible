import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

export interface ResourceHandler {
	readonly resourceType:
		string;

	handle(
		resource:
			DecodedResourceContent
	): Promise<void>;
}