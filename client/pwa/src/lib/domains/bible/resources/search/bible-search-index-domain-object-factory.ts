import type {
	BibleSearchIndex,
	BibleSearchIndexChunks
} from '../../models/bible-search-index.model';

import {
	createBibleSearchIndexId
} from '../../models/bible-search-index.model';

import {
	BIBLE_SEARCH_INDEX_OBJECT_TYPE
} from '../../persistence/bible-search-index-store';

import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import {
	BIBLE_SEARCH_INDEX_DATA_TYPE,
	BIBLE_SEARCH_INDEX_DATA_VERSION,
	BIBLE_SEARCH_RESOURCE_TYPE,
	parseBibleSearchIndexResourceId
} from './bible-search-index-resource';

/**
 * Gives validated Bible Search Index payloads their canonical Bible Domain
 * identity.
 *
 * The datatype handler owns FlexSearch payload validation. This factory owns
 * Resource-path interpretation and converts the path's Bible-version key into
 * the canonical `bible/search-index` Domain-object identity.
 */
export class BibleSearchIndexDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		BIBLE_SEARCH_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const version =
			parseBibleSearchIndexResourceId(
				resource.resourceId
			);

		const id =
			createBibleSearchIndexId(
				resource.publisher,
				version
			);

		const searchIndex:
			BibleSearchIndex = {
				id,
				version,
				chunks:
					value as BibleSearchIndexChunks
			};

		return [
			{
				objectType:
					BIBLE_SEARCH_INDEX_OBJECT_TYPE,


				objectId:
					id,

				dataType:
					BIBLE_SEARCH_INDEX_DATA_TYPE,

				dataVersion:
					BIBLE_SEARCH_INDEX_DATA_VERSION,

				value:
					searchIndex
			}
		];
	}
}
