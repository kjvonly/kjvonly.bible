import type { DecodedResourceContent, ResourceHandler } from '$lib/resource';
import { DictionaryEntriesDataTypeHandler } from './dictionary-entries-data-type-handler';
import { DictionaryChunkInstaller } from './dictionary-chunk-installer';
import { DICTIONARY_RESOURCE_TYPE } from './dictionary-resource-contract';

/**
 * Dictionary-specific Resource handler: validate the published Dictionary edition bundle, then
 * install chunked Domain objects in the existing Resource Worker. No per-word
 * Domain objects or changes to the generic Resource installer are involved.
 */
export class DictionaryResourceHandler implements ResourceHandler {
	readonly resourceType = DICTIONARY_RESOURCE_TYPE;

	constructor(
		private readonly dataType: DictionaryEntriesDataTypeHandler,
		private readonly installer: DictionaryChunkInstaller
	) {}

	/** Keep unsupported semantic versions consistent with the Resource boundary. */
	async handle(resource: DecodedResourceContent): Promise<void> {
		if (resource.dataType !== this.dataType.dataType ||
			resource.dataVersion !== this.dataType.dataVersion) {
			throw new Error(`Unsupported Resource data type: ${resource.dataType}@${resource.dataVersion}`);
		}
		const bundle = this.dataType.validate(resource.value);
		await this.installer.install(resource, bundle);
	}
}
