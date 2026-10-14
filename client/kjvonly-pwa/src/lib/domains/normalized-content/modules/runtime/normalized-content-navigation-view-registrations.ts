import type {
	NavigationViewRegistration
} from '$lib/application';

import {
	NORMALIZED_CONTENT_VIEWS,
	type NormalizedContentView
} from '../../models/normalized-content-navigation.model';

import NormalizedContentReader from '../reader/normalizedContentReader.svelte';
import NormalizedContentOverflowActionsView from '../reader/views/normalizedContentOverflowActionsView.svelte';

export const normalizedContentNavigationViewRegistrations:
	readonly NavigationViewRegistration<NormalizedContentView>[] = [
		{
			view:
				NORMALIZED_CONTENT_VIEWS.READER,
			component:
				NormalizedContentReader
		},
		{
			view: NORMALIZED_CONTENT_VIEWS.OVERFLOW_ACTIONS,
			component: NormalizedContentOverflowActionsView
		}
	];
