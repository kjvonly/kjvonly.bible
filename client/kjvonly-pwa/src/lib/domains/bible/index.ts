export type {
	BCV,
	BibleReadingNavigation,
	Word
} from './models/bible.model';

export type {
	BibleVersion
} from './models/bible-version.model';

export {
	BIBLE_LOCATION_REFERENCE_TYPE
} from './models/bible-location-reference.model';

export {
	parseBibleLocationRef
} from './services/bible-application-reference';

export {
	ChapterService
} from './services/chapter.service';

export {
	ParagraphsService
} from './services/paragraphs.service';

export {
	PericopesService
} from './services/pericopes.service';

export {
	BibleTextMarkupService
} from './services/bible-text-markup.service';

export {
	BibleBooknamesService
} from './services/bible-booknames.service';

export {
	BibleReferenceLabelService
} from './services/bible-reference-label.service';

export {
	BibleVerseReferenceService
} from './services/bible-verse-reference.service';

export type {
	BibleVerseReferences
} from './services/bible-verse-reference.service';

export type {
	BibleChapterVerseCountLookup
} from './services/bible-reference-label.service';

export type {
	SearchService
} from './services/search.service';

export {
	createSearchService
} from './services/search.service';

export {
	BibleVersionsService
} from './services/bibleVersions.service';

export {
	VerseService
} from './services/verse.service';

export {
	BibleLocationReferenceService
} from './services/bibleLocationReference.service';

export {
	BibleNavigationService
} from './services/bibleNavigation.service';

export {
	BookGroupingsService
} from './services/bibleMetadata/bookGroupingByBookID.service';

export type {
	BibleVersionIdentity
} from './utils/bible-identity';

export {
	createBibleVersionId,
	parseBibleVersionId,
	createChapterId,
	extractBibleVersion,
	extractBibleVersionPublisher
} from './utils/bible-identity';

export {
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BIBLE_CHAPTER_DATA_TYPE,
	BIBLE_CHAPTER_DATA_VERSION,
	BIBLE_CHAPTER_VERSION_METADATA_KEY,
	createBibleChapterResourceId
} from './resources/chapters/bible-chapter-resource';

export {
	BibleChapterDataTypeHandler
} from './resources/chapters/bible-chapter-data-type-handler';

export {
	BibleChapterDomainObjectFactory
} from './resources/chapters/bible-chapter-domain-object-factory';

export {
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	BIBLE_BOOKNAMES_DATA_TYPE,
	BIBLE_BOOKNAMES_DATA_VERSION,
	createBibleBooknamesResourceId
} from './resources/booknames/bible-booknames-resource';

export {
	BibleBooknamesDataTypeHandler
} from './resources/booknames/bible-booknames-data-type-handler';

export {
	BibleBooknamesDomainObjectFactory
} from './resources/booknames/bible-booknames-domain-object-factory';

export {
	BIBLE_PARAGRAPHS_RESOURCE_TYPE,
	BIBLE_PARAGRAPHS_DATA_TYPE,
	BIBLE_PARAGRAPHS_DATA_VERSION,
	createBibleParagraphsResourceId
} from './resources/paragraphs/bible-paragraphs-resource';

export {
	BibleParagraphsDataTypeHandler
} from './resources/paragraphs/bible-paragraphs-data-type-handler';

export {
	BibleParagraphsDomainObjectFactory
} from './resources/paragraphs/bible-paragraphs-domain-object-factory';

export {
	BIBLE_PERICOPES_RESOURCE_TYPE,
	BIBLE_PERICOPES_DATA_TYPE,
	BIBLE_PERICOPES_DATA_VERSION,
	createBiblePericopesResourceId
} from './resources/pericopes/bible-pericopes-resource';

export {
	BiblePericopesDataTypeHandler
} from './resources/pericopes/bible-pericopes-data-type-handler';

export {
	BiblePericopesDomainObjectFactory
} from './resources/pericopes/bible-pericopes-domain-object-factory';

export {
	BIBLE_SEARCH_RESOURCE_TYPE,
	BIBLE_SEARCH_INDEX_DATA_TYPE,
	BIBLE_SEARCH_INDEX_DATA_VERSION,
	createBibleSearchIndexResourceId
} from './resources/search/bible-search-index-resource';

export {
	BibleSearchIndexDataTypeHandler
} from './resources/search/bible-search-index-data-type-handler';

export {
	BibleSearchIndexDomainObjectFactory
} from './resources/search/bible-search-index-domain-object-factory';

export {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
	BIBLE_TEXT_MARKUP_DATA_TYPE,
	BIBLE_TEXT_MARKUP_DATA_VERSION,
	createBibleTextMarkupResourceId
} from './resources/text-markup/bible-text-markup-resource';

export {
	BibleTextMarkupDataTypeHandler
} from './resources/text-markup/bible-text-markup-data-type-handler';

export {
	BibleTextMarkupDomainObjectFactory
} from './resources/text-markup/bible-text-markup-domain-object-factory';

export {
	BIBLE_VIEWS,
	type BibleView
} from './models/bible-navigation.model';

export {
	REFS_VIEWS,
	type RefsView
} from './models/refs-navigation.model';

export {
	SEARCH_VIEWS,
	type SearchView
} from './models/search-navigation.model';
