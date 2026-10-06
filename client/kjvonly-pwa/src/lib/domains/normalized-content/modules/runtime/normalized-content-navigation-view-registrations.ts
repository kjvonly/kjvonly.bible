import type {
	NavigationViewRegistration
} from '$lib/application';

import {
	NORMALIZED_CONTENT_VIEWS,
	type NormalizedContentView
} from '../../models/normalized-content-navigation.model';

import NormalizedContentReader from '../reader/normalizedContentReader.svelte';

export const normalizedContentNavigationViewRegistrations:
	readonly NavigationViewRegistration<NormalizedContentView>[] = [
		{
			view:
				NORMALIZED_CONTENT_VIEWS.READER,
			component:
				NormalizedContentReader
		}
	];
