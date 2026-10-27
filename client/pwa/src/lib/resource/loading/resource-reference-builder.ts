import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

export interface ResourceReferenceBuilder<TKey> {
	individual(
		source:
			PublishedResourceReference,
		key:
			TKey
	):
		PublishedResourceReference |
		null;

	bundle(
		source:
			PublishedResourceReference
	):
		PublishedResourceReference;
}

export const appendResourceReferenceBuilder:
	ResourceReferenceBuilder<string> = {

	individual(
		source,
		key
	) {
		return {
			publisher:
				source.publisher,

			resourceId:
				`${source.resourceId}/${key}`
		};
	},

	bundle(
		source
	) {
		return source;
	}
};