import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createBibleSearchIndexId
} from '../../models/bible-search-index.model';

import {
	BIBLE_SEARCH_INDEX_OBJECT_TYPE
} from '../../persistence/bible-search-index-store';

import {
	BibleSearchIndexDomainObjectFactory
} from './bible-search-index-domain-object-factory';

import {
	BIBLE_SEARCH_INDEX_DATA_TYPE,
	BIBLE_SEARCH_INDEX_DATA_VERSION,
	BIBLE_SEARCH_RESOURCE_TYPE
} from './bible-search-index-resource';

describe(
	'BibleSearchIndexDomainObjectFactory',
	() => {
		it(
			'creates the canonical Bible Search Index Domain object',
			() => {
				const publisher =
					'a'.repeat(64);

				const chunks =
					createChunks();

				const id =
					createBibleSearchIndexId(
						publisher,
						'kjvs'
					);

				expect(
					new BibleSearchIndexDomainObjectFactory()
						.create(
							{
								publisher,
								resourceId:
									`kjvonly/bible/search-index/kjvs`,
								resourceType:
									BIBLE_SEARCH_RESOURCE_TYPE,
								dataType:
									BIBLE_SEARCH_INDEX_DATA_TYPE,
								dataVersion:
									BIBLE_SEARCH_INDEX_DATA_VERSION,
								modifiedAt:
									100,
								mediaType:
									'application/json'
							},
							chunks
						)
				).toEqual([
					{
						objectType:
							BIBLE_SEARCH_INDEX_OBJECT_TYPE,
						objectId:
							id,
						dataType:
							BIBLE_SEARCH_INDEX_DATA_TYPE,
						dataVersion:
							BIBLE_SEARCH_INDEX_DATA_VERSION,
						value: {
							id,
							version:
								'kjvs',
							chunks
						}
					}
				]);
			}
		);

		it(
			'rejects the Search Resource root because it does not identify a Bible version',
			() => {
				expect(
					() =>
						new BibleSearchIndexDomainObjectFactory()
							.create(
								{
									publisher:
										'a'.repeat(64),
									resourceId:
										BIBLE_SEARCH_RESOURCE_TYPE,
									resourceType:
										BIBLE_SEARCH_RESOURCE_TYPE,
									dataType:
										BIBLE_SEARCH_INDEX_DATA_TYPE,
									dataVersion:
										BIBLE_SEARCH_INDEX_DATA_VERSION,
									modifiedAt:
										100,
									mediaType:
										'application/json'
								},
								createChunks()
							)
				).toThrow(
					'Invalid Bible Search Index Resource ID'
				);
			}
		);
	}
);

function createChunks() {
	return {
		reg:
			'{}',

		cfg:
			'{"doc":0,"opt":1}',

		map:
			'[]',

		ctx:
			'[]'
	};
}
