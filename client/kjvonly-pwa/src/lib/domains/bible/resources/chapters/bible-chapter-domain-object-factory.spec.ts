import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BIBLE_CHAPTER_OBJECT_TYPE
} from '../../persistence/chapter-store';

import {
	BIBLE_VERSION_DATA_TYPE,
	BIBLE_VERSION_OBJECT_TYPE
} from '../../persistence/bible-version-store';

import {
	BIBLE_CHAPTER_DATA_TYPE,
	BIBLE_CHAPTER_DATA_VERSION,
	BIBLE_CHAPTER_RESOURCE_TYPE
} from './bible-chapter-resource';

import {
	BibleChapterDomainObjectFactory
} from './bible-chapter-domain-object-factory';

describe(
	'BibleChapterDomainObjectFactory',
	() => {
		it(
			'keeps bibleId in Domain identity while version comes from Resource metadata',
			() => {
				const factory =
					new BibleChapterDomainObjectFactory();

				const publisher =
					'publisher';

				const candidates =
					factory.create(
						createContext({
							publisher,
							resourceId:
								`kjvonly/bible/chapter/bible-identity/1_1`,
							metadata: {
								version:
									'King James Version'
							}
						}),
						createChapterContent(
							1
						)
					);

				expect(
					candidates
				).toEqual([
					{
						objectType:
							BIBLE_VERSION_OBJECT_TYPE,
						objectId:
							'publisher/bible-identity',
						dataType:
							BIBLE_VERSION_DATA_TYPE,
						dataVersion:
							1,
						value: {
							id:
								'publisher/bible-identity',
							publisher,
							version:
								'King James Version'
						}
					},
					{
						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,
						objectId:
							'publisher/bible-identity/1_1',
						dataType:
							BIBLE_CHAPTER_DATA_TYPE,
						dataVersion:
							BIBLE_CHAPTER_DATA_VERSION,
						value: {
							id:
								'publisher/bible-identity/1_1',
							...createChapterContent(
								1
							)
						}
					}
				]);
			}
		);

		it(
			'does not require metadata.version to equal bibleId',
			() => {
				const candidates =
					new BibleChapterDomainObjectFactory()
						.create(
							createContext({
								resourceId:
									`kjvonly/bible/chapter/opaque-id/1_1`,
								metadata: {
									version:
										'kjvs'
								}
							}),
							createChapterContent(
								1
							)
						);

				expect(
					candidates[0].objectId
				).toBe(
					'publisher/opaque-id'
				);

				expect(
					(candidates[0].value as { version: string }).version
				).toBe(
					'kjvs'
				);
			}
		);

		it(
			'requires semantic version metadata',
			() => {
				expect(
					() =>
						new BibleChapterDomainObjectFactory()
							.create(
								createContext({
									resourceId:
										`kjvonly/bible/chapter/bible-identity/1_1`
								}),
								createChapterContent(
									1
								)
							)
				).toThrow(
					'Bible Chapter Resource metadata requires a non-empty version.'
				);
			}
		);

		it(
			'keeps bundle entries inside the Resource bibleId and validates Chapter refs',
			() => {
				expect(
					() =>
						new BibleChapterDomainObjectFactory()
							.create(
								createContext({
									resourceId:
										`kjvonly/bible/chapter/bible-a`,
									metadata: {
										version:
											'Any Version'
									}
								}),
								{
									'bible-b/1_1':
										createChapterContent(
											1
									)
								}
							)
				).toThrow(
					'Bible Chapter bundle entry bibleId does not match Resource bibleId'
				);
			}
		);
	}
);

function createContext(
	overrides: {
		publisher?: string;
		resourceId?: string;
		metadata?: Readonly<Record<string, string>>;
	} = {}
) {
	return {
		publisher:
			overrides.publisher ??
			'publisher',
		resourceId:
			overrides.resourceId ??
			`kjvonly/bible/chapter/bible-identity/1_1`,
		resourceType:
			BIBLE_CHAPTER_RESOURCE_TYPE,
		modifiedAt:
			100,
		mediaType:
			'application/json',
		dataType:
			BIBLE_CHAPTER_DATA_TYPE,
		dataVersion:
			BIBLE_CHAPTER_DATA_VERSION,
		...(overrides.metadata === undefined
			? {}
			: { metadata: overrides.metadata })
	};
}

function createChapterContent(
	number: number
) {
	return {
		number,
		bookName:
			'Genesis',
		verses: {},
		verseMap: {},
		footnotes: {}
	};
}
