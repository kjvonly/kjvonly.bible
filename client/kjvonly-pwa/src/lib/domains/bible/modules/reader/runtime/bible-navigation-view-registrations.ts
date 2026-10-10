import {
	type NavigationViewRegistration
} from '$lib/application';

import {
	BIBLE_VIEWS,
	type BibleView
} from '../../../models/bible-navigation.model';

import BibleContainer from '../bibleContainer.svelte';
import BibleOverflowActionsView from '../views/bibleOverflowActionsView.svelte';
import {
	BibleVersionView
} from '../../components/bibleVersion';
import Books from '../views/bookChapterVerse/books.svelte';
import Chapters from '../views/bookChapterVerse/chapters.svelte';
import Verses from '../views/bookChapterVerse/verses.svelte';
import CopyVerseView from '../views/copyVerseView.svelte';
import NavReadingsView from '../views/navReadingsView.svelte';

/**
 * Bible-owned navigation views registered by the application composition root.
 *
 * View IDs are persistent navigation contract values; this table is the single
 * Reader-local mapping from those IDs to Svelte components. The legacy
 * `BOOK_CHAPTER_VERSE` alias remains only so existing in-development persisted
 * stacks can still resolve while the split book/chapter/verse views are used.
 */
export const bibleNavigationViewRegistrations:
	readonly NavigationViewRegistration<BibleView>[] = [
		{
			view: BIBLE_VIEWS.READER,
			component: BibleContainer
		},
		{
			view: BIBLE_VIEWS.OVERFLOW_ACTIONS,
			component: BibleOverflowActionsView
		},
		{
			view: BIBLE_VIEWS.VERSION,
			component: BibleVersionView
		},
		{
			view: BIBLE_VIEWS.BOOK_CHAPTER_VERSE_BOOK,
			component: Books
		},
		{
			view: BIBLE_VIEWS.BOOK_CHAPTER_VERSE_CHAPTER,
			component: Chapters
		},
		{
			view: BIBLE_VIEWS.BOOK_CHAPTER_VERSE_VERSE,
			component: Verses
		},
		{
			// Preserve persisted pre-split navigation entries during the migration.
			view: BIBLE_VIEWS.BOOK_CHAPTER_VERSE,
			component: Books
		},
		{
			view: BIBLE_VIEWS.COPY_VERSE,
			component: CopyVerseView
		},
		{
			view: BIBLE_VIEWS.NAV_READINGS,
			component: NavReadingsView
		}
	];
