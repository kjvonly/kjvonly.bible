import type { PublishedResourceReference, ResourceInstallResult } from '$lib/resource';
import type { DictionaryEditionSource } from '../models/dictionary.model';
import {
	createDictionaryPublishedIndexResourceId,
	DICTIONARY_PUBLISHED_INDEX_RESOURCE_TYPE
} from '../models/dictionary-published-headword-index.model';

interface PublishedIndexResourceInstaller {
	install(reference: PublishedResourceReference): Promise<ResourceInstallResult>;
}

/** Install a required published search index before the Dictionary entries Resource. */
export class DictionaryPublishedIndexPreparer {
	constructor(private readonly resources: PublishedIndexResourceInstaller) {}

	async prepare(source: DictionaryEditionSource): Promise<void> {
		const reference: PublishedResourceReference = {
			publisher: source.publisher,
			resourceId: createDictionaryPublishedIndexResourceId(source.resourceId)
		};
		const result = await this.resources.install(reference);
		for (const outcome of result.resources) {
			if (outcome.status === 'failed') throw outcome.error;
		}
		const accepted = result.resources.some(outcome =>
			(outcome.status === 'handled' || outcome.status === 'current') &&
			outcome.resourceType === DICTIONARY_PUBLISHED_INDEX_RESOURCE_TYPE &&
			outcome.reference.publisher === reference.publisher &&
			outcome.reference.resourceId === reference.resourceId
		);
		if (!result.found || !accepted) {
			throw new Error(`Published Dictionary index Resource not accepted: ${reference.publisher}/${reference.resourceId}`);
		}
	}
}
