import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createBibleBooknamesId
} from '../../models/bible-booknames.model';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE
} from '../../persistence/bible-booknames-store';

import {
	BibleBooknamesDomainObjectFactory
} from './bible-booknames-domain-object-factory';

import {
	BIBLE_BOOKNAMES_DATA_TYPE,
	BIBLE_BOOKNAMES_DATA_VERSION,
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from './bible-booknames-resource';

describe(
	'BibleBooknamesDomainObjectFactory',
	() => {
		it(
			'creates the canonical Bible Booknames Domain object',
			() => {
				const publisher =
					'a'.repeat(64);

				const factory =
					new BibleBooknamesDomainObjectFactory();

				const content =
					createContent();

				const id =
					createBibleBooknamesId(
						publisher,
						'default'
					);

				expect(
					factory.create(
						{
							publisher,
							resourceId:
								`kjvonly/bible/booknames/default`,
							resourceType:
								BIBLE_BOOKNAMES_RESOURCE_TYPE,
							dataType:
								BIBLE_BOOKNAMES_DATA_TYPE,
							dataVersion:
								1,
							modifiedAt:
								100,
							mediaType:
								'application/json'
						},
						content
					)
				).toEqual([
					{
						objectType:
							BIBLE_BOOKNAMES_OBJECT_TYPE,
						objectId:
							id,
						dataType:
							BIBLE_BOOKNAMES_DATA_TYPE,
						dataVersion:
							BIBLE_BOOKNAMES_DATA_VERSION,
						value: {
							id,
							...content
						}
					}
				]);
			}
		);

		it(
			'rejects non-leaf Booknames Resource paths',
			() => {
				const factory =
					new BibleBooknamesDomainObjectFactory();

				expect(
					() =>
						factory.create(
							{
								publisher:
									'a'.repeat(64),
								resourceId:
									BIBLE_BOOKNAMES_RESOURCE_TYPE,
								resourceType:
									BIBLE_BOOKNAMES_RESOURCE_TYPE,
								dataType:
									BIBLE_BOOKNAMES_DATA_TYPE,
								dataVersion:
									1,
								modifiedAt:
									100,
								mediaType:
									'application/json'
							},
							createContent()
						)
				).toThrow(
					'Invalid Bible Booknames Resource ID'
				);
			}
		);
	}
);

function createContent() {
	return {
		booknamesById: {
			'1':
				'Genesis'
		},
		booknamesByName: {
			Genesis:
				1
		},
		shortNames: {
			'1':
				'Gen'
		},
		maxChapterById: {
			'1':
				1
		},
		bookchapterversecountById: {
			'1': {
				'1':
					31
			}
		}
	};
}
