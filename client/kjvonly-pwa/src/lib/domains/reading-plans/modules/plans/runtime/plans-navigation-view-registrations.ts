import {
	type NavigationViewRegistration
} from '$lib/application';

import {
	PLANS_VIEWS
} from '../../../models/plans.model';

import Discover from '../discover/discover.svelte';
import DiscoverDetails from '../discover/discoverDetails.svelte';
import NextReadings from '../nextReadings/nextReadings.svelte';
import SubsAction from '../subscription/subsAction.svelte';
import SubsDetails from '../subscription/subsDetails.svelte';
import SubsView from '../subscription/subsView.svelte';

/**
 * Plans-owned navigation view registrations consumed by the application
 * composition root. Plans keeps ownership of its view IDs and components while
 * the application owns registration into the shared navigation runtime.
 */
export const plansNavigationViewRegistrations:
	readonly NavigationViewRegistration<PLANS_VIEWS>[] = [
		{
			view: PLANS_VIEWS.SUBS_LIST,
			component: SubsView
		},
		{
			view: PLANS_VIEWS.SUBS_ACTIONS,
			component: SubsAction
		},
		{
			view: PLANS_VIEWS.SUBS_DETAILS,
			component: SubsDetails
		},
		{
			view: PLANS_VIEWS.PLANS_LIST,
			component: Discover
		},
		{
			view: PLANS_VIEWS.PLANS_DETAILS,
			component: DiscoverDetails
		},
		{
			view: PLANS_VIEWS.NEXT_LIST,
			component: NextReadings
		}
	];
