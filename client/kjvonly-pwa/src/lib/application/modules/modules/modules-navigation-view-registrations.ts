import type {
	NavigationViewRegistration
} from '../../runtime/rendering/navigation-view-registry';

import {
	MODULES_VIEWS,
	type ModulesView
} from './modules-navigation.model';

import Modules from './modules.svelte';

/**
 * Modules-launcher navigation views registered by the application composition root.
 */
export const modulesNavigationViewRegistrations:
	readonly NavigationViewRegistration<ModulesView>[] = [
		{
			view: MODULES_VIEWS.ROOT,
			component: Modules
		}
	];
