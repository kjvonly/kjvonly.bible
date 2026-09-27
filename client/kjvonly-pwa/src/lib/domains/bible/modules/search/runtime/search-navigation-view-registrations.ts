import type {
	NavigationViewRegistration
} from '$lib/application';

import {
	SEARCH_VIEWS,
	type SearchView
} from '../../../models/search-navigation.model';

import SearchContainer from '../searchContainer.svelte';

/**
 * Search-owned navigation views registered by the application composition root.
 */
export const searchNavigationViewRegistrations:
	readonly NavigationViewRegistration<SearchView>[] = [
		{
			view: SEARCH_VIEWS.RESULTS,
			component: SearchContainer
		}
	];
