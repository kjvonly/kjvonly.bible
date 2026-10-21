import type {
	NavigationViewRegistration
} from '$lib/application';

import {
	NORMALIZED_CONTENT_VIEWS,
	type NormalizedContentView
} from '../../models/normalized-content-navigation.model';

import NormalizedContentReader from '../reader/normalizedContentReader.svelte';
import NormalizedContentOverflowActionsView from '../reader/views/normalizedContentOverflowActionsView.svelte';
import NormalizedContentTextMarkupLookupView from '../reader/views/normalizedContentTextMarkupLookupView.svelte';

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
		},
		{
			view: NORMALIZED_CONTENT_VIEWS.TEXT_MARKUP_LOOKUP,
			component: NormalizedContentTextMarkupLookupView
		}
	];
