import type { ResourceDataTypeHandler } from '$lib/resource';
import {
	DICTIONARY_PUBLISHED_INDEX_DATA_TYPE,
	DICTIONARY_PUBLISHED_INDEX_DATA_VERSION,
	validateDictionaryPublishedHeadwordIndex
} from '../../models/dictionary-published-headword-index.model';

/** Validates the storage-independent published FlexSearch index Resource contract. */
export class DictionaryPublishedHeadwordIndexDataTypeHandler implements ResourceDataTypeHandler {
	readonly dataType = DICTIONARY_PUBLISHED_INDEX_DATA_TYPE;
	readonly dataVersion = DICTIONARY_PUBLISHED_INDEX_DATA_VERSION;

	/** Reject malformed or unsupported CLI exports before persistence. */
	validate(value: unknown) {
		return validateDictionaryPublishedHeadwordIndex(value);
	}
}
