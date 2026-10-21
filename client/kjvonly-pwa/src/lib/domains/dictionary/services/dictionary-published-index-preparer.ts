import type { PublishedResourceReference, ResourceInstallResult } from '$lib/resource';
import type { DictionaryEditionSource } from '../models/dictionary.model';
import { createDictionaryPublishedIndexResourceId } from '../models/dictionary-published-headword-index.model';

interface PublishedIndexResourceInstaller {
	install(reference: PublishedResourceReference): Promise<ResourceInstallResult>;
}

/** Request the published index through the generic Resource lifecycle; the edition installer owns fallback policy. */
export class DictionaryPublishedIndexPreparer {
	constructor(private readonly resources: PublishedIndexResourceInstaller) {}

	/** Attempt the optional published index; Resource transport errors belong to the installing caller. */
	async prepare(source: DictionaryEditionSource): Promise<void> {
		const reference: PublishedResourceReference = {
			publisher: source.publisher,
			resourceId: createDictionaryPublishedIndexResourceId(source.resourceId)
		};
		const result = await this.resources.install(reference);
		if (!result.found || result.resources.some(outcome => outcome.status === 'failed')) {
			console.info('[Dictionary index] Published index unavailable; using local index fallback.', reference);
		}
	}
}
