import type {
	NavigationViewRegistration
} from '$lib/application';

import {
	REFS_VIEWS,
	type RefsView
} from '../../../models/refs-navigation.model';

import RefsContainer from '../refsContainer.svelte';

/**
 * Strong's/Refs navigation views registered by the application composition root.
 */
export const refsNavigationViewRegistrations:
	readonly NavigationViewRegistration<RefsView>[] = [
		{
			view: REFS_VIEWS.ROOT,
			component: RefsContainer
		}
	];
