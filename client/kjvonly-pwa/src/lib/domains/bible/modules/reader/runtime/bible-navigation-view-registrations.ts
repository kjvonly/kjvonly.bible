import {
	type NavigationViewRegistration
} from '$lib/application';

import {
	BIBLE_VIEWS,
	type BibleView
} from '../../../models/bible-navigation.model';

import BibleContainer from '../bibleContainer.svelte';
import BibleMenuView from '../views/bibleMenuView.svelte';
import BibleVersionView from '../views/bibleVersionView.svelte';
import BookChapterVerseView from '../views/bookChapterVerse/bookChapterVerseView.svelte';
import CopyVerseView from '../views/copyVerseView.svelte';
import NavReadingsView from '../views/navReadingsView.svelte';

/**
 * Bible-owned navigation views registered by the application composition root.
 */
export const bibleNavigationViewRegistrations:
	readonly NavigationViewRegistration<BibleView>[] = [
		{
			view: BIBLE_VIEWS.READER,
			component: BibleContainer
		},
		{
			view: BIBLE_VIEWS.MENU,
			component: BibleMenuView
		},
		{
			view: BIBLE_VIEWS.VERSION,
			component: BibleVersionView
		},
		{
			view: BIBLE_VIEWS.BOOK_CHAPTER_VERSE,
			component: BookChapterVerseView
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
