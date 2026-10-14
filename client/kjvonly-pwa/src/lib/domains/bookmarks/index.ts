/** Node-safe public contracts for the Bookmarks domain. */
export {
    BOOKMARKS_VIEWS,
    parseBookmarksNavigationIntent,
    type BookmarksNavigationIntent,
    type BookmarksRelocationNavigationIntent,
    parseBookmarkRelocationConfirmationState,
    parseBookmarkDeleteConfirmationState,
    type BookmarkDeleteConfirmationState,
    createBookmarkRelocationCompletedResult,
    parseBookmarkRelocationCompletedResult,
    BOOKMARKS_NAVIGATION_RESULTS,
    createBookmarkBrowseNavigationResult,
    parseBookmarkBrowseNavigationResult,
    type BookmarkBrowseNavigationResult
} from './models/bookmarks-navigation.model';
export type {
	Bookmark,
	BookmarkTarget,
	BibleBookmarkTarget,
	NormalizedDocumentBookmarkTarget,
	NormalizedBookmarkDocumentReference,
	NormalizedBookmarkWordAddress
} from './models/bookmark.model';

export {
	BOOKMARK_OBJECT_TYPE,
	createBookmarkId,
	createBookmarkDomainObjectId,
	parseBookmarkId
} from './models/bookmark-id';

export {
	parseBookmarkTarget,
	bookmarkTargetsEqual,
	assertNormalizedBookmarkWordAddress
} from './services/bookmark-target-validation';

export {
	BOOKMARKS_RESOURCE_TYPE,
	BOOKMARK_DATA_TYPE,
	BOOKMARK_DATA_VERSION,
	type BookmarkResourceContent
} from './resources/bookmarks-resource-contract';

export {
	createBookmarkResourceId,
	parseBookmarkResourceId,
	type BookmarkResourceIdentity
} from './resources/bookmarks-resource-id';

export { BookmarkDataTypeHandler } from './resources/bookmark-data-type-handler';

export {
	BookmarkDomainObjectFactory
} from './resources/bookmark-domain-object-factory';

export {
	BookmarksResourcePublication
} from './resources/bookmarks-resource-publication';

export type { BookmarksStore } from './persistence/bookmarks-store';
export type { BookmarksWriteStores, BookmarksWriteTransaction } from './resources/bookmarks-write-stores';

export { BookmarksService } from './services/bookmarks.service';

export {
    createChapterBookmarksByLocation,
    type ChapterBookmarksByLocation
} from './services/bookmarks-bible-scope';

export { BookmarksModuleResourceSelectionContributor } from './resources/bookmarks-module-resource-selection-contributor';
