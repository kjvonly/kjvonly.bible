import type { ResourceDomainObjectFactory, ResourceDomainObjectFactoryContext } from '$lib/resource';
import {
	createDictionaryPublishedIndexObjectId,
	DICTIONARY_PUBLISHED_INDEX_DATA_TYPE,
	DICTIONARY_PUBLISHED_INDEX_DATA_VERSION,
	DICTIONARY_PUBLISHED_INDEX_OBJECT_TYPE,
	DICTIONARY_PUBLISHED_INDEX_RESOURCE_TYPE,
	entriesResourceIdForPublishedIndex,
	validateDictionaryPublishedHeadwordIndex
} from '../../models/dictionary-published-headword-index.model';

/** Materialize one portable published index via the generic Resource installation contract. */
export class DictionaryPublishedHeadwordIndexFactory implements ResourceDomainObjectFactory {
	readonly resourceType = DICTIONARY_PUBLISHED_INDEX_RESOURCE_TYPE;

	/** Ensure the payload belongs to the edition advertised by its Resource. */
	create(resource: ResourceDomainObjectFactoryContext, value: unknown) {
		const index = validateDictionaryPublishedHeadwordIndex(value);
		const expectedEntriesId = entriesResourceIdForPublishedIndex(resource.resourceId);
		if (index.resourceId !== expectedEntriesId) {
			throw new Error('Published Dictionary index targets a different Resource.');
		}
		return [{
			objectType: DICTIONARY_PUBLISHED_INDEX_OBJECT_TYPE,
			objectId: createDictionaryPublishedIndexObjectId(resource.publisher, index.resourceId),
			dataType: DICTIONARY_PUBLISHED_INDEX_DATA_TYPE,
			dataVersion: DICTIONARY_PUBLISHED_INDEX_DATA_VERSION,
			value: index
		}];
	}
}
