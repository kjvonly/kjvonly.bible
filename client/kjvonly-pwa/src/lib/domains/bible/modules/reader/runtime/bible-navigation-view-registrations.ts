import {
	type NavigationViewRegistration
} from '$lib/application';

import {
	BIBLE_VIEWS,
	type BibleView
} from '../../../models/bible-navigation.model';

import BibleContainer from '../bibleContainer.svelte';

/**
 * Bible-owned navigation views registered by the application composition root.
 */
export const bibleNavigationViewRegistrations:
	readonly NavigationViewRegistration<BibleView>[] = [
		{
			view: BIBLE_VIEWS.READER,
			component: BibleContainer
		}
	];
